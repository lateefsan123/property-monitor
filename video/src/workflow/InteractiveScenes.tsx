import React, {useLayoutEffect,useRef} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {IconArrowLeft,IconLink,IconFileSpreadsheet,IconPlus,IconX,IconCheck,IconPhoto} from '@tabler/icons-react';
import {Mic, X, Captions, ArrowUp} from 'lucide-react';
import SpreadsheetListRow from '../../../src/features/seller-signal/components/SpreadsheetListRow';
import {DEFAULT_MESSAGE_TEMPLATE} from '../../../src/features/seller-signal/insight-utils';
import {ASSISTANT_PROMPTS} from '../../../shared/assistant-prompts';
import {AppHeader,leads} from './SellerScenes';
import {typed,TypedField} from './typing';
import {pos,tween,Cursor} from './primitives';
const noop=()=>{};

// Frame-controlled equivalent of NewSpreadsheetModal.UrlTab; the app owns the CSS.
export function ImportScene(){
 const f=useCurrentFrame(), choice=f<65, scan=f>=218&&f<238, picker=f>=238, selected=f>=283, complete=f>=348;
 const url=typed('https://docs.google.com/spreadsheets/d/downtown-leads',f,80,2);
 return <AbsoluteFill className="app-shell"><AppHeader page="Spreadsheets"/>
 {complete?<div style={{...pos(390,150),width:1140}}><div className="ss-list-toolbar"><label className="ss-list-search"><input readOnly placeholder="Search spreadsheets"/></label><button className="ss-list-add"><IconPlus size={18}/>Add spreadsheet</button></div>{leads.map(l=><SpreadsheetListRow key={l.id} name={l.building} count={1} onClick={noop} onToggleFavorite={noop} onTogglePin={noop} onToggleSelect={noop}/>)}</div>:
 <div style={{...pos(480,140),width:640,transform:'scale(1.5)',transformOrigin:'top left'}}><div className="lead-modal new-sheet-modal" style={{maxHeight:580}}>
  <div className="lead-modal-header"><div className="lead-modal-title-block">{!choice&&<button className="new-sheet-back"><IconArrowLeft size={18}/></button>}<h2 className="lead-modal-name">{choice?'Add a spreadsheet':'From a Google Sheet URL'}</h2></div><button className="lead-modal-close"><IconX size={16}/></button></div>
  <div className="lead-modal-body">{choice?<div className="new-sheet-choice">{[['URL to spreadsheet','Paste a Google Sheet link.',IconLink],['Import Excel (.xlsx)','Upload an Excel or CSV file.',IconFileSpreadsheet]].map(([title,desc,Icon])=><button key={title as string} className="new-sheet-choice-card"><span className="new-sheet-choice-icon">{React.createElement(Icon as any,{size:22})}</span><span className="new-sheet-choice-text"><span className="new-sheet-choice-title">{title as string}</span><span className="new-sheet-choice-desc">{desc as string}</span></span></button>)}</div>:
   <div className="new-sheet-form"><div className="new-sheet-input-row"><TypedField className="new-sheet-url" value={url} active={f>=75&&f<210} placeholder="Paste your Google Sheet link"/><button className="new-sheet-submit" disabled={!url||scan||f>=328||(picker&&!selected)}>{scan||f>=328?<span className="new-sheet-spinner" style={{animation:'none',transform:`rotate(${f*14}deg)`}}/>:<IconPlus size={18}/>}</button></div>
    {picker?<div className="new-sheet-building-picker"><div className="new-sheet-building-summary"><strong>Select buildings</strong><span>{selected?8:0} selected · {selected?8:0} rows · {selected?8:0} phone entries</span><small>Each building becomes its own spreadsheet card. You can add up to 10 more.</small></div><input className="new-sheet-building-search" readOnly placeholder="Search buildings"/><div className="new-sheet-building-actions"><button>Select visible</button><button>Clear</button></div><div className="new-sheet-building-list">{leads.map(l=><label key={l.id} className="new-sheet-building-option"><input type="checkbox" checked={selected} readOnly/><span>{l.building}</span><small>1 rows · 1 phones</small></label>)}</div></div>:
    <div className="new-sheet-instructions"><h3 className="new-sheet-instructions-title">How to get your spreadsheet link</h3><ol className="new-sheet-steps">{[<>Open your sheet at <strong>sheets.google.com</strong> (or upload an Excel file via <strong>File → Import</strong>).</>,<>Click <strong>Share</strong> in the top right and set access to <em>Anyone with the link</em>.</>,<>Copy the URL from your browser’s address bar and paste it above.</>].map((x,i)=><li key={i}><span className="new-sheet-step-num">{i+1}</span><span className="new-sheet-step-text">{x}</span></li>)}</ol></div>}
   </div>}
  </div></div></div>}
 {f>=35&&f<72&&<Cursor x={tween(f,35,60,1370,950)} y={300} click={Math.max(0,1-Math.abs(f-65)/6)}/>}
 {f>=195&&f<239&&<Cursor x={tween(f,195,215,980,1395)} y={290} click={Math.max(0,1-Math.abs(f-218)/6)}/>}
 {f>=260&&f<305&&<Cursor x={tween(f,260,280,1395,600)} y={486} click={Math.max(0,1-Math.abs(f-283)/6)}/>}
 {f>=305&&f<349&&<Cursor x={tween(f,305,325,600,1395)} y={tween(f,305,325,486,290)} click={Math.max(0,1-Math.abs(f-328)/6)}/>}
 </AbsoluteFill>;
}

