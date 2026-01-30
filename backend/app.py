"""
FastAPI Backend for Med-Gemma 4B IT Medical Assistant
Provides REST API endpoints for all medical functionalities
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn
from PIL import Image
import io
import logging

from model_handler import get_model_handler
from utils import (
    decode_base64_image,
    preprocess_medical_image,
    validate_medical_image,
    get_example_questions,
    get_xray_prompt,
    dicom_bytes_to_image
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Med-Gemma Medical Assistant API",
    description="AI-powered medical assistant using Med-Gemma 4B IT model",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request validation
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2048)
    conversation_history: Optional[List[Dict[str, str]]] = None
    language: str = Field(default="tr", pattern="^(tr|en)$")


class DrugInfoRequest(BaseModel):
    drug_name: str = Field(..., min_length=1, max_length=256)
    query_type: str = Field(default="general", pattern="^(general|interactions|side_effects|dosage)$")
    language: str = Field(default="tr", pattern="^(tr|en)$")


class SymptomAnalysisRequest(BaseModel):
    symptoms: List[str] = Field(..., min_items=1, max_items=20)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, pattern="^(male|female|other)$")
    language: str = Field(default="tr", pattern="^(tr|en)$")


class XRayAnalysisRequest(BaseModel):
    image_base64: str
    question: Optional[str] = None
    analysis_type: str = Field(default="general", pattern="^(general|pneumonia|fracture|cardiac|lung)$")
    language: str = Field(default="tr", pattern="^(tr|en)$")
    # Optional patient context
    patient_age: Optional[int] = Field(None, ge=0, le=150)
    patient_gender: Optional[str] = None
    patient_history: Optional[str] = None


class MedicalImageRequest(BaseModel):
    """Unified request for all medical imaging types"""
    image_base64: str
    image_type: str = Field(..., pattern="^(ctmr|fundus|dermo|histo|lab)$")
    analysis_type: str = Field(default="general")
    question: Optional[str] = None
    language: str = Field(default="tr", pattern="^(tr|en)$")


class CompareImagesRequest(BaseModel):
    """Request for image comparison (before/after)"""
    before_image: str
    after_image: str
    comparison_type: str = Field(default="progression", pattern="^(progression|treatment|general)$")
    language: str = Field(default="tr", pattern="^(tr|en)$")


# Global model handler
model_handler = None

# Shared prompts for medical image analysis
MEDICAL_IMAGE_PROMPTS = {
    "ctmr": {
        "brain": "Bu beyin MR görüntüsünü analiz et. Tümör, kanama, infarkt veya diğer anormallikleri değerlendir.",
        "chest_ct": "Bu toraks CT görüntüsünü analiz et. Akciğer nodülleri, kitleler veya diğer bulguları değerlendir.",
        "abdomen": "Bu karın CT görüntüsünü analiz et. Organları ve anormallikleri değerlendir.",
        "spine": "Bu omurga MR görüntüsünü analiz et. Disk, sinir ve yapısal anormallikleri değerlendir.",
        "general": "Bu CT/MR görüntüsünü analiz et ve bulgularını raporla."
    },
    "fundus": {
        "diabetic_retinopathy": "Bu fundus görüntüsünde diyabetik retinopati belirtileri var mı? Mikroanevrizma, hemoraji, eksuda varlığını değerlendir.",
        "glaucoma": "Bu fundus görüntüsünde glokom belirtileri var mı? Optik disk cup/disc oranını ve sinir lifi tabakasını değerlendir.",
        "macular": "Bu fundus görüntüsünde makula dejenerasyonu belirtileri var mı? Drusen, pigment değişiklikleri değerlendir.",
        "general": "Bu fundus/retina görüntüsünü analiz et ve bulgularını raporla."
    },
    "dermo": {
        "melanoma": "Bu dermoskopi görüntüsünde melanom şüphesi var mı? ABCDE kriterlerini değerlendir.",
        "benign_malign": "Bu cilt lezyonu benign mi malign mi? Dermoskopik özellikleri analiz et.",
        "psoriasis": "Bu cilt görüntüsünde psoriazis belirtileri var mı? Tipik özellikleri değerlendir.",
        "general": "Bu dermatolojik görüntüyü analiz et ve bulgularını raporla."
    },
    "histo": {
        "cancer": "Bu histopatoloji görüntüsünde kanser hücreleri var mı? Hücre morfolojisini değerlendir.",
        "grading": "Bu patoloji örneğinde tümör derecesi (grade) nedir? Histolojik özellikleri değerlendir.",
        "margins": "Bu patoloji örneğinde cerrahi sınırlar temiz mi? Tümör yayılımını değerlendir.",
        "general": "Bu histopatoloji görüntüsünü analiz et ve bulgularını raporla."
    },
    "lab": {
        "blood": "Bu kan tahlili (hemogram) sonuçlarını oku ve yorumla. Normal değerlerin dışında olanları vurgula.",
        "biochemistry": "Bu biyokimya tetkik sonuçlarını oku ve yorumla. Anormal değerleri açıkla.",
        "thyroid": "Bu tiroid testi sonuçlarını oku ve yorumla. Tiroid fonksiyonunu değerlendir.",
        "lipid": "Bu lipid profili sonuçlarını oku ve yorumla. Kardiyovasküler risk durumunu değerlendir.",
        "urine": "Bu idrar tahlili sonuçlarını oku ve yorumla. Anormal bulguları açıkla.",
        "general": "Bu lab sonuçlarını oku, değerleri çıkar ve yorumla. Anormal olanları vurgula."
    }
}


def build_medical_prompt(image_type: str, analysis_type: str, question: Optional[str]) -> str:
    if question:
        return question
    image_prompts = MEDICAL_IMAGE_PROMPTS.get(image_type, {})
    return image_prompts.get(
        analysis_type,
        image_prompts.get("general", "Bu tıbbi görüntüyü analiz et.")
    )


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model_handler
    logger.info("Starting Med-Gemma Medical Assistant API...")
    logger.info("Note: Model will be loaded on first request to save initial startup time")
    model_handler = get_model_handler()


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global model_handler
    logger.info("Shutting down...")
    if model_handler:
        model_handler.unload_model()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Med-Gemma Medical Assistant API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    import torch
    
    return {
        "status": "healthy",
        "model_loaded": model_handler.model is not None if model_handler else False,
        "device": model_handler.device if model_handler else "unknown",
        "cuda_available": torch.cuda.is_available(),
        "gpu_memory_allocated": f"{torch.cuda.memory_allocated() / 1024**3:.2f}GB" if torch.cuda.is_available() else "N/A"
    }


from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# ... (skip lines 10-118) ...

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint
    """
    try:
        model = get_model_handler()
        
        # Ensure model is loaded
        if model.model is None:
            try:
                model.load_model()
            except Exception as e:
                logger.error(f"Failed to load model: {str(e)}")
                return JSONResponse(content={
                    "success": False,
                    "response": f"Model load error: {str(e)}"
                }, status_code=500)
        
        # Convert chat history if needed
        history = []
        if request.conversation_history:
            history = request.conversation_history
            
        return StreamingResponse(
            model.chat_stream(request.message, history),
            media_type="text/plain"
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/analyze-xray")
async def analyze_xray(request: XRayAnalysisRequest):
    """
    Analyze chest X-ray image
    Upload an X-ray and get AI analysis
    """
    try:
        logger.info("X-ray analysis request received")
        
        # Decode image
        image = decode_base64_image(request.image_base64)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Validate image
        is_valid, error_msg = validate_medical_image(image)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Preprocess image
        image = preprocess_medical_image(image)
        
        # Ensure model is loaded
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()
        
        # Get appropriate prompt
        if request.question:
            question = request.question
        else:
            question = get_xray_prompt(request.analysis_type)
            if request.language == "tr":
                # Translate common prompts to Turkish
                translations = {
                    "general": "Bu göğüs röntgenini analiz et. Anormallikleri, bulguları açıkla ve klinik değerlendirmeni sun.",
                    "pneumonia": "Bu göğüs röntgeninde pnömoni belirtileri var mı? Bulgularını açıkla.",
                    "fracture": "Bu röntgende görülebilen kırıklar var mı? Yerini belirt ve açıkla.",
                    "cardiac": "Bu göğüs röntgeninde kardiyak silueti ve kalp anormalliklerini değerlendir.",
                    "lung": "Bu röntgende akciğerleri değerlendir, anormallik, kitle veya infiltrasyon var mı?"
                }
                question = translations.get(request.analysis_type, question)
        
        # Build patient context if provided (optional)
        patient_context = ""
        if request.patient_age or request.patient_gender or request.patient_history:
            context_parts = []
            if request.patient_age:
                context_parts.append(f"Yaş: {request.patient_age}")
            if request.patient_gender:
                context_parts.append(f"Cinsiyet: {request.patient_gender}")
            if request.patient_history:
                context_parts.append(f"Klinik Öykü: {request.patient_history}")
            patient_context = "\n\nHasta Bilgileri:\n" + "\n".join(context_parts) + "\n\n"
            question = patient_context + question
        
        # Stream the response
        def generate_stream():
            for token in model_handler.generate_response_stream(question, image=image, max_new_tokens=1024):
                yield token
        
        return StreamingResponse(generate_stream(), media_type="text/plain")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"X-ray analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/drug-info")
