"""Write an FCP7 XML timeline for Resolve with scene cuts and a separate mix."""
from pathlib import Path
import json,sys,xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[2]
EDIT='polished' if '--polished' in sys.argv else 'whatsapp' if '--whatsapp' in sys.argv else 'fresh' if '--fresh' in sys.argv else 'revised' if '--revised' in sys.argv else 'final'
OUT=ROOT/f'video/review/{EDIT}'
t=json.loads((ROOT/f'video/src/workflow/{EDIT}-timeline.json').read_text())
def tag(parent,name,text=None,**attrs):
 e=E.SubElement(parent,name,attrs)
 if text is not None:e.text=str(text)
 return e
def rate(parent):
 r=tag(parent,'rate');tag(r,'timebase',30);tag(r,'ntsc','FALSE')
def sample(parent):
 rate(parent);tag(parent,'width',1920);tag(parent,'height',1080);tag(parent,'anamorphic','FALSE');tag(parent,'pixelaspectratio','square');tag(parent,'fielddominance','none')
x=E.Element('xmeml',version='5');seq=tag(x,'sequence',id='repeat-final');tag(seq,'name',f'Repeat AI - {EDIT.title()} ElevenLabs');tag(seq,'duration',t['frames']);rate(seq)
tc=tag(seq,'timecode');rate(tc);tag(tc,'string','00:00:00:00');tag(tc,'frame',0);tag(tc,'displayformat','NDF')
media=tag(seq,'media');video=tag(media,'video');sample(tag(tag(video,'format'),'samplecharacteristics'));track=tag(video,'track')
rows=t['scenes']+[{'id':'close','from':t['closeFrom'],'frames':90}]
for i,r in enumerate(rows):
 c=tag(track,'clipitem',id=f'shot-{i}');tag(c,'name',r['id'].title());tag(c,'duration',t['frames']);rate(c)
 for k,v in [('start',r['from']),('end',r['from']+r['frames']),('in',r['from']),('out',r['from']+r['frames'])]:tag(c,k,v)
 f=tag(c,'file',id='visual-master')
 if i==0:
  tag(f,'name',f'repeat-ai-{EDIT}-master.mp4');tag(f,'pathurl',(OUT/f'repeat-ai-{EDIT}-master.mp4').as_uri());rate(f);tag(f,'duration',t['frames']);sample(tag(tag(tag(f,'media'),'video'),'samplecharacteristics'))
audio=tag(media,'audio');fmt=tag(tag(audio,'format'),'samplecharacteristics');tag(fmt,'depth',24);tag(fmt,'samplerate',48000);tag(audio,'channelcount',2)
for ch in [1,2]:
 tr=tag(audio,'track');c=tag(tr,'clipitem',id=f'mix-{ch}');tag(c,'name','Narration and music');tag(c,'duration',t['frames']);rate(c)
 for k,v in [('start',0),('end',t['frames']),('in',0),('out',t['frames'])]:tag(c,k,v)
 f=tag(c,'file',id='final-mix')
 if ch==1:
  p=ROOT/f'video/assets/accurate/public/workflow/{EDIT}/mix.wav';tag(f,'name',p.name);tag(f,'pathurl',p.as_uri());rate(f);tag(f,'duration',t['frames']);am=tag(tag(f,'media'),'audio');tag(am,'channelcount',2);a=tag(am,'samplecharacteristics');tag(a,'depth',24);tag(a,'samplerate',48000)
 st=tag(c,'sourcetrack');tag(st,'mediatype','audio');tag(st,'trackindex',ch)
E.indent(x)
E.ElementTree(x).write(OUT/f'repeat-ai-{EDIT}-resolve.xml',encoding='utf-8',xml_declaration=True)
print('Resolve XML ready; import is not performed while the bridge is unavailable.')