// Same editor/library/preview structure and classes as MessageTemplatesPanel.
export function Templates(){
 const f=useCurrentFrame(),fresh=f>=35,saved=f>=480;
 const name=f<45?'Transaction update':typed('Building update',f,45,2);
 let content=DEFAULT_MESSAGE_TEMPLATE;
 if(f>=115){content=typed('Hi ',f,120,3);if(f>=145)content+='{{name}}';if(f>=160)content+=typed(',\n\nHere are the latest sales in ',f,160,2);if(f>=250)content+='{{building}}.';if(f>=280)content+='\n\n{{transactions}}';if(f>=300)content+=typed('\n\nWould you like an updated valuation?',f,300,2);}
 const preview=content.replaceAll('{{name}}','Alex').replaceAll('{{building}}','Forte 2').replaceAll('{{transactions}}','2 bed · AED 2.9M · 992 sqft').trim();
 const editingName=f>=45&&f<100,editingBody=f>=115&&f<430;
 return <AbsoluteFill className="app-shell"><AppHeader page="Sellers"/><div className="message-template-overlay"><section className="message-template-modal">
  <header className="message-template-modal-header"><h1>Message templates</h1><button className="message-template-close"><IconX size={26}/></button></header>
  <div className="message-template-modal-body"><div className="message-template-workspace">
   <nav className="message-template-library"><button className="message-template-new"><IconPlus size={22}/>New template</button><button className={!fresh?'is-selected':''}><span>Transaction update</span><IconCheck className="message-template-default" size={20}/></button>{saved&&<button className="is-selected"><span>Building update</span></button>}</nav>
   <div className="message-template-editor"><div className="message-template-name-row"><label className="message-template-name-field"><span>Template name</span><TypedField value={name} active={editingName} className="wf-template-name"/></label></div><label className="message-template-body-field"><span>Message</span><TypedField value={content} active={editingBody} multiline className="wf-template-body"/></label>
   <div className="message-template-token-field"><span>Insert variable</span><div className="message-template-token-row">{['{{name}}','{{building}}','{{transactions}}'].map((token,i)=><button key={token} style={{background:Math.abs(f-[145,250,280][i])<6?'var(--bg-hover)':undefined}}>{token}</button>)}</div></div>
   <div className="message-template-image-field"><span>Attached image <span className="message-template-optional">(optional)</span></span><button className="message-template-image-picker"><IconPhoto size={20}/>Add image</button></div></div>
   <aside className="message-template-live-preview"><h2 className="message-template-preview-head">Preview (WhatsApp)</h2><div className="message-template-chat-bubble"><p>{preview||'Your message preview will appear here.'}</p></div></aside>
  </div></div><footer className="message-template-actions"><div>{saved&&<p className="message-template-notice">Template saved.</p>}</div><button className="message-template-save">{f>=455&&f<480?'Saving…':!fresh||saved?'Save changes':'Create template'}</button></footer>
 </section></div>
 {f<45&&<Cursor x={tween(f,0,30,1120,385)} y={235} click={Math.max(0,1-Math.abs(f-35)/6)}/>}
 {f>=38&&f<50&&<Cursor x={tween(f,38,45,385,780)} y={265} click={Math.max(0,1-Math.abs(f-45)/5)}/>}
 {f>=100&&f<122&&<Cursor x={800} y={420} click={Math.max(0,1-Math.abs(f-110)/5)}/>}
 {[145,250,280].map((t,i)=>f>=t-12&&f<t+10?<Cursor key={t} x={[640,748,882][i]} y={686} click={Math.max(0,1-Math.abs(f-t)/6)}/>:null)}
 {f>=432&&f<485&&<Cursor x={tween(f,432,452,950,1510)} y={tween(f,432,452,620,947)} click={Math.max(0,1-Math.abs(f-455)/6)}/>}
 </AbsoluteFill>;
}

