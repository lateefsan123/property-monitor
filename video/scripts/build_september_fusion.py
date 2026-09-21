"""Author editable Fusion motion scenes. Source screenshots/videos remain unaltered.

The output is native .comp node graphs, imported and rendered by Resolve MCP.
FFmpeg only prepares independent crops/pads from approved project assets.
"""
from pathlib import Path
import json
import subprocess

ROOT=Path(__file__).resolve().parents[2]
A=ROOT/'video/assets/september-rebuild'
OUT=ROOT/'video/fusion/september-rebuild'
SOURCES=A/'sources'
W,H=1920,1080
PAPER=(.966,.961,.945)
INK=(.115,.13,.125)
SAGE=(.82,.90,.83)
PEACH=(.97,.86,.78)
LILAC=(.87,.85,.94)
BLUE=(.81,.89,.94)

def run(*args):subprocess.run(args,check=True)
def q(s):return json.dumps(str(s),ensure_ascii=False)
def val(v):
 if isinstance(v,str):return q(v)
 if isinstance(v,(tuple,list)):return '{'+','.join(val(x) for x in v)+'}'
 return str(v)
def inp(v=None,expr=None,source=None,port='Output'):
 if source:return f'Input {{ SourceOp = {q(source)}, Source = {q(port)} }}'
 return 'Input { '+(f'Value = {val(v)}, ' if v is not None else '')+(f'Expression = {q(expr)}, ' if expr else '')+'}'
def ease(start,end):
 u=f'min(max((time-{start})/{max(1,end-start)},0),1)'
 return f'({u}*{u}*(3-2*{u}))'
def ramp(a,b,start,end):return f'({a}+({b-a})*{ease(start,end)})'
def gate(start,end,length):return f'({ease(start,start+10)}*(1-{ease(end-10,end)}))' if end<length else ease(start,start+10)

