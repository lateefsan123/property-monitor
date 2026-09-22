"""Reproducible voice stems, restrained effects, licensed score and final mix."""
from pathlib import Path
import json, subprocess, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/assets/accurate/public/workflow'
SR=48000
DURATION=164
LINES=[
 ('01-open',.5,"Turn your seller list into better conversations. Meet Repeat A I.",'af_heart'),
 ('02-import',5.4,"Start by importing your leads. Paste a Google Sheet link, or choose an Excel file. Repeat A I brings your sellers into one workspace, organised by building, with their contact details and status.",'af_heart'),
 ('03-sellers',21.5,"Now open Sellers. See who is a prospect, who is at market appraisal, and who is available for sale. Filter the list to focus on the conversations that matter. Not interested keeps opted-out sellers out of automated follow-ups.",'af_heart'),
 ('04-context',36.4,"Sold today highlights fresh transaction data in a seller's building. Open their record to see their details, then Market data for the latest sales, prices, and dates. That gives your next message a reason to exist.",'af_heart'),
 ('05-automation-v2',49.8,"Connect WhatsApp for personalised, automated transaction updates, following your schedule and sending limits.",'af_heart'),
 ('06-template',58.4,"Happy with the default message? You're ready. Want your own wording? Create a custom template. Name, building, and transaction fields personalise it for each seller, and the preview shows the result.",'af_heart'),
 ('07-schedule-a',73.5,"Then decide which buildings get follow-ups on which days. Choose a day, pick a spreadsheet, and select its buildings.",'af_heart'),
 ('07-schedule-b',82,"Give Monday both Act towers, Tuesday Saint Regis, Wednesday the Burj buildings, and Thursday Imperial Avenue.",'af_heart'),
 ('07-schedule-c',92,"Review the whole week, then save. Empty days stay off while weekly scheduling is enabled.",'af_heart'),
 ('08-market',99.5,"You can also watch the buildings you cover for asking-price drops. Open Burj Khalifa, choose an apartment, and inspect the price chart. The activity history shows when it was listed, and exactly when the asking price changed.",'af_heart'),
 ('09-tools',119.4,"Keep your everyday tools connected: Google Sheets, Excel, Gmail, Outlook, and your calendars.",'af_heart'),
 ('10-assistant',128.5,"And you don't have to do every step by hand. Ask Repeat is your smart assistant. Type, or talk with voice. Ask for a market summary, find sellers, or prepare a template or schedule change. Here, it drafts a new message template. Review the change, then confirm.",'af_heart'),
 ('11-platforms',151.4,"At your desk or between viewings. Keep working across the web, Windows, and mobile.",'af_heart'),
 ('12-close',159.5,"Less admin. Better conversations. Repeat A I.",'af_heart'),
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
 subprocess.run(['ffmpeg','-v','error','-y','-ss','8','-i',str(OUT.parent/'dream-culture.mp3'),'-t',str(DURATION),'-ar',str(SR),'-ac','2',str(OUT/'score.wav')],check=True)
 music,_=sf.read(OUT/'score.wav',dtype='float32');music=music[:n]
 music*=gain[:,None];music[:SR]*=np.linspace(0,1,SR)[:,None];music[-2*SR:]*=np.linspace(1,0,2*SR)[:,None]
 fx=np.zeros((n,2),dtype=np.float32)
 # Tiny, original tactile ticks at actual UI interaction points. No stock swoosh on every cut.
 for when,hz in [(8,580),(28,650),(39,650),(44,580),(75.5,580),(83,650),(88,650),(94,650),(102.667,650),(107,580)]:
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
