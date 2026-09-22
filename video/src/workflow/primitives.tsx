import React from 'react';
import {AbsoluteFill, Img, interpolate, Easing, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
export const asset = staticFile;
export const tween=(f:number,a:number,b:number,x=0,y=1)=>interpolate(f,[a,b],[x,y],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)});
export const pos=(x:number,y:number):React.CSSProperties=>({position:'absolute',left:x,top:y});
export const Screenshot=({name,style={}}:{name:string;style?:React.CSSProperties})=><Img src={asset(name)} style={{width:1920,height:1080,...style}}/>;
export const Cursor=({x,y,click=0}:{x:number;y:number;click?:number})=><div style={{...pos(x,y),zIndex:3000,transform:`scale(${1-.16*click})`,transformOrigin:'3px 3px',filter:'drop-shadow(0 2px 3px #0008)'}}><svg width="30" height="38" viewBox="0 0 30 38"><path d="M3 2L3 29L10 22L17 35L23 32L16 20L27 20Z" fill="#fff" stroke="#242423" strokeWidth="2"/></svg></div>;
export const Caption=({children}:{children:React.ReactNode})=><div className="film-caption">{children}</div>;
export const Focus=({children,scale=1,x=960,y=540}:{children:React.ReactNode;scale?:number;x?:number;y?:number})=><AbsoluteFill style={{transform:`translate(${960-x*scale}px,${540-y*scale}px) scale(${scale})`,transformOrigin:'0 0'}}>{children}</AbsoluteFill>;
export const Clip=({name,frames,hold}:{name:string;frames:number;hold:string})=>{
 const f=useCurrentFrame();
 return f<frames?<OffthreadVideo src={asset(name)} muted style={{width:1920,height:1080}}/>:<Screenshot name={hold}/>;
};
