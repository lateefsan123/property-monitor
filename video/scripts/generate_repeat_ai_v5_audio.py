"""36-second narration-only mix. Intentionally no clicks, pencil sounds or music."""
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000
LINES = [
    (.45, 4.8, 'A price drops. A seller calls. Another follow-up.'),
    (5.5, 2.5, 'It all adds up.'),
    (8.9, 5.8, 'Repeat AI brings the signals together, for a better conversation.'),
    (15.5, 5.5, 'Keep the update relevant. Review your message, and make it your own.'),
    (22.0, 5.5, 'Keep every seller, every note, and the next step together.'),
    (28.3, 3.3, 'Less chasing. More timely conversations.'),
    (32.1, 3.6, 'Repeat AI. Seller follow-up, done properly.'),
]

def main():
    pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    mix = np.zeros(SR * 36, dtype=np.float32)
    for start, budget, text in LINES:
        speed = 1.02
        voice = np.concatenate([np.asarray(part.audio) for part in pipeline(text, voice='af_heart', speed=speed)])
        if len(voice) / SR > budget:
            speed *= len(voice) / SR / budget + .025
            voice = np.concatenate([np.asarray(part.audio) for part in pipeline(text, voice='af_heart', speed=speed)])
        assert len(voice) / SR <= budget, text
        begin = round(start * SR)
        mix[begin:begin+len(voice)] += voice * .85
        print(f'{start}: {len(voice)/SR:.2f}s — {text}', flush=True)
    mix *= min(1.2, .8 / max(float(np.max(np.abs(mix))), .01))
    out = Path(__file__).resolve().parents[2] / 'public/video/repeat-ai-v5/voice-only.wav'
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, mix, SR, subtype='PCM_16')
    print(out)

if __name__ == '__main__':
    main()