async def drug_information(request: DrugInfoRequest):
    """
    Get drug information
    Query drug details, interactions, side effects, or dosage
    """
    try:
        logger.info(f"Drug info request: {request.drug_name}")
        
        # Ensure model is loaded
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()
        
        result = model_handler.drug_information(
            drug_name=request.drug_name,
            query_type=request.query_type
        )
        result["language"] = request.language
        
        return result
        
    except Exception as e:
        logger.error(f"Drug info error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/symptom-check")
async def symptom_analysis(request: SymptomAnalysisRequest):
    """
    Analyze symptoms and provide medical assessment
    Performs triage and provides recommendations
    """
    try:
        logger.info(f"Symptom analysis request: {len(request.symptoms)} symptoms")
        
        # Ensure model is loaded
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()
        
        patient_info = {}
        if request.age:
            patient_info["age"] = request.age
        if request.gender:
            patient_info["gender"] = request.gender
        
        result = model_handler.symptom_analysis(
            symptoms=request.symptoms,
            patient_info=patient_info if patient_info else None
        )
        result["language"] = request.language
        
        return result
        
    except Exception as e:
        logger.error(f"Symptom analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/example-questions")
async def example_questions(language: str = "tr"):
    """Get example questions in specified language"""
    try:
        questions = get_example_questions(language)
        return {
            "success": True,
            "questions": questions,
            "language": language
        }
    except Exception as e:
        logger.error(f"Error getting example questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clear-cache")
