from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import torch
import whisper
import os
import pickle
import shutil
import pandas as pd
from transformers import CLIPProcessor, CLIPModel

app = FastAPI(title="JanSetu AI Engine")

# Frontend Connection (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables define karein taaki functions inhe access kar sakein
clip_model = None
clip_processor = None
whisper_model = None
vectorizer = None
classifier_model = None
sla_model = None

# --- MODELS LOAD SECTION ---
def load_all_models():
    global clip_model, clip_processor, whisper_model, vectorizer, classifier_model, sla_model
    
    try:
        print("🚀 Loading models... Please wait.")
        
        # 1. Whisper (Voice to Text) - Sabse pehle load karein
        print("--- Loading Whisper (Base) ---")
        whisper_model = whisper.load_model("base")
        
        # 2. CLIP (Image Verification) - Iske liye internet chahiye pehli baar
        print("--- Loading CLIP (openai/clip-vit-base-patch32) ---")
        clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

        # 3. Vectorizer & Classifiers (Custom Weights)
        print("--- Loading Custom Classifiers ---")
        with open("weights/vectorizer.pkl", "rb") as f:
            vectorizer = pickle.load(f)
        with open("weights/classifier.pkl", "rb") as f:
            classifier_model = pickle.load(f)
        with open("weights/sla_model.pkl", "rb") as f:
            sla_model = pickle.load(f)

        print("✅ ALL MODELS LOADED SUCCESSFULLY!")
    except Exception as e:
        print(f"❌ LOADING ERROR: {e}")
        print("Tip: Check your internet connection for CLIP and ensure 'weights' folder exists.")

# Server start hote hi models load karein
load_all_models()

# --- ENDPOINT 1: VOICE TRANSCRIPTION (WHISPER) ---
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if whisper_model is None:
        return {"error": "Whisper model not loaded"}

    # Filename ko simple rakhein
    audio_path = "temp_audio.wav" 
    
    try:
        # File save karein
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer) # upload file save karne ka safe tarika
        
        # Transcribe
        result = whisper_model.transcribe(audio_path, fp16=False) # CPU ke liye fp16=False behtar hai
        return {"transcript": result["text"]}
    
    except Exception as e:
        print(f"Error trace: {e}") # Terminal mein check karne ke liye
        return {"error": f"Transcription failed: {str(e)}"}
    
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

# --- ENDPOINT 2: COMPLAINT PREDICTION (CLIP + NLP) ---
@app.post("/predict")
async def predict_complaint(text: str = Form(...), file: UploadFile = File(...)):
    if clip_model is None or vectorizer is None:
        return {"status": "Error", "reason": "AI Models not ready"}

    try:
        # --- STEP 1: CLIP Image Verification ---
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        inputs = clip_processor(text=[f"a photo of {text}", "a random unrelated photo"], 
                                images=image, return_tensors="pt", padding=True)
        
        with torch.no_grad():
            outputs = clip_model(**inputs)
        
        # Similarity score calculate karein
        probs = outputs.logits_per_image.softmax(dim=1)
        match_score = probs[0][0].item()
        
        # Agar score 60% se kam hai toh reject karein
        if match_score < 0.6:
            return {
                "status": "Rejected", 
                "reason": "Image does not match the description", 
                "score": f"{match_score*100:.2f}%"
            }

        # --- STEP 2: Classification ---
        text_vectorized = vectorizer.transform([text])
        category = classifier_model.predict(text_vectorized)[0]

        # --- STEP 3: Response ---
        return {
            "status": "Verified",
            "match_score": f"{match_score*100:.2f}%",
            "analysis": {
                "category": str(category),
                "priority": "Medium",
                "expected_days": 5
            }
        }
    except Exception as e:
        return {"status": "Error", "reason": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)