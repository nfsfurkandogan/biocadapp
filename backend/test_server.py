"""
Simple test server to verify FastAPI setup
Run this first to ensure backend can start
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Med-Gemma Test Server")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "running", "message": "Med-Gemma Test Server"}

@app.get("/api/health")
async def health():
    import torch
    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A"
    }

if __name__ == "__main__":
    print("=" * 50)
    print("Med-Gemma Test Server")
    print("=" * 50)
    print("\nStarting on http://localhost:8000")
    print("\nTest URLs:")
    print("  - http://localhost:8000")
    print("  - http://localhost:8000/api/health")
    print("\nPress CTRL+C to stop\n")
    
    uvicorn.run(
        "test_server:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
