"""Conform the rendered Blender shot, encode delivery MP4 and export Resolve XML."""
from pathlib import Path
import json,subprocess,hashlib,xml.etree.ElementTree as E,shutil

ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'video/review/launch';PUBLIC=ROOT/'video/assets/launch/public'
edit=json.loads((Path(__file__).parent/'timeline.json').read_text())
desk=ROOT/'video/assets/launch/blender/desk-dolly.mp4'
assert desk.exists(),'Final Blender animation is required; never deliver the temporary hero placeholder.'
desk_meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(desk)]))
assert int(desk_meta['streams'][0]['nb_frames'])>=201
shutil.copy2(desk,PUBLIC/'desk-film.mp4')
shot=next(r for r in edit['scenes'] if r['id']=='platforms');a=shot['fromFrame'];b=a+shot['frames']
movie=OUT/'repeat-ai-launch.mp4'
filters=f'[0:v]trim=end_frame={a},setpts=PTS-STARTPTS[v0];[1:v]trim=end_frame={shot["frames"]},setpts=PTS-STARTPTS,setsar=1[v1];[0:v]trim=start_frame={b},setpts=PTS-STARTPTS[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v]'
subprocess.run(['ffmpeg','-v','error','-y','-i',str(OUT/'repeat-ai-launch-master.mp4'),'-i',str(desk),'-i',str(PUBLIC/'mix.wav'),'-filter_complex',filters,'-map','[v]','-map','2:a','-c:v','libx264','-crf','18','-preset','slow','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','256k','-movflags','+faststart','-metadata','title=Repeat AI — Stay close to your sellers',str(movie)],check=True)

def tag(parent,name,text=None,**attrs):
    e=E.SubElement(parent,name,attrs)
    if text is not None:e.text=str(text)
    return e
def rate(p):r=tag(p,'rate');tag(r,'timebase',30);tag(r,'ntsc','FALSE')
def sample(p):
    rate(p)
    for k,v in [('width',1920),('height',1080),('anamorphic','FALSE'),('pixelaspectratio','square'),('fielddominance','none')]:tag(p,k,v)
x=E.Element('xmeml',version='5');seq=tag(x,'sequence',id='repeat-launch');tag(seq,'name','Repeat AI - Stay close to your sellers');tag(seq,'duration',edit['frames']);rate(seq)
media=tag(seq,'media');video=tag(media,'video');sample(tag(tag(video,'format'),'samplecharacteristics'));track=tag(video,'track')
for i,row in enumerate(edit['scenes']):
    c=tag(track,'clipitem',id=f'shot-{i}');tag(c,'name',row['id'].title());tag(c,'duration',edit['frames']);rate(c)
    for k,v in [('start',row['fromFrame']),('end',row['fromFrame']+row['frames']),('in',row['fromFrame']),('out',row['fromFrame']+row['frames'])]:tag(c,k,v)
    f=tag(c,'file',id='launch-picture')
    if i==0:tag(f,'name',movie.name);tag(f,'pathurl',movie.as_uri());rate(f);tag(f,'duration',edit['frames']);sample(tag(tag(tag(f,'media'),'video'),'samplecharacteristics'))
audio=tag(media,'audio');fmt=tag(tag(audio,'format'),'samplecharacteristics');tag(fmt,'depth',24);tag(fmt,'samplerate',48000);tag(audio,'channelcount',2)
for ch in [1,2]:
    tr=tag(audio,'track');c=tag(tr,'clipitem',id=f'mix-{ch}');tag(c,'name','Final mix');tag(c,'duration',edit['frames']);rate(c)
    for k,v in [('start',0),('end',edit['frames']),('in',0),('out',edit['frames'])]:tag(c,k,v)
    f=tag(c,'file',id='mix')
    if ch==1:
        p=PUBLIC/'mix.wav';tag(f,'name',p.name);tag(f,'pathurl',p.as_uri());rate(f);tag(f,'duration',edit['frames']);am=tag(tag(f,'media'),'audio');tag(am,'channelcount',2);s=tag(am,'samplecharacteristics');tag(s,'depth',24);tag(s,'samplerate',48000)
    st=tag(c,'sourcetrack');tag(st,'mediatype','audio');tag(st,'trackindex',ch)
E.indent(x);E.ElementTree(x).write(OUT/'repeat-ai-launch-resolve.xml',encoding='utf-8',xml_declaration=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]))
assert int(probe['streams'][0]['nb_frames'])==edit['frames']
subprocess.run(['ffmpeg','-v','error','-i',str(movie),'-f','null','-'],check=True)
qa=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(movie),'-vf','blackdetect=d=0.1:pix_th=0.05','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
assert 'black_start:' not in qa.stderr,qa.stderr
levels=json.loads(qa.stderr[qa.stderr.rfind('{'):qa.stderr.rfind('}')+1])
report=dict(duration=probe['format']['duration'],frames=edit['frames'],width=1920,height=1080,fps=30,bytes=movie.stat().st_size,sha256=hashlib.sha256(movie.read_bytes()).hexdigest(),audio=levels,fullDecode='pass',blackGaps='none',resolve='XML prepared, not live-imported')
(OUT/'delivery-qa.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
