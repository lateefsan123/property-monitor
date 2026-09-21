import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {requestEnvelope} from './request-envelope';

const C={paper:'#F8F7F3',ink:'#202326',blue:'#345AF4',muted:'#777B80',line:'#D7D9D8',lilac:'#E8E9FE',green:'#DDF3DE'};
const asset=(s:string)=>staticFile(`video/repeat-ai-minimal/${s}`);
const mix=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
const out=(f:number,a:number,b:number)=>1-mix(f,a,b);
const pos=(x:number,y:number):React.CSSProperties=>({position:'absolute',left:x,top:y});

type IconName='sheet'|'building'|'chat'|'mic'|'calendar'|'mail'|'check'|'arrow'|'spark';
const paths:Record<IconName,string[]>={
 sheet:['M15 7H43L55 19V57H15Z','M43 7V19H55','M23 29H47M23 38H47M23 47H47M31 29V47'],
 building:['M13 57V21L35 11V57M35 57V5L55 15V57M7 57H61','M20 28H27M20 37H27M20 46H27','M42 20H48M42 29H48M42 38H48M42 47H48'],
 chat:['M13 10H53Q59 10 59 16V44Q59 50 53 50H29L15 59V50H13Q7 50 7 44V16Q7 10 13 10Z','M20 26H46M20 36H38'],
 mic:['M26 12Q26 5 33 5Q40 5 40 12V31Q40 38 33 38Q26 38 26 31Z','M18 28V31Q18 46 33 46Q48 46 48 31V28','M33 46V57M24 57H42'],
 calendar:['M12 14H54Q58 14 58 18V54Q58 58 54 58H12Q8 58 8 54V18Q8 14 12 14Z','M20 6V21M46 6V21M8 29H58','M20 39H26M39 39H45M20 48H26'],
 mail:['M10 14H56Q60 14 60 18V50Q60 54 56 54H10Q6 54 6 50V18Q6 14 10 14Z','M7 17L33 37L59 17'],
 check:['M13 34L27 47L55 18'],
 arrow:['M10 33H54','M40 19L54 33L40 47'],
 spark:['M33 5L40 25L60 32L40 39L33 59L26 39L6 32L26 25Z'],
};

const Icon:React.FC<{name:IconName;size?:number;color?:string;progress?:number}>=({name,size=64,color=C.ink,progress=1})=><svg width={size} height={size} viewBox="0 0 66 66" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{paths[name].map((d,i)=><path key={d} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1-Math.min(1,Math.max(0,progress*paths[name].length-i))}/>)}</svg>;
const Stroke:React.FC<{d:string;progress:number;color?:string;width?:number}>=({d,progress,color=C.blue,width=4})=><path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1-progress}/>;
const Reveal:React.FC<React.PropsWithChildren<{f:number;start?:number;style?:React.CSSProperties}>>=({f,start=0,style,children})=><div style={{...style,opacity:mix(f,start,start+16),transform:`translateY(${mix(f,start,start+22,22,0)}px)`}}>{children}</div>;
const Head:React.FC<React.PropsWithChildren<{f:number;dark?:boolean}>>=({f,dark=false,children})=><Reveal f={f} style={{...pos(150,113),fontSize:67,fontWeight:500,lineHeight:1.12,letterSpacing:-3,color:dark?C.paper:C.ink}}>{children}</Reveal>;
const Pointer:React.FC<{x:number;y:number;click?:number;opacity?:number}>=({x,y,click=0,opacity=1})=><div style={{...pos(x,y),opacity,transform:`scale(${1-click*.14})`,transformOrigin:'5px 5px',filter:'drop-shadow(0 3px 3px #0002)'}}><svg width="42" height="51" viewBox="0 0 42 51"><path d="M5 3L6 39L16 30L25 47L33 43L24 27L38 26Z" fill={C.ink} stroke="white" strokeWidth="2.5"/></svg></div>;
const CursorText:React.FC<{text:string;f:number;start:number;end:number}>=({text,f,start,end})=><>{text.slice(0,Math.floor(interpolate(f,[start,end],[0,text.length],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})))}<span style={{display:'inline-block',width:0,opacity:f<start||f>end+18?0:Math.floor(f/13)%2===0?1:0,color:C.blue}}>│</span></>;
const Mark:React.FC<{size?:number;dark?:boolean}>=({size=220,dark=false})=><Img src={staticFile('brand/repeat-ai-logo.png')} style={{width:size,filter:dark?undefined:'brightness(0)',objectFit:'contain'}}/>;

