"""Storyboard-timed narration; no decorative sound effects. Outputs editable stem."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SR = 24000
LINES = [
    (.10, 3.80, 'Your sellers. Your spreadsheets. A market that never stops.'),
    (4.10, 5.65, 'Keep all your spreadsheets together. Bring your sellers into one organised workspace.'),
    (10.10, 5.50, 'Monitor listings and price changes in the buildings you cover.'),
    (16.10, 5.50, 'See recent sales in their building, so your follow-up has a reason.'),
    (22.10, 5.55, 'Personalise your template. Then send through your connected WhatsApp.'),
    (28.25, 3.50, 'A relevant update. A more useful conversation.'),
    (36.05, 5.55, 'Automate your daily seller follow-ups. Your template. Relevant market context.'),
    (42.05, 5.55, 'Less admin. More informed follow-ups. Repeat AI. Seller follow-up, done properly.'),
]

def main():
    pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
    mix = np.zeros(SR * 48, dtype=np.float32)
    timings = []
    for start, budget, text in LINES:
        speed = 1.0
        def synth():
            return np.concatenate([np.asarray(part.audio) for part in pipeline(text, voice='af_heart', speed=speed)])
        voice = synth()
        # Trim only silent leading/trailing model padding, never internal speech pauses.
        def trim(audio):
            active = np.flatnonzero(np.abs(audio) > .002)
            if not len(active):
                raise RuntimeError('Empty narration')
            return audio[max(0, active[0]-240):min(len(audio),active[-1]+1200)]
        voice = trim(voice)
        if len(voice) / SR > budget:
            speed = len(voice) / SR / budget + .02
            if speed > 1.16:
                raise RuntimeError(f'Shorten copy rather than rushing: {text}')
            voice = trim(synth())
        assert len(voice) / SR <= budget, text
        begin = round(start * SR)
        mix[begin:begin+len(voice)] += voice * .85
        timings.append(dict(start=start,end=start+len(voice)/SR,text=text,speed=speed))
        print(f'{start}: {len(voice)/SR:.2f}s, speed {speed:.2f} — {text}', flush=True)
    mix *= min(1.2, .8 / max(float(np.max(np.abs(mix))), .01))
    out = Path(__file__).resolve().parents[2] / 'public/video/repeat-ai-v6'
    out.mkdir(parents=True, exist_ok=True)
    sf.write(out / 'voice.wav', mix, SR, subtype='PCM_16')
    (out / 'voice-timings.json').write_text(json.dumps(timings, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
