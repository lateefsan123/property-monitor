// Geometry/interaction checks for the actual rendered film, beyond image loading.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {openFilm} from './browser.mjs';
import {SCREENS,CURSOR,CAPTIONS,DURATION} from './app-pacing-v6.mjs';

const root=import.meta.dirname;
const report={frames:[],failures:[]};
const centres=['actions.json','template-actions.json'].flatMap(file=>JSON.parse(readFileSync(path.join(root,'out/desktop/takes-v6',file))).filter(action=>action.centre).map(action=>action.centre));
for(const [t,x,y,action] of CURSOR){
  if(action==='click'&&!centres.some(point=>Math.abs(point.x-x)<1.6&&Math.abs(point.y-y)<1.6)) report.failures.push(`Unverified click at ${t}: ${x},${y}`);
}
assert.ok(!SCREENS.some(([,name])=>name==='desktop-whatsapp'),'Rejected WhatsApp capture must not be used');
const frames=SCREENS.map(([start,name],index)=>{
  const end=SCREENS[index+1]?.[0]??DURATION;
  return {t:start+Math.min(.9,(end-start)*.75),name};
});
frames.push({t:1.2,name:'hook'},{t:3.1,name:'hook-question'},{t:DURATION-1,name:'close'});
// Also inspect captions after their entrance animation has settled.
for(const [start,end] of CAPTIONS) if(end-start>1.8) frames.push({t:start+1.2,name:'caption'});
for(const format of ['9x16','16x9']){
  const session=await openFilm(format,'app-film-v6','http://127.0.0.1:4197');
  try{
    for(const frame of frames){
      await session.seek(frame.t);
      const result=await session.page.evaluate(()=>{
        const rect=element=>{const b=element.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
        const images=[...document.images].filter(image=>image.naturalWidth===0).map(image=>image.src);
        const words=[...document.querySelectorAll('.type span')].filter(element=>Number(getComputedStyle(element).opacity)>.85).map(element=>({...rect(element),text:element.textContent}));
        const ui=[...document.querySelectorAll('.desktop-frame,.phone')].filter(element=>Number(getComputedStyle(element).opacity)>.85).map(rect);
        const cursor=document.querySelector('.cursor-arrow');
        return {words,ui,images,cursor:cursor?rect(cursor):null};
      });
      const {width,height}=session;
      const label=`${format} ${frame.name} ${frame.t.toFixed(2)}s`;
      if(result.images.length) report.failures.push(`${label}: broken image`);
      for(const box of result.ui){
        if(box.x<20||box.y<20||box.right>width-20||box.bottom>height-35) report.failures.push(`${label}: UI outside safe frame (${JSON.stringify(box)})`);
      }
      for(const word of result.words){
        if(word.x<25||word.y<20||word.right>width-25||word.bottom>height-80) report.failures.push(`${label}: caption clipped: ${word.text}`);
        if(result.ui.some(box=>word.x<box.right&&word.right>box.x&&word.y<box.bottom&&word.bottom>box.y)) report.failures.push(`${label}: caption overlaps UI: ${word.text}`);
      }
      report.frames.push({format,...frame,ui:result.ui,words:result.words.length});
    }
    if(session.errors.length) report.failures.push(...session.errors);
  }finally{await session.browser.close();}
}
writeFileSync(path.join(root,'out/layout-checks-v6.json'),JSON.stringify(report,null,2));
console.log(`Checked ${report.frames.length} composed states; ${report.failures.length} geometry/interaction failures.`);
if(report.failures.length){console.log(report.failures.slice(0,35).join('\n'));process.exitCode=1;}
