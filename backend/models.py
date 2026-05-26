from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum


class CutType(str, Enum):
    silence = "silence"
    repetition = "repetition"
    filler = "filler"
    off_topic = "off_topic"
    pause = "pause"


class CutSource(str, Enum):
    ai = "ai"
    silence_detection = "silence_detection"
    user = "user"


class CutSegment(BaseModel):
    id: str
    start: float
    end: float
    type: CutType
    source: CutSource
    confidence: float = 1.0
    transcript_text: Optional[str] = None
    reasoning: Optional[str] = None
    enabled: bool = True


class SubtitleEntry(BaseModel):
    index: int
    start: float
    end: float
    text: str


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class MusicTrack(BaseModel):
    id: str
    title: str
    duration: int
    bpm: Optional[int] = None
    mood: str
    file: str


class JobStatus(str, Enum):
    uploading = "uploading"
    transcribing = "transcribing"
    analyzing = "analyzing"
    ready = "ready"
    exporting = "exporting"
    done = "done"
    error = "error"


class Job(BaseModel):
    job_id: str
    video_path: str
    status: JobStatus = JobStatus.uploading
    duration: Optional[float] = None
    transcript: list[TranscriptSegment] = []
    cuts: list[CutSegment] = []
    subtitles: list[SubtitleEntry] = []
    error: Optional[str] = None


class ExportRequest(BaseModel):
    cuts: list[CutSegment]
    music_id: Optional[str] = None
    music_volume: float = 0.15
    include_subtitles: bool = True
