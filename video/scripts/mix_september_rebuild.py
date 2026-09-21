"""Build narration, ducked score, restrained motion cues, and captions."""
from pathlib import Path
import json, re, subprocess
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/audio/september-rebuild'
SR=48000
DURATION=90

def stamp(t):
    ms=round(t*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def main():
    rows=json.loads((OUT/'manifest.json').read_text())
    for row,start in zip(rows,[.4,6.4,14.5,23.5,32.5,43.5,53.5,60.4,72.5,82.5]):row['start']=start
    (OUT/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
    n=SR*DURATION
    narration=np.zeros(n,dtype=np.float32)
    music_gain=np.full(n,.19,dtype=np.float32)
    captions=[]
    for row in rows:
        a,sr=sf.read(OUT/f'{row["name"]}.wav',dtype='float32')
        a=resample_poly(a,SR,sr)
        start=round(row['start']*SR); end=start+len(a)
        narration[start:end]+=a
        # Pre-duck gently before the line; release into each product demonstration.
        lo=max(0,start-int(.18*SR)); hi=min(n,end+int(.65*SR))
        music_gain[lo:start]=np.linspace(.19,.070,start-lo)
        music_gain[start:end]=.070
        music_gain[end:hi]=np.linspace(.070,.19,hi-end)
        text=row['text'].replace('A I','AI').replace('Chat G P T','ChatGPT').replace('M C P','MCP')
        chunks=re.split(r'(?<=[.?])\s+',text)
        # Caption phrase positions are editorial estimates, bounded to each actual stem.
        weights=[len(x.split()) for x in chunks]; total=sum(weights); t=row['start']
        for chunk,weight in zip(chunks,weights):
            stop=t+row['duration']*weight/total
            words=chunk.split(); split=len(words)//2
            if len(chunk)>65: chunk=' '.join(words[:split])+'\n'+' '.join(words[split:])
            captions.append((t,stop,chunk));t=stop
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(ROOT/'public/video/repeat-ai-storyboard/sunlit-walkthrough.mp3'),'-t',str(DURATION),'-ar',str(SR),'-ac','2',str(OUT/'score-source.wav')],check=True)
    music,sr=sf.read(OUT/'score-source.wav',dtype='float32')
    music=np.pad(music,((0,max(0,n-len(music))),(0,0)))[:n]
    music*=music_gain[:,None]
    music[:SR]*=np.linspace(0,1,SR)[:,None]
    music[-2*SR:]*=np.linspace(1,0,2*SR)[:,None]
    # Original, quiet air sweeps for large scene moves; soft ticks for assembling panels.
    fx=np.zeros((n,2),dtype=np.float32)
    rng=np.random.default_rng(21)
    for t in [6.4,14,23,32,43,53,60,67.2,72,82,85.7]:
        length=int(.30*SR); tt=np.arange(length)/SR
        noise=sosfilt(butter(2,[600,2400],btype='bandpass',fs=SR,output='sos'),rng.normal(0,1,length))
        swoosh=noise*np.sin(np.pi*np.arange(length)/length)**2*.034
        p=int(t*SR); fx[p:p+length,0]+=swoosh*np.linspace(1,.5,length);fx[p:p+length,1]+=swoosh*np.linspace(.5,1,length)
    for t in [1,1.9,2.8,3.7,73.0,73.7]:
        length=int(.09*SR); tt=np.arange(length)/SR
        tick=np.sin(2*np.pi*(740-1300*tt)*tt)*np.exp(-tt*65)*.024
        p=int(t*SR);fx[p:p+length]+=tick[:,None]
    voice=np.repeat(narration[:,None],2,axis=1)
    sf.write(OUT/'narration-timeline.wav',voice,SR,subtype='PCM_24')
    sf.write(OUT/'music-ducked.wav',music,SR,subtype='PCM_24')
    sf.write(OUT/'motion-cues.wav',fx,SR,subtype='PCM_24')
    sf.write(OUT/'premix.wav',voice+music+fx,SR,subtype='PCM_24')
    loud='loudnorm=I=-16:TP=-1.5:LRA=9'
    p=subprocess.run(['ffmpeg','-hide_banner','-i',str(OUT/'premix.wav'),'-af',loud+':print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    measured=json.JSONDecoder().raw_decode(p.stderr[p.stderr.rfind('{'):])[0]
    (OUT/'loudness-first-pass.json').write_text(json.dumps(measured,indent=2)+'\n')
    args=':'.join(f'{key}={measured[source]}' for key,source in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'premix.wav'),'-af',loud+':'+args+':linear=true','-ar',str(SR),'-c:a','pcm_s24le',str(OUT/'final-mix-90.wav')],check=True)
    (OUT/'repeat-ai-explainer.srt').write_text('\n\n'.join(f'{i}\n{stamp(a)} --> {stamp(b)}\n{text}' for i,(a,b,text) in enumerate(captions,1))+'\n',encoding='utf-8')
    print('90-second mix and captions ready. First-pass loudness:',measured)

if __name__=='__main__':main()
