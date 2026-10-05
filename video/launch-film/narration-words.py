"""python narration-words.py AUDIO [--script dialogue-natural-v4.txt] [--offset 0.5]

Word timings for a narration file or a finished film (local faster-whisper), written
to out/<name>.words.json. app-pacing.mjs cues follow these times. With --script,
checks that every scripted word is heard, in order; --offset shifts the script's
expected start when AUDIO is the film rather than the bare take.
"""
import argparse, difflib, json, re, sys
from pathlib import Path
from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument('audio')
parser.add_argument('--script')
parser.add_argument('--offset', type=float, default=0)
parser.add_argument('--model', default='large-v3-turbo')
args = parser.parse_args()

model = WhisperModel(args.model, device='cpu', compute_type='int8')
segments, _ = model.transcribe(args.audio, word_timestamps=True, beam_size=5, language='en')
words = [dict(word=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3)) for s in segments for w in s.words]
target = Path(__file__).parent / 'out' / f'{Path(args.audio).stem}.words.json'
target.write_text(json.dumps(words, indent=1), encoding='utf-8')
print(f'{len(words)} words, {words[0]["start"]:.2f}-{words[-1]["end"]:.2f}s -> {target}')

if args.script:
    # Spellings and numbers the recogniser writes differently from the script.
    same = {'due': 'do', 'specialise': 'specialize', 'forty': '40', 'thousand': '000'}
    def tokens(text):
        text = re.sub(r'two thousand', '2 000', text.lower()).replace(',000', ' 000').replace('-', ' ')
        return [same.get(t, t) for t in re.findall(r"[a-z0-9']+", text)]
    script = tokens(Path(args.script).read_text(encoding='utf-8'))
    heard = tokens(' '.join(w['word'] for w in words))
    problems = [op for op in difflib.SequenceMatcher(a=script, b=heard, autojunk=False).get_opcodes() if op[0] != 'equal']
    for tag, a0, a1, b0, b1 in problems:
        print(f'  {tag}: script "{" ".join(script[a0:a1])}" / heard "{" ".join(heard[b0:b1])}"')
    first = words[0]['start'] - args.offset
    print(f'{len(script)} scripted words, {len(problems)} differences; speech starts {first:+.2f}s from the expected start')
    sys.exit(1 if problems else 0)
