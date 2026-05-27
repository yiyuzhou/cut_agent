import json
import logging
import os
import uuid

from dotenv import load_dotenv
from openai import OpenAI

from models import CutSegment, CutSource, CutType, TranscriptSegment

logger = logging.getLogger(__name__)

load_dotenv()

_deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY", "")
if not _deepseek_api_key:
    logger.warning("DEEPSEEK_API_KEY is not set — AI analysis will fail")

client = OpenAI(
    api_key=_deepseek_api_key,
    base_url="https://api.deepseek.com",
)

_TOOL = {
    "type": "function",
    "function": {
        "name": "report_cuts",
        "description": "Report segments of the transcript that should be cut from the final video, with detailed reasoning.",
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
                            "reasoning": {"type": "string", "description": "Why this segment should be cut, in Chinese. Explain the specific issue found."},
                        },
                        "required": ["start", "end", "type", "confidence", "transcript_text", "reasoning"],
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

For EACH cut you report, you MUST include a "reasoning" field explaining in Chinese WHY this specific segment should be cut. Be specific — reference the actual content, timing gap, or filler words found. Example: "此处有4.6秒的冗长停顿，位于'是我林晨'和'我想查一下'之间，属于无效等待，建议剪掉以保持节奏紧凑。"

Keep natural speech rhythm. Only cut segments that genuinely hurt the viewing experience.
Be conservative — when in doubt, keep the segment."""


def analyze_transcript(transcript: list[TranscriptSegment]) -> list[CutSegment]:
    if not transcript:
        return []

    if not _deepseek_api_key:
        raise RuntimeError("DEEPSEEK_API_KEY 环境变量未设置，请在 .env 文件中配置后重启后端")

    lines = [f"[{seg.start:.2f}s - {seg.end:.2f}s] {seg.text}" for seg in transcript]
    transcript_text = "\n".join(lines)

    logger.info("Calling DeepSeek API with model deepseek-v4-pro, transcript length: %d chars", len(transcript_text))
    try:
        response = client.chat.completions.create(
            model="deepseek-v4-pro",
            max_tokens=4096,
            tools=[_TOOL],
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": f"Here is the transcript to analyze:\n\n{transcript_text}"},
            ],
        )
    except Exception as e:
        logger.exception("DeepSeek API call failed")
        raise RuntimeError(f"DeepSeek API 调用失败: {e}") from e

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
                start_t = float(c["start"])
                end_t = float(c["end"])
                reasoning = c.get("reasoning") or ""
                if not reasoning:
                    duration = end_t - start_t
                    type_names = {"filler": "口误/语气词", "repetition": "内容重复", "pause": "冗长停顿", "off_topic": "跑题内容"}
                    type_cn = type_names.get(c.get("type", ""), "内容问题")
                    reasoning = f"AI检测到{type_cn}（时长{duration:.1f}秒），建议剪辑以提升视频节奏。"
                cuts.append(
                    CutSegment(
                        id=str(uuid.uuid4()),
                        start=start_t,
                        end=end_t,
                        type=cut_type,
                        source=CutSource.ai,
                        confidence=float(c.get("confidence", 0.8)),
                        transcript_text=c.get("transcript_text", ""),
                        reasoning=reasoning,
                        enabled=True,
                    )
                )
            return cuts

    return []
