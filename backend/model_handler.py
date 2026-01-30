"""
Med-Gemma 4B IT Model Handler
Handles model loading, inference, and GPU memory management with 4-bit quantization
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from PIL import Image
import logging
from typing import Optional, Dict, Any, List, Union
import gc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MedGemmaHandler:
    """Handler for Med-Gemma 4B IT model with optimized GPU usage"""
    
    def __init__(self, model_name: str = "google/medgemma-4b-it"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        logger.info(f"Initializing MedGemmaHandler on {self.device}")
        
    def load_model(self):
        """Load MedGemma model with optimized settings"""
        if self.model is not None:
            logger.info("Model already loaded")
            return
        
        try:
            logger.info(f"Loading {self.model_name}...")
            
            # Import specific classes for MedGemma
            from transformers import AutoProcessor, AutoModelForImageTextToText
            
            # Load processor
            self.processor = AutoProcessor.from_pretrained(self.model_name)
            
            # Load model with optimized settings for 8GB GPU
            model_kwargs = {
                "device_map": "auto",
                "torch_dtype": torch.bfloat16 if torch.cuda.is_available() else torch.float32,
                "trust_remote_code": True,
                "low_cpu_mem_usage": True,
            }
            
            # Optimized quantization for 8GB GPU - use more memory for better performance
            if torch.cuda.is_available():
                from transformers import BitsAndBytesConfig
                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.bfloat16,  # bfloat16 is faster than float16
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_use_double_quant=True  # Double quantization for better quality
                )
                model_kwargs["quantization_config"] = quantization_config
                # Use 4.5GB max for laptop - prevents overheating
                model_kwargs["max_memory"] = {0: "4.5GB"}
            
            self.model = AutoModelForImageTextToText.from_pretrained(
                self.model_name,
                **model_kwargs
            )
            
            self.model.eval()
            logger.info("✓ Model loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def generate_response(
        self,
        prompt: str,
        image: Optional[Image.Image] = None,
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        do_sample: bool = True
    ) -> str:
        """
        Generate response using MedGemma processor
        """
        # Collect stream into a single string
        full_response = ""
        for token in self.generate_response_stream(prompt, image, max_new_tokens, temperature, top_p, do_sample):
            full_response += token
        return full_response

    def generate_response_stream(
        self,
        prompt: str,
        image: Optional[Image.Image] = None,
        max_new_tokens: int = 300,
        temperature: float = 0.7,
        top_p: float = 0.9,
        do_sample: bool = False
    ):
        """
        Generate streaming response
        """
        if self.model is None:
            self.load_model()
        
        try:
            from transformers import TextIteratorStreamer
            from threading import Thread
            
            # Prepare messages format
            messages = []
            messages.append({
                "role": "system",
                "content": [{"type": "text", "text": "You are a helpful and expert medical assistant."}]
            })
            
            user_content = [{"type": "text", "text": prompt}]
            if image is not None:
                user_content.append({"type": "image", "image": image})
                
            messages.append({
                "role": "user",
                "content": user_content
            })
            
            # Process inputs
            inputs = self.processor.apply_chat_template(
                messages, 
                add_generation_prompt=True, 
                tokenize=True,
                return_dict=True, 
                return_tensors="pt"
            ).to(self.model.device)
            
            # Create streamer
            streamer = TextIteratorStreamer(self.processor, skip_special_tokens=True, skip_prompt=True)
            
            # Generate kwargs
            generation_kwargs = dict(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=do_sample,
                temperature=temperature if do_sample else 1.0,
                top_p=top_p if do_sample else 1.0,
                use_cache=True,
                repetition_penalty=1.1,
                streamer=streamer
            )
            
            # Run generation in a separate thread
            thread = Thread(target=self.model.generate, kwargs=generation_kwargs)
            thread.start()
            
            # Yield tokens from streamer
            for new_text in streamer:
                yield new_text
                
        except Exception as e:
            logger.error(f"Error generating stream: {str(e)}")
            raise
    
    def analyze_xray(self, image: Image.Image, question: str = None) -> Dict[str, Any]:
        """
        Analyze chest X-ray image
        
        Args:
            image: PIL Image of chest X-ray
            question: Optional specific question about the X-ray
            
        Returns:
            Dictionary with analysis results
        """
        if question is None:
            question = "Analyze this chest X-ray. Describe any abnormalities, findings, and provide a clinical impression."
        
        prompt = f"<image>\n{question}\n\nProvide a detailed medical analysis:"
        
        try:
            analysis = self.generate_response(prompt, image=image, max_new_tokens=768)
            
            return {
                "success": True,
                "analysis": analysis,
                "image_received": True
            }
        except Exception as e:
            logger.error(f"X-ray analysis error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def drug_information(self, drug_name: str, query_type: str = "general") -> Dict[str, Any]:
        """
        Get drug information
        
        Args:
            drug_name: Name of the drug
            query_type: Type of query (general, interactions, side_effects, dosage)
            
        Returns:
            Dictionary with drug information
        """
        query_templates = {
            "general": f"Provide comprehensive information about the drug {drug_name}, including its uses, mechanism of action, and important considerations.",
            "interactions": f"What are the major drug interactions for {drug_name}? List contraindications and drugs that should not be combined.",
            "side_effects": f"List and explain the common and serious side effects of {drug_name}.",
            "dosage": f"What are the standard dosage recommendations for {drug_name} for different patient populations?"
        }
        
        prompt = query_templates.get(query_type, query_templates["general"])
        
        try:
            response = self.generate_response(prompt, max_new_tokens=256)
            
            return {
                "success": True,
                "drug_name": drug_name,
                "query_type": query_type,
                "information": response
            }
        except Exception as e:
            logger.error(f"Drug information error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def symptom_analysis(self, symptoms: List[str], patient_info: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyze symptoms and provide triage assessment
        
        Args:
            symptoms: List of symptoms
            patient_info: Optional patient demographic information
            
        Returns:
            Dictionary with analysis and recommendations
        """
        symptoms_str = ", ".join(symptoms)
        
        patient_context = ""
        if patient_info:
            age = patient_info.get("age", "")
            gender = patient_info.get("gender", "")
            if age or gender:
                patient_context = f"Patient: {age} year old {gender}. "
        
        prompt = f"{patient_context}Symptoms: {symptoms_str}\n\nProvide a differential diagnosis, urgency assessment, and recommendations for next steps."
        
        try:
            analysis = self.generate_response(prompt, max_new_tokens=384)
            
            return {
                "success": True,
                "symptoms": symptoms,
                "analysis": analysis
            }
        except Exception as e:
            logger.error(f"Symptom analysis error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def chat(self, message: str, conversation_history: List[Dict[str, str]] = None) -> str:
        """
        Medical chat interface
        
        Args:
            message: User message
            conversation_history: Previous conversation turns
            
        Returns:
            Model response
        """
        # Build conversation context
        context = ""
        if conversation_history:
            for turn in conversation_history[-5:]:  # Last 5 turns for context
                context += f"User: {turn.get('user', '')}\nAssistant: {turn.get('assistant', '')}\n"
        
        prompt = f"{context}User: {message}\nAssistant:"
        
        return self.generate_response(prompt, max_new_tokens=512)

    def chat_stream(self, message: str, conversation_history: List[Dict[str, str]] = None):
        """
        Streaming chat interface
        """
        # Build conversation context
        context = ""
        if conversation_history:
            for turn in conversation_history[-5:]:
                context += f"User: {turn.get('user', '')}\nAssistant: {turn.get('assistant', '')}\n"
        
        prompt = f"{context}User: {message}\nAssistant:"
        
        return self.generate_response_stream(prompt, max_new_tokens=256)
    
    def clear_memory(self):
        """Clear GPU memory cache"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
            logger.info("GPU cache cleared")
    
    def unload_model(self):
        """Unload model from memory"""
        if self.model is not None:
            del self.model
            del self.tokenizer
            self.model = None
            self.tokenizer = None
            self.clear_memory()
            logger.info("Model unloaded from memory")


# Global instance
_model_handler = None


def get_model_handler() -> MedGemmaHandler:
    """Get or create global model handler instance"""
    global _model_handler
    if _model_handler is None:
        _model_handler = MedGemmaHandler()
    return _model_handler
