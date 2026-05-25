import asyncio
import json
import os
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse

from api.job_store import job_store
from models import ExportRequest, JobStatus
from services.exporter import export_video

router = APIRouter()

export_store: dict = {}

MUSIC_DIR = os.path.join(os.path.dirname(__file__), "../../music")


@router.post("/export/{job_id}")
async def start_export(job_id: str, req: ExportRequest):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    export_id = str(uuid.uuid4())
    export_store[export_id] = {"status": "pending", "progress": 0, "output_path": None}

    music_path = None
    if req.music_id:
        catalog_path = os.path.join(MUSIC_DIR, "catalog.json")
        with open(catalog_path) as f:
            catalog = json.load(f)
        track = next((t for t in catalog if t["id"] == req.music_id), None)
        if track:
            music_path = os.path.join(MUSIC_DIR, track["file"])

    asyncio.create_task(
        _run_export(export_id, job, req, music_path)
    )

    return {"export_id": export_id}


async def _run_export(export_id: str, job, req: ExportRequest, music_path):
    try:
        export_store[export_id]["status"] = "exporting"

        def progress_cb(pct: float):
            export_store[export_id]["progress"] = pct

        output_path = await asyncio.to_thread(
            export_video,
            job.video_path,
            req.cuts,
            job.subtitles if req.include_subtitles else [],
            music_path,
            req.music_volume,
            progress_cb,
        )
        export_store[export_id]["output_path"] = output_path
        export_store[export_id]["status"] = "done"
        export_store[export_id]["progress"] = 100
    except Exception as e:
        export_store[export_id]["status"] = "error"
        export_store[export_id]["error"] = str(e)


async def export_progress_stream(export_id: str):
    while True:
        state = export_store.get(export_id)
        if not state:
            yield f"data: {json.dumps({'error': 'not found'})}\n\n"
            return
        yield f"data: {json.dumps({'status': state['status'], 'progress': state['progress']})}\n\n"
        if state["status"] in ("done", "error"):
            return
        await asyncio.sleep(0.5)


@router.get("/export/progress/{export_id}")
async def get_export_progress(export_id: str):
    if export_id not in export_store:
        raise HTTPException(status_code=404, detail="Export not found")
    return StreamingResponse(
        export_progress_stream(export_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/export/download/{export_id}")
async def download_export(export_id: str):
    state = export_store.get(export_id)
    if not state or state["status"] != "done":
        raise HTTPException(status_code=404, detail="Export not ready")
    return FileResponse(
        state["output_path"],
        media_type="video/mp4",
        filename="edited_vlog.mp4",
    )


@router.get("/music")
async def list_music():
    catalog_path = os.path.join(MUSIC_DIR, "catalog.json")
    if not os.path.exists(catalog_path):
        return {"tracks": []}
    with open(catalog_path) as f:
        catalog = json.load(f)
    return {"tracks": catalog}


@router.get("/music/{track_id}/preview")
async def preview_music(track_id: str):
    catalog_path = os.path.join(MUSIC_DIR, "catalog.json")
    with open(catalog_path) as f:
        catalog = json.load(f)
    track = next((t for t in catalog if t["id"] == track_id), None)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    file_path = os.path.join(MUSIC_DIR, track["file"])
    return FileResponse(file_path, media_type="audio/mpeg")
