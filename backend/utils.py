"""
Utility functions for Med-Gemma application
Includes image processing, validation, and helper functions
"""

import io
import base64
from PIL import Image
import numpy as np
from typing import Optional, Tuple
import logging
import pydicom
from pydicom.multival import MultiValue

logger = logging.getLogger(__name__)


def decode_base64_image(base64_str: str) -> Optional[Image.Image]:
    """
    Decode base64 string to PIL Image
    
    Args:
        base64_str: Base64 encoded image string
        
    Returns:
        PIL Image or None if decoding fails
    """
    try:
        # Remove data URL prefix if present
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        
        return image
    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}")
        return None


def encode_image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """
    Encode PIL Image to base64 string
    
    Args:
        image: PIL Image
        format: Image format (PNG, JPEG, etc.)
        
    Returns:
        Base64 encoded string
    """
    buffered = io.BytesIO()
    image.save(buffered, format=format)
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/{format.lower()};base64,{img_str}"


def preprocess_medical_image(
    image: Image.Image,
    target_size: Tuple[int, int] = (512, 512),
    normalize: bool = True
) -> Image.Image:
    """
    Preprocess medical image for model input
    
    Args:
        image: Input PIL Image
        target_size: Target resolution
        normalize: Whether to normalize pixel values
        
    Returns:
        Preprocessed PIL Image
    """
    # Convert to RGB if not already
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize maintaining aspect ratio
    image.thumbnail(target_size, Image.Resampling.LANCZOS)
    
    # Create new image with padding if needed
    new_image = Image.new("RGB", target_size, (0, 0, 0))
    paste_x = (target_size[0] - image.size[0]) // 2
    paste_y = (target_size[1] - image.size[1]) // 2
    new_image.paste(image, (paste_x, paste_y))
    
    return new_image


