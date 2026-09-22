"""Prepare an independent launch edit; never changes the longer product demo."""
from pathlib import Path
import json, shutil, subprocess
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT=Path(__file__).resolve().parents[3]
PUBLIC=ROOT/'video/assets/launch/public'
SOURCE=ROOT/'video/assets/accurate/public'
SR=48000
for item in ['logo.png','inter.woff2','Inter-LICENSE.txt','workflow/gmail.png','workflow/outlook.svg','workflow/calendar.png','workflow/polished/claude.svg','workflow/whatsapp/landing-template-art.png']:
    target=PUBLIC/item; target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(SOURCE/item,target)

# Cut only at sentence boundaries, leaving action/read time without slowing speech.
cuts=[('opening',0,6.3,7),('brand',6.3,8.62,2.6),('import',8.62,12.05,4.3),
      ('seller',12.05,16.085,5),('whatsapp',16.085,21.4,6.3),('schedule',21.4,23.43,4.5),
      ('market',23.43,27.5,5.1),('assistant',27.5,40.08,13.3),
      ('integrations',40.08,46.5,7.2),('platforms',46.5,48.635,6.7),('close',48.635,50.939,4.2)]
# ASR leads the acoustic boundary on these particular words. Keep sentence
# ownership explicit rather than moving Import/Turn/Keep/At/Repeat backward.
word_boundaries=[0,6.3,8.4,12.05,16,21.4,23.18,27.5,40.08,46.15,48.46,50.939]
source,sr=sf.read(PUBLIC/'narration.mp3',dtype='float32')
if source.ndim>1: source=source.mean(axis=1)
source=resample_poly(source,SR,sr)
words=json.loads((Path(__file__).parent/'words.json').read_text())
rows=[]; parts=[]; frame=0; caption=[]
for index,(name,start,end,duration) in enumerate(cuts):
    n=round(duration*SR); piece=np.zeros(n,dtype='float32'); clip=source[round(start*SR):round(end*SR)].copy()
    fade=min(192,len(clip)//4); clip[:fade]*=np.linspace(0,1,fade);clip[-fade:]*=np.linspace(1,0,fade)
    offset=.1 if name!='opening' else .3
    at=round(offset*SR);piece[at:at+len(clip)]=clip
    rows.append(dict(id=name,fromFrame=frame,frames=round(duration*30),voiceOffset=offset,sourceStart=start,sourceEnd=end))
    for word in words:
        if word_boundaries[index]<=word['start']<word_boundaries[index+1]:
            begin=max(0,word['start']-start);finish=max(begin+.06,min(word['end'],end)-start)
            caption.append(dict(word=word['word'],start=frame/30+offset+begin,end=frame/30+offset+finish))
    frame+=round(duration*30);parts.append(piece)
sf.write(PUBLIC/'voice.wav',np.concatenate(parts),SR,subtype='PCM_24')
(Path(__file__).parent/'timeline.json').write_text(json.dumps(dict(frames=frame,scenes=rows,words=caption),indent=2))
print(f'{frame} frames / {frame/30:.2f} sec')
