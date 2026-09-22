"""Assemble approved ElevenLabs stems, score, captions and the frame-accurate shot timeline."""
from pathlib import Path
import json, subprocess, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/assets/accurate/public/workflow/final'
SR=48000
def run(args): return subprocess.run(args,capture_output=True,text=True,check=True)
def stamp(t):
 m=round(t*1000)
 return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02},{m%1000:03}'
def main():
 rows=json.loads((ROOT/'video/review/elevenlabs/final-narration.json').read_text())
 scenes=[]; stems=[]; frame=0; caps=[]
 for i,row in enumerate(rows):
  a,sr=sf.read(OUT/'voice'/f'{i:02}.mp3',dtype='float32')
  if a.ndim>1:a=a.mean(axis=1)
  active=np.flatnonzero(abs(a)>.002)
  assert len(active)>0
  a=a[max(0,active[0]-int(.06*sr)):min(len(a),active[-1]+int(.16*sr))]
  a=resample_poly(a,SR,sr)
  a*=min(1.5,.76/max(abs(a)))
  duration=len(a)/SR
  voice_offset=.55 if row['id']!='assistant' else .35
  frames=max(round(row['minSeconds']*30),int(np.ceil((duration+voice_offset+1.0)*30)))
  scene={**row,'from':frame,'frames':frames,'voiceStart':frame/30+voice_offset,'voiceDuration':duration}
  scenes.append(scene);stems.append(a);frame+=frames
  parts=re.split(r'(?<=[.!?])\s+',row['text']);total=sum(len(x.split()) for x in parts); t=scene['voiceStart']
  for part in parts:
   end=t+duration*len(part.split())/total
   # Short captions remain optional; the picture carries the product labels.
   caps.append((t,end,part));t=end
  print(row['id'],round(duration,2),'seconds ->',frames/30,'scene',flush=True)
 totalFrames=frame+90;n=int(totalFrames/30*SR)
 vo=np.zeros(n,dtype=np.float32);gain=np.full(n,.13,dtype=np.float32)
 for row,a in zip(scenes,stems):
  st=round(row['voiceStart']*SR);en=st+len(a);vo[st:en]+=a
  lo=max(0,st-int(.18*SR));hi=min(n,en+int(.4*SR))
  gain[lo:st]=np.linspace(.13,.055,st-lo);gain[st:en]=.055;gain[en:hi]=np.linspace(.055,.13,hi-en)
 run(['ffmpeg','-v','error','-y','-stream_loop','-1','-ss','8','-i',str(OUT.parents[1]/'dream-culture.mp3'),'-t',str(totalFrames/30),'-ar',str(SR),'-ac','2',str(OUT/'score.wav')])
 music,_=sf.read(OUT/'score.wav',dtype='float32');music=music[:n]*gain[:,None]
 music[:SR]*=np.linspace(0,1,SR)[:,None];music[-3*SR:]*=np.linspace(1,0,3*SR)[:,None]
 fx=np.zeros((n,2),dtype=np.float32)
 for row in scenes:
  if not row['navigation']:continue
  when=row['from']/30+row['navigation']*.69
  t=np.arange(int(.04*SR))/SR;tick=np.sin(2*np.pi*620*t)*np.exp(-t*110)*.015
  at=round(when*SR);fx[at:at+len(tick)]+=tick[:,None]
 premix=np.repeat(vo[:,None],2,axis=1)+music+fx
 for name,a in [('voice',vo),('music',music),('premix',premix)]:sf.write(OUT/f'{name}.wav',a,SR,subtype='PCM_24')
 loud='loudnorm=I=-16:TP=-1.5:LRA=8'
 probe=run(['ffmpeg','-hide_banner','-i',str(OUT/'premix.wav'),'-af',loud+':print_format=json','-f','null','-'])
 measured=json.JSONDecoder().raw_decode(probe.stderr[probe.stderr.rfind('{'):])[0]
 params=':'.join(f'{k}={measured[v]}' for k,v in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
 run(['ffmpeg','-v','error','-y','-i',str(OUT/'premix.wav'),'-af',loud+':'+params+':linear=true','-ar',str(SR),'-c:a','pcm_s24le',str(OUT/'mix.wav')])
 timeline={'frames':totalFrames,'duration':totalFrames/30,'closeFrom':frame,'scenes':scenes}
 (ROOT/'video/src/workflow/final-timeline.json').write_text(json.dumps(timeline,indent=2)+'\n')
 (OUT/'voice-timing.json').write_text(json.dumps(timeline,indent=2)+'\n')
 (OUT/'captions.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,s) in enumerate(caps,1))+'\n',encoding='utf-8')
 print('MIX READY',totalFrames/30,flush=True)
if __name__=='__main__':main()
