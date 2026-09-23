"""Export the inspected picture and verify the encoded delivery file."""
from pathlib import Path
import hashlib,json,subprocess

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
OUT=ROOT/'video/review/launch-refined';PUBLIC=ROOT/'video/assets/launch-refined/public'
edit=json.loads((HERE/'timeline.json').read_text())
movie=OUT/'repeat-ai-refined.mp4'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'repeat-ai-refined-master.mp4'),'-i',str(PUBLIC/'mix.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart','-metadata','title=Repeat AI - Stay close to your sellers',str(movie)],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]))
video=next(s for s in probe['streams'] if s['codec_type']=='video')
assert int(video['nb_frames'])==edit['frames']
assert video['width']==1920 and video['height']==1080
assert abs(float(probe['format']['duration'])-edit['frames']/30)<.08
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True)
check=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(movie),'-vf','blackdetect=d=0.08:pix_th=0.04','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
assert 'black_start:' not in check.stderr,check.stderr
levels=json.loads(check.stderr[check.stderr.rfind('{'):check.stderr.rfind('}')+1])
assert float(levels['input_tp'])<=-.9,levels
assert -18<float(levels['input_i'])<-14,levels
report={'duration':float(probe['format']['duration']),'frames':edit['frames'],'width':1920,'height':1080,'fps':30,'bytes':movie.stat().st_size,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'fullDecode':'pass','blackGaps':'none','audio':levels,'originalLaunchPreserved':True}
(OUT/'delivery-qa.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
