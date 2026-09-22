"""Package optional captions and attribution, then verify the complete exported movie."""
from pathlib import Path
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/review/workflow'
ASSETS=ROOT/'video/assets/accurate/public/workflow'
CREDIT='Dream Culture - Kevin MacLeod (incompetech.com), CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Edited and mixed under narration.'

def run(args):
 return subprocess.run(args,capture_output=True,text=True,check=True)

def main():
 movie=OUT/'repeat-ai-explainer-workflow.mp4'
 run(['ffmpeg','-v','error','-y','-i',str(OUT/'repeat-ai-workflow-master.mp4'),'-i',str(ASSETS/'mix.wav'),'-i',str(ASSETS/'captions.srt'),'-map','0:v:0','-map','1:a:0','-map','2:0','-c:v','copy','-c:a','aac','-b:a','320k','-c:s','mov_text','-t','164','-metadata:s:s:0','language=eng','-disposition:s:0','0','-metadata','title=Repeat AI - From seller list to next conversation','-metadata','comment=Actual Chrome recordings, captures and app presentation components; fictional example contacts demonstrate import, seller management and weekly scheduling. Captured 22 September 2026. Native mobile capture 13 September 2026.','-metadata','copyright='+CREDIT,'-movflags','+faststart',str(movie)])
 probe=json.loads(run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(movie)]).stdout)
 streams=probe['streams'];v=next(s for s in streams if s['codec_type']=='video');a=next(s for s in streams if s['codec_type']=='audio')
 assert v['width']==1920 and v['height']==1080 and v['r_frame_rate']=='30/1' and int(v['nb_frames'])==4920
 assert a['channels']==2
 assert abs(float(probe['format']['duration'])-164)<.05
 decode=run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'])
 assert not decode.stderr.strip(),decode.stderr
 black=run(['ffmpeg','-hide_banner','-i',str(movie),'-vf','blackdetect=d=0.1:pix_th=0.04','-an','-f','null','-'])
 assert 'black_start:' not in black.stderr
 loud=run(['ffmpeg','-hide_banner','-i',str(movie),'-af','loudnorm=I=-16:TP=-1.5:LRA=8:print_format=json','-vn','-f','null','-'])
 loudness=json.JSONDecoder().raw_decode(loud.stderr[loud.stderr.rfind('{'):])[0]
 assert -17<float(loudness['input_i'])<-15
 assert float(loudness['input_tp'])<=-1
 report=dict(file=movie.name,duration=164,width=1920,height=1080,fps=30,frames=4920,full_decode='pass',black_frames='none',optional_captions='English, off by default',loudness=loudness,music_credit=CREDIT,sha256=hashlib.sha256(movie.read_bytes()).hexdigest(),bytes=movie.stat().st_size)
 (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
 # Inspect four successive states for each key action, not only finished scene layouts.
 for name,start in [('import',12),('sellers',26),('details',42),('template',60),('schedule',79.15),('week',94),('market',106),('price-history',111.9),('integrations',121),('assistant',136),('platforms',153)]:
  run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(movie),'-vf','fps=2,scale=640:360,tile=4x1','-frames:v','1',str(OUT/f'motion-{name}.jpg')])
 run(['ffmpeg','-v','error','-y','-ss','37.5','-i',str(movie),'-frames:v','1','-vf','scale=1280:720',str(OUT/'poster-sellers.jpg')])
 print(json.dumps(report,indent=2))

if __name__=='__main__':main()