class Scene:
 def __init__(self,name,seconds,color=PAPER):
  self.name=name;self.n=int(seconds*30);self.nodes=[];self.i=0
  self.base=self.bg('Paper',color)
 def node(self,typ,inputs=None,extra='',name=None):
  self.i+=1;name=name or f'N{self.i}'
  fields=',\n'.join(f'{k} = {v}' for k,v in (inputs or {}).items())
  self.nodes.append(f'{name} = {typ} {{ Inputs = {{ {fields} }}, {extra} }}')
  return name
 def bg(self,name,color,alpha=1,mask=None):
  d={'Width':inp(W),'Height':inp(H),'UseFrameFormatSettings':inp(0),'TopLeftRed':inp(color[0]),'TopLeftGreen':inp(color[1]),'TopLeftBlue':inp(color[2]),'TopLeftAlpha':inp(alpha)}
  if mask:d['EffectMask']=inp(source=mask,port='Mask')
  return self.node('Background',d,name=name)
 def rect(self,cx,cy,w,h,r=.025,expr=None):
  return self.node('RectangleMask',{'MaskWidth':inp(W),'MaskHeight':inp(H),'Center':inp((cx,cy),expr),'Width':inp(w),'Height':inp(h),'CornerRadius':inp(r)})
 def merge(self,fg,blend='1',mask=None):
  d={'Background':inp(source=self.base),'Foreground':inp(source=fg),'Blend':inp(1,blend),'PerformDepthMerge':inp(0)}
  if mask:d['EffectMask']=inp(source=mask,port='Mask')
  self.base=self.node('Merge',d);return self.base
 def transform(self,source,x='.5',y='.5',size='1',angle='0'):
  return self.node('Transform',{'Input':inp(source=source),'Center':inp((.5,.5),f'Point({x},{y})'),'Size':inp(1,size),'Angle':inp(0,angle),'MotionBlur':inp(1),'Quality':inp(3),'ShutterAngle':inp(150)})
 def panel(self,color,x,y,w,h,start=0,dx=0,dy=-.15,end=None):
  m=self.rect(x,y,w,h)
  b=self.bg(f'Panel{self.i}',color,mask=m)
  t=self.transform(b,ramp(.5+dx,.5,start,start+25),ramp(.5+dy,.5,start,start+25))
  return self.merge(t,gate(start,end or self.n,self.n))
 def loader(self,path):
  path=Path(path).as_posix()
  # PNGs are held; movies retain actual interactions and hold their final frame.
  return self.node('Loader',{'GlobalIn':inp(0),'GlobalOut':inp(self.n-1),'ClipTimeStart':inp(0),'ClipTimeEnd':inp(self.n-1),'HoldLastFrame':inp(1)},extra=f'Clips = {{ Clip {{ ID = "Clip1", Filename = {q(path)}, FormatID = "", StartFrame = 0, Length = {self.n}, LengthSetManually = true, TrimIn = 0, TrimOut = {self.n-1}, ExtendLast = {self.n}, GlobalStart = 0, GlobalEnd = {self.n-1} }} }}')
 def media(self,path,x='.5',y='.5',size='1',start=0,end=None,angle='0',wipe=False,viewport=None):
  l=self.loader(path); t=self.transform(l,x,y,size,angle)
  mask=self.rect(*viewport) if viewport else None
  if wipe:
   # An eased expanding matte reveals the asset without swapping finished cards.
   p=ease(start,start+28)
   mask=self.node('RectangleMask',{'MaskWidth':inp(W),'MaskHeight':inp(H),'Width':inp(1,p),'Height':inp(1),'Center':inp((.5,.5),f'Point({p}/2,.5)')})
  return self.merge(t,gate(start,end or self.n,self.n),mask)
 def text(self,label,x,y,size=.035,start=0,end=None,color=INK,bold=False,dx=0,dy=-.02,write=False):
  d={'Width':inp(W),'Height':inp(H),'StyledText':inp(label),'Font':inp('Segoe UI'),'Style':inp('Semibold' if bold else 'Regular'),'Size':inp(size),'Red1':inp(color[0]),'Green1':inp(color[1]),'Blue1':inp(color[2]),'Center':inp((x,y),f'Point({ramp(x+dx,x,start,start+20)},{ramp(y+dy,y,start,start+20)})')}
  if write:d['WriteOnEnd']=inp(1,ease(start,start+28))
  t=self.node('TextPlus',d);return self.merge(t,gate(start,end or self.n,self.n))
 def dot(self,x,y,start,end=None,color=(.6,.67,.59),radius=.002):
  m=self.node('EllipseMask',{'MaskWidth':inp(W),'MaskHeight':inp(H),'Center':inp((x,y)),'Width':inp(radius*2),'Height':inp(radius*2)})
  return self.merge(self.bg(f'Dot{self.i}',color,mask=m),gate(start,end or self.n,self.n))
 def finish(self):
  self.node('MediaOut',{'Index':inp('0'),'Input':inp(source=self.base)},name='MediaOut1')
  path=OUT/f'{self.name}.comp'
  path.write_text('Composition { CurrentTime = 0, RenderRange = {0,'+str(self.n-1)+'}, GlobalRange = {0,'+str(self.n-1)+'}, Tools = ordered() {\n'+',\n'.join(self.nodes)+'\n} }\n',encoding='utf-8')
  return dict(name=self.name,seconds=self.n/30,frames=self.n,nodes=len(self.nodes),comp=path.as_posix())