const Opening:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.paper}}>
  <div style={pos(150,105)}><Mark size={218}/></div>
  <div style={{...pos(150,285),fontSize:112,fontWeight:500,letterSpacing:-6,lineHeight:1.05}}>
   <div>Property moves.</div>
   <Reveal f={f} start={28}><span style={{color:C.blue}}>Stay one step ahead.</span></Reveal>
  </div>
  <svg style={{...pos(165,677),overflow:'visible'}} width="1550" height="200"><Stroke d="M90 45H145C240 45 215 138 325 138H500C610 138 590 45 700 45H965C1060 45 1050 138 1140 138H1440" progress={mix(f,42,123)} color={C.line} width={3}/><Stroke d="M90 45H145C240 45 215 138 325 138H500C610 138 590 45 700 45H965C1060 45 1050 138 1140 138H1440" progress={mix(f,55,132)} width={3}/></svg>
  {[['sheet',160,668,36],['building',840,668,70],['chat',1590,760,105]].map(([name,x,y,start])=><div key={name} style={{...pos(Number(x),Number(y)),padding:8,background:C.paper}}><Icon name={name as IconName} size={84} progress={mix(f,Number(start),Number(start)+24)}/></div>)}
 </AbsoluteFill>;
};

const SellerRow:React.FC<{name:string;building:string;active?:boolean;compact?:boolean}>=({name,building,active=false,compact=false})=><div style={{display:'flex',alignItems:'center',gap:24,height:compact?76:105,borderBottom:`1px solid ${C.line}`,padding:'0 22px',background:active?C.lilac:'transparent',borderRadius:active?13:0}}><div style={{width:46,height:46,borderRadius:23,background:active?C.blue:'#E8E8E2',color:active?'white':C.ink,display:'grid',placeItems:'center',fontSize:20}}>{name[0]}</div><div style={{fontSize:compact?23:30,flex:1}}>{name}</div><div style={{fontSize:compact?20:26,color:C.muted}}>{building}</div></div>;

const Sellers:React.FC=()=>{
 const f=useCurrentFrame();
 const gather=mix(f,68,100);
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Your sellers. Together.</Head>
  {['Google Sheets','Microsoft Excel'].map((label,i)=><div key={label} style={{...pos(200,345+i*245),opacity:mix(f,10+i*14,28+i*14)*out(f,148,168),transform:`translateX(${gather*25}px)`}}><Icon name="sheet" size={94} color={i?'#217346':'#2B9460'} progress={mix(f,12+i*14,41+i*14)}/><div style={{fontSize:25,marginTop:15}}>{label}</div></div>)}
  <svg style={{...pos(450,360),opacity:out(f,147,165)}} width="400" height="420"><Stroke d="M0 50H110Q160 50 160 130V170Q160 210 205 210H365" progress={mix(f,45,89)} color={C.line}/><Stroke d="M0 295H110Q160 295 160 255V250Q160 210 205 210H365" progress={mix(f,61,100)} color={C.line}/></svg>
  {[0,1,2].map(i=><div key={i} style={{...pos(mix(f,58+i*9,101+i*9,405,830),mix(f,58+i*9,101+i*9,402+i*80,390+i*105)),width:70,height:7,borderRadius:5,background:C.blue,opacity:mix(f,56+i*9,61+i*9)*out(f,95+i*9,102+i*9)}}/>)}
  <div style={{...pos(mix(f,157,187,840,530),mix(f,157,187,350,420)),width:760}}>
   <Reveal f={f} start={55} style={{fontSize:25,color:C.muted,margin:'0 22px 18px'}}>Sellers</Reveal>
   {['Ahmed','Priya','Daniel'].map((name,i)=><Reveal key={name} f={f} start={95+i*11} style={{height:i===0?105:105*out(f,157,184)}}><div style={{opacity:i===0?1:out(f,157,184)}}><SellerRow name={name} building={['Forte 2','Burj Khalifa','Marina Gate'][i]} active={i===0&&f>175}/></div></Reveal>)}
   <div style={{fontSize:28,margin:'28px 24px',color:C.muted,opacity:mix(f,180,200)}}>Property, notes and next follow-up.</div>
  </div>
  <Pointer x={mix(f,155,181,1650,1150)} y={mix(f,155,181,850,516)} click={Math.sin(mix(f,182,194)*Math.PI)} opacity={mix(f,154,165)*out(f,207,222)}/>
 </AbsoluteFill>;
};

