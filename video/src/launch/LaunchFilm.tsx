import React from 'react';
import {AbsoluteFill, Audio, Freeze, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {IconBrandOpenai,IconLink,IconFileSpreadsheet,IconCheck,IconArrowUpRight,IconPlus,IconSearch} from '@tabler/icons-react';
import SpreadsheetListRow from '../../../src/features/seller-signal/components/SpreadsheetListRow';
import {WhatsAppDelivery} from '../workflow/WhatsAppDelivery';
import {SellerMoment,ScheduleMoment,MarketMoment,AssistantMoment} from './ProductScenes';
import {Cursor,tween} from '../workflow/primitives';
import '../../../src/styles/app-shell.css';
import '../../../src/styles/spreadsheet-minimal-list.css';
import '../accurate/film.css';
import './launch.css';
import timeline from './timeline.json';

const cream='#f1eee7',ink='#202623',sage='#bbcaa9';
const asset=staticFile;
const place=(left:number,top:number):React.CSSProperties=>({position:'absolute',left,top});
function Word({children,at=0}:{children:React.ReactNode;at?:number}){const f=useCurrentFrame();return <span style={{display:'inline-block',opacity:tween(f,at,at+10),transform:`translateY(${tween(f,at,at+16,30,0)}px)`}}>{children}</span>}

function Sheet({x=0}:{x?:number}){const f=useCurrentFrame();return <div style={{...place(x,385),width:1250,background:'#fffef8',borderRadius:14,padding:35,boxShadow:'0 20px 65px #343c2414',transform:`rotate(${tween(f,0,90,-4,-1)}deg)`}}><div style={{display:'flex',alignItems:'center',gap:16,fontSize:24,paddingBottom:25,borderBottom:'1px solid #dedfd6'}}><IconFileSpreadsheet color='#698066' size={29}/>Downtown sellers</div><div className="launch-sheet-grid"><b>Name</b><b>Building</b><b>Status</b>{[['Alex Morgan','St. Regis','Prospect'],['Maya Bennett','St. Regis','For sale available'],['Riley Brooks','Burj Khalifa','Prospect'],['Jamie Quinn','Burj Khalifa','Market appraisal']].map((row,i)=>row.map((cell,j)=><div key={`${i}-${j}`} style={{background:i===0&&f>18?'#e8efdf':undefined,opacity:tween(f,8+i*5,20+i*5)}}>{cell}</div>))}</div></div>}
function Opening(){const f=useCurrentFrame();const camera=f<51?0:f<108?tween(f,51,76,0,1920):tween(f,108,136,1920,3840);return <AbsoluteFill style={{background:cream,color:ink,overflow:'hidden'}}>
 <div style={{position:'absolute',width:5800,height:1080,transform:`translateX(${-camera}px)`}}>
  <div style={{...place(300,150),fontSize:92,letterSpacing:-5,fontWeight:500}}><Word>Your sellers.</Word></div><Sheet x={300}/>
  <div style={{...place(2220,150),fontSize:92,letterSpacing:-5,fontWeight:500}}>Your market.</div><div style={{...place(2220,320),width:1320,height:580,overflow:'hidden',borderRadius:12}}><Img src={asset('property.png')} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${1+Math.max(0,f-50)*.0007})`}}/><div style={{...place(35,380),background:'#f1eee7ec',padding:'22px 30px',borderRadius:8,fontSize:28}}>New transaction <span style={{marginLeft:90,fontWeight:600}}>AED 6.3M</span></div></div>
  <div style={{...place(4140,165),fontSize:89,letterSpacing:-5,fontWeight:500,lineHeight:1.12}}>Something worth<br/>following up on.</div>
  <div style={{...place(4190,485),width:1100,padding:38,borderRadius:'24px 24px 24px 0',background:'#dce7ce',fontSize:35,lineHeight:1.5,boxShadow:'0 18px 45px #303c2410'}}><span style={{fontSize:22,color:'#64725e'}}>Alex Morgan</span><div style={{marginTop:15}}>Hi Alex, a 2-bedroom apartment<br/>just sold in your building.</div><span style={{display:'block',textAlign:'right',fontSize:19,color:'#718266',marginTop:14}}>10:10 âœ“âœ“</span></div>
 </div><div style={{...place(1700,960),fontSize:18,color:'#858b7d'}}>Repeat AI</div></AbsoluteFill>}

function Brand({close=false}:{close?:boolean}){const f=useCurrentFrame();return <AbsoluteFill style={{background:ink,color:cream,alignItems:'center',justifyContent:'center'}}>
 <svg width="1200" height="600" style={{position:'absolute',opacity:.09,transform:`rotate(-12deg) scale(${tween(f,0,120,.9,1.1)})`}} viewBox="0 0 1200 600"><path d="M0 100H440Q510 100 510 180V390Q510 470 590 470H1200" fill="none" stroke={sage} strokeWidth="55"/></svg>
 <Img src={asset('logo.png')} style={{width:760,opacity:tween(f,0,15),transform:`translateY(${tween(f,0,24,18,0)}px)`}}/>
 {close&&<><div style={{fontSize:39,letterSpacing:-1,marginTop:52,opacity:tween(f,12,30)}}>Stay close to your sellers.</div><div style={{fontSize:26,color:sage,marginTop:62,opacity:tween(f,40,60)}}>repeatai.org <IconArrowUpRight style={{verticalAlign:'middle',marginLeft:5}} size={24}/></div></>}
 </AbsoluteFill>}

function ImportMoment(){const f=useCurrentFrame();const ready=f>=64;const url='https://docs.google.com/spreadsheets/d/st-regis';const count=Math.floor(tween(f,5,54,0,url.length));return <AbsoluteFill style={{background:cream,color:ink}}>
 <div style={{...place(165,115),fontSize:67,fontWeight:500,letterSpacing:-3}}>Start with your sellers.</div>
 <div className="accurate-film launch-import" data-theme="dark" style={{...place(180,300),width:1560,height:580,borderRadius:18,overflow:'hidden',background:'#1f1f1e',boxShadow:'0 35px 70px #20262318'}}>
  <div style={{padding:'27px 42px',fontSize:25,borderBottom:'1px solid #383a33'}}>Spreadsheets</div>
  <div style={{padding:'34px 55px',transform:'scale(1.2)',transformOrigin:'top left',width:1300}}>
   {!ready?<><div style={{fontSize:27,marginBottom:35}}>From a Google Sheet URL</div><div style={{display:'flex',gap:12}}><div style={{border:'1px solid #585c51',borderRadius:8,padding:'21px 24px',width:1020,fontSize:24,color:'#dddcd2',height:74}}><IconLink size={22} style={{marginRight:15}}/>{url.slice(0,count)}<span style={{opacity:Math.floor(f/10)%2===0?1:0}}>â”‚</span></div><div style={{display:'grid',placeItems:'center',width:72,borderRadius:8,background:f>=55?'#e9e8dc':'#393b36',color:'#222'}}><IconPlus size={30}/></div></div><div style={{fontSize:18,color:'#a5a697',marginTop:28}}>Google Sheets URL or Excel file</div></>:<><div className="ss-list-toolbar" style={{margin:'0 0 18px'}}><label className="ss-list-search"><IconSearch size={20}/><input readOnly placeholder="Search spreadsheets"/></label><button className="ss-list-add"><IconPlus size={18}/>Add spreadsheet</button></div>{['The St. Regis Residences, Downtown Dubai','Burj Khalifa'].map((name,i)=><div key={name} style={{opacity:tween(f,64+i*10,76+i*10),transform:`translateY(${tween(f,64+i*10,80+i*10,15,0)}px)`}}><SpreadsheetListRow name={name} count={4} favorited={false} pinned={false} selected={false} selectionActive={false} onClick={()=>{}} onToggleSelect={()=>{}} onToggleFavorite={()=>{}} onTogglePin={()=>{}}/></div>)}</>}
  </div>
  {!ready&&f>=44&&<Cursor x={tween(f,44,59,1180,1520)} y={tween(f,44,59,430,215)} click={Math.max(0,1-Math.abs(f-59)/5)}/>}
 </div></AbsoluteFill>}

function WhatsAppMoment(){const f=useCurrentFrame();return <AbsoluteFill style={{background:cream,color:ink}}>
 <div style={{...place(160,280),fontSize:78,lineHeight:1.15,letterSpacing:-4,fontWeight:500,width:700}}><Word>A useful update.</Word><br/><span style={{color:'#798a69'}}><Word at={12}>A personal touch.</Word></span></div>
 <div style={{...place(168,610),fontSize:29,color:'#6e7967',opacity:tween(f,80,98)}}>Your wording. Your broker card.</div>
 <div className='launch-whatsapp-crop' style={{position:'absolute',left:345,top:0,width:1920,height:1080,transform:'scale(.91)',transformOrigin:'50% 50%',clipPath:'inset(0 32% 0 31%)'}}><Freeze frame={Math.round(tween(f,0,50,65,124))}><WhatsAppDelivery/></Freeze></div>
 <div style={{position:'absolute',bottom:40,right:64,fontSize:17,color:'#87917e'}}>Example conversation</div>
 </AbsoluteFill>}

function Integrations(){const f=useCurrentFrame();const mcp=f>=82;return <AbsoluteFill style={{background:cream,color:ink,justifyContent:'center',alignItems:'center'}}>
 <div style={{fontSize:67,letterSpacing:-3,position:'absolute',top:145}}>{mcp?'Your account. Your choice of assistant.':'Bring your tools along.'}</div>
 <svg width="1440" height="500" viewBox="0 0 1440 500" style={{position:'absolute',top:320}}><path d={mcp?'M290 200H560Q620 200 620 270H820Q820 200 880 200H1150':'M290 200H600M720 200V340M840 200H1150'} stroke="#a5b597" strokeWidth="3" fill="none" strokeDasharray="1400" strokeDashoffset={1400*(1-tween(f,mcp?85:0,mcp?125:35))}/></svg>
 <div style={{display:'flex',alignItems:'center',gap:mcp?400:210,marginTop:30}}>
  {mcp?['ChatGPT','Claude'].map((name,i)=><div key={name} style={{textAlign:'center',opacity:tween(f,82+i*5,96+i*5),transform:`translateY(${tween(f,82+i*5,103+i*5,28,0)}px)`}}><div className="launch-icon">{name==='Claude'?<Img src={asset('workflow/polished/claude.svg')} style={{width:105,height:105}}/>:<IconBrandOpenai size={108} stroke={1.4}/>}</div><p style={{fontSize:30,marginTop:25}}>{name}</p></div>):[['gmail.png','Gmail'],['outlook.svg','Outlook'],['calendar.png','Calendar']].map(([file,name],i)=><div key={name} style={{textAlign:'center',opacity:tween(f,i*7,i*7+15)}}><div className="launch-icon"><Img src={asset('workflow/'+file)} style={{width:92,height:92,objectFit:'contain'}}/></div><p style={{fontSize:28,marginTop:25}}>{name}</p></div>)}
 </div>
 <div style={{position:'absolute',bottom:175,fontSize:29,color:'#6e7b65',opacity:tween(f,mcp?110:20,mcp?128:40)}}>{mcp?'Find sellers Â· Check activity Â· Review changes':'Email and calendar, connected to Repeat AI'}</div>
 </AbsoluteFill>}

function Product({row}:{row:any}){const f=useCurrentFrame();const maps:any={seller:[SellerMoment,210],schedule:[ScheduleMoment,150],market:[MarketMoment,180]};if(row.id==='assistant'){
 const canonical=interpolate(f,[0,100,180,270,330,380,row.frames-1],[0,24,28,95,145,205,239],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 const labels=[{at:108,text:'Type, or use your voice.'},{at:174,text:'Find a seller.'},{at:211,text:'Check the market.'},{at:260,text:'Prepare a template.'},{at:331,text:'Review the change.'}];
 const label=[...labels].reverse().find(x=>f>=x.at);
 return <AbsoluteFill><Freeze frame={Math.floor(canonical)}><AssistantMoment/></Freeze>{label&&<div style={{...place(184,700),fontSize:29,color:'#748164',opacity:tween(f,label.at,label.at+8),transform:`translateY(${tween(f,label.at,label.at+12,10,0)}px)`}}>{label.text}</div>}</AbsoluteFill>;
 }const [Comp,len]=maps[row.id];return <Freeze frame={Math.min(len-1,Math.floor(f*len/row.frames))}><Comp/></Freeze>}
function Shot({row}:{row:any}){switch(row.id){case'opening':return <Opening/>;case'brand':return <Brand/>;case'import':return <ImportMoment/>;case'whatsapp':return <WhatsAppMoment/>;case'integrations':return <Integrations/>;case'platforms':return <AbsoluteFill style={{background:cream}}><OffthreadVideo src={asset('desk-film.mp4')} muted style={{width:1920,height:1080,objectFit:'cover'}}/></AbsoluteFill>;case'close':return <Brand close/>;default:return <Product row={row}/>}}
export function LaunchFilm(){return <AbsoluteFill className="launch-film" data-theme="dark"><Audio src={asset('mix.wav')}/>{timeline.scenes.map(row=><Sequence key={row.id} from={row.fromFrame} durationInFrames={row.frames}><Shot row={row}/></Sequence>)}</AbsoluteFill>}
