"""Conform the completed Resolve animation render to the tighter 90-second cut.

Only unused trailing holds are removed. No animation or UI is recreated here.
The companion interchange carries the same source ranges for Resolve import.
"""
from pathlib import Path
import json, subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/review/september-rebuild'
AUDIO=ROOT/'video/audio/september-rebuild'
SOURCE=OUT/'repeat-ai-full-explainer-motion-03.mp4'

def main():
    rows=json.loads((ROOT/'video/fusion/september-rebuild/scene-manifest.json').read_text())
    original_starts=[0,14,26,38,52,64,74,86,98]
    filters=[];events=[]
    for i,(row,start) in enumerate(zip(rows,original_starts)):
        first=start*30;last=first+row['frames']
        filters.append(f'[0:v]trim=start_frame={first}:end_frame={last},setpts=PTS-STARTPTS[v{i}]')
        events.append(dict(path=SOURCE.as_posix(),name=row['name'],start_frame=first,end_frame=last,record_frame=row['record_frame'],media_type='video',media_start_tc_frame=108000))
    filters.append(''.join(f'[v{i}]' for i in range(len(rows)))+f'concat=n={len(rows)}:v=1:a=0[outv]')
    (OUT/'conform.ffgraph').write_text(';\n'.join(filters)+'\n')
    events.append(dict(path=(AUDIO/'final-mix-90.wav').as_posix(),name='Narration, music and motion cues',start_frame=0,end_frame=2700,record_frame=0,media_type='audio',media_start_tc_frame=0))
    (OUT/'resolve-conform-plan.json').write_text(json.dumps(events,indent=2)+'\n')
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(SOURCE),'-i',str(AUDIO/'final-mix-90.wav'),'-i',str(AUDIO/'repeat-ai-explainer.srt'),'-filter_complex_script',str(OUT/'conform.ffgraph'),'-map','[outv]','-map','1:a:0','-map','2:0','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','320k','-c:s','mov_text','-metadata:s:s:0','language=eng','-disposition:s:0','0','-t','90','-movflags','+faststart',str(OUT/'repeat-ai-explainer.mp4')],check=True)
    print('90-second final conform ready')

if __name__=='__main__':main()
