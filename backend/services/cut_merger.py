from models import CutSegment, CutSource, CutType
import uuid


def merge_cuts(silence_cuts: list[CutSegment], ai_cuts: list[CutSegment]) -> list[CutSegment]:
    all_cuts = silence_cuts + ai_cuts
    if not all_cuts:
        return []

    # Sort by start time
    all_cuts.sort(key=lambda c: c.start)

    merged: list[CutSegment] = []
    for cut in all_cuts:
        if cut.end - cut.start < 0.5:
            continue
        if merged and cut.start < merged[-1].end:
            # Overlapping — extend the previous cut
            prev = merged[-1]
            merged[-1] = CutSegment(
                id=prev.id,
                start=prev.start,
                end=max(prev.end, cut.end),
                type=prev.type,
                source=CutSource.silence_detection if prev.source == CutSource.silence_detection and cut.source == CutSource.silence_detection else CutSource.ai,
                confidence=max(prev.confidence, cut.confidence),
                transcript_text=prev.transcript_text or cut.transcript_text,
                reasoning=prev.reasoning or cut.reasoning,
                enabled=True,
            )
        else:
            merged.append(CutSegment(
                id=cut.id,
                start=cut.start,
                end=cut.end,
                type=cut.type,
                source=cut.source,
                confidence=cut.confidence,
                transcript_text=cut.transcript_text,
                reasoning=cut.reasoning,
                enabled=cut.enabled,
            ))

    return merged