const Market:React.FC=()=>{
 const f=useCurrentFrame();
 const price=mix(f,84,116,3.1,2.9);
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Know when the market moves.</Head>
  <Img src={asset('architecture.png')} style={{...pos(30,265),width:890,height:610,objectFit:'contain',opacity:mix(f,8,30),transform:`translateY(${mix(f,8,32,25,0)}px)`}}/>
  <Reveal f={f} start={17} style={{...pos(970,342),fontSize:30,color:C.muted}}>Forte 2 · Asking price</Reveal>
  <div style={{...pos(965,405),display:'flex',alignItems:'baseline',gap:18,opacity:mix(f,23,40)}}><span style={{fontSize:36}}>AED</span><div style={{height:130,overflow:'hidden',fontSize:112,fontWeight:500,letterSpacing:-6,display:'flex'}}><span style={{transform:`translateY(${f>=84&&f<116?-Math.sin(mix(f,84,116)*Math.PI)*12:0}px)`}}>{price.toFixed(1)}</span><span>M</span></div></div>
  <div style={{...pos(980,557),fontSize:29,color:C.blue,opacity:mix(f,115,131)}}>↓ AED 200,000</div>
  <svg style={pos(979,650)} width="610" height="220"><path d="M0 175H610" stroke={C.line}/><Stroke d="M0 30H140L235 60H345L450 142H590" progress={mix(f,45,121)} width={4}/><circle cx="590" cy="142" r={mix(f,117,132,0,8)} fill={C.blue}/></svg>
  <div style={{...pos(980,855),fontSize:25,color:C.muted,opacity:mix(f,139,156)}}>A reason to reach out.</div>
 </AbsoluteFill>;
};

const Ask:React.FC=()=>{
 const f=useCurrentFrame();
 const level=requestEnvelope[Math.max(0,f-121)]??0;
 return <AbsoluteFill style={{background:C.ink,color:C.paper}}>
  <Head f={f} dark>Just ask Repeat.</Head>
  <div style={{...pos(150,215),fontSize:28,color:'#A9ADAF',opacity:mix(f,14,32)}}>Talk or type.</div>
  <div style={{...pos(240,380),width:1440,height:155,borderBottom:'1px solid #62666A',display:'flex',alignItems:'center',gap:40}}>
   <div style={{fontSize:48,letterSpacing:-1.8,flex:1}}><CursorText text="Show me the latest price drops." f={f} start={121} end={194}/></div>
   <div style={{width:94,height:94,borderRadius:48,display:'grid',placeItems:'center',background:f>104?C.blue:'#373B3E',transform:`scale(${1-Math.sin(mix(f,98,111)*Math.PI)*.07})`}}><Icon name="mic" size={49} color="white" progress={mix(f,18,44)}/></div>
  </div>
  <div style={{...pos(736,596),display:'flex',alignItems:'center',gap:8,height:75,opacity:mix(f,107,120)*out(f,199,213)}}>{Array.from({length:29},(_,i)=><div key={i} style={{width:7,borderRadius:5,background:'#A3B5FF',height:10+level*(.35+.65*(Math.sin(f*.35+i*.71)*.5+.5))*Math.sin((i+1)/30*Math.PI)*62}}/>)}</div>
  <div style={{...pos(310,685),width:1300,display:'flex',alignItems:'center',gap:28,opacity:mix(f,211,227),transform:`translateY(${mix(f,211,233,18,0)}px)`}}><Icon name="building" size={58} color="#BFCBFF"/><span style={{fontSize:36}}>Forte 2</span><span style={{marginLeft:'auto',fontSize:36}}>AED 2.9M</span><span style={{fontSize:27,color:'#BFCBFF'}}>↓ 200K</span></div>
  <Pointer x={mix(f,69,98,1740,1610)} y={mix(f,69,98,780,468)} click={Math.sin(mix(f,99,109)*Math.PI)} opacity={mix(f,70,79)*out(f,117,127)}/>
 </AbsoluteFill>;
};

