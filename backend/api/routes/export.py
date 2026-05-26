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
        with open(catalog_path, encoding="utf-8") as f:
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
        import traceback
        traceback.print_exc()
        export_store[export_id]["status"] = "error"
        export_store[export_id]["error"] = str(e)


async def export_progress_stream(export_id: str):
    while True:
        state = export_store.get(export_id)
        if not state:
            yield f"data: {json.dumps({'error': 'not found'})}\n\n"
            return
        msg = {'status': state['status'], 'progress': state['progress']}
        if state.get('error'):
            msg['error'] = state['error']
        yield f"data: {json.dumps(msg)}\n\n"
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


@router.post("/preview/{job_id}")
async def preview_video(job_id: str, req: ExportRequest):
    """Apply cuts and return a preview video for inline playback."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    output_path = await asyncio.to_thread(
        export_video,
        job.video_path,
        req.cuts,
        [],  # no subtitles in preview
        None,  # no music in preview
        0.0,
        lambda pct: None,
    )
    return FileResponse(
        output_path,
        media_type="video/mp4",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/music")
async def list_music():
    catalog_path = os.path.join(MUSIC_DIR, "catalog.json")
    if not os.path.exists(catalog_path):
        return {"tracks": []}
    with open(catalog_path, encoding="utf-8") as f:
        catalog = json.load(f)
    return {"tracks": catalog}


@router.get("/music/{track_id}/preview")
async def preview_music(track_id: str):
    catalog_path = os.path.join(MUSIC_DIR, "catalog.json")
    with open(catalog_path, encoding="utf-8") as f:
        catalog = json.load(f)
    track = next((t for t in catalog if t["id"] == track_id), None)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    # Serve short preview clip if available, otherwise full track
    preview_file = track["file"].replace(".mp3", "_preview.mp3")
    preview_path = os.path.join(MUSIC_DIR, preview_file)
    if os.path.exists(preview_path):
        return FileResponse(preview_path, media_type="audio/mpeg")
    file_path = os.path.join(MUSIC_DIR, track["file"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Music file not found")
    return FileResponse(file_path, media_type="audio/mpeg")
