from pathlib import Path
import json, re, html
from collections import Counter
ROOT=Path(__file__).resolve().parent
series=[]; data=[]
starters={1,10,41,64,81,101,107,121,136,141,161,181}
for raw in (ROOT/'seeds.txt').read_text(encoding='utf-8-sig').splitlines():
 if not raw.strip():continue
 if raw.startswith('@'):
  name,feature,proof=raw[1:].split('|')
  series.append(name); group=len(series)
  continue
 parts=raw.split('|')
 assert len(parts)==5,raw
 hook,tension,turn,reaction,close=parts
 n=len(data)+1
 pov='Seller' if group<=3 else 'Split POV' if group<=5 else 'Agent' if group<=9 else 'Product / founder'
 if group<=3:
  shots=[('0–2s','Seller phone / reaction close-up',f'On-screen: {hook}'),('2–7s','Fictional incoming chat',f'Generic broker message: “{tension}”'),('7–13s','Relevant alternative chat',f'Broker: “{turn}”'),('13–18s','Seller reply / reaction',f'Seller: “{reaction}”'),('18–25s','Real mobile workflow insert, then small end card',f'{proof} End line: “{close}”')]
  format_name='The other WhatsApps'
 elif group<=5:
  shots=[('0–2s','Seller-side hook',f'On-screen: {hook}'),('2–7s','Before: seller phone / broker at desk',f'Friction: “{tension}”'),('7–13s','After: broker checks the appropriate setting',f'Broker: “{turn}”'),('13–18s','Seller-side reaction',f'Seller: “{reaction}”'),('18–25s','Actual mobile setting/result and end line',f'{proof} End line: “{close}”')]
  format_name='Same moment, two sides'
 elif group==7:
  shots=[('0–2s','Both lanes: same actor, room and task',f'On-screen: {hook}'),('2–7s','Left lane',tension),('7–13s','Right lane with actual mobile proof insert',turn),('13–18s','Both lanes resolve the same task',f'VO: “{reaction}”'),('18–25s','One real result and short end card',f'{proof} End line: “{close}”')]
  format_name='Same broker, two mornings'
 elif group==9:
  shots=[('0–2s','Open mid-conversation, actor A',f'On-screen: {hook}'),('2–7s','Actor A, first camera position',tension),('7–13s','Actor B, second camera position',turn),('13–18s','Reaction back to A',reaction),('18–25s','One actual UI insert, then punchline',f'{proof} End line: “{close}”')]
  format_name='Two brokers, one problem'
 elif group==10:
  shots=[('0–2s','Question on screen / host',hook),('2–7s','Host or concise voiceover',tension),('7–13s','Actual mobile interaction',turn),('13–18s','Visible result / clarification',reaction),('18–25s','Close and optional brief product proof',f'{proof} End line: “{close}”')]
  format_name='Show me the setting'
 else:
  shots=[('0–2s','Agent in the activity named by the hook',f'On-screen: {hook}'),('2–7s','Interrupted activity / agent to camera',f'Agent: “{tension}”'),('7–13s','Brief actual mobile workflow insert',f'Agent: “{turn}”'),('13–18s','Return to and finish the original activity',f'Agent: “{reaction}”'),('18–25s','Proof if needed, then understated end card',f'{proof} End line: “{close}”')]
  format_name='Meanwhile, the broker'
 cta=['See how Repeat AI follow-ups work.','Watch the Repeat AI demo.','Explore the seller workspace.','See the workflow at repeatai.org.'][((n-1)//3)%4]
 question={'Seller':'What makes you open a broker’s message?','Agent':'Which part of your day keeps getting interrupted?','Split POV':'Which side of this feels familiar?','Product / founder':'Which control should we explain next?'}[pov]
 item={'id':f'RA-{n:03d}','series':name,'format':format_name,'perspective':pov,'feature':feature,'hook':hook,'dialogue':{'tension':tension,'turn':turn,'reaction':reaction,'closing_line':close},'target_duration':'20–30 seconds; adjust after read-through','status':'Draft — verify current UI and read aloud before production','starter':n in starters,'shots':[{'time':t,'visual':v,'script':s} for t,v,s in shots],'proof_instruction':proof,'cta':cta,'caption':f'{close} {cta}','story_frames':[hook,tension,turn,f'{close} {question}'],'whatsapp_status':f'{hook} {close} See the Repeat AI demo.','production_note':'Fictional dramatisation. Use real supported mobile UI and demo data. No invented results, automatic reply handling or guaranteed time savings. Configure and verify eligibility before depicting an automated send.'}
 data.append(item)
assert len(data)==200,len(data)
assert len({d['id'] for d in data})==200
assert len({d['hook'].casefold() for d in data})==200
assert len({tuple(d['dialogue'].values()) for d in data})==200
assert Counter(d['perspective'] for d in data)=={'Agent':80,'Seller':60,'Split POV':40,'Product / founder':20}
assert sum(d['starter'] for d in data)==12
(ROOT/'scripts.json').write_text(json.dumps({'created':'2026-10-23','version':1,'publication_state':'Drafts only; no media generated or posts scheduled','scripts':data},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
md=['# Repeat AI — 200 draft short scripts','Read README.md for the research, format recipes, production rules and claim boundaries. Every chat and scenario is fictional. Target durations are editorial guides, not measured timings.','## Starting candidates','\n'.join(f"- {d['id']}: {d['hook']} ({d['perspective']})" for d in data if d['starter'])]
for name in series:
 md += [f'\n# {name}\n']
 for d in [d for d in data if d['series']==name]:
  md += [f"## {d['id']} — {d['hook']}",f"**{d['perspective']} · {d['format']} · {d['target_duration']}**",f"Feature: {d['feature']}. {'STARTING CANDIDATE. ' if d['starter'] else ''}{d['status']}\n"]
  for s in d['shots']:md.append(f"- **{s['time']} — {s['visual']}:** {s['script']}")
  md += [f"\n**One CTA:** {d['cta']}",f"**Caption:** {d['caption']}",f"**Stories:** {' → '.join(d['story_frames'])}",f"**WhatsApp Status:** {d['whatsapp_status']}",f"**Production:** {d['production_note']}\n"]
(ROOT/'SCRIPTS.md').write_text('\n\n'.join(md).rstrip()+'\n',encoding='utf-8')
payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
template=(ROOT/'viewer-template.html').read_text(encoding='utf-8')
assert '__SCRIPT_DATA__' in template
(ROOT/'index.html').write_text(template.replace('__SCRIPT_DATA__',payload),encoding='utf-8')
print('Built 200 scripts, 10 collections, 6 formats, 12 starting candidates; unique IDs/hooks/dialogues and perspective totals verified.')
