"""Build picture timing from complete narration, retaining every source audio sample.

Unlike the first cut, boundaries are discovered from word alignment AND measured
silence. No source samples are trimmed, faded or time-stretched. Extra read time
is inserted only at verified quiet phrase boundaries.
"""
from pathlib import Path
import difflib, json, math, re, shutil
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
PUBLIC=ROOT/'video/assets/launch-refined/public'
OUT=ROOT/'video/review/launch-refined'
SR=48000
PUBLIC.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
for relative in ['logo.png','property.png','inter.woff2','Inter-LICENSE.txt','desk-film.mp4','workflow/outlook.svg','workflow/polished/claude.svg','workflow/whatsapp/landing-template-art.png']:
    target=PUBLIC/relative;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(ROOT/'video/assets/launch/public'/relative,target)
script=json.loads((HERE/'script.json').read_text())
raw=json.loads((HERE/'words.json').read_text())
voice,sr=sf.read(PUBLIC/'narration.mp3',dtype='float32')
if voice.ndim>1: voice=voice.mean(axis=1)
voice=resample_poly(voice,SR,sr)

def tokens(value):
    value=value.lower().replace('repeat a i dot org','repeat ai org').replace('organised','organized').replace('chatgpt','chat gpt').replace('repeatai','repeat ai')
    return re.findall(r"[a-z0-9]+",value)

observed=[]
for word in raw:
    for token in tokens(word['word']): observed.append({**word,'token':token})
expected=[]
for index,row in enumerate(script):
    expected.extend({'token':token,'scene':index} for token in tokens(row['text']))
matcher=difflib.SequenceMatcher(None,[x['token'] for x in expected],[x['token'] for x in observed],autojunk=False)
aligned={}
for block in matcher.get_matching_blocks():
    for k in range(block.size): aligned[block.a+k]=observed[block.b+k]
missing=[x['token'] for i,x in enumerate(expected) if i not in aligned]
(OUT/'narration-alignment.json').write_text(json.dumps({'expectedWords':len(expected),'matchedWords':len(aligned),'unmatched':missing,'transcript':' '.join(w['word'] for w in raw)},indent=2))
# Never silently construct missing speech from canonical captions.
assert len(missing)<=5, f'Narration needs review: {missing}'
groups=[]
for index,row in enumerate(script):
    indices=[i for i,x in enumerate(expected) if x['scene']==index]
    matches=[aligned[i] for i in indices if i in aligned]
    assert len(matches)>=len(indices)-3,(row['id'],'Unreliable alignment')
    groups.append(matches)

cuts=[0]; quiet=[]
for i in range(1,len(groups)):
    following=groups[i][0]['start']
    # Include unmatched ASR spellings between anchors (e.g. Claude -> Clod).
    previous=max(w['end'] for w in raw if groups[i-1][0]['start']<=w['start']<following)
    lo=round(max(0,previous-.08)*SR)
    # Whisper can attach the following word to preceding silence (e.g. "at").
    # Search that lead-in too, but never past its reported end.
    hi=round(min(following+.24,max(following+.03,groups[i][0]['end']-.08))*SR)
    # A 40ms quiet window protects consonants from arbitrary sentence slicing.
    win=round(.04*SR)
    candidates=range(lo,max(lo+1,hi-win),round(.002*SR))
    position=min(candidates,key=lambda p:float(np.mean(voice[p:p+win]**2)))
    rms=float(np.sqrt(np.mean(voice[position:position+win]**2)))
    assert rms<.012, f'No safe phrase break before {script[i]["id"]}: RMS {rms:.5f}'
    cut=position+win//2
    cuts.append(cut);quiet.append({'before':script[i]['id'],'sourceTime':cut/SR,'windowRmsDb':20*math.log10(max(rms,1e-9))})
cuts.append(len(voice))

parts=[]; scenes=[]; frame=0; captions=[]
for i,row in enumerate(script):
    clip=voice[cuts[i]:cuts[i+1]]
    lead=.24 if i else .3
    duration=max(row['minimum'],len(clip)/SR+lead+.32)
    frames=math.ceil(duration*30);piece=np.zeros(frames*SR//30,dtype=np.float32)
    offset=round(lead*SR);piece[offset:offset+len(clip)]=clip
    # Bit-identical decoded samples retained through assembly, with no fades.
    assert np.array_equal(piece[offset:offset+len(clip)],clip)
    words=[{'word':w['word'],'start':max(0,w['start']-cuts[i]/SR+lead),'end':max(0,w['end']-cuts[i]/SR+lead)} for w in raw if cuts[i]/SR<=w['start']<cuts[i+1]/SR]
    scenes.append({'id':row['id'],'fromFrame':frame,'frames':frames,'words':words,'sourceStartSample':cuts[i],'sourceEndSample':cuts[i+1],'voiceOffset':lead})
    for word in words: captions.append({**word,'start':word['start']+frame/30,'end':word['end']+frame/30})
    parts.append(piece);frame+=frames

sf.write(PUBLIC/'voice.wav',np.concatenate(parts),SR,subtype='PCM_24')
(HERE/'timeline.json').write_text(json.dumps({'frames':frame,'scenes':scenes,'words':captions},indent=2))
(OUT/'audio-boundary-qa.json').write_text(json.dumps({'sourceSamples':len(voice),'retainedSamples':sum(cuts[i+1]-cuts[i] for i in range(len(script))),'trimmedSamples':0,'timeStretch':False,'voiceGainFades':False,'quietBoundaries':quiet,'duration':frame/30},indent=2))
print(json.dumps({'frames':frame,'duration':frame/30,'unmatched':missing,'scenes':[{k:r[k] for k in ['id','fromFrame','frames']} for r in scenes]},indent=2))
