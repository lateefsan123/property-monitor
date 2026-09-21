"""Verify the actual Resolve export and produce rendered-frame review sheets."""
from pathlib import Path
import hashlib, json, re, subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/review/september-rebuild'
MOVIE=OUT/'repeat-ai-explainer.mp4'

def command(*args):
    return subprocess.run(args,capture_output=True,text=True,check=True)

def main():
    rows=json.loads((ROOT/'video/fusion/september-rebuild/scene-manifest.json').read_text())
    cursor=0;paths=set()
    for row in rows:
        assert row['record_frame']==cursor
        cursor+=row['frames']
        comp=Path(row['comp']).read_text()
        assert 'MediaOut1 = MediaOut' in comp
        for source in re.findall(r'Filename = "([^"]+)"',comp):
            assert Path(source).is_file(),source
            paths.add(source)
    assert cursor==2700
    print('Verified 9 native scenes, 2700 frames,',len(paths),'existing picture sources',flush=True)
    probe=json.loads(command('ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(MOVIE)).stdout)
    v=next(s for s in probe['streams'] if s['codec_type']=='video')
    a=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'],v['r_frame_rate'])==(1920,1080,'30/1')
    assert int(v['nb_read_frames'])==2700,v
    assert a['channels']==2 and a['codec_name']=='aac',a
    assert abs(float(probe['format']['duration'])-90)<.10
    decode=command('ffmpeg','-v','error','-xerror','-i',str(MOVIE),'-f','null','-')
    assert not decode.stderr.strip(),decode.stderr
    loud=command('ffmpeg','-hide_banner','-i',str(MOVIE),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-')
    levels=json.JSONDecoder().raw_decode(loud.stderr[loud.stderr.rfind('{'):])[0]
    assert -18<float(levels['input_i'])<-14,levels
    assert float(levels['input_tp'])<0,levels
    black=command('ffmpeg','-hide_banner','-i',str(MOVIE),'-vf','blackdetect=d=0.025:pix_th=0.025:pic_th=0.99','-an','-f','null','-')
    black_intervals=re.findall(r'black_start:[^\r\n]+',black.stderr)
    assert not black_intervals,black_intervals
    checks=OUT/'qc';checks.mkdir(exist_ok=True)
    command('ffmpeg','-v','error','-y','-i',str(MOVIE),'-vf','fps=1,scale=480:-1,tile=6x3','-q:v','2',str(checks/'film-%02d.jpg'))
    command('ffmpeg','-v','error','-y','-i',str(MOVIE),'-t','8','-vf','fps=4,scale=480:-1,tile=4x4','-q:v','2',str(checks/'opening-motion-%02d.jpg'))
    for name,sec in [('spreadsheets',21),('assistant',40),('schedule',58),('integrations',64),('platforms',78),('closing',88),('poster',5)]:
        command('ffmpeg','-v','error','-y','-ss',str(sec),'-i',str(MOVIE),'-frames:v','1',str(checks/f'{name}.jpg'))
    report={
        'movie':MOVIE.relative_to(ROOT).as_posix(),
        'sha256':hashlib.file_digest(MOVIE.open('rb'),'sha256').hexdigest(),
        'bytes':MOVIE.stat().st_size,
        'video':{k:v.get(k) for k in ['codec_name','width','height','r_frame_rate','nb_read_frames','duration','bit_rate']},
        'audio':{k:a.get(k) for k in ['codec_name','sample_rate','channels','duration','bit_rate']},
        'duration_seconds':float(probe['format']['duration']),
        'full_decode':'passed',
        'black_intervals':black_intervals,
        'loudness':levels,
        'source_files':sorted(str(Path(p).relative_to(ROOT).as_posix()) for p in paths),
        'review':'Rendered contact sheets and selected full-resolution frames generated; visual review recorded separately.'
    }
    (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':main()