def validate_medical_image(image: Image.Image) -> Tuple[bool, str]:
    """
    Validate medical image for processing
    
    Args:
        image: PIL Image to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check image size
    if image.size[0] < 100 or image.size[1] < 100:
        return False, "Image too small (minimum 100x100 pixels)"
    
    if image.size[0] > 4096 or image.size[1] > 4096:
        return False, "Image too large (maximum 4096x4096 pixels)"
    
    # Check image mode
    valid_modes = ["RGB", "L", "RGBA"]
    if image.mode not in valid_modes:
        return False, f"Invalid image mode: {image.mode}"
    
    return True, ""


def _first_value(value):
    if value is None:
        return None
    if isinstance(value, (list, tuple, MultiValue)):
        return float(value[0])
    return float(value)


def dicom_bytes_to_image(dicom_bytes: bytes) -> Tuple[Optional[Image.Image], str]:
    """
    Convert DICOM bytes to a PIL Image for model input.

    Returns:
        (PIL Image, error_message). On failure, image is None and error_message is set.
    """
    try:
        ds = pydicom.dcmread(io.BytesIO(dicom_bytes), force=True)
        pixel_array = ds.pixel_array

        # Select a representative frame if multi-frame / 3D
        if pixel_array.ndim == 3:
            frame = pixel_array[pixel_array.shape[0] // 2]
        elif pixel_array.ndim == 4:
            frame = pixel_array[pixel_array.shape[0] // 2]
        else:
            frame = pixel_array

        # Handle RGB-like data
        if frame.ndim == 3 and frame.shape[-1] in (3, 4):
            rgb = frame[..., :3].astype(np.float32)
            min_val = np.min(rgb)
            max_val = np.max(rgb)
            if max_val == min_val:
                max_val = min_val + 1.0
            rgb = (rgb - min_val) / (max_val - min_val)
            rgb = np.clip(rgb * 255.0, 0, 255).astype(np.uint8)
            return Image.fromarray(rgb, mode="RGB"), ""

        # Grayscale processing with rescale + windowing
        img = frame.astype(np.float32)
        slope = float(getattr(ds, "RescaleSlope", 1.0))
        intercept = float(getattr(ds, "RescaleIntercept", 0.0))
        img = img * slope + intercept

        window_center = _first_value(getattr(ds, "WindowCenter", None))
        window_width = _first_value(getattr(ds, "WindowWidth", None))

        if window_center is not None and window_width is not None and window_width > 0:
            lower = window_center - (window_width / 2.0)
            upper = window_center + (window_width / 2.0)
        else:
            lower, upper = np.percentile(img, (1, 99))
            if lower == upper:
                lower = float(np.min(img))
                upper = float(np.max(img))
                if lower == upper:
                    lower, upper = 0.0, 1.0

        img = np.clip(img, lower, upper)
        img = (img - lower) / (upper - lower + 1e-5)
        img = np.clip(img * 255.0, 0, 255).astype(np.uint8)

        if getattr(ds, "PhotometricInterpretation", "MONOCHROME2") == "MONOCHROME1":
            img = 255 - img

        pil_img = Image.fromarray(img, mode="L").convert("RGB")
        return pil_img, ""
    except Exception as e:
        logger.error(f"Error decoding DICOM: {str(e)}")
        return None, str(e)


# Medical terminology dictionary (Turkish-English)
MEDICAL_TERMS_TR = {
    # Anatomy
    "akciğer": "lung",
    "kalp": "heart",
    "karaciğer": "liver",
    "böbrek": "kidney",
    "mide": "stomach",
    "bağırsak": "intestine",
    "beyin": "brain",
    "kemik": "bone",
    
    # Conditions
    "pnömoni": "pneumonia",
    "kanser": "cancer",
    "tümör": "tumor",
    "enfeksiyon": "infection",
    "kırık": "fracture",
    "iltihaplanma": "inflammation",
    
    # Symptoms
    "ağrı": "pain",
    "ateş": "fever",
    "öksürük": "cough",
    "nefes darlığı": "shortness of breath",
    "baş ağrısı": "headache",
    "bulantı": "nausea",
    "kusma": "vomiting",
}


def translate_medical_term(term: str, to_english: bool = True) -> str:
    """
    Translate medical term between Turkish and English
    
    Args:
        term: Medical term to translate
        to_english: If True, translate TR->EN, else EN->TR
        
    Returns:
        Translated term or original if not found
    """
    term_lower = term.lower()
    
    if to_english:
        return MEDICAL_TERMS_TR.get(term_lower, term)
    else:
        # Reverse lookup
        for tr, en in MEDICAL_TERMS_TR.items():
            if en == term_lower:
                return tr
        return term


# Example medical questions for the interface
EXAMPLE_QUESTIONS_TR = [
    "Bu göğüs röntgeninde anormallik var mı?",
    "Pnömoni belirtileri nelerdir?",
    "Aspirin ile etkileşime giren ilaçlar nelerdir?",
    "Ateş, öksürük ve nefes darlığı semptomlarını değerlendirir misiniz?",
    "Hipertansiyon tedavisinde kullanılan ilaçlar nelerdir?",
]

EXAMPLE_QUESTIONS_EN = [
    "Are there any abnormalities in this chest X-ray?",
    "What are the symptoms of pneumonia?",
    "What drugs interact with Aspirin?",
    "Can you evaluate symptoms of fever, cough, and shortness of breath?",
    "What medications are used to treat hypertension?",
]


def get_example_questions(language: str = "tr") -> list:
    """Get example questions in specified language"""
    return EXAMPLE_QUESTIONS_TR if language == "tr" else EXAMPLE_QUESTIONS_EN


# Common medical image analysis prompts
XRAY_ANALYSIS_PROMPTS = {
    "general": "Analyze this chest X-ray. Describe any abnormalities, findings, and provide a clinical impression.",
    "pneumonia": "Does this chest X-ray show signs of pneumonia? Explain your findings.",
    "fracture": "Are there any fractures visible in this X-ray? Locate and describe them.",
    "cardiac": "Evaluate the cardiac silhouette and any cardiac abnormalities in this chest X-ray.",
    "lung": "Assess the lungs in this X-ray for any abnormalities, masses, or infiltrates.",
}


def get_xray_prompt(analysis_type: str = "general") -> str:
    """Get X-ray analysis prompt by type"""
    return XRAY_ANALYSIS_PROMPTS.get(analysis_type, XRAY_ANALYSIS_PROMPTS["general"])
