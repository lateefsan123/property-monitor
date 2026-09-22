from pathlib import Path
import json
from faster_whisper import WhisperModel

ROOT=Path(__file__).resolve().parents[3]
audio=ROOT/'video/assets/launch/public/narration.mp3'
model=WhisperModel('base.en',device='cpu',compute_type='int8')
segments, info=model.transcribe(str(audio),word_timestamps=True,beam_size=5)
words=[dict(word=w.word.strip(),start=w.start,end=w.end) for s in segments for w in s.words]
(ROOT/'video/src/launch/words.json').write_text(json.dumps(words,indent=2),encoding='utf-8')
for w in words: print(f"{w['start']:6.2f} {w['word']}",flush=True)