const Followup:React.FC=()=>{
 const f=useCurrentFrame(); const personal=mix(f,130,148); const bubble=mix(f,188,214);
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Your words. Their context.</Head>
  <div style={{...pos(mix(f,188,214,270,480),320),width:1040,padding:'38px 48px',boxSizing:'border-box',borderRadius:mix(f,188,214,0,30),borderTopRightRadius:mix(f,188,214,0,7),background:`rgba(221,243,222,${bubble})`,transform:`translateY(${mix(f,188,214,0,20)}px)`}}>
   <div style={{fontSize:41,lineHeight:1.55,letterSpacing:-.9,whiteSpace:'pre-wrap'}}>
    <div style={{opacity:mix(f,13,25)}}>Hi <span style={{color:personal?C.ink:C.blue,background:personal?'transparent':C.lilac,padding:'0 5px',borderRadius:6}}>{f<139?'{{name}}':'Ahmed'}</span>,</div>
    <div style={{marginTop:19}}><CursorText text="I noticed some recent asking-price changes in " f={f} start={30} end={85}/>{f>=85&&<span style={{whiteSpace:'nowrap',color:personal?C.ink:C.blue,background:personal?'transparent':C.lilac,padding:'0 5px',borderRadius:6}}>{f<139?'{{building}}':'Forte 2'}</span>}{f>=85?'.':''}</div>
    <div style={{marginTop:24}}><CursorText text="Would an updated valuation be useful?" f={f} start={89} end={127}/></div>
   </div>
   <div style={{marginTop:25,display:'flex',alignItems:'center',gap:12,fontSize:22,color:'#55765A',opacity:bubble}}><Icon name="chat" size={28} color="#55765A"/>WhatsApp preview</div>
  </div>
  <div style={{...pos(1415,365),fontSize:26,color:C.muted,opacity:mix(f,147,160)*out(f,182,197)}}><div style={{color:C.ink,marginBottom:15}}>Ahmed</div>Forte 2</div>
  <svg style={{...pos(1335,385),opacity:out(f,182,197)}} width="70" height="220"><Stroke d="M55 0H15V170H55" progress={mix(f,146,163)} color={C.line} width={2}/></svg>
 </AbsoluteFill>;
};

const Schedule:React.FC=()=>{
 const f=useCurrentFrame(); const move=mix(f,84,123); const x=1120+(262-1120)*move; const y=336+(610-336)*move;
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Make room for the follow-up.</Head>
  <div style={{...pos(210,477),display:'flex',width:1500,height:330,borderTop:`1px solid ${C.line}`,opacity:mix(f,15,32)}}>{['Monday','Tuesday','Wednesday','Thursday','Friday'].map((day,i)=><div key={day} style={{width:300,borderRight:i<4?`1px solid ${C.line}`:undefined,padding:'25px 24px',boxSizing:'border-box',background:i===0&&f>123?'#EEEEFC':undefined}}><span style={{fontSize:26,color:i===0?C.ink:C.muted}}>{day}</span></div>)}</div>
  <div style={{...pos(x,y),display:'flex',alignItems:'center',gap:15,width:215,height:78,padding:'0 18px',boxSizing:'border-box',background:C.lilac,border:`1px solid ${f>125?'#B2BCF9':C.line}`,borderRadius:12,transform:`rotate(${-2*Math.sin(move*Math.PI)}deg)`,opacity:mix(f,31,49),boxShadow:f>83&&f<125?'0 8px 20px #20232612':undefined}}><Icon name="building" size={37} color={C.blue}/><span style={{fontSize:29}}>Forte 2</span></div>
  <Pointer x={f<84?mix(f,54,83,1580,1230):x+110} y={f<84?mix(f,54,83,375,373):y+37} click={Math.sin(mix(f,80,88)*Math.PI)} opacity={mix(f,54,68)*out(f,138,154)}/>
  <div style={{...pos(250,842),display:'flex',alignItems:'center',gap:15,fontSize:28,opacity:mix(f,148,169)}}><Icon name="check" size={35} color={C.blue} progress={mix(f,145,169)}/>Your week, planned by building.</div>
 </AbsoluteFill>;
};

const Integrations:React.FC=()=>{
 const f=useCurrentFrame();
 const items=[{label:'Gmail',sub:'Email',icon:'mail',x:350,y:395},{label:'Outlook',sub:'Email & calendar',icon:'mail',x:350,y:640},{label:'Google Calendar',sub:'Calendar',icon:'calendar',x:1175,y:395},{label:'Claude + ChatGPT',sub:'MCP connection',icon:'spark',x:1175,y:640}];
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Works with your tools.</Head>
  <svg style={pos(0,0)} width="1920" height="1080">{items.map((item,i)=><Stroke key={item.label} d={i<2?`M${item.x+240} ${item.y+30}H720Q785 ${item.y+30} 785 555H915`:`M1005 555H1080Q1120 555 1120 ${item.y+30}H${item.x-30}`} progress={mix(f,54+i*18,91+i*18)} color={C.line} width={3}/>)}</svg>
  <div style={{...pos(903,502),width:114,height:114,borderRadius:57,background:C.blue,display:'grid',placeItems:'center',opacity:mix(f,18,36)}}><Img src={staticFile('brand/repeat-ai-icon.png')} style={{width:74,opacity:mix(f,29,51)}}/></div>
  {items.map((item,i)=><Reveal key={item.label} f={f} start={30+i*19} style={{...pos(item.x,item.y),background:C.paper,padding:'0 12px',minWidth:240}}><div style={{display:'flex',alignItems:'center',gap:15,fontSize:29}}><Icon name={item.icon as IconName} size={44} progress={mix(f,32+i*19,60+i*19)}/>{item.label}</div><div style={{fontSize:21,color:C.muted,margin:'12px 0 0 59px'}}>{item.sub}</div></Reveal>)}
 </AbsoluteFill>;
};

