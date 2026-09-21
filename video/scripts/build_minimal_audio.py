"""Reproducible voice stems, restrained effects, licensed score and final mix."""
from pathlib import Path
import json, subprocess, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/assets/minimal/public/video/repeat-ai-minimal'
SR=48000
DURATION=67
LINES=[
 ('01-open',.35,"Property moves fast. Your next conversation should start with the right context.",'af_heart'),
 ('02-sellers',5.5,"Meet Repeat A I. Bring your sellers together from Google Sheets and Excel.",'af_heart'),
 ('03-market',13.6,"Follow the buildings you cover, and spot asking-price changes worth a conversation.",'af_heart'),
 ('04-ask',21.45,"Need an answer? Just ask Repeat. Talk, or type.",'af_heart'),
 ('05-request',25.05,"Show me the latest price drops.",'af_sky'),
 ('06-message',30.45,"Keep it personal. Start with your own words, and turn them into a WhatsApp follow-up for each seller.",'af_heart'),
 ('07-schedule',40.5,"Then plan your week by building. Choose what to follow up, and when.",'af_heart'),
 ('08-tools',48.25,"Connect your email and calendars. And work with Claude or Chat G P T, through M C P.",'af_heart'),
 ('09-platforms',55.4,"At your desk, or between viewings. Keep going across web, Windows, and mobile.",'af_heart'),
 ('10-close',62.25,"Less admin. Better conversations. Repeat A I.",'af_heart'),
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
 request,rate=sf.read(stems/'05-request.wav',dtype='float32')
 envelope=np.array([np.sqrt(np.mean(request[i:i+rate//30]**2)) for i in range(0,len(request),rate//30)])
 envelope=np.clip(envelope/max(np.percentile(envelope,90),.001),0,1)
 (ROOT/'video/src/minimal/request-envelope.ts').write_text('// Generated from the example request audio, one RMS value per video frame.\nexport const requestEnvelope = '+json.dumps(envelope.round(4).tolist())+';\n')
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
 subprocess.run(['ffmpeg','-v','error','-y','-ss','8','-i',str(OUT/'dream-culture.mp3'),'-t',str(DURATION),'-ar',str(SR),'-ac','2',str(OUT/'score.wav')],check=True)
 music,_=sf.read(OUT/'score.wav',dtype='float32');music=music[:n]
 music*=gain[:,None];music[:SR]*=np.linspace(0,1,SR)[:,None];music[-2*SR:]*=np.linspace(1,0,2*SR)[:,None]
 fx=np.zeros((n,2),dtype=np.float32)
 # Tiny, original tactile ticks at actual UI interaction points. No stock swoosh on every cut.
 for when,hz in [(8.5,740),(9,820),(9.5,900),(11.2,580),(16.85,650),(24.4,480),(34.65,680),(44.15,740)]:
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
