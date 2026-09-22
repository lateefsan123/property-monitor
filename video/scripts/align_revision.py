"""Measure narration word times for the revised visual cues and optional captions."""
from pathlib import Path
import json,sys
from faster_whisper import WhisperModel

ROOT=Path(__file__).resolve().parents[2]
EDIT='whatsapp' if '--whatsapp' in sys.argv else 'fresh' if '--fresh' in sys.argv else 'revised'
OUT=ROOT/f'video/review/{EDIT}'
OUT.mkdir(parents=True,exist_ok=True)
rows=json.loads((OUT/'narration.json').read_text(encoding='utf-8'))
model=WhisperModel('base.en',device='cpu',compute_type='int8',cpu_threads=6)
for row in rows:
    target=OUT/f'words-{row["id"]}.json'
    if target.exists():continue
    source=ROOT/'video/assets/accurate/public/workflow'/row['source']
    segments,info=model.transcribe(str(source),word_timestamps=True,beam_size=5,initial_prompt=row['text'])
    words=[dict(word=w.word.strip(),start=w.start,end=w.end) for s in segments for w in s.words]
    target.write_text(json.dumps(words,indent=2)+'\n',encoding='utf-8')
    print(row['id'], ' '.join(f'{w["start"]:.2f}:{w["word"]}' for w in words),flush=True)
