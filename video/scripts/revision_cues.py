"""Align known copy to ASR word boundaries; discard transcription hallucinations.

Visual cue times refer to phrases in the recording. Canonical frames refer to the
deterministic app scenes, so voice edits do not proportionally stretch all actions.
"""
from pathlib import Path
import json,re,difflib
ROOT=Path(__file__).resolve().parents[2]
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
def align_words(row,trim,edit="revised"):
    raw=json.loads((ROOT/f'video/review/{edit}/words-{row["id"]}.json').read_text())
    expected=row['text'].split(); result=[None]*len(expected)
    matcher=difflib.SequenceMatcher(None,[norm(w) for w in expected],[norm(w['word']) for w in raw],autojunk=False)
    for block in matcher.get_matching_blocks():
        for k in range(block.size):result[block.a+k]=raw[block.b+k]
    missing=[expected[i] for i,w in enumerate(result) if w is None]
    print(row['id'],'alignment substitutions:',missing,flush=True)
    # Only spelling/tokenisation mismatches interpolate between measured neighbours.
    for i,w in enumerate(result):
        if w is not None:continue
        before=next((result[j]['end'] for j in range(i-1,-1,-1) if result[j]),0)
        end=next((j for j in range(i+1,len(result)) if result[j]),len(result))
        after=result[end]['start'] if end<len(result) else before+.2*(end-i)
        result[i]={'start':before,'end':before+max(.04,after-before)/(end-i)}
    def shift(t):return max(0,t-trim)+row['voiceOffset']+sum(p['duration'] for p in row['pauses'] if t>=p['at'])
    return [dict(word=text,start=shift(w['start']),end=shift(w['end'])) for text,w in zip(expected,result)]

def scene_cues(row,words):
    def phrase(text,offset=0):
        target=[norm(x) for x in text.split()];tokens=[norm(w['word']) for w in words]
        for i in range(len(tokens)-len(target)+1):
            if tokens[i:i+len(target)]==target:return words[i]['start']+offset
        raise ValueError(f'Missing cue phrase {text!r} in {row["id"]}')
    end=row['frames']/30-1/30;nav=row['navigation'];id=row['id']
    cues=[(nav,0)]
    if row.get('capture'):
        return [[round(nav*30),0],[row['frames']-1,round((end-nav)*30)]]
    if id=='import':
        cues += [(1.9,35),(2.25,65),(2.5,80),(phrase('Choose',-.75),210),(phrase('Choose',-.35),238),(phrase('Choose'),260),(phrase('the buildings',.2),283),(phrase('and Repeat AI',.2),328),(phrase('brings in your leads'),348),(end,419)]
    elif id=='sellers':
        cues += [(phrase('Filter',-.5),110),(phrase('prospects'),180*28/37),(phrase('for sale'),270*28/37),(phrase('not interested',.7),360*28/37),(phrase('Sold today'),390*28/37),(phrase('Open a seller'),540*28/37),(phrase('what sold'),660*28/37),(phrase('With WhatsApp'),870*28/37),(end,839)]
    elif id=='templates':
        cues += [(phrase('In Message',-.3),30),(phrase('In Message'),35),(phrase('write your own',-.65),45),(phrase('write your own',-.08),110),(phrase('write your own'),120),(phrase("seller's name"),145),(phrase('their building'),250),(phrase('latest transactions'),280),(phrase('latest transactions',.3),300),(phrase('The preview',-.15),410),(phrase('so you can see'),430),(phrase('save it'),455),(phrase('save it',.6),480),(end,539)]
    elif id=='schedule':
        cues += [(phrase('Schedule lets'),55*24/26),(3.5,100*24/26),(5.4,230*24/26),(7.25,340*24/26),(9.55,465*24/26),(phrase("Here we've added",-.45),555*24/26),(phrase('Save the plan',-.75),585*24/26),(phrase('Save the plan'),630*24/26),(end,719)]
    elif id=='market':
        cues += [(phrase('spot apartments'),60),(phrase('Open a building'),110),(phrase('then an apartment',.3),220),(phrase('You can follow'),360),(phrase('Activity'),427),(phrase("It's a useful",-.2),490),(end,599)]
    elif id=='assistant':
        cues += [(phrase('Type what you need',-.2),35),(phrase('Type what you need'),40),(8.9,225),(phrase('templates and scheduling'),295),(phrase('scheduling',.25),320),(phrase('Here',-.25),350),(phrase('Here',.25),380),(end,539)]
    elif id=='integrations':
        # New integration scene reads real scene time; cues still record the section change.
        cues += [(phrase('And through MCP'),210),(end,780)]
    else:cues += [(end,row['baseSeconds']*30-1)]
    assert all(a[0]<b[0] and a[1]<=b[1] for a,b in zip(cues,cues[1:])),(id,cues)
    return [[round(t*30),round(f)] for t,f in cues]
