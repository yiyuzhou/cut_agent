import os
import subprocess
import tempfile
import uuid
from typing import Callable

from models import CutSegment, SubtitleEntry


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _write_srt(subtitles: list[SubtitleEntry], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for sub in subtitles:
            f.write(f"{sub.index}\n")
            f.write(f"{_format_srt_time(sub.start)} --> {_format_srt_time(sub.end)}\n")
            f.write(f"{sub.text}\n\n")


def _build_select_filter(cuts: list[CutSegment], duration: float) -> tuple[str, str]:
    """Build ffmpeg select/aselect filter expressions to keep non-cut segments."""
    enabled_cuts = sorted([c for c in cuts if c.enabled], key=lambda c: c.start)

    keep_intervals: list[tuple[float, float]] = []
    cursor = 0.0
    for cut in enabled_cuts:
        if cut.start > cursor:
            keep_intervals.append((cursor, cut.start))
        cursor = max(cursor, cut.end)
    if cursor < duration:
        keep_intervals.append((cursor, duration))

    if not keep_intervals:
        return "select=1", "aselect=1"

    parts = "+".join(
        f"between(t,{s:.3f},{e:.3f})" for s, e in keep_intervals
    )
    return f"select='{parts}',setpts=N/FRAME_RATE/TB", f"aselect='{parts}',asetpts=N/SR/TB"


def export_video(
    video_path: str,
    cuts: list[CutSegment],
    subtitles: list[SubtitleEntry],
    music_path: str | None,
    music_volume: float,
    progress_cb: Callable[[float], None],
) -> str:
    tmp_dir = os.path.join(os.path.dirname(__file__), "../../tmp")
    os.makedirs(tmp_dir, exist_ok=True)

    # Get video duration
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True,
    )
    duration = float(probe.stdout.strip() or "0")

    srt_path = None
    if subtitles:
        srt_path = os.path.join(tmp_dir, f"{uuid.uuid4()}.srt")
        _write_srt(subtitles, srt_path)

    output_path = os.path.join(tmp_dir, f"export_{uuid.uuid4()}.mp4")

    vf, af = _build_select_filter(cuts, duration)

    # Build filter graph
    inputs = ["-i", video_path]

    if srt_path:
        # Embed subtitle burn with improved styling
        escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        video_chain = (
            f"[0:v]{vf},"
            f"subtitles='{escaped}':force_style='FontSize=20,PrimaryColour=&H00FFFFFF,"
            f"OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=40'"
            f"[vout]"
        )
    else:
        video_chain = f"[0:v]{vf}[vout]"

    filter_parts = [video_chain, f"[0:a]{af}[aout_raw]"]

    if music_path:
        inputs += ["-i", music_path]
        vol = max(0.0, min(1.0, music_volume))
        filter_parts.append(f"[1:a]volume={vol:.2f},aloop=loop=-1:size=2e+09[music]")
        filter_parts.append(f"[aout_raw][music]amix=inputs=2:duration=first[aout]")
    else:
        filter_parts.append(f"[aout_raw]acopy[aout]")

    filter_complex = ";".join(filter_parts)

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "[aout]",
    ]

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]

    progress_cb(0.0)
    proc = subprocess.Popen(
        cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace"
    )

    # Parse ffmpeg progress from stderr
    time_re = __import__("re").compile(r"time=(\d+):(\d+):([\d.]+)")
    for line in proc.stderr:
        m = time_re.search(line)
        if m and duration > 0:
            elapsed = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
            progress_cb(min(99.0, elapsed / duration * 100))

    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg export failed (code {proc.returncode})")

    if srt_path and os.path.exists(srt_path):
        os.remove(srt_path)

    progress_cb(100.0)
    return output_path
