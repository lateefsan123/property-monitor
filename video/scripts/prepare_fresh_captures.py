"""Encode Chrome screencast frames using their actual wall-clock timestamps."""
from pathlib import Path
import json,subprocess,shutil
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'video/assets/accurate/captures/fresh'
OUT=ROOT/'video/assets/accurate/public/workflow/fresh'
OUT.mkdir(parents=True,exist_ok=True)
TAKES={'import':17.6,'templates':19.161,'schedule':20.445}
report={}
for name,duration in TAKES.items():
    folder=BASE/f'{name}-final'
    frames=[]
    for file in sorted(folder.glob('*.jpg')):
        metadata=json.loads(file.with_suffix('.json').read_text())
        frames.append((file,metadata['timestamp']))
    # Chrome can deliver adjacent compositor events a few milliseconds out of order.
    frames.sort(key=lambda frame:frame[1])
    first=frames[0][1];lines=['ffconcat version 1.0'];pause_applied=False
    for i,(file,stamp) in enumerate(frames):
        end=frames[i+1][1]-first if i+1<len(frames) else duration
        delta=max(.000001,end-(stamp-first))
        # A quiet, completed-board hold keeps the recording at normal speed.
        if name=='schedule' and not pause_applied and stamp-first<=10.8<end:
            delta+=1;pause_applied=True
        lines += [f"file '{file.as_posix()}'",f'duration {delta:.6f}']
    lines += [f"file '{frames[-1][0].as_posix()}'"]
    concat=folder/'timed.ffconcat';concat.write_text('\n'.join(lines)+'\n')
    length=duration+(1 if name=='schedule' else 0)
    subprocess.run(['ffmpeg','-v','error','-y','-safe','0','-i',str(concat),'-vf','fps=30','-t',str(length),'-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{name}.mp4')],check=True)
    shutil.copy2(frames[-1][0],OUT/f'{name}-end.jpg')
    report[name]={'source':'Codex Chrome Page.startScreencast','framesCaptured':len(frames),'recordedSeconds':duration,'outputSeconds':length,'motionSpeed':1,'addedStillHold':1 if name=='schedule' else 0}
(OUT/'capture-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