def prepare_assets():
 A.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
 run('ffmpeg','-v','error','-y','-f','lavfi','-i','color=c=0xf6f5f1:s=1920x1080:r=30:d=20','-an','-c:v','libx264','-pix_fmt','yuv420p',str(A/'canvas-20s.mp4'))
 for i,name in enumerate(['phone','laptop','towers','planner','happy','walking']):
  x=(i%3)*512;y=(i//3)*512
  # Cropping a sprite sheet for animation preserves its generated alpha.
  height=490 if name=='towers' else 534 if name=='walking' else 512
  if name=='walking':y=490
  run('ffmpeg','-v','error','-y','-i',str(A/'broker-vignettes-v2.png'),'-vf',f'crop=512:{height}:{x}:{y},scale=-2:700,pad=1920:1080:(ow-iw)/2:190:color=black@0','-frames:v','1',str(A/f'{name}.png'))
 # Real source captures made in Chrome. Fill only the missing trailing handle.
 sources=['dashboard','spreadsheets','market','assistant','followup','schedule','integrations']
 for name in sources:
  path=SOURCES/f'{name}.mp4'
  run('ffmpeg','-v','error','-y','-i',str(path),'-vf','tpad=stop_mode=clone:stop_duration=16','-t','16','-r','30','-an','-c:v','libx264','-crf','16','-pix_fmt','yuv420p',str(A/f'{name}-held.mp4'))
 # A genuine iPhone capture from Sep 13; no invented native interaction.
 run('ffmpeg','-v','error','-y','-i',str(SOURCES/'native-iphone-sept13.png'),'-vf','scale=-2:800,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba','-frames:v','1',str(A/'mobile-canvas.png'))
 run('ffmpeg','-v','error','-y','-i',str(ROOT/'public/brand/repeat-ai-logo.png'),'-vf','scale=900:-2,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black@0','-frames:v','1',str(A/'brand-lockup.png'))

def build():
 specs=[]
 # 0–14: overlapping illustrated work gathers into the real dashboard.
 s=Scene('01-opening',14)
 s.text('Repeat AI',.10,.92,.023,start=0,bold=True,end=195)
 sprites=[('phone',.20,.58,0),('laptop',.49,.69,28),('towers',.79,.60,55),('planner',.34,.25,81),('happy',.70,.23,108)]
 for name,x,y,st in sprites:
  e=ease(178,234)
  s.media(A/f'{name}.png',x=f'{x}+(.5-{x})*{e}',y=f'{y}+(.5-{y})*{e}+.009*sin(time/19+{st})',size=f'{ramp(.35,.61,st,st+28)}*(1-.78*{e})',start=st,end=234,angle=f'2*sin(time/32+{st})',wipe=True)
 for text,x,y,st in [('Another update',.80,.82,61),('Another spreadsheet',.49,.90,40),('A seller to call',.19,.33,14),('A week to plan',.35,.07,97)]:
  s.text(text,x,y,.022,start=st,end=187,write=True)
 # An arcing sequence of dots connects the small actions, then disappears into the UI.
 import math
 for i in range(23):
  x=.18+i*.028;y=.44+.095*math.sin(i/22*math.pi*2)
  s.dot(x,y,110+i*2,end=216,radius=.002)
 s.media(A/'dashboard-held.mp4',x=ramp(1.35,.5,192,245),y='.49',size=ramp(.62,.78,192,255),start=186)
 s.text('One connected workspace',.5,.925,.032,start=243,bold=True)
 s.text('Sellers  ·  Buildings  ·  Follow-ups',.5,.075,.025,start=284)
 specs.append(s.finish())
 # 14–23: moving panels, live search and a crop that travels to the relevant row.
 s=Scene('02-spreadsheets',9,BLUE)
 s.panel(PAPER,.18,.51,.30,.91,start=0,dx=-.3)
 s.media(A/'laptop.png',x='.18',y='.59',size=ramp(.25,.63,0,28),start=0)
 s.text('Bring your\nspreadsheets.',.18,.30,.033,start=18,bold=True)
 s.text('Keep the context.',.18,.16,.022,start=55)
 s.media(A/'spreadsheets-held.mp4',x=ramp(1.3,.66,0,31),y='.51',size=ramp(.72,.66,0,31),start=0)
 s.text('Your sellers, together.',.66,.92,.034,start=16,bold=True)
 # The actual page moves closer after the search finishes, focusing attention.
 s.merge(s.bg('FocusPaper',BLUE),gate(156,s.n,s.n))
 s.media(A/'spreadsheets-held.mp4',x=ramp(.66,.5,157,190),y=ramp(.51,.43,157,190),size=ramp(.66,1.10,157,190),start=156,viewport=(.5,.48,.91,.70))
 s.text('Find the right building.',.5,.93,.038,start=176,bold=True)
 s.text('Your sellers. Their property context.',.5,.075,.025,start=196)
 specs.append(s.finish())
 # 23–32: the same market context; actual asking-price drop cards.
 s=Scene('03-market',9,PEACH)
 s.text('Know what changed.',.5,.93,.039,start=0,bold=True)
 s.media(A/'market-held.mp4',x=f'{ramp(-.65,.5,0,27)}+.24*{ease(90,135)}',y=f'.48-.08*{ease(90,135)}',size=f'{ramp(.78,.89,0,30)}+.66*{ease(90,135)}',start=0,viewport=(.5,.48,.91,.74))
 s.text('Asking-price changes, in view.',.5,.075,.025,start=50,end=235)
 s.text('A reason for your next conversation.',.5,.075,.025,start=244)
 specs.append(s.finish())
 # 32–43: real assistant answer; narrator describes type/voice entry, no dubbed fake response.
 s=Scene('04-assistant',11,LILAC)
 s.panel(PAPER,.28,.50,.49,.88,start=0,dx=-.45)
 s.media(A/'phone.png',x='.27',y='.62',size=ramp(.2,.70,0,30),start=0,end=115)
 s.text('Type a question.',.28,.29,.043,start=14,end=95,bold=True)
 s.text('Or start talking.',.28,.22,.030,start=50,end=122)
 s.media(A/'happy.png',x='.27',y='.67',size=ramp(.65,.70,109,145),start=109)
 s.text('Your market.\nYour next step.',.28,.30,.041,start=119,bold=True)
 s.media(A/'assistant-held.mp4',x=ramp(1.15,.74,8,38),y='.50',size='1.04',start=8,viewport=(.74,.50,.282,.845))
 s.text('Ask Repeat AI',.73,.94,.025,start=30,bold=True)
 specs.append(s.finish())
 # 43–53: a live editable template becomes a WhatsApp preview; no send is depicted.
 s=Scene('05-followup',10,SAGE)
 s.text('Your words. Their context.',.5,.93,.038,start=0,bold=True)
 s.media(A/'followup-held.mp4',x=f'.5-.44*{ease(141,189)}',y=f'{ramp(-.6,.48,0,28)}-.30*{ease(141,189)}',size=f'.88+.92*{ease(141,189)}',start=0,viewport=(.5,.48,.92,.74))
 s.text('Start with your own wording.',.5,.075,.025,start=30,end=146)
 s.text('Preview it with their property details.',.5,.075,.025,start=156)
 specs.append(s.finish())
 # 53–60: real picker interaction, with unsaved state visible.
 s=Scene('06-schedule',7,BLUE)
 s.text('Give your week a plan.',.5,.93,.038,start=0,bold=True)
 s.media(A/'schedule-held.mp4',x=f'{ramp(1.4,.5,0,25)}+.24*{ease(105,147)}',y=f'.46+.04*{ease(105,147)}',size=f'.91+.5*{ease(105,147)}',start=0,viewport=(.5,.46,.92,.72))
 s.text('Choose a day. Choose a building.',.5,.075,.025,start=70)
 specs.append(s.finish())
 # 60–72: actual integration settings, then staggered AI-tool cards.
 s=Scene('07-integrations',12,PEACH)
 s.text('Bring your tools along.',.5,.93,.038,start=0,bold=True)
 s.media(A/'integrations-held.mp4',x=ramp(-.5,.5,0,28),y='.49',size='.88',start=0,end=235,viewport=(.5,.49,.645,.704))
 for i,(label,col) in enumerate([('Claude',LILAC),('ChatGPT',SAGE)]):
  x=.30+i*.40;st=211+i*10
  s.panel(col,x,.49,.35,.43,start=st,dy=-.60)
  s.text(label,x,.53,.061,start=st+11,bold=True)
  s.text('MCP connection',x,.38,.025,start=st+24)
 s.text('Sheets  ·  Excel  ·  Email  ·  Calendars',.5,.075,.023,start=50,end=222)
 s.text('Keep using the tools you know.',.5,.075,.025,start=246)
 specs.append(s.finish())
 # 72–82: surfaces enter independently.
 s=Scene('08-platforms',10,SAGE)
 s.text('Web. Windows. Mobile.',.5,.93,.041,start=0,bold=True)
 s.panel(PAPER,.33,.49,.60,.74,start=0,dx=-.7)
 s.media(A/'dashboard-held.mp4',x=ramp(-.6,.33,0,30),y='.48',size='.58',start=0)
 s.panel(PAPER,.81,.49,.28,.74,start=18,dy=-.8)
 s.media(A/'mobile-canvas.png',x='.81',y=ramp(-.5,.49,18,48),size='.93',start=18)
 s.text('At your desk',.33,.075,.026,start=30)
 s.text('Between viewings',.81,.075,.026,start=55)
 specs.append(s.finish())
 # 82–90: moving illustration clears to the official brand lockup.
 s=Scene('09-close',8)
 s.media(A/'walking.png',x=ramp(.1,.28,0,110),y='.48',size='.83',start=0,end=118)
 s.text('Less admin.',.63,.62,.055,start=10,end=118,bold=True,write=True)
 s.text('More useful conversations.',.63,.43,.036,start=46,end=118,write=True)
 s.merge(s.bg('BrandBackground',INK),ease(108,133))
 s.media(A/'brand-lockup.png',x='.5',y='.56',size=ramp(.86,1,118,148),start=118)
 s.text('repeatai.org',.5,.35,.033,start=150,color=PAPER)
 specs.append(s.finish())
 record=0
 for row in specs:row['record_frame']=record;record+=row['frames']
 (OUT/'scene-manifest.json').write_text(json.dumps(specs,indent=2)+'\n')
 print(f'{len(specs)} native Fusion scenes; {record/30:.1f} seconds; {sum(x["nodes"] for x in specs)} nodes')

if __name__=='__main__':
 import sys
 if '--assets' in sys.argv:prepare_assets()
 build()
