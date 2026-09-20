import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Broker} from './RepeatAIIllustratedOpening';
// @ts-expect-error The product's existing JavaScript presentation components have no TS declarations.
import {MarketPanel, MessagePanel} from '../../src/features/seller-signal/components/LeadModalPanels';
import './repeat-ai-clean-film.css';

const P='#f6f2e9', I='#1e293b', M='#64748b', B='#e8e8e8';
const n=(f:number,k:number[],v:number[])=>interpolate(f,k,v,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const p=(f:number,a:number,b:number)=>n(f,[a,b],[0,1]);
const vis=(f:number,a:number,b:number,c:number,d:number)=>n(f,[a,b,c,d],[0,1,1,0]);
const noop=()=>{};
const lead={name:'Sara',building:'Marina Tower'};
const insight={status:'ready',locationName:'Marina Tower',count:1,avg:2400000,min:2400000,max:2400000,psf:1702,recentTransactions:[{id:'demo-1',date:'2026-09-18T12:00:00Z',locationLabel:'Marina Tower',price:2400000,beds:2,area:1410}]};
const intro='Hi Sara, a recent sale in Marina Tower:\n\n2 bed · 1,410 sq ft · AED 2.4M';
const closing='\n\nWant to discuss how yours compares?';
const tx=intro+closing;
const fileNames=['Marina sellers','Downtown owners','Palm contacts'];

const Window:React.FC<React.PropsWithChildren<{title:string;style?:React.CSSProperties}>>=({title,style,children})=><div style={{background:'#fff',border:`1px solid ${B}`,borderRadius:14,overflow:'hidden',boxShadow:'0 12px 32px #24242409',...style}}><div style={{height:54,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 23px',borderBottom:`1px solid ${B}`,fontSize:18,fontWeight:600}}>{title}<span style={{fontWeight:400,color:'#94a3b8',fontSize:21}}>×</span></div>{children}</div>;
const Rail:React.FC<{items:string[];active:string}>=({items,active})=><div style={{width:158,flexShrink:0,borderRight:`1px solid ${B}`,padding:12,boxSizing:'border-box'}}>{items.map(item=><div key={item} style={{padding:'12px 11px',fontSize:15,borderRadius:8,marginBottom:3,background:item===active?'#e8e8e8':undefined,color:item===active?I:M}}>{item}</div>)}</div>;
const SheetThumb:React.FC=()=> <div style={{height:112,background:'#fafafa',padding:15,boxSizing:'border-box'}}>{Array.from({length:5},(_,i)=><div key={i} style={{display:'flex',height:15,gap:9,borderBottom:'1px solid #e8e8e8'}}>{[62,39,29].map((w,j)=><div key={j} style={{width:w,height:3,marginTop:5,background:i===0?'#b9bec5':'#dfe2e6'}}/>)}</div>)}</div>;

export const RepeatAICleanProductFilm:React.FC=()=>{
  const f=useCurrentFrame();
  const files=vis(f,110,143,281,309), listings=vis(f,294,320,465,492);
  const details=vis(f,474,499,825,851), chat=vis(f,830,858,1068,1093);
  const automations=vis(f,1075,1102,1258,1286), end=p(f,1260,1295);
  const market=f<653;
  const message=intro+closing.slice(0,Math.round(p(f,713,774)*closing.length));
  const fileGather=p(f,112,151), sellerView=p(f,239,255);
  return <AbsoluteFill style={{background:P}}>
    <Audio src={staticFile('video/repeat-ai-v6/mix.wav')}/>
    <div className="repeat-clean-film" style={{position:'absolute',width:960,height:540,transform:'scale(2)',transformOrigin:'top left',fontFamily:'Arial, sans-serif',color:I,overflow:'hidden'}}>
      {/* No storyboard labels or explanatory metadata is burnt into this cut. */}
      <div style={{position:'absolute',left:60,top:59,fontSize:38,fontWeight:600,letterSpacing:-1,opacity:1-p(f,107,136)}}>Too much to keep up with.</div>
      <div style={{position:'absolute',left:n(f,[0,110,148,1250,1295],[350,350,1000,1000,60]),top:125,width:410,height:410,opacity:vis(f,-1,0,114,146)+end}}><Broker frame={f}/></div>
      <Img src={staticFile('video/repeat-ai-v4/notes.png')} style={{position:'absolute',left:65,top:175,width:205,opacity:vis(f,4,23,110,141),transform:`rotate(${Math.sin(f/24)*2}deg)`}}/>
      <Img src={staticFile('video/repeat-ai-v4/property.png')} style={{position:'absolute',left:728,top:132,width:220,opacity:vis(f,28,47,112,144)}}/>

      {/* One persistent workspace: spreadsheets → sellers → listing detail. */}
      <div style={{position:'absolute',left:70+n(f,[110,146],[70,0]),top:70,width:820,height:400,opacity:Math.max(files,listings)}}>
        <Window title={f<241?'Spreadsheets':f<294?'Sellers':'Listings'} style={{height:400}}>
          <div style={{display:'flex',height:346}}><Rail items={['Home','Sellers','Listings','Spreadsheets','Message template']} active={f<241?'Spreadsheets':f<294?'Sellers':'Listings'}/>
            <div style={{flex:1,position:'relative',padding:24}}>
              <div style={{position:'absolute',inset:24,opacity:files*(1-sellerView)}}><div style={{display:'flex',justifyContent:'space-between',fontSize:16,marginBottom:20}}><span>All spreadsheets</span><span style={{fontSize:14}}>＋ New spreadsheet</span></div><div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:13}}>{fileNames.map((name,i)=><div key={name} style={{border:`1px solid ${B}`,borderRadius:10,overflow:'hidden',transform:`translateY(${(1-p(f,141+i*10,161+i*10))*35}px)`,opacity:p(f,141+i*10,161+i*10)}}><SheetThumb/><div style={{padding:13,fontSize:15}}>{name}</div></div>)}</div></div>
              <div style={{opacity:files*sellerView,position:'absolute',inset:24}}><div style={{fontSize:16,marginBottom:24}}>Marina Tower　⌄</div><div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr .8fr',fontSize:12,color:M,borderBottom:`1px solid ${B}`,padding:12}}><span>NAME</span><span>BUILDING</span><span>STATUS</span></div>{['Sara','Adam','Maya'].map((name,i)=><div key={name} style={{display:'grid',gridTemplateColumns:'1.2fr 1fr .8fr',fontSize:16,padding:'18px 12px',borderBottom:`1px solid ${B}`,background:i===0?'#f5f5f5':undefined}}><span>{name}</span><span style={{fontSize:14}}>Marina Tower</span><span style={{fontSize:14}}>Prospect</span></div>)}</div>
              <div style={{opacity:listings,position:'absolute',inset:24}}><div style={{display:'flex',justifyContent:'space-between',fontSize:17}}><span>Marina Tower</span><span style={{fontSize:14,padding:'5px 10px',background:'#f0f0f0',borderRadius:5}}>Price drops</span></div><div style={{border:`1px solid ${B}`,borderRadius:10,marginTop:26,padding:24}}><div style={{fontSize:22,fontWeight:600}}>2 bedroom apartment</div><div style={{color:M,fontSize:15,marginTop:10}}>Marina Tower · 1,410 sq ft</div><div style={{display:'flex',alignItems:'baseline',gap:20,marginTop:27}}><span style={{fontSize:30,fontWeight:600}}>AED {Math.round(n(f,[348,378],[2600000,2470000])).toLocaleString('en-US')}</span><span style={{fontSize:15,color:M,textDecoration:'line-through',opacity:p(f,350,372)}}>2,600,000</span></div></div></div>
            </div>
          </div>
        </Window>
      </div>
      {/* Loose source documents become the spreadsheet tiles. */}
      {fileNames.map((name,i)=><div key={name} style={{position:'absolute',left:n(fileGather,[0,1],[65+i*13,252+i*195]),top:n(fileGather,[0,1],[370+i*34,195]),width:n(fileGather,[0,1],[246,175]),opacity:vis(f,35+i*16,51+i*16,139+i*7,155+i*7),transform:`rotate(${(1-fileGather)*[-5,3,-2][i]}deg)`,background:'#fff',border:`1px solid ${B}`,borderRadius:9,padding:'18px 14px',fontSize:17,boxSizing:'border-box'}}>{name}.xlsx</div>)}

      {/* The product's actual MarketPanel and MessagePanel render inside its tab layout. */}
      <div style={{position:'absolute',left:70+n(f,[474,500],[80,0]),top:70,width:820,opacity:details,transform:`translateX(${n(f,[825,851],[0,145])}px) scale(${n(f,[825,851],[1,.93])})`}}>
        <Window title="Sara" style={{height:400}}><div style={{position:'absolute',left:76,top:27,fontSize:13,fontWeight:400,color:M}}>Marina Tower</div><div style={{display:'flex',height:290}}><Rail items={['Overview','Data quality','Market data','Message','Notes']} active={market?'Market data':'Message'}/><div style={{padding:'21px 23px',width:660,boxSizing:'border-box'}}>
          {market?<MarketPanel insight={insight} lead={lead}/>:<MessagePanel edited={false} imageUrl={null} message={message} onChangeMessage={noop} onResetMessage={noop} onSelectTemplate={noop} selectedTemplateId="default" templateOptions={[{id:'default',label:'Transaction update'}]} whatsappConnected/>}
        </div></div><div style={{height:55,borderTop:`1px solid ${B}`,display:'flex',justifyContent:'flex-end',alignItems:'center',paddingRight:20,opacity:market?0:1}}><span style={{padding:'11px 18px',borderRadius:8,background:'#25d366',color:'#fff',fontSize:16,fontWeight:600,transform:`scale(${n(f,[803,811,820],[1,.95,1])})`}}>Send via WhatsApp</span></div></Window>
      </div>

      {/* Clean conversation shot: just the chat, no secondary slogans or badges. */}
      <div style={{position:'absolute',left:n(f,[830,861],[395,225]),top:50,width:510,height:440,opacity:chat,border:'1px solid #d7d1c5',borderRadius:22,overflow:'hidden',background:'#ebe6db'}}>
        <div style={{background:'#fff',height:59,display:'flex',alignItems:'center',padding:'0 20px',gap:15,fontSize:19}}><span>‹</span><span style={{width:32,height:32,borderRadius:'50%',background:'#e7e7e7',display:'grid',placeItems:'center',fontSize:16}}>S</span><span>Sara</span><span style={{marginLeft:'auto',fontSize:18}}>⋮</span></div>
        <div style={{position:'absolute',top:83,left:59,right:19,borderRadius:'12px 0 12px 12px',background:'#dceccd',padding:19,whiteSpace:'pre-line',fontSize:20,lineHeight:1.4,transform:`translateY(${n(f,[842,869],[30,0])}px)`}}>{tx}<div style={{textAlign:'right',fontSize:11,color:'#60755a',marginTop:9}}>10:24　{f>889?'✓✓':'✓'}</div></div>
        <div style={{position:'absolute',top:299+n(f,[980,1000],[12,0]),left:18,right:91,borderRadius:'0 12px 12px 12px',background:'#fff',padding:'15px 18px',fontSize:19,opacity:p(f,980,1000)}}>Yes, can we talk this afternoon?<div style={{fontSize:11,color:M,marginTop:6}}>10:25</div></div>
        <div style={{position:'absolute',bottom:14,left:14,right:14,borderRadius:21,padding:'11px 15px',background:'#fff',color:M,fontSize:15}}>＋　Message<div style={{position:'absolute',right:21,top:11,width:7,height:12,borderRadius:5,background:M}}/><div style={{position:'absolute',right:18,top:16,width:13,height:11,border:`1.5px solid ${M}`,borderTop:0,borderRadius:'0 0 9px 9px'}}/></div>
      </div>

      <div style={{position:'absolute',left:100+n(f,[1074,1104],[-50,0]),top:103,width:760,opacity:automations}}><Window title="Settings" style={{height:331}}><div style={{display:'flex',height:277}}><Rail items={['Automations','WhatsApp','Send activity','Billing']} active="Automations"/><div style={{padding:27,flex:1}}><div style={{fontSize:21,fontWeight:600,marginBottom:27}}>Automations</div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'23px 0',borderBottom:`1px solid ${B}`}}><span style={{fontSize:18}}>Transaction update automation</span><div style={{width:46,height:26,borderRadius:20,background:f<1150?'#d1d5db':'#1e293b',position:'relative'}}><div style={{position:'absolute',left:n(f,[1145,1155],[3,23]),top:3,width:20,height:20,borderRadius:'50%',background:'#fff'}}/></div></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:25,fontSize:18,color:M}}><span>Monthly report automation</span><div style={{width:46,height:26,borderRadius:20,background:'#d1d5db',position:'relative'}}><div style={{position:'absolute',left:3,top:3,width:20,height:20,borderRadius:'50%',background:'#fff'}}/></div></div></div></div></Window></div>

      <div style={{position:'absolute',left:485,top:161,opacity:end,transform:`translateY(${(1-end)*35}px)`}}><div style={{fontSize:45,fontWeight:700,letterSpacing:-1.3}}>Repeat AI</div><div style={{fontSize:33,lineHeight:1.17,marginTop:23}}>Seller follow-up,<br/>done properly.</div><div style={{display:'inline-block',background:'#242424',color:P,borderRadius:8,padding:'14px 22px',fontSize:19,marginTop:30,opacity:p(f,1330,1356)}}>Get started</div></div>
    </div>
  </AbsoluteFill>;
};
