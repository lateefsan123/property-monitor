"""Reproducible voice stems, restrained effects, licensed score and final mix."""
from pathlib import Path
import json, subprocess, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/assets/accurate/public/workflow/clean'
SR=48000
DURATION=141
LINES=[
 ('clean-open',.3,"This is Repeat A I.",'af_heart'),
 ('clean-import',3.2,"You can import a Google Sheet link or an Excel file. Here, we'll use the link. Choose the buildings, then add the spreadsheet.",'af_heart'),
 ('clean-sellers',17.4,"On Sellers, you can filter by status: prospect, market appraisal, for sale, or not interested.",'af_heart'),
 ('clean-context',26.0,"Sold today shows fresh transactions in that building. Open a seller to see the sales, dates and prices.",'af_heart'),
 ('clean-automation',35.2,"With WhatsApp connected, eligible sellers get automated updates using those transactions.",'af_heart'),
 ('clean-template',45.3,"You can use the default message or write your own. Here, we'll add a name, a building and recent sales. The preview updates as you type.",'af_heart'),
 ('clean-schedule-a',63.4,"Next, choose which buildings get messages on each day. Pick a spreadsheet, select its building, and repeat for the other days.",'af_heart'),
 ('clean-schedule-b',77,"We've filled Monday through Thursday. Now save the plan. Empty days stay off.",'af_heart'),
 ('clean-market',87.4,"To track price drops, open a building and choose an apartment. The chart shows the asking price.",'af_heart'),
 ('clean-market-activity',99.5,"Open Activity to see when that price changed.",'af_heart'),
 ('clean-tools',107.4,"Connect your spreadsheets, email and calendars.",'af_heart'),
 ('clean-assistant-v2',114.4,"You can also type or speak to Ask Repeat. It can find sellers, summarise the market, and prepare changes, like a new template.",'af_heart'),
 ('clean-review',127.5,"Check the draft, then confirm.",'af_heart'),
 ('clean-platforms',132.4,"Repeat A I works on web, Windows and mobile.",'af_heart'),
]

def stamp(t):
 m=round(t*1000)
 return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02},{m%1000:03}'

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 stems=OUT/'voice';stems.mkdir(exist_ok=True)
 pipe=None;rows=[]
 for name,start,words,voice in LINES:
  path=stems/f'{name}.wav'
  if not path.exists():
   if pipe is None:pipe=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M')
   a=np.concatenate([np.asarray(r.audio,dtype=np.float32) for r in pipe(words,voice=voice,speed=1.0)])
   active=np.flatnonzero(abs(a)>.002)
   a=a[max(0,active[0]-1500):min(len(a),active[-1]+3600)]
   a*=min(1,.80/max(np.max(abs(a)),.001))
   sf.write(path,a,24000,subtype='PCM_16')
  a,sr=sf.read(path,dtype='float32')
  rows.append(dict(name=name,start=start,duration=len(a)/sr,text=words,voice=voice))
  print(name,round(len(a)/sr,3),flush=True)
 for a,b in zip(rows,rows[1:]):
  assert a['start']+a['duration']<b['start']-.08, f'Voice overlap: {a}'
 assert rows[-1]['start']+rows[-1]['duration']<DURATION-.3
 (OUT/'voice-timing.json').write_text(json.dumps(rows,indent=2)+'\n')
 n=SR*DURATION; vo=np.zeros(n,dtype=np.float32);gain=np.full(n,.19,dtype=np.float32)
 caps=[]
 for row in rows:
  a,sr=sf.read(stems/f'{row["name"]}.wav',dtype='float32');a=resample_poly(a,SR,sr)
  st=round(row['start']*SR);en=st+len(a);vo[st:en]+=a
  lo=max(0,st-int(.18*SR));hi=min(n,en+int(.45*SR))
  gain[lo:st]=np.linspace(.19,.075,st-lo);gain[st:en]=.075;gain[en:hi]=np.linspace(.075,.19,hi-en)
  text=row['text'].replace('A I','AI').replace('Chat G P T','ChatGPT').replace('M C P','MCP')
  parts=re.split(r'(?<=[.?!])\s+',text);t=row['start'];total=sum(len(p.split()) for p in parts)
  for part in parts:
   end=t+row['duration']*len(part.split())/total
   caps.append((t,end,part));t=end
 subprocess.run(['ffmpeg','-v','error','-y','-ss','8','-i',str(OUT.parents[1]/'dream-culture.mp3'),'-t',str(DURATION),'-ar',str(SR),'-ac','2',str(OUT/'score.wav')],check=True)
 music,_=sf.read(OUT/'score.wav',dtype='float32');music=music[:n]
 music*=gain[:,None];music[:SR]*=np.linspace(0,1,SR)[:,None];music[-2*SR:]*=np.linspace(1,0,2*SR)[:,None]
 fx=np.zeros((n,2),dtype=np.float32)
 # Tiny, original tactile ticks at actual UI interaction points. No stock swoosh on every cut.
 for when,hz in [(10.27,580),(14,650),(49.83,650),(53.33,580),(54.33,580),(60.17,650),(82.38,650),(94.33,580)]:
  dur=int(.055*SR);t=np.arange(dur)/SR;wave=np.sin(2*np.pi*hz*t)*np.exp(-t*90)*.032
  at=int(when*SR);fx[at:at+dur]+=wave[:,None]
 premix=np.repeat(vo[:,None],2,axis=1)+music+fx
 sf.write(OUT/'voice.wav',vo,SR,subtype='PCM_24');sf.write(OUT/'music.wav',music,SR,subtype='PCM_24');sf.write(OUT/'fx.wav',fx,SR,subtype='PCM_24');sf.write(OUT/'premix.wav',premix,SR,subtype='PCM_24')
 loud='loudnorm=I=-16:TP=-1.5:LRA=8'
 probe=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUT/'premix.wav'),'-af',loud+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 measured=json.JSONDecoder().raw_decode(probe.stderr[probe.stderr.rfind('{'):])[0]
 args=':'.join(f'{k}={measured[v]}' for k,v in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'premix.wav'),'-af',loud+':'+args+':linear=true','-ar',str(SR),'-c:a','pcm_s24le',str(OUT/'mix.wav')],check=True)
 (OUT/'captions.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,s) in enumerate(caps,1))+'\n',encoding='utf-8')
 (OUT/'audio-qc.json').write_text(json.dumps(dict(first_pass=measured,voice=rows),indent=2)+'\n')
 print('MIX READY',flush=True)

if __name__=='__main__':main()
