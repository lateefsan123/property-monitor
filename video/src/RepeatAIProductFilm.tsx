import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, interpolateColors, staticFile, useCurrentFrame} from 'remotion';
import {Broker} from './RepeatAIIllustratedOpening';

const C={paper:'#f6f2e9',ink:'#242424',muted:'#7d756b',line:'#d9d3c8',orange:'#f3d7c4',white:'#fffdf9',chat:'#dceccd'};
const ease=Easing.inOut(Easing.cubic);
const at=(f:number,frames:number[],values:number[])=>interpolate(f,frames,values,{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:ease});
const ramp=(f:number,a:number,b:number)=>at(f,[a,b],[0,1]);
const show=(f:number,a:number,b:number,c:number,d:number)=>at(f,[a,b,c,d],[0,1,1,0]);
const art=(name:string)=>staticFile(`video/repeat-ai-v4/${name}.png`);
const text:React.CSSProperties={fontSize:21,lineHeight:1.35};
const label:React.CSSProperties={fontSize:13,letterSpacing:1.6,textTransform:'uppercase',color:C.muted};
const Float:React.FC<React.PropsWithChildren<{x:number;y:number;opacity?:number;style?:React.CSSProperties}>>=({x,y,opacity=1,style,children})=><div style={{position:'absolute',left:x,top:y,opacity,...style}}>{children}</div>;
const Panel:React.FC<React.PropsWithChildren<{style?:React.CSSProperties}>>=({style,children})=><div style={{background:C.white,border:`1px solid ${C.line}`,borderRadius:14,boxSizing:'border-box',...style}}>{children}</div>;
const Tag:React.FC<React.PropsWithChildren>=({children})=><span style={{display:'inline-block',background:C.orange,padding:'7px 11px',borderRadius:7,fontSize:15}}>{children}</span>;