const Platform:React.FC=()=>{
 const f=useCurrentFrame(); const phone=mix(f,76,105);
 return <AbsoluteFill style={{background:C.paper}}>
  <Head f={f}>Keep going. Wherever you are.</Head>
  <svg style={pos(0,0)} width="1920" height="1080"><Stroke d="M335 765V355Q335 330 360 330H1210Q1235 330 1235 355V765M285 765H1285L1320 805H250Z" progress={mix(f,18,67)} color={C.ink} width={3}/><Stroke d="M1320 455Q1320 430 1345 430H1565Q1590 430 1590 455V865Q1590 890 1565 890H1345Q1320 890 1320 865Z" progress={mix(f,75,119)} color={C.ink} width={3}/></svg>
  <div style={{...pos(385,384),width:800,opacity:mix(f,49,68)}}><div style={{fontSize:25,marginBottom:30,color:C.muted}}>Sellers</div><SellerRow name="Ahmed" building="Forte 2" active/><div style={{margin:'28px 23px',fontSize:27,color:C.muted,opacity:out(f,78,96)}}>Next follow-up · Monday</div></div>
  <div style={{...pos(mix(f,78,114,410,1344),mix(f,78,114,592,590)),width:mix(f,78,114,740,222),height:116,borderRadius:12,background:C.paper,opacity:mix(f,78,92),border:`1px solid ${C.line}`,boxSizing:'border-box',padding:'20px 17px'}}><div style={{fontSize:26,whiteSpace:'nowrap'}}>Forte 2</div><div style={{fontSize:20,marginTop:13,color:C.muted,whiteSpace:'nowrap'}}>Monday</div></div>
  <div style={{...pos(1345,492),fontSize:25,opacity:phone}}>Ahmed</div>
  <div style={{...pos(520,875),fontSize:29,color:C.muted,display:'flex',gap:38,opacity:mix(f,128,149)}}><span>Web</span><span>·</span><span>Windows</span><span>·</span><span>Mobile</span></div>
 </AbsoluteFill>;
};

const Close:React.FC=()=>{
 const f=useCurrentFrame();
 return <AbsoluteFill style={{background:C.blue,color:'white',justifyContent:'center',alignItems:'center'}}>
  <Reveal f={f} start={5} style={{fontSize:91,lineHeight:1.14,letterSpacing:-4,textAlign:'center',fontWeight:500}}>Less admin.<br/>Better conversations.</Reveal>
  <div style={{marginTop:55,opacity:mix(f,34,53)}}><Mark size={345} dark/></div>
  <div style={{marginTop:43,fontSize:27,opacity:mix(f,73,93)}}>Meet your next seller workspace.</div>
 </AbsoluteFill>;
};

export const MinimalFilm:React.FC=()=> <AbsoluteFill style={{background:C.paper,color:C.ink,fontFamily:'Film Inter, Inter, Arial, sans-serif'}}>
 <style>{`@font-face{font-family:'Film Inter';src:url('${asset('inter.woff2')}') format('woff2');font-weight:100 900;font-display:block;}*{box-sizing:border-box;}`}</style>
 <Audio src={asset('mix.wav')}/>
 <Sequence from={0} durationInFrames={150}><Opening/></Sequence>
 <Sequence from={150} durationInFrames={240}><Sellers/></Sequence>
 <Sequence from={390} durationInFrames={240}><Market/></Sequence>
 <Sequence from={630} durationInFrames={270}><Ask/></Sequence>
 <Sequence from={900} durationInFrames={300}><Followup/></Sequence>
 <Sequence from={1200} durationInFrames={240}><Schedule/></Sequence>
 <Sequence from={1440} durationInFrames={210}><Integrations/></Sequence>
 <Sequence from={1650} durationInFrames={210}><Platform/></Sequence>
 <Sequence from={1860} durationInFrames={150}><Close/></Sequence>
</AbsoluteFill>;