const request='Create a new template named Viewing follow-up: Hi {{name}}, here are the latest transactions in {{building}}. {{transactions}} Would you like an updated valuation? Prepare it for my review.';
// MatrixOrb's dot geometry, evaluated on Remotion time rather than requestAnimationFrame.
function Orb({frame}:{frame:number}){const size=104,half=5,spacing=size*.74/10;return <svg className="assistant-matrix-orb" width={size} height={size} style={{display:'block'}}>{Array.from({length:121},(_,i)=>{const x=i%11,y=Math.floor(i/11),d=Math.hypot((x-half)/half,(y-half)/half),scale=.88;const r=spacing*.6*Math.exp(-d*d*1.7)*(.62+.12*Math.sin(frame/30*1.05-d*2.4))*scale;return d<=1.12&&r>=.5?<circle key={i} cx={size/2+(x-half)*spacing*scale} cy={size/2+(y-half)*spacing*scale} r={r} fill="currentColor"/>:null})}</svg>}
export function Assistant(){
 const f=useCurrentFrame(),sent=f>=320,review=f>=350;
 const body=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(body.current)body.current.scrollTop=Math.max(0,body.current.scrollHeight-body.current.clientHeight)*tween(f,355,380);},[f]);
 const draft=sent?'':typed(request,f,40,1);
 return <AbsoluteFill className="app-shell"><div style={{...pos(170,365),width:620}}><h1 style={{fontSize:64,margin:0}}>Ask Repeat</h1><p style={{fontSize:28,lineHeight:1.7,color:'var(--text-muted)'}}>Find sellers<br/>Check market data<br/>Prepare changes</p></div>
 <div className="repeat-assistant is-open" style={{position:'absolute',left:1040,top:65,right:'auto',bottom:'auto',transform:'scale(1.35)',transformOrigin:'top left'}}><section className="assistant-panel"><header className="assistant-header"><span>Repeat AI</span><div className="assistant-header-actions"><button>+</button><button><X size={20}/></button></div></header>
 <div className="assistant-body" ref={body}>{!sent?<><Orb frame={f}/><h2>What can I help with?</h2><p className="assistant-hint">Sales, market insights and your sellers.<br/>Type a message or talk to me.</p><div className="assistant-suggestions">{ASSISTANT_PROMPTS.map(p=><button key={p}>{p}</button>)}</div></>:<><div className="assistant-chat-log"><p className="assistant-chat-message is-user">{request}</p>{!review?<p>Thinking…</p>:<p className="assistant-chat-message is-assistant">Ready for review below. Nothing has been changed or sent yet.</p>}</div>{review&&<div className="assistant-approval" style={{opacity:tween(f,350,360)}}><h3>Create template “Viewing follow-up”?</h3><p>{'Hi {{name}}, here are the latest transactions in {{building}}. {{transactions}} Would you like an updated valuation?\n\nSaved as a new template. Your default template and broker image remain unchanged. No message is sent.'}</p><button>Confirm change</button><button>Discard</button></div>}</>}
 </div><footer className="assistant-footer"><div className={`assistant-composer${f>=35&&!sent?' wf-is-typing':''}`}><TypedField multiline value={draft} active={f>=35&&!sent} placeholder="Ask Repeat anything…" className="wf-assistant-draft"/><button disabled={!draft||sent}><ArrowUp size={20}/></button></div><div className="assistant-controls"><button><Captions size={22}/></button><button className="assistant-start" disabled={review}><Mic size={20}/>Let’s talk<ArrowUp size={18}/></button></div><small>AI assistant · Messages and requested app details shared with OpenAI.</small></footer>
 </section></div>
 {f>=295&&f<329&&<Cursor x={tween(f,295,315,1330,1530)} y={815} click={Math.max(0,1-Math.abs(f-320)/6)}/>}
 </AbsoluteFill>;
}
