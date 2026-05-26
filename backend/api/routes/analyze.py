import asyncio
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.job_store import job_store
from models import JobStatus
from services.transcriber import transcribe_video
from services.silence_detector import detect_silence
from services.analyzer import analyze_transcript
from services.cut_merger import merge_cuts

router = APIRouter()


async def analysis_stream(job_id: str):
    job = job_store.get(job_id)
    if not job:
        yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
        return

    try:
        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 0})}\n\n"
        job.status = JobStatus.transcribing

        # 转录期间每 3 秒发一次心跳，防止浏览器断开连接
        transcribe_task = asyncio.create_task(
            asyncio.to_thread(transcribe_video, job.video_path)
        )
        while not transcribe_task.done():
            await asyncio.sleep(3)
            if not transcribe_task.done():
                yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 0, 'heartbeat': True})}\n\n"

        transcript, subtitles = await transcribe_task
        job.transcript = transcript
        job.subtitles = subtitles

        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 100})}\n\n"
        yield f"data: {json.dumps({'stage': 'analyzing', 'progress': 0})}\n\n"
        job.status = JobStatus.analyzing

        silence_task = asyncio.create_task(asyncio.to_thread(detect_silence, job.video_path))
        ai_task = asyncio.create_task(asyncio.to_thread(analyze_transcript, transcript))
        while not silence_task.done() or not ai_task.done():
            await asyncio.sleep(3)
            if not silence_task.done() or not ai_task.done():
                yield f"data: {json.dumps({'stage': 'analyzing', 'progress': 0, 'heartbeat': True})}\n\n"

        silence_cuts = silence_task.result()
        ai_cuts = ai_task.result()

        yield f"data: {json.dumps({'stage': 'analyzing', 'progress': 100})}\n\n"

        merged = merge_cuts(silence_cuts, ai_cuts)
        job.cuts = merged
        job.status = JobStatus.ready

        yield f"data: {json.dumps({'stage': 'done', 'cuts_count': len(merged)})}\n\n"

    except Exception as e:
        job.status = JobStatus.error
        job.error = str(e)
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@router.get("/analyze/{job_id}")
async def analyze(job_id: str):
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    return StreamingResponse(
        analysis_stream(job_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/cuts/{job_id}")
async def get_cuts(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in (JobStatus.ready, JobStatus.exporting, JobStatus.done):
        raise HTTPException(status_code=400, detail=f"Job not ready: {job.status}")
    return {
        "cuts": [c.model_dump() for c in job.cuts],
        "subtitles": [s.model_dump() for s in job.subtitles],
        "transcript": [t.model_dump() for t in job.transcript],
        "duration": job.duration,
    }
