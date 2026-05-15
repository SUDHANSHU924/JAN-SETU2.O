"""JanSetu AI Engine — FastAPI service on port 8001.

Uses custom pkl models from the weights/ directory for text classification.
CLIP and Whisper are loaded lazily and fall back gracefully if unavailable.
"""

from __future__ import annotations

import io
import os
import pickle
import shutil

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="JanSetu AI Engine", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")
DATA_DIR = os.path.join(BASE_DIR, "data")

_vectorizer = None
_classifier = None
_priority_classifier = None
_sla_model = None
_clip_model = None
_clip_processor = None
_whisper_model = None
_dedup_model = None

MODELS_STATUS = {
    "sklearn": False,
    "clip": False,
    "whisper": False,
    "dedup": False,
}


def _load_pkl_models() -> None:
    global _vectorizer, _classifier, _priority_classifier, _sla_model
    loaded = []
    for name, var_name, filename in [
        ("vectorizer",          "_vectorizer",          "vectorizer.pkl"),
        ("classifier",          "_classifier",          "classifier.pkl"),
        ("priority_classifier", "_priority_classifier", "priority_classifier.pkl"),
        ("sla_model",           "_sla_model",           "sla_model.pkl"),
    ]:
        try:
            with open(os.path.join(WEIGHTS_DIR, filename), "rb") as f:
                globals()[var_name] = pickle.load(f)
            loaded.append(name)
        except Exception as e:
            print(f"[AI-ENGINE] {name} load failed: {e}")
    if loaded:
        MODELS_STATUS["sklearn"] = True
        print(f"[AI-ENGINE] Models loaded: {', '.join(loaded)}")


def _load_clip() -> None:
    global _clip_model, _clip_processor
    try:
        from transformers import CLIPModel, CLIPProcessor
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        MODELS_STATUS["clip"] = True
        print("[AI-ENGINE] CLIP model loaded")
    except Exception as e:
        print(f"[AI-ENGINE] CLIP not available: {e}")


def _load_dedup() -> None:
    global _dedup_model
    try:
        from sentence_transformers import SentenceTransformer
        _dedup_model = SentenceTransformer("all-MiniLM-L6-v2")
        MODELS_STATUS["dedup"] = True
        print("[AI-ENGINE] MiniLM dedup model loaded")
    except Exception as e:
        print(f"[AI-ENGINE] MiniLM not available: {e}")


# Load models at startup
_load_pkl_models()
_load_clip()
_load_dedup()


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models": MODELS_STATUS,
        "weights_dir": WEIGHTS_DIR,
    }


@app.post("/predict")
async def predict(text: str = Form(...)):
    """Classify complaint text → category, priority, sla_days."""
    if _vectorizer is None or _classifier is None:
        return {
            "status": "fallback",
            "category": "General",
            "priority": "medium",
            "sla_days": 5.0,
            "confidence": 0.0,
            "reason": "Models not loaded",
        }
    try:
        vec = _vectorizer.transform([text])
        category = str(_classifier.predict(vec)[0])
        priority = str(_priority_classifier.predict(vec)[0]) if _priority_classifier else "medium"
        sla_days = 5.0
        if _sla_model:
            try:
                sla_days = round(float(_sla_model.predict(vec)[0]), 1)
            except Exception:
                pass
        return {
            "status": "ok",
            "category": category,
            "priority": priority,
            "sla_days": sla_days,
            "confidence": 0.85,
        }
    except Exception as e:
        return {"status": "error", "reason": str(e), "category": "General", "priority": "medium", "sla_days": 5.0}


@app.post("/predict-with-image")
async def predict_with_image(text: str = Form(...), file: UploadFile = File(...)):
    """Classify complaint text and verify image using CLIP."""
    image_result = {"verified": True, "score": 0.0, "reason": "CLIP not loaded"}

    if _clip_model is not None:
        try:
            import torch
            from PIL import Image
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            inputs = _clip_processor(
                text=[f"a photo of {text}", "a random unrelated photo"],
                images=image,
                return_tensors="pt",
                padding=True,
            )
            with torch.no_grad():
                outputs = _clip_model(**inputs)
            probs = outputs.logits_per_image.softmax(dim=1)
            score = float(probs[0][0].item())
            image_result = {
                "verified": score >= 0.6,
                "score": round(score, 3),
                "reason": "Image verified" if score >= 0.6 else "Image does not match description",
            }
        except Exception as e:
            image_result = {"verified": True, "score": 0.0, "reason": str(e)}

    if not image_result["verified"]:
        return {"status": "Rejected", "image": image_result}

    text_result = await predict(text=text)
    return {"status": "ok", "image": image_result, **text_result}


@app.post("/check-duplicate")
async def check_duplicate(text: str = Form(...), category: str = Form(...)):
    """Check if complaint is a near-duplicate of an existing one."""
    if _dedup_model is None:
        return {"is_duplicate": False, "similarity": 0.0, "reason": "Dedup model not loaded"}

    import json
    data_file = os.path.join(DATA_DIR, "complaints.json")
    try:
        from sklearn.metrics.pairwise import cosine_similarity
        stored = {}
        if os.path.exists(data_file):
            with open(data_file, "r", encoding="utf-8") as f:
                stored = json.load(f)

        category_texts = stored.get(category, [])
        if not category_texts:
            category_texts.append(text)
            stored[category] = category_texts
            with open(data_file, "w", encoding="utf-8") as f:
                json.dump(stored, f, ensure_ascii=False, indent=2)
            return {"is_duplicate": False, "matched_complaint": None, "similarity": 0.0}

        stored_embeddings = _dedup_model.encode(category_texts)
        new_embedding = _dedup_model.encode([text])
        sims = cosine_similarity(new_embedding, stored_embeddings)[0]
        best_idx = int(sims.argmax())
        best_score = float(sims[best_idx])

        if best_score > 0.50:
            return {"is_duplicate": True, "matched_complaint": category_texts[best_idx], "similarity": round(best_score, 3)}

        category_texts.append(text)
        stored[category] = category_texts
        with open(data_file, "w", encoding="utf-8") as f:
            json.dump(stored, f, ensure_ascii=False, indent=2)
        return {"is_duplicate": False, "matched_complaint": None, "similarity": round(best_score, 3)}

    except Exception as e:
        return {"is_duplicate": False, "similarity": 0.0, "error": str(e)}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Transcribe audio using Whisper."""
    audio_path = "/tmp/jansetu_audio.wav"
    try:
        with open(audio_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        global _whisper_model
        if _whisper_model is None:
            try:
                import whisper
                _whisper_model = whisper.load_model("base")
                MODELS_STATUS["whisper"] = True
            except Exception as e:
                return {"transcript": "", "success": False, "error": f"Whisper not available: {e}"}

        result = _whisper_model.transcribe(audio_path, fp16=False)
        return {"transcript": result.get("text", "").strip(), "success": True}
    except Exception as e:
        return {"transcript": "", "success": False, "error": str(e)}
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
