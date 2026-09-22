import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {IconMenu2,IconHome,IconTable,IconUsers,IconCalendar,IconSun,IconPlus,IconDownload} from '@tabler/icons-react';
import MessageTemplatesPanel from '../../src/features/seller-signal/components/MessageTemplatesPanel';
import NewSpreadsheetModal from '../../src/features/seller-signal/components/NewSpreadsheetModal';
import SpreadsheetListRow from '../../src/features/seller-signal/components/SpreadsheetListRow';
import SchedulePage from '../../src/features/schedule/SchedulePage';
import {DEFAULT_MESSAGE_TEMPLATE} from '../../src/features/seller-signal/insight-utils';
import {sources,demoClient} from './fixtures';
import '../../src/styles/app-shell.css';
import '../../src/styles/seller-records.css';
import '../../src/styles/seller-toolbar.css';
import '../../src/styles/seller-panels.css';
import '../../src/styles/lead-modal.css';
import '../../src/styles/seller-message-templates.css';
import '../../src/styles/spreadsheet-minimal-list.css';
import './recording.css';

function App(){
 const initial=new URLSearchParams(location.search).get('scene')||'import';
 const [page,setPage]=useState(initial),[adding,setAdding]=useState(initial==='import'),[imported,setImported]=useState([]);
 const [templates,setTemplates]=useState([{id:'default',name:'Transaction update',content:DEFAULT_MESSAGE_TEMPLATE,is_default:true}]);
 const [menu,setMenu]=useState(false);
 const title=page==='schedule'?'Schedule':page==='import'?'Spreadsheets':'Sellers';
 return <div className="app-shell"><header className="capture-header"><button aria-label="Open menu" onClick={()=>setMenu(!menu)}><IconMenu2 size={22}/></button><IconHome size={18}/><span>/</span>{page==='schedule'?<IconCalendar size={18}/>:page==='import'?<IconTable size={18}/>:<IconUsers size={18}/>}<strong>{title}</strong><div style={{marginLeft:'auto',display:'flex',gap:20,alignItems:'center'}}><button className="capture-download"><IconDownload size={18}/>Download app</button><IconSun size={18}/></div></header>
 {menu&&<aside className="sidenav capture-nav">{[['Spreadsheets','import'],['Message template','templates'],['Schedule','schedule']].map(([label,key])=><button className="sidenav-link" key={key} onClick={()=>{setPage(key);setMenu(false)}}>{label}</button>)}</aside>}
 {page==='import'&&<main className="capture-sheets"><div className="ss-list-toolbar"><label className="ss-list-search"><input placeholder="Search spreadsheets"/></label><button className="ss-list-add" onClick={()=>setAdding(true)}><IconPlus size={18}/>Add spreadsheet</button></div>{imported.map(s=><SpreadsheetListRow key={s.id} name={s.label} count={4} onClick={()=>{}} onToggleFavorite={()=>{}} onTogglePin={()=>{}} onToggleSelect={()=>{}}/>)}</main>}
 {page==='import'&&adding&&<NewSpreadsheetModal onClose={()=>setAdding(false)} submitting={false} onSubmit={async(url)=>{setImported(list=>[...list,sources.find(s=>url.includes(s.id))]);return true}}/>}
 {page==='templates'&&<MessageTemplatesPanel templates={templates} loading={false} saving={false} onClose={()=>setPage('import')} onSave={async(value)=>{const next={...value,id:'building-update'};setTemplates(list=>[...list,next]);return next}}/>}
 {page==='schedule'&&<div style={{paddingTop:56}}><SchedulePage userId="recording-demo" client={demoClient}/></div>}
 </div>
}
const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById('root')).render(<QueryClientProvider client={cache}><App/></QueryClientProvider>);
// Local capture transport: the only payloads accepted are JPEG frames from this tab.
window.saveCaptureFrame=async payload=>{const r=await fetch('/capture-frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw Error('Frame save failed')};
const pointer=document.createElement('div');pointer.className='recording-pointer';pointer.innerHTML='<svg width="23" height="30" viewBox="0 0 23 30"><path d="M2 2 L2 23 L8 18 L13 28 L17 26 L12 16 L21 16 Z" fill="white" stroke="#252525" stroke-width="1.5"/></svg>';document.body.append(pointer);
document.addEventListener('mousemove',event=>{const parent=document.querySelector('dialog[open]')||document.body;if(pointer.parentNode!==parent)parent.append(pointer);pointer.style.left=event.clientX+'px';pointer.style.top=event.clientY+'px';pointer.style.opacity='1'});
document.addEventListener('keydown',()=>{pointer.style.opacity='0'});
