import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import subprocess
import json

from models import Job, JobStatus
from api.job_store import job_store

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../tmp")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_video_duration(video_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", video_path
        ],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])


@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="只支持视频文件")

    job_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1] or ".mp4"
    video_path = os.path.join(UPLOAD_DIR, f"{job_id}{ext}")

    async with aiofiles.open(video_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    try:
        duration = get_video_duration(video_path)
    except Exception:
        duration = None

    job = Job(job_id=job_id, video_path=video_path, status=JobStatus.uploading, duration=duration)
    job_store[job_id] = job

    return {"job_id": job_id, "duration": duration, "filename": file.filename}
