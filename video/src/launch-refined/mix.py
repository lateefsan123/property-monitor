"""Mix complete voice with a bar-aligned extension of the original score."""
from pathlib import Path
import json, subprocess, re
import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d,gaussian_filter1d

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
PUBLIC=ROOT/'video/assets/launch-refined/public';OUT=ROOT/'video/review/launch-refined';SR=48000
edit=json.loads((HERE/'timeline.json').read_text())
voice,_=sf.read(PUBLIC/'voice.wav',dtype='float32');n=len(voice)
score,_=sf.read(ROOT/'video/assets/launch/audio/repeat-launch-original-score.wav',dtype='float32')
# Loop whole four-bar phrases from the original score before the closing section.
while len(score)<n:
    a,b=round(28.8*SR),round(38.4*SR)
    score=np.concatenate([score[:b],score[a:b],score[b:]])
music=score[:n].copy()
envelope=gaussian_filter1d(maximum_filter1d(np.abs(voice[::240]),size=65),sigma=12)
gain=np.interp(np.arange(n),np.arange(len(envelope))*240,np.where(envelope>.009,.22,.36))
music*=gain[:,None]
music[-2*SR:]*=np.linspace(1,0,2*SR)[:,None]
voice*=.8/max(.01,float(np.max(np.abs(voice))))
premix=voice[:,None]+music
sf.write(PUBLIC/'premix.wav',premix,SR,subtype='PCM_24')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-nostats',*args],capture_output=True,text=True,check=True)
analysis=ff(['-i',str(PUBLIC/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-']).stderr
levels=json.loads(analysis[analysis.rfind('{'):analysis.rfind('}')+1])
filter=f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={levels['input_i']}:measured_TP={levels['input_tp']}:measured_LRA={levels['input_lra']}:measured_thresh={levels['input_thresh']}:offset={levels['target_offset']}:linear=true"
ff(['-y','-i',str(PUBLIC/'premix.wav'),'-af',filter,'-ar','48000','-c:a','pcm_s24le',str(PUBLIC/'mix.wav')])
(OUT/'mix-analysis.json').write_text(json.dumps(levels,indent=2))
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
# Canonical scene captions with acoustic scene timing; no invented word matches.
script=json.loads((HERE/'script.json').read_text());captions=[]
for row,line in zip(edit['scenes'],script):
    begin=row['fromFrame']/30+row['voiceOffset']; end=(row['fromFrame']+row['frames'])/30-.15
    words=line['text'].split();chunks=[' '.join(words[k:k+8]) for k in range(0,len(words),8)]
    for k,chunk in enumerate(chunks):
        a=begin+(end-begin)*k/len(chunks);b=begin+(end-begin)*(k+1)/len(chunks)
        captions.append(f'{len(captions)+1}\n{stamp(a)} --> {stamp(b)}\n{chunk}\n')
(OUT/'repeat-ai-refined.srt').write_text('\n'.join(captions),encoding='utf-8')
print('Voice-forward mix ready',levels)
