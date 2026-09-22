"""Create the approved revision manifest without overwriting the previous cut."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
rows=json.loads((ROOT/'video/review/elevenlabs/final-narration.json').read_text(encoding='utf-8'))
rows=rows[1:]
for i,row in enumerate(rows,1):
    row['source']=f'final/voice/{i:02}.mp3'
    row['voiceOffset']=.55
    row['pauses']=[]
    if row['id']=='import':row.update(navigation=0,minSeconds=18,voiceOffset=.4)
    if row['id']=='sellers':row.update(navigation=2.4,voiceOffset=2.6)
    if row['id']=='templates':row.update(navigation=2)
    if row['id']=='schedule':row.update(navigation=2,minSeconds=23,pauses=[{'at':7.12,'duration':4}])
    if row['id']=='market':row.update(navigation=1.8,minSeconds=19)
    if row['id']=='integrations':
        row.update(minSeconds=26,source='revised/integrations.mp3',text='Connect Gmail or Outlook to read emails and draft replies, with each send confirmed by you. Your calendar brings in upcoming events. And through MCP, you can work with your Repeat AI account from Codex, Claude or ChatGPT. Ask for a seller, check recent WhatsApp messages, or update a lead, with changes sent to you for approval. So you can keep working in the assistant you already use.')
    if row['id']=='assistant':row.update(navigation=3.1,voiceOffset=.35,minSeconds=22)
    if row['id']=='platforms':row.update(minSeconds=6)
out=ROOT/'video/review/revised';out.mkdir(exist_ok=True)
(out/'narration.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
