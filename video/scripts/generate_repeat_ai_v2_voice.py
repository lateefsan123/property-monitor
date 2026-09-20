from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline


SAMPLE_RATE = 24_000
VOICE = "af_heart"
SPEED = 1.0

LINES = [
    "Seller follow-up gets complicated fast. One property update, three spreadsheets, and a WhatsApp thread you meant to reply to yesterday.",
    "Repeat AI turns that noise into a clear signal: what changed, which seller it matters to, and what to do next.",
    "Start the day knowing exactly what needs attention. Follow-ups due, messages sent, and fresh activity across the buildings you watch.",
    "See new listings, price drops, and status changes without rebuilding the picture every morning.",
    "Every seller keeps their property, notes, status, and next step together, so the context is there when you need it.",
    "Turn the update into a useful WhatsApp message. Reach the right seller while the signal is still fresh.",
    "Less chasing. Less admin. More timely conversations, with your seller data kept private to your account.",
    "Repeat AI. Seller follow-up, done properly.",
]


def render_line(pipeline: KPipeline, text: str) -> np.ndarray:
    chunks = [np.asarray(audio, dtype=np.float32) for _, _, audio in pipeline(text, voice=VOICE, speed=SPEED)]
    if not chunks:
        raise RuntimeError(f"Kokoro produced no audio for: {text}")
    if len(chunks) == 1:
        return chunks[0]
    gap = np.zeros(int(SAMPLE_RATE * 0.08), dtype=np.float32)
    parts: list[np.ndarray] = []
    for index, chunk in enumerate(chunks):
        if index:
            parts.append(gap)
        parts.append(chunk)
    return np.concatenate(parts)


def main() -> None:
    output_dir = Path(__file__).resolve().parents[1] / "audio" / "repeat-ai-v2"
    output_dir.mkdir(parents=True, exist_ok=True)
    pipeline = KPipeline(lang_code="a")

    for index, line in enumerate(LINES, start=1):
        audio = render_line(pipeline, line)
        peak = float(np.max(np.abs(audio)))
        if peak > 0:
            audio = audio * min(1.0, 0.89 / peak)
        path = output_dir / f"{index:02d}-narration.wav"
        sf.write(path, audio, SAMPLE_RATE, subtype="PCM_16")
        print(f"{path.name}\t{len(audio) / SAMPLE_RATE:.2f}s")


if __name__ == "__main__":
    main()
