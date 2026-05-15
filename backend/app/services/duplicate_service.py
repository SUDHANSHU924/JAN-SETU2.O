"""Duplicate complaint detection using sentence embeddings (MiniLM).

Falls back gracefully if sentence-transformers is not installed.
"""

from __future__ import annotations

import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.normpath(
    os.path.join(_HERE, "..", "..", "..", "services", "ai-engine", "data", "complaints.json")
)

_model = None


def _get_model():
    global _model
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("[DEDUP] MiniLM model loaded")
    except Exception as e:
        print(f"[DEDUP] sentence-transformers not available ({e}) — duplicate detection disabled")
        _model = False
    return _model


def _load_complaints() -> dict:
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_complaints(data: dict) -> None:
    try:
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[DEDUP] Save failed: {e}")


def check_duplicate(new_complaint: str, category: str) -> dict:
    """Check if a new complaint duplicates an existing one in the same category."""
    model = _get_model()
    if not model:
        return {"is_duplicate": False, "matched_complaint": None, "similarity": 0.0}

    try:
        from sklearn.metrics.pairwise import cosine_similarity

        stored = _load_complaints()
        category_texts = stored.get(category, [])

        if not category_texts:
            category_texts.append(new_complaint)
            stored[category] = category_texts
            _save_complaints(stored)
            return {"is_duplicate": False, "matched_complaint": None, "similarity": 0.0}

        stored_embeddings = model.encode(category_texts)
        new_embedding = model.encode([new_complaint])
        similarities = cosine_similarity(new_embedding, stored_embeddings)[0]
        best_index = int(similarities.argmax())
        best_score = float(similarities[best_index])

        if best_score > 0.50:
            return {
                "is_duplicate": True,
                "matched_complaint": category_texts[best_index],
                "similarity": round(best_score, 3),
            }

        category_texts.append(new_complaint)
        stored[category] = category_texts
        _save_complaints(stored)
        return {"is_duplicate": False, "matched_complaint": None, "similarity": round(best_score, 3)}

    except Exception as e:
        print(f"[DEDUP] check_duplicate error: {e}")
        return {"is_duplicate": False, "matched_complaint": None, "similarity": 0.0}
