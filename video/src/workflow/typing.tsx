import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame} from 'remotion';

// Deterministic keystrokes: one character per event, with small word/punctuation pauses.
export function typed(text:string, frame:number, start:number, step=2){
 let at=start, count=0;
 for(let i=0;i<text.length;i++){
  at+=step+(i%7===0?1:0)+(text[i]===' '?1:0)+(/[.,:!?]/.test(text[i])?3:0);
  if(frame<at)break;
  count=i+1;
 }
 return text.slice(0,count);
}
export function Caret({active=true}:{active?:boolean}){
 const frame=useCurrentFrame();
 return active?<span className="wf-caret" style={{opacity:frame%30<20?1:0}}/>:null;
}
// Keep the native field's dimensions and wrapping, with a frame-controlled caret for export.
export function TypedField({value,active=false,multiline=false,className='',placeholder='',style={}}:{value:string;active?:boolean;multiline?:boolean;className?:string;placeholder?:string;style?:React.CSSProperties}){
 const mirror=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(mirror.current&&content.current)mirror.current.scrollTop=content.current.scrollHeight;},[value]);
 const Tag=multiline?'textarea':'input';
 return <div className={`wf-typed ${active?'is-typing':''} ${className}`} style={style}>
  <Tag className="wf-native-field" value={value} readOnly aria-label={placeholder} rows={multiline?2:undefined}/>
  <div className="wf-type-mirror" ref={mirror}><div ref={content} style={{whiteSpace:multiline?'pre-wrap':'pre'}}>{value||(!active?<span style={{color:'var(--text-muted)'}}>{placeholder}</span>:'')}<Caret active={active}/></div></div>
 </div>;
}
