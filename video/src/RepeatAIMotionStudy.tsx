import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';

// One continuous canvas: the drawings themselves travel into the signal list.
const INK = '#30382f';
const GREEN = '#246448';
const PAPER = '#fafaf3';
const ease = Easing.inOut(Easing.cubic);
const p = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const Stroke: React.FC<{d: string; f: number; at?: number; duration?: number; color?: string; width?: number}> = ({d, f, at = 0, duration = 22, color = INK, width = 2.8}) => <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p(f, at, at + duration)} />;
const Words: React.FC<{x: number; y: number; children: React.ReactNode; size?: number; color?: string; opacity?: number}> = ({x, y, children, size = 23, color = INK, opacity = 1}) => <text x={x} y={y} fill={color} opacity={opacity} fontFamily="Inter, Arial, sans-serif" fontSize={size} letterSpacing="-.5">{children}</text>;

const Drawing: React.FC<{kind: number; f: number}> = ({kind, f}) => {
  const live = Math.max(0, f - 40);
  const wiggle = Math.sin(live / 11) * 5;
  if (kind === 0) return <>
    <path d="M-96-78 L92-86 101 72-90 81Z" fill="#f1dfb5" opacity={p(f, 27, 50) * .45}/>
    <Stroke f={f} d="M-96-78 Q-3-79 92-86 L101 72 Q9 76-90 81Z" duration={28}/>
    <g transform={`rotate(${wiggle * .12})`}><Stroke f={f} at={14} d="M-57-30 L-20-61 19-32 M-50-34 V7 H12 V-34 M-28 7 V-12 H-10 V7"/>
    <Stroke f={f} at={29} d="M-61 34 H66 M-61 49 H30"/></g>
    <Words x={30} y={-18} size={17} opacity={p(f, 36, 46)}>↓ 5%</Words>
    <Stroke f={f} at={44} d="M33-9 Q58-14 76-7" color={GREEN} width={5}/>
  </>;
  if (kind === 1) return <>
    <path d="M-25-31 Q-70-22-77 53 L-32 90 30 71 15-32Z" fill="#dfe9da" opacity={p(f, 33, 57)}/>
    <Stroke f={f} d="M-61 84 Q-76 31-49-1 L-24-22 Q-53-61-30-79 Q-9-96 9-76 L10-53 Q27-51 16-38 L-1-31 21-17 Q41-11 40 10"/>
    <Stroke f={f} at={20} d="M-22-20 Q-36 12-22 29 Q-13 41 1 24 L24-5"/>
    <g transform={`rotate(${wiggle}, 25, -12)`}>
      <Stroke f={f} at={30} d="M23 12 Q45 8 47-20 L45-43 Q44-51 39-48 L35-31 M31-20 L28-60 48-65 54-28 36-22"/>
      <Stroke f={f} at={45} d="M64-57 L75-65 M67-38 L84-38 M61-20 L73-13" color={GREEN}/>
    </g>
    <Stroke f={f} at={38} d="M-14 49 Q13 49 23 30 L29 84 M-18-64 L-14-63"/>
  </>;
  if (kind === 2) return <>
    <path d="M-71 66 V-66 L-1-91 4 66Z" fill="#e0e9da" opacity={p(f, 35, 55)}/>
    <Stroke f={f} d="M-93 72 H105 M-72 69 V-66 L-1-91 3 69 M3-91 L70-63 V69 M-1-43 L71-19 M-1 2 L71 26" duration={30}/>
    {[-48, -15, 18].map((y, i) => <Stroke key={y} f={f} at={15 + i * 8} d={`M-56 ${y} L-39 ${y-5} V${y+15} L-56 ${y+20}Z M-26 ${y-10} L-12 ${y-14} V${y+6} L-26 ${y+11}Z`}/>)}
    <g transform={`translate(0 ${Math.sin(live / 14) * 4})`}><Stroke f={f} at={44} d="M91-89 V-35 M77-50 L91-35 105-50" color={GREEN} width={4}/></g>
    <Stroke f={f} at={48} d="M-12 69 V43 L9 49 V69"/>
  </>;
  if (kind === 3) return <>
    <path d="M-61-80 L40-86 58 87-48 91Z" fill="#f0e4ce" opacity={p(f, 26, 49)}/>
    <Stroke f={f} d="M-61-80 Q-6-87 40-86 L58 87 Q4 92-48 91Z M-37-61 L19-65 M-27 70 L23 68" duration={27}/>
    <g transform={`translate(${Math.sin(live / 12) * 3} 0)`}><Stroke f={f} at={24} d="M-83-30 L14-37 19 8-39 11-62 31-62 12-78 13Z M-62-12 L-7-16 M-58 0 L-21-3"/>
    <Stroke f={f} at={43} d="M-4 21 L82 18 83 56 68 57 69 76 48 58 0 61Z M13 35 L61 33 M14 46 L42 45" color={GREEN}/></g>
  </>;
  if (kind === 4) return <>
    <path d="M-78-56 L81-63 78-33-77-28Z" fill="#e9d4c7" opacity={p(f, 26, 45)}/>
    <Stroke f={f} d="M-78-56 L81-63 88 79-71 85Z M-79-28 L82-33 M-44-78 V-42 M42-80 V-48"/>
    {[0, 1, 2].map(i => <Stroke key={i} f={f} at={20 + i * 7} d={`M-48 ${i*29-4} H-25 M-2 ${i*29-6} H17 M42 ${i*29-8} H62`}/>)}
    <Stroke f={f} at={43} d="M-9 18 Q15 6 30 18 Q44 37 17 46 Q-9 46-12 29 Q-12 20-9 18" color={GREEN}/>
  </>;
  return <>
    <path d="M-75 70 L-35-4-7-21 41-23 85 53 52 73Z" fill="#dee7db" opacity={p(f, 35, 60)}/>
    <Stroke f={f} d="M-24-20 Q-45-37-35-64 Q-28-88-8-85 Q19-85 19-58 L25-47 17-42 Q21-17-3-22 L-8-12 M-20-61 L-16-60"/>
    <Stroke f={f} at={19} d="M-22-13 Q-52-11-61 14 L-83 57 Q-77 80-46 70 L0 49 M-22 13 L-34 42 9 30 M26-16 Q46-10 58 15 L74 39"/>
    <g transform={`rotate(${wiggle * .6}, 33, 24)`}><Stroke f={f} at={31} d="M8 29 Q12 13 28 22 L40 32 Q45 37 36 42 L2 47 M38 34 L63-5 M58-10 L67-5"/></g>
    <Stroke f={f} at={44} d="M-92 82 H100 M2 68 L46 50 84 65 40 83Z M24 68 L48 60"/>
  </>;
};

