from __future__ import annotations
"""Placeholder grievance service helpers for the v1 scaffold."""

from typing import Optional


from datetime import datetime

from fastapi import BackgroundTasks, UploadFile

from app.services.ai_pipeline import run_ai_pipeline


def build_grievance_response(
    title: str,
    description: str,
    channel: str,
    file: Optional[UploadFile],
) -> dict:
    return {
        "message": "Grievance submitted successfully",
        "id": "temp-grievance-id",
        "status": "processing",
        "ai_status": "queued",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "data": {
            "title": title,
            "description": description,
            "channel": channel,
            "file_name": file.filename if file else None,
        },
        "note": "Database and AI/ML integrations will be added later by teammates",
    }


def queue_grievance_ai(
    background_tasks: Optional[BackgroundTasks],
    grievance_id: str,
    title: str,
    description: str,
) -> None:
    if background_tasks is None:
        return
    background_tasks.add_task(run_ai_pipeline, grievance_id, f"{title}\n{description}")