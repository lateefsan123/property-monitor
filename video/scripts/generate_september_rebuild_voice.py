"""Narration for the reference-led Fusion rebuild, with editorial cue times."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'video/audio/september-rebuild'
LINES=[
 ('01-scattered',0.4,"There's always another update. Another spreadsheet. Another seller to get back to."),
 ('02-together',6.4,"Repeat A I brings your property work together, so the next conversation starts with the right context."),
 ('03-sellers',14.5,"Connect your spreadsheets. Keep your sellers, their properties, and your follow-ups in one place."),
 ('04-market',23.5,"Follow the buildings you cover. Spot asking-price changes, and see what's moved since you last checked."),
 ('05-assistant',32.5,"Need an answer? Type a question, or talk to Repeat A I. Get help with your market, your sellers, and your next step."),
 ('06-follow-up',43.5,"Make every follow-up feel personal. Start with your own wording, add the property context, and preview it for WhatsApp."),
 ('07-schedule',53.5,"Plan the week by building. Choose what to follow up, and when."),
 ('08-integrations',60.4,"Bring your tools along. Google Sheets and Excel. Gmail and Outlook. Calendars. Even Claude and Chat G P T, through an M C P connection."),
 ('09-platforms',72.5,"And keep going across web, Windows, and mobile. At your desk, between viewings, wherever the day takes you."),
 ('10-close',82.5,"Less admin. More useful conversations. Repeat A I.")
]

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 p=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M')
 rows=[]
 for name,start,text in LINES:
  a=np.concatenate([np.asarray(x.audio,dtype=np.float32) for x in p(text,voice='af_heart',speed=.96)])
  active=np.flatnonzero(np.abs(a)>.002)
  a=a[max(0,active[0]-1800):min(len(a),active[-1]+4800)]
  a*=min(1,.84/max(np.max(np.abs(a)),.001))
  sf.write(OUT/f'{name}.wav',a,24000,subtype='PCM_16')
  rows.append(dict(name=name,start=start,text=text,duration=len(a)/24000,voice='af_heart',speed=.96))
  print(name,round(len(a)/24000,3),flush=True)
 (OUT/'manifest.json').write_text(json.dumps(rows,indent=2)+'\n')
 for i,r in enumerate(rows[:-1]):
  assert r['start']+r['duration']<rows[i+1]['start'], f'Overlapping voice: {r["name"]}'

if __name__=='__main__':main()