const positions = [[-520,-240],[-580,70],[-40,-260],[510,-190],[-290,300],[390,230]];
const names = ['Price changed','Seller called','New listing','Message waiting','Follow-up due','Notes to remember'];
const starts = [0,24,48,77,104,132];

export const RepeatAIMotionStudy: React.FC = () => {
  const f = useCurrentFrame();
  const gather = p(f, 228, 286);
  const focus = p(f, 320, 350);
  const ui = p(f, 249, 281);
  const type = Math.floor(p(f, 363, 420) * 91);
  const sentence = 'Hi Sara, a similar apartment in your building just dropped 5%. Shall we review your price?';
  const camera = 1 + p(f, 0, 220) * .035;
  return <AbsoluteFill style={{background:PAPER}}>
    <Audio src={staticFile('video/repeat-ai-v3/opening-audio.wav')}/>
    <svg viewBox="0 0 1920 1080" width="1920" height="1080">
      <defs><filter id="paper"><feTurbulence baseFrequency=".65" numOctaves="3" seed="9" type="fractalNoise"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs>
      <rect width="1920" height="1080" fill={PAPER} filter="url(#paper)"/>
      <g transform={`translate(960 515) scale(${mix(camera,1,gather)})`}>
        {/* A real line leads the eye between the illustrated activities. */}
        <g opacity={1-gather}>
          <Stroke f={f} at={85} duration={110} color="#8ca48c" width={2} d="M-360-215 C-310-370-155-354-161-202 S114-185 157-209 C218-242 207-90 349-124 C628-176 682 199 535 240 C408 406 90 317 54 251 C-89 52-64 367-170 326"/>
          <g opacity={p(f, 155, 185)}><Words x={-60} y={90} size={30}>It adds up.</Words><Stroke f={f} at={183} color={GREEN} width={3} d="M-67 104 Q17 117 105 99"/></g>
        </g>
        {/* Inbox shell grows around the same six drawings. */}
        <g opacity={ui * (1-focus)}>
          <rect x="-540" y="-365" width="1080" height="765" rx="22" fill="#fff" stroke="#d9e0d5" strokeWidth="2"/>
          <rect x="-540" y="-365" width="1080" height="92" rx="22" fill="#eaf0e6"/>
          <Words x={-493} y={-309} size={28} color={GREEN}>Repeat AI</Words><Words x={325} y={-309} size={18}>Your signals</Words>
          {names.map((name,i) => <g key={name} opacity={p(f, 273+i*3, 287+i*3)}>
            <path d={`M-470 ${-163+i*94} H470`} stroke="#edf0e9"/>
            <Words x={-353} y={-202+i*94} size={24}>{name}</Words>
            <Words x={315} y={-202+i*94} size={18} color="#7b887b">{i===0?'Just now':'Today'}</Words>
          </g>)}
        </g>
        {positions.map(([x,y],i)=>{
          const t = p(f, 225+i*4, 279+i*4);
          return <g key={i} opacity={1-focus} transform={`translate(${mix(x,-425,t)} ${mix(y,-215+i*94,t)}) scale(${mix(1.12,.25,t)}) rotate(${mix([-7,-3,3,6,-5,2][i],0,t)})`}>
            <Drawing kind={i} f={f-starts[i]}/>
            <Words x={-88} y={123} size={19} opacity={p(f, starts[i]+43, starts[i]+58)*(1-t)}>{names[i]}</Words>
          </g>;
        })}
        {/* The first signal becomes the follow-up card without a scene cut. */}
        <g opacity={p(f,301,319)} transform={`translate(${mix(0,-25,focus)} ${mix(-215,-45,focus)}) scale(${mix(1,1.17,focus)})`}>
          <rect x="-490" y="-43" width="980" height={mix(82,460,focus)} rx="15" fill="#f0f5ec" stroke={GREEN} strokeWidth="2"/>
          <g transform={`translate(-437 0) scale(.27)`}><Drawing kind={0} f={100}/></g>
          <Words x={-365} y={9} size={25}>Price dropped 5%</Words>
          <Words x={150} y={8} size={19} color={GREEN}>Marina · 2 bedroom</Words>
          <g opacity={focus}>
            <path d="M-447 64 H447" stroke="#ceddcc"/>
            <circle cx="-408" cy="108" r="22" fill="#d1e0cc"/>
            <Words x={-418} y={116} size={23} color={GREEN}>S</Words>
            <Words x={-367} y={107} size={23}>Sara · Seller</Words>
            <Words x={-367} y={133} size={17} color="#6f7d6e">Same building. Relevant update.</Words>
            <rect x="-445" y="167" width="890" height="145" rx="15" fill="white" stroke="#dce5d6"/>
            <foreignObject x="-418" y="190" width="810" height="109"><div style={{fontFamily:'Inter, Arial, sans-serif',fontSize:26,lineHeight:1.5,color:INK}}>{sentence.slice(0,type)}<span style={{opacity: f%24<15?1:0,color:GREEN}}>│</span></div></foreignObject>
            <g opacity={p(f,412,431)} transform={`translate(0 ${mix(16,0,p(f,412,431))})`}>
              <rect x="190" y="342" width="255" height="51" rx="25" fill={GREEN}/>
              <Words x={228} y={375} color="white" size={20}>Ready to follow up</Words>
              <Stroke f={f} at={419} duration={15} color={GREEN} width={3} d="M-436 366 L-428 373-413 354"/>
              <Words x={-397} y={372} size={20} color={GREEN}>The right context.</Words>
            </g>
          </g>
        </g>
      </g>
      <g opacity={p(f,322,350)}><Words x={355} y={185} size={43}>One signal. A better conversation.</Words></g>
    </svg>
  </AbsoluteFill>;
};
