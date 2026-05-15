"""AI pipeline: loads custom pkl models from services/ai-engine/weights/ and classifies complaints."""

from __future__ import annotations

import io
import os
import pickle

# Path to the shared weights folder
_HERE = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "services", "ai-engine", "weights"))

_vectorizer = None
_classifier = None
_priority_classifier = None
_sla_model = None
_clip_model = None
_clip_processor = None


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
            print(f"[AI] {name} load failed: {e}")
    if loaded:
        print(f"[AI] Models loaded: {', '.join(loaded)}")


def _load_clip() -> None:
    global _clip_model, _clip_processor
    try:
        from transformers import CLIPModel, CLIPProcessor
        print("[AI] Loading CLIP model...")
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        print("[AI] CLIP loaded successfully")
    except Exception as e:
        print(f"[AI] CLIP loading failed (optional): {e}")


_load_pkl_models()
_load_clip()


def classify_text(text: str) -> dict:
    """Classify complaint text → {category, priority, sla_days}."""
    try:
        if _vectorizer is None or _classifier is None:
            return {"category": "General", "priority": "Medium", "sla_days": 5.0}
        vec = _vectorizer.transform([text])
        category = _classifier.predict(vec)[0]
        priority = _priority_classifier.predict(vec)[0] if _priority_classifier else "medium"
        sla_days = 5.0
        if _sla_model:
            try:
                sla_days = float(_sla_model.predict(vec)[0])
            except Exception:
                sla_days = 5.0
        return {
            "category": str(category),
            "priority": str(priority),
            "sla_days": round(sla_days, 1),
            "confidence": 0.85,
        }
    except Exception as e:
        print(f"[AI] classify_text error: {e}")
        return {"category": "General", "priority": "Medium", "sla_days": 5.0, "confidence": 0.0}


def verify_image(text: str, image_bytes: bytes) -> dict:
    """Verify that an uploaded image matches the complaint description using CLIP."""
    try:
        import torch
        from PIL import Image

        if _clip_model is None:
            return {"verified": True, "score": 0.0, "reason": "CLIP not loaded — auto-approved"}
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        inputs = _clip_processor(
            text=[f"a photo of {text}", "a random unrelated photo"],
            images=image,
            return_tensors="pt",
            padding=True,
        )
        with torch.no_grad():
            outputs = _clip_model(**inputs)
        probs = outputs.logits_per_image.softmax(dim=1)
        score = probs[0][0].item()
        if score < 0.6:
            return {"verified": False, "score": round(score, 3), "reason": "Image does not match description"}
        return {"verified": True, "score": round(score, 3), "reason": "Image verified"}
    except Exception as e:
        print(f"[AI] verify_image error: {e}")
        return {"verified": True, "score": 0.0, "reason": "Verification unavailable — auto-approved"}


def transcribe_audio(audio_path: str) -> dict:
    """Transcribe an audio file using Whisper."""
    try:
        import whisper
        print(f"[WHISPER] Transcribing: {audio_path}")
        model = whisper.load_model("tiny")
        result = model.transcribe(audio_path, fp16=False)
        transcript = result.get("text", "").strip()
        print(f"[WHISPER] Transcript: {transcript}")
        return {"transcript": transcript, "success": True}
    except Exception as e:
        print(f"[WHISPER] Error: {e}")
        return {"transcript": "", "success": False, "error": str(e)}
