from pathlib import Path
import json, subprocess, re, difflib
import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[3]
PUBLIC=ROOT/'video/assets/launch/public'
OUT=ROOT/'video/review/launch'
SR=48000
edit=json.loads((Path(__file__).parent/'timeline.json').read_text())
voice,_=sf.read(PUBLIC/'voice.wav',dtype='float32');n=len(voice)
music,_=sf.read(ROOT/'video/assets/launch/audio/repeat-launch-original-score.wav',dtype='float32')
music=music[:n]
# Conservative music bed with smooth envelope following narration.
from scipy.ndimage import maximum_filter1d,gaussian_filter1d
envelope=np.abs(voice[::240]); envelope=gaussian_filter1d(maximum_filter1d(envelope,size=70),sigma=12)
gain=np.interp(np.arange(n),np.arange(len(envelope))*240,np.where(envelope>.01,.28,.48))
music*=gain[:,None]
music[-int(2.0*SR):]*=np.linspace(1,0,int(2.0*SR))[:,None]
voice*=.82/max(.01,np.max(np.abs(voice)))
fx=np.zeros((n,2),dtype='float32')
def effect(file,time,scale):
    a,_=sf.read(ROOT/'video/assets/launch/audio'/file,dtype='float32')
    if a.ndim==1:a=np.repeat(a[:,None],2,axis=1)
    pos=round(time*SR); length=min(len(a),n-pos)
    fx[pos:pos+length]+=a[:length]*scale
for time in [1.85,3.85,9.6,18.9,29.7,55.3]:effect('soft-air-transition.wav',time,.18)
for time in [11.55,28.52,45.55]:effect('soft-interface-tap.wav',time,.35)
effect('soft-confirmation.wav',29.05,.14)
premix=voice[:,None]+music+fx
sf.write(PUBLIC/'premix.wav',premix,SR,subtype='PCM_24')
sf.write(PUBLIC/'music.wav',music,SR,subtype='PCM_24')
sf.write(PUBLIC/'effects.wav',fx,SR,subtype='PCM_24')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-nostats',*args],capture_output=True,text=True,check=True)
analysis=ff(['-i',str(PUBLIC/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-']).stderr
levels=json.loads(analysis[analysis.rfind('{'):analysis.rfind('}')+1])
filter=f"loudnorm=I=-16:TP=-1.5:LRA=9:measured_I={levels['input_i']}:measured_TP={levels['input_tp']}:measured_LRA={levels['input_lra']}:measured_thresh={levels['input_thresh']}:offset={levels['target_offset']}:linear=true:print_format=json"
result=ff(['-y','-i',str(PUBLIC/'premix.wav'),'-af',filter,'-ar','48000','-c:a','pcm_s24le',str(PUBLIC/'mix.wav')])
(OUT/'mix-analysis.json').write_text(json.dumps(levels,indent=2))

script="""Your sellers are in a spreadsheet. The market keeps moving. And every follow-up needs something worth saying.
Repeat AI brings it together.
Import your sellers, and keep each building organised. When a sale happens in their building, you've got something useful to share.
Turn it into a personal WhatsApp update. Your wording. Your broker card. Sent on the days you choose.
Keep an eye on the buildings you cover, and see when asking prices change.
Need a hand? Just ask Repeat. Type, or use your voice. Find a seller, check the market, or prepare a new message template. Then review the change.
Connect your email and calendar. You can even work with your Repeat AI account from ChatGPT and Claude.
At your desk, or on your phone.
Repeat AI. Stay close to your sellers."""
(Path(__file__).parent/'narration.txt').write_text(script,encoding='utf-8')
norm=lambda s:re.sub('[^a-z]','',s.lower()).replace('organised','organized')
raw=edit['words'];expected=script.split();aligned=[None]*len(expected)
for block in difflib.SequenceMatcher(None,[norm(w) for w in expected],[norm(w['word']) for w in raw],autojunk=False).get_matching_blocks():
    for k in range(block.size):aligned[block.a+k]=raw[block.b+k]
for i,w in enumerate(aligned):
    if w is None:
        before=next((aligned[j]['end'] for j in range(i-1,-1,-1) if aligned[j]),0)
        after=next((aligned[j]['start'] for j in range(i+1,len(aligned)) if aligned[j]),before+.3)
        aligned[i]=dict(start=before,end=max(before+.1,after))
def stamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
captions=[];group=[]
for word,time in zip(expected,aligned):
    group.append((word,time))
    if len(group)>=8 or re.search(r'[.!?]$',word):
        captions.append(f"{len(captions)+1}\n{stamp(group[0][1]['start'])} --> {stamp(group[-1][1]['end'])}\n{' '.join(x[0] for x in group)}\n")
        group=[]
(OUT/'repeat-ai-launch.srt').write_text('\n'.join(captions),encoding='utf-8')
print('Mix and canonical captions ready',levels)
