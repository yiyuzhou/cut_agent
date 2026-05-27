import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.job_store import job_store
from models import JobStatus
from services.transcriber import transcribe_video
from services.silence_detector import detect_silence
from services.analyzer import analyze_transcript
from services.cut_merger import merge_cuts

logger = logging.getLogger(__name__)

router = APIRouter()


async def analysis_stream(job_id: str):
    job = job_store.get(job_id)
    if not job:
        yield f"data: {json.dumps({'error': 'job not found'})}\n\n"
        return

    try:
        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 0, 'status': '正在加载 Whisper 模型...'})}\n\n"
        job.status = JobStatus.transcribing

        transcribe_task = asyncio.create_task(
            asyncio.to_thread(transcribe_video, job.video_path)
        )
        elapsed = 0
        while not transcribe_task.done():
            await asyncio.sleep(2)
            elapsed += 2
            if not transcribe_task.done():
                pct = min(int(elapsed / max(job.duration * 0.1, 30) * 100), 90)
                yield f"data: {json.dumps({'stage': 'transcribing', 'progress': pct, 'status': '语音转录中...'})}\n\n"

        transcript, subtitles = await transcribe_task
        job.transcript = transcript
        job.subtitles = subtitles

        yield f"data: {json.dumps({'stage': 'transcribing', 'progress': 100, 'status': '转录完成'})}\n\n"
        yield f"data: {json.dumps({'stage': 'analyzing', 'progress': 0, 'status': '正在分析...'})}\n\n"
        job.status = JobStatus.analyzing

        silence_task = asyncio.create_task(asyncio.to_thread(detect_silence, job.video_path))
        ai_task = asyncio.create_task(asyncio.to_thread(analyze_transcript, transcript))
        elapsed = 0
        while not silence_task.done() or not ai_task.done():
            await asyncio.sleep(2)
            elapsed += 2
            if not silence_task.done() or not ai_task.done():
                pct = min(int(elapsed / 60 * 100), 90)
                status = '静音检测 + AI 分析中...' if elapsed < 10 else 'AI 正在深度分析转录文本...'
                yield f"data: {json.dumps({'stage': 'analyzing', 'progress': pct, 'status': status})}\n\n"

        try:
            silence_cuts = silence_task.result()
        except Exception as e:
            logger.exception("Silence detection failed")
            raise RuntimeError(f"静音检测失败: {e}") from e

        try:
            ai_cuts = ai_task.result()
        except Exception as e:
            logger.exception("AI analysis failed")
            raise RuntimeError(f"AI 分析失败: {e}") from e

        yield f"data: {json.dumps({'stage': 'analyzing', 'progress': 100})}\n\n"

        merged = merge_cuts(silence_cuts, ai_cuts)
        job.cuts = merged
        job.status = JobStatus.ready

        yield f"data: {json.dumps({'stage': 'done', 'cuts_count': len(merged)})}\n\n"

    except Exception as e:
        logger.exception("Analysis stream error for job %s", job_id)
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