async def clear_cache():
    """Clear GPU memory cache"""
    try:
        if model_handler:
            model_handler.clear_memory()
        return {
            "success": True,
            "message": "Cache cleared successfully"
        }
    except Exception as e:
        logger.error(f"Cache clear error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-medical-image")
async def analyze_medical_image(request: MedicalImageRequest):
    """
    Unified endpoint for all medical image types
    Supports: CT/MR, Fundus, Dermoscopy, Histopathology, Lab Results
    """
    try:
        global model_handler
        logger.info(f"Medical image analysis: type={request.image_type}, analysis={request.analysis_type}")
        
        # Decode image
        image_data = request.image_base64
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        
        import base64
        from PIL import Image
        import io
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Ensure model is loaded
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()
        
        # Build specialized prompt based on image type
        question = build_medical_prompt(request.image_type, request.analysis_type, request.question)
        
        # Stream the response
        def generate_stream():
            for token in model_handler.generate_response_stream(question, image=image, max_new_tokens=1024):
                yield token
        
        return StreamingResponse(generate_stream(), media_type="text/plain")
        
    except Exception as e:
        logger.error(f"Medical image analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze-dicom")
async def analyze_dicom(
    file: UploadFile = File(...),
    image_type: str = Form("ctmr"),
    analysis_type: str = Form("general"),
    question: Optional[str] = Form(None),
    language: str = Form("tr")
):
    """
    Analyze a DICOM file (CT/MR) and return AI assessment
    """
    try:
        global model_handler

        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        filename = file.filename.lower()
        if not (filename.endswith(".dcm") or filename.endswith(".dicom")):
            logger.info("DICOM upload without .dcm/.dicom extension; attempting to parse anyway.")

        if image_type not in MEDICAL_IMAGE_PROMPTS:
            raise HTTPException(status_code=400, detail="Invalid image_type")

        dicom_bytes = await file.read()
        image, error_msg = dicom_bytes_to_image(dicom_bytes)
        if image is None:
            raise HTTPException(status_code=400, detail=f"Invalid DICOM data: {error_msg}")

        # Validate and preprocess
        is_valid, error_msg = validate_medical_image(image)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        image = preprocess_medical_image(image)

        # Ensure model is loaded
        if model_handler is None:
            model_handler = get_model_handler()
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()

        prompt = build_medical_prompt(image_type, analysis_type, question)

        def generate_stream():
            for token in model_handler.generate_response_stream(prompt, image=image, max_new_tokens=1024):
                yield token

        return StreamingResponse(generate_stream(), media_type="text/plain")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DICOM analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/compare-images")
async def compare_images(request: CompareImagesRequest):
    """
    Compare before/after images for progression assessment
    """
    try:
        global model_handler
        logger.info(f"Image comparison: type={request.comparison_type}")
        
        import base64
        from PIL import Image
        import io
        
        # Decode both images
        def decode_image(img_data):
            if "base64," in img_data:
                img_data = img_data.split("base64,")[1]
            image_bytes = base64.b64decode(img_data)
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        before_image = decode_image(request.before_image)
        after_image = decode_image(request.after_image)
        
        # Ensure model is loaded
        if model_handler.model is None:
            logger.info("Loading model for first request...")
            model_handler.load_model()
        
        # Build comparison prompt
        comparison_prompts = {
            "progression": "Bu iki görüntüyü karşılaştır (ilki önceki, ikincisi sonraki). Hastalık progresyonu var mı? Değişiklikleri detaylı açıkla.",
            "treatment": "Bu iki görüntüyü karşılaştır (ilki tedavi öncesi, ikincisi tedavi sonrası). Tedavi yanıtını değerlendir. İyileşme var mı?",
            "general": "Bu iki görüntüyü karşılaştır ve aralarındaki farkları açıkla."
        }
        
        prompt = comparison_prompts.get(request.comparison_type, comparison_prompts["general"])
        
        # For comparison, we'll analyze with both images
        # Note: MedGemma can handle multi-image input
        result = model_handler.generate_response(prompt, image=before_image)
        
        return {
            "success": True,
            "analysis": result,
            "comparison_type": request.comparison_type,
            "language": request.language
        }
        
    except Exception as e:
        logger.error(f"Image comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Set to True for development
        log_level="info"
    )
