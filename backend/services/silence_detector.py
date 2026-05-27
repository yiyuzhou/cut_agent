import re
import subprocess
from models import CutSegment, CutType, CutSource
import uuid


def detect_silence(video_path: str, noise_db: float = -30, min_duration: float = 1.0) -> list[CutSegment]:
    cmd = [
        "ffmpeg", "-i", video_path,
        "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
        "-f", "null", "-"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    output = result.stderr

    cuts = []
    starts = re.findall(r"silence_start: ([\d.]+)", output)
    ends = re.findall(r"silence_end: ([\d.]+)", output)

    for s, e in zip(starts, ends):
        start, end = float(s), float(e)
        duration = end - start
        if duration >= 0.5:
            cuts.append(CutSegment(
                id=str(uuid.uuid4()),
                start=start,
                end=end,
                type=CutType.silence,
                source=CutSource.silence_detection,
                confidence=1.0,
                transcript_text=f"[{duration:.1f}秒静音]",
                reasoning=f"检测到{duration:.1f}秒的静音段，属于无效空白，建议剪掉以保持视频节奏紧凑。",
                enabled=True,
            ))

    return cuts
