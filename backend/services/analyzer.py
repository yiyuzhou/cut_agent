import json
import os
import uuid

from openai import OpenAI

from models import CutSegment, CutSource, CutType, TranscriptSegment

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)

_TOOL = {
    "type": "function",
    "function": {
        "name": "report_cuts",
        "description": "Report segments of the transcript that should be cut from the final video.",
        "parameters": {
            "type": "object",
            "properties": {
                "cuts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "number", "description": "Start time in seconds"},
                            "end": {"type": "number", "description": "End time in seconds"},
                            "type": {
                                "type": "string",
                                "enum": ["filler", "repetition", "pause", "off_topic"],
                            },
                            "confidence": {"type": "number", "description": "0.0 to 1.0"},
                            "transcript_text": {"type": "string", "description": "The text of the segment"},
                        },
                        "required": ["start", "end", "type", "confidence", "transcript_text"],
                    },
                }
            },
            "required": ["cuts"],
        },
    },
}

_SYSTEM = """You are a professional video editor assistant specializing in vlog content.
Analyze the provided transcript and identify segments that should be cut to improve video quality.

Cut these types of segments:
- filler: Filler words/sounds like "um", "uh", "er", "那个", "就是", "然后然后", repeated hesitation sounds
- repetition: Repeated phrases or sentences where the speaker restates the same idea
- pause: Long awkward pauses or dead air (indicated by gaps in timestamps)
- off_topic: Tangents clearly unrelated to the main vlog content

Keep natural speech rhythm. Only cut segments that genuinely hurt the viewing experience.
Be conservative — when in doubt, keep the segment."""


def analyze_transcript(transcript: list[TranscriptSegment]) -> list[CutSegment]:
    if not transcript:
        return []

    lines = [f"[{seg.start:.2f}s - {seg.end:.2f}s] {seg.text}" for seg in transcript]
    transcript_text = "\n".join(lines)

    response = client.chat.completions.create(
        model="deepseek-v4-pro",
        max_tokens=4096,
        tools=[_TOOL],
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"Here is the transcript to analyze:\n\n{transcript_text}"},
        ],
    )

    message = response.choices[0].message
    if not message.tool_calls:
        return []

    for tool_call in message.tool_calls:
        if tool_call.function.name == "report_cuts":
            raw_cuts = json.loads(tool_call.function.arguments).get("cuts", [])
            cuts = []
            for c in raw_cuts:
                try:
                    cut_type = CutType(c["type"])
                except ValueError:
                    cut_type = CutType.filler
                cuts.append(
                    CutSegment(
                        id=str(uuid.uuid4()),
                        start=float(c["start"]),
                        end=float(c["end"]),
                        type=cut_type,
                        source=CutSource.ai,
                        confidence=float(c.get("confidence", 0.8)),
                        transcript_text=c.get("transcript_text", ""),
                        enabled=True,
                    )
                )
            return cuts

    return []
