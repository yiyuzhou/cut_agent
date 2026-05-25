import whisper
from models import TranscriptSegment, SubtitleEntry


def transcribe_video(video_path: str) -> tuple[list[TranscriptSegment], list[SubtitleEntry]]:
    model = whisper.load_model("base")
    result = model.transcribe(video_path, word_timestamps=False)

    transcript = []
    subtitles = []

    for i, seg in enumerate(result["segments"]):
        transcript.append(TranscriptSegment(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
        ))
        subtitles.append(SubtitleEntry(
            index=i + 1,
            start=seg["start"],
            end=seg["end"],
            text=seg["text"].strip(),
        ))

    return transcript, subtitles
