"""Generate a scene-timed voice and quiet original pencil/click sounds."""
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/video/repeat-ai-v3/opening-audio.wav'
SR = 24000
LINES = [
    (0.45, 4.8, 'A price drops. A seller calls. Another follow-up.'),
    (5.5, 2.5, 'It all adds up.'),
    (8.9, 5.8, 'Repeat AI brings the signals together, for a better conversation.'),
]

def main():
    pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    mix = np.zeros(SR * 15, dtype=np.float32)
    for start, budget, line in LINES:
        speed = 1.02
        parts = list(pipeline(line, voice='af_heart', speed=speed))
        voice = np.concatenate([np.asarray(item.audio) for item in parts])
        if len(voice) / SR > budget:
            speed *= (len(voice) / SR) / budget + .025
            voice = np.concatenate([np.asarray(item.audio) for item in pipeline(line, voice='af_heart', speed=speed)])
        if len(voice) / SR > budget:
            raise RuntimeError('Narration exceeds its scene')
        begin = round(start * SR)
        mix[begin:begin+len(voice)] += voice * .85
        print(f'{start}s: {len(voice)/SR:.2f}s / {budget}s — {line}', flush=True)
    rng = np.random.default_rng(41)
    for start in [0, .8, 1.6, 2.56, 3.46, 4.4]:
        n = int(SR * .32)
        t = np.arange(n) / SR
        pencil = np.diff(rng.normal(size=n+1)).astype(np.float32)
        pencil *= np.sin(np.pi * t / .32) ** 2 * .009
        begin = int((start + .12) * SR)
        mix[begin:begin+n] += pencil
    for start, freq in [(8.05, 440), (8.32, 510), (8.59, 590), (10.3, 690), (14.3, 880)]:
        n = int(SR*.12)
        t = np.arange(n)/SR
        click = np.sin(2*np.pi*freq*t)*np.exp(-t*50)*.035
        begin = int(start*SR)
        mix[begin:begin+n] += click
    peak = float(np.max(np.abs(mix)))
    mix *= min(1.2, .8/max(peak, .01))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUT, mix, SR, subtype='PCM_16')
    print(OUT)

if __name__ == '__main__':
    main()