export const RepeatAIProductFilm:React.FC=()=>{
  const f=useCurrentFrame();
  // The same surface travels through the pipeline, listing, transaction, editor and chat.
  const keys=[0,112,147,284,311,466,496,646,677,823,858,1066,1100];
  const x=at(f,keys,[390,390,365,365,75,75,400,400,95,95,460,460,1020]);
  const y=at(f,keys,[145,145,151,151,232,232,173,173,141,141,171,171,171]);
  const w=at(f,keys,[515,515,515,515,515,515,470,470,770,770,425,425,425]);
  const h=at(f,keys,[304,304,304,304,211,211,258,258,307,307,216,216,216]);
  const chat=ramp(f,823,858);
  const paperToChat=interpolateColors(chat,[0,1],[C.white,C.chat]);
  const pipeline=show(f,125,149,281,304);
  const listing=show(f,304,320,461,482);
  const market=show(f,479,500,645,666);
  const draft=show(f,660,686,819,843);
  const message=show(f,668,696,1067,1091);
  const automation=show(f,1080,1110,1250,1280);
  const outro=ramp(f,1260,1295);
  const headline=f<112?'Too many places. Too much to remember.':f<296?'All your spreadsheets, together.':f<478?'Know what changed.':f<659?'A reason to reach out.':f<837?'Your message. Made personal.':f<1080?'A useful conversation.':f<1262?'Follow-ups, on autopilot.':'';
  const brokerOpacity=show(f,-1,0,111,145)+outro;
  const brokerX=at(f,[0,110,148,1240,1295],[340,340,1010,1010,40]);
  const brokerY=at(f,[0,110,148,1240,1295],[100,100,100,100,123]);
  const propertyOpacity=show(f,27,45,110,145)+show(f,299,321,462,488);
  const edit=' Want to discuss how yours compares?';
  const typed=edit.slice(0,Math.round(ramp(f,716,775)*edit.length));
  const outgoingCopy=f<785?typed:edit;
  return <AbsoluteFill style={{background:C.paper}}>
    <Audio src={staticFile('video/repeat-ai-v6/mix.wav')}/>
    <div style={{position:'absolute',width:960,height:540,transform:'scale(2)',transformOrigin:'top left',fontFamily:'Arial, sans-serif',color:C.ink,overflow:'hidden'}}>
      <Float x={45} y={27} opacity={show(f,112,143,1239,1265)}><div style={{fontSize:21,fontWeight:700}}>Repeat AI</div></Float>
      <Float x={45} y={f<112?42:76} opacity={1-outro} style={{fontSize:f<112?35:33,fontWeight:600,letterSpacing:-.9,maxWidth:f<112?520:850}}>{headline}</Float>

      {/* Broker poses and props are raster assets, never flattened scene slides. */}
      <Float x={brokerX} y={brokerY} opacity={brokerOpacity} style={{width:425,height:425,transform:`rotate(${Math.sin(f/36)*.4}deg)`}}><Broker frame={f}/></Float>
      <Float x={at(f,[0,145,300,470],[735,735,640,640])} y={at(f,[0,145,300,470],[110,110,205,205])} opacity={propertyOpacity} style={{width:250,transform:`rotate(${at(f,[25,65,110],[12,-3,0])}deg)`}}><Img src={art('property')} style={{width:'100%'}}/></Float>
      <Float x={58} y={195} opacity={show(f,8,30,98,132)} style={{width:215,transform:`rotate(${Math.sin(f/25)*2}deg)`}}><Img src={art('notes')} style={{width:'100%'}}/></Float>

      {/* Loose files settle into one source list; each file has its own trajectory. */}
      {['Marina sellers.xlsx','Downtown owners.csv','Palm contacts.xlsx'].map((name,i)=>{
        const enter=ramp(f,40+i*16,58+i*16);
        const gather=ramp(f,112+i*5,146+i*5);
        const away=ramp(f,283,307);
        return <Float key={name} x={at(gather,[0,1],[65+i*15,46])-away*380} y={at(gather,[0,1],[379+i*35,184+i*82])} opacity={enter*(1-away)} style={{transform:`rotate(${(1-gather)*[-6,3,-3][i]}deg) scale(${.8+.2*enter})`,width:267}}><Panel style={{padding:'20px 17px',fontSize:19}}>{name}<span style={{float:'right',opacity:gather,color:'#ab663d'}}>✓</span></Panel></Float>;
      })}
      <Float x={48} y={151} opacity={pipeline} style={label}>Your spreadsheet sources</Float>

      {/* WhatsApp shell appears behind the shared message, not as a replacement slide. */}
      <Float x={425+at(f,[823,858],[80,0])} y={95} opacity={show(f,825,857,1063,1091)}><Panel style={{width:480,height:413,overflow:'hidden',background:'#ebe6db',borderRadius:23}}><div style={{height:54,background:C.white,padding:'15px 20px',boxSizing:'border-box',fontSize:20}}>‹　●　Sara<span style={{float:'right',fontSize:16}}>Call　⋮</span></div><div style={{textAlign:'center',fontSize:11,color:C.muted,marginTop:10}}>TODAY</div><div style={{position:'absolute',bottom:12,left:15,right:15,background:C.white,borderRadius:18,padding:'9px 14px',fontSize:14,color:C.muted}}>＋　Message<div style={{position:'absolute',right:21,top:9,width:7,height:12,borderRadius:5,background:C.muted}}/><div style={{position:'absolute',right:18,top:14,width:13,height:11,border:`1.5px solid ${C.muted}`,borderTop:0,borderRadius:'0 0 9px 9px'}}/></div></Panel></Float>
      <Float x={x} y={y} opacity={show(f,117,143,1068,1100)}><Panel style={{width:w,height:h,background:paperToChat,borderColor:chat>.8?'transparent':C.line,borderRadius:14}}>
        <div style={{position:'absolute',inset:24,opacity:pipeline}}><div style={label}>Sellers</div><div style={{fontSize:25,margin:'15px 0 20px',fontWeight:600}}>One organised workspace.</div>{['Sara · Marina Tower','Adam · Creek View','Maya · Palm Court'].map((s,i)=><div key={s} style={{padding:'15px 12px',borderTop:`1px solid ${C.line}`,background:i===0?C.orange:undefined,fontSize:20,opacity:ramp(f,149+i*17,167+i*17),transform:`translateX(${(1-ramp(f,149+i*17,167+i*17))*35}px)`}}>{s}</div>)}</div>
        <div style={{position:'absolute',inset:26,opacity:listing}}><div style={label}>2 bedroom · Asking price</div><div style={{marginTop:19,fontSize:24,color:C.muted,textDecoration:f>350?'line-through':undefined}}>AED 2,600,000</div><div style={{marginTop:12,fontSize:36,fontWeight:600,opacity:ramp(f,350,377),transform:`translateY(${(1-ramp(f,350,377))*20}px)`}}>AED {Math.round(at(f,[350,377],[2600000,2470000])).toLocaleString('en-US')} <span style={{fontSize:20,color:'#ad5c30'}}>−5%</span></div><div style={{fontSize:16,color:C.muted,marginTop:13}}>Listing price change · not a completed sale</div></div>
        <div style={{position:'absolute',inset:26,opacity:market}}><div style={label}>Sales history · Marina Tower</div><div style={{marginTop:24,fontSize:22}}>Recent completed sale</div><div style={{marginTop:20,fontSize:38,fontWeight:600}}>AED 2,400,000</div><div style={{marginTop:18,fontSize:21}}>2 bed · 1,410 sq ft</div></div>
        <div style={{position:'absolute',left:25,right:25,top:20,opacity:draft,display:'flex',justifyContent:'space-between',alignItems:'center'}}><Tag>Template: Transaction update</Tag><span style={{fontSize:14,color:C.muted}}>WhatsApp connected</span></div>
        <div style={{position:'absolute',left:at(chat,[0,1],[28,20]),right:20,top:at(chat,[0,1],[83,18]),opacity:message,fontSize:at(chat,[0,1],[24,20]),lineHeight:1.4}}>Hi Sara, a recent sale in Marina Tower:<div style={{marginTop:24}}>2 bed · 1,410 sq ft · AED 2.4M</div><div style={{marginTop:24}}>{outgoingCopy}<span style={{opacity:f<806&&f%24<13?1:0,color:'#b3673c'}}>│</span></div><div style={{textAlign:'right',fontSize:11,color:'#60755a',opacity:chat,marginTop:9}}>10:24　{f>887?'✓✓':'✓'}</div></div>
        <div style={{position:'absolute',left:27,bottom:23,opacity:draft,fontSize:15,color:C.muted}}>Editable for this seller</div>
        <div style={{position:'absolute',right:24,bottom:18,opacity:draft,padding:'13px 18px',borderRadius:8,background:C.ink,color:C.paper,fontSize:18,transform:`scale(${at(f,[804,810,817],[1,.96,1])})`}}>Send via WhatsApp</div>
      </Panel></Float>

      <Float x={75} y={156} opacity={listing}><span style={{fontSize:25}}>Marina Tower</span><div style={{display:'flex',gap:10,marginTop:14}}>{['New listings','Price drops','Status changes'].map((s,i)=><div key={s} style={{opacity:ramp(f,306+i*12,320+i*12)}}><Tag>{s}</Tag></div>)}</div></Float>
      <Float x={at(f,[467,499],[40,65])} y={173} opacity={market}><Panel style={{width:285,padding:27}}><div style={label}>Seller</div><div style={{fontSize:34,marginTop:18}}>Sara</div><div style={{fontSize:21,marginTop:15}}>Marina Tower · 2 bed</div><div style={{marginTop:22}}><Tag>Prospect</Tag></div></Panel></Float>
      {/* The transaction line is the hand-off from data to a templated message. */}
      <Float x={at(f,[644,659,682],[426,426,123])} y={at(f,[644,659,682],[358,358,282])} opacity={show(f,643,650,676,686)} style={{...text,background:C.orange,padding:'8px 12px',borderRadius:8}}>2 bed · 1,410 sq ft · AED 2.4M</Float>

      <Float x={49} y={175} opacity={show(f,840,860,1063,1090)} style={{width:315}}><div style={{fontSize:36,lineHeight:1.12,fontWeight:600}}>Not “just<br/>checking in”.</div><div style={{marginTop:28,fontSize:21,color:C.muted,lineHeight:1.4}}>Relevant market context.<br/>Your own words.</div><div style={{marginTop:88,fontSize:13,color:C.muted}}>Illustrative conversation</div></Float>
      <Float x={444} y={390+at(f,[980,1001],[7,0])} opacity={show(f,980,1001,1065,1090)}><Panel style={{width:373,padding:'12px 16px',fontSize:18,borderRadius:'0 12px 12px 12px'}}>Yes, can we talk this afternoon?<div style={{fontSize:10,color:C.muted,marginTop:7}}>10:25</div></Panel></Float>

      {/* Queue entries progress independently, without implying 50 sends or guaranteed replies. */}
      <Float x={50} y={160} opacity={automation} style={{width:490,transform:`translateX(${(1-ramp(f,1080,1110))*-80}px)`}}><div style={label}>Automatic WhatsApp follow-ups</div><div style={{fontSize:48,lineHeight:1.08,fontWeight:600,letterSpacing:-1.6,marginTop:25}}>Keep your<br/>pipeline moving.</div><div style={{fontSize:22,color:C.muted,marginTop:25,lineHeight:1.4}}>Your saved template.<br/>Relevant market context.</div><div style={{fontSize:13,color:C.muted,marginTop:32}}>Requires connected WhatsApp and eligible sellers.</div></Float>
      <Float x={570+at(f,[1080,1110],[140,0])} y={150} opacity={automation}><Panel style={{width:334,padding:24}}><Tag>Automatic follow-up enabled</Tag>{['Eligible seller','Market update available','Saved template ready','WhatsApp follow-up'].map((s,i)=>{const t=ramp(f,1115+i*26,1130+i*26);return <div key={s} style={{borderBottom:`1px solid ${C.line}`,padding:'22px 0',fontSize:19,opacity:.35+.65*t,transform:`translateX(${(1-t)*12}px)`}}><span style={{color:'#ae653c',display:'inline-block',width:28}}>{t>.9?'✓':'·'}</span>{s}</div>;})}</Panel></Float>

      <Float x={460} y={145+at(f,[1260,1295],[45,0])} opacity={outro}><div style={{fontSize:48,fontWeight:700,letterSpacing:-1.5}}>Repeat AI</div><div style={{fontSize:36,lineHeight:1.16,marginTop:22}}>Seller follow-up,<br/>done properly.</div><div style={{fontSize:19,color:C.muted,marginTop:23}}>Spreadsheets. Sellers. Market context.</div><div style={{background:C.ink,color:C.paper,padding:'15px 22px',borderRadius:9,marginTop:26,display:'inline-block',fontSize:21,opacity:ramp(f,1334,1360)}}>Get started with Repeat AI</div></Float>
    </div>
  </AbsoluteFill>;
};
