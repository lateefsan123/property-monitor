"""Check the final encoded read and create captions from its word timings."""
from pathlib import Path
import argparse,difflib,json,re

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'video/review/launch-refined'
parser=argparse.ArgumentParser();parser.add_argument('--reuse-transcript',action='store_true');args=parser.parse_args()
movie=OUT/'repeat-ai-refined.mp4'; transcript=OUT/'encoded-transcript.json'
if not args.reuse_transcript:
    from faster_whisper import WhisperModel
    model=WhisperModel('small.en',device='cpu',compute_type='int8')
    segments,_=model.transcribe(str(movie),word_timestamps=True,beam_size=5)
    words=[dict(word=w.word.strip(),start=w.start,end=w.end) for seg in segments for w in seg.words]
    transcript.write_text(json.dumps(words,indent=2),encoding='utf-8')
else:
    assert transcript.stat().st_mtime>=movie.stat().st_mtime,'Transcript predates export'
    words=json.loads(transcript.read_text(encoding='utf-8'))
script=json.loads((HERE/'script.json').read_text(encoding='utf-8'))
expected=' '.join(row['text'] for row in script)
observed=' '.join(w['word'] for w in words)
def norm(text):
    text=text.lower().replace('repeat a i dot org','repeat ai org').replace('repeatai','repeat ai').replace('chatgpt','chat gpt').replace("they're",'their').replace('follow-ups','follow-up')
    return re.findall(r'[a-z0-9]+',text)
a,b=norm(expected),norm(observed)
differences=[{'expected':a[i:j],'observed':b[k:l]} for op,i,j,k,l in difflib.SequenceMatcher(None,a,b,autojunk=False).get_opcodes() if op!='equal']
assert not differences,differences

def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
captions=[];group=[]
for word in words:
    item=dict(word)
    item['word']=item['word'].replace("they're",'their')
    if item['word'].lower()=='repeat': item['word']='Repeat'
    group.append(item)
    if len(group)>=8 or re.search(r'[.!?]$',item['word']):
        text=' '.join(w['word'] for w in group).replace('follow -up','follow-up').replace('repeatai .org','repeatai.org')
        captions.append(f"{len(captions)+1}\n{stamp(group[0]['start'])} --> {stamp(group[-1]['end'])}\n{text}\n")
        group=[]
if group: captions.append(f"{len(captions)+1}\n{stamp(group[0]['start'])} --> {stamp(group[-1]['end'])}\n{' '.join(w['word'] for w in group)}\n")
(OUT/'repeat-ai-refined.srt').write_text('\n'.join(captions),encoding='utf-8')
report={'scriptWordCount':len(expected.split()),'normalizedScriptMatchesEncodedTranscript':True,'normalizations':['URL spelling','ChatGPT tokenization','their/they\u0027re homophone','follow-up/follow-ups ASR number variation'],'sourceSamplesTrimmed':0,'visualReview':'Independent reviewer passed corrected stills and sampled encoded transitions/actions.','visualSamples':[430,560,1140,1330,1360,1430,1510,1603,1612,1625,1710,1830],'audioPerceptuallyAuditioned':False,'captions':'Timed from final encoded word timestamps; homophone/spelling cleanup only.'}
(OUT/'final-review.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
