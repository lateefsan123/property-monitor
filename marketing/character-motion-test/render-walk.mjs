import {chromium} from '../../video/node_modules/playwright-core/index.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=import.meta.dirname,out=path.join(root,'out');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1217/chrome-win64/chrome.exe')});
const page=await browser.newPage({viewport:{width:1100,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root,'walk.html')).href);await page.waitForFunction(()=>window.walkReady);await page.getByRole('button',{name:'Pause animation'}).click();
// Confirm grounded feet and valid joint positions over the whole cycle.
for(let n=0;n<240;n++){await page.evaluate(t=>window.seekWalk(t),n/30);const s=await page.evaluate(()=>window.walkState);for(const leg of [s.front,s.back]){assert.ok(Number.isFinite(leg.kneeX)&&Number.isFinite(leg.kneeY));if(leg.stance)assert.ok(Math.abs(s.hipY+leg.footY-670)<.001);}}
for(const t of [2.1,2.33,3.0,3.23]){await page.evaluate(t=>window.seekWalk(t),t);await page.locator('canvas').screenshot({path:path.join(out,`walk-check-${t}.png`)});}
assert.deepEqual(errors,[]);if(process.argv.includes('--check')){await browser.close();console.log('Walk cycle checks passed: 240 frames, finite joints and grounded stance feet.');process.exit(0);}
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-i','pipe:0','-vf','scale=800:640','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-t','8','-movflags','+faststart',path.join(out,'repeat-ai-walking-test.mp4')],{stdio:['pipe','inherit','inherit']});
const finished=new Promise((r,j)=>{ff.once('error',j);ff.once('close',code=>code===0?r():j(Error(`ffmpeg ${code}`)));});
for(let n=0;n<240;n++){await page.evaluate(t=>window.seekWalk(t),n/30);const b=await page.locator('canvas').screenshot();if(!ff.stdin.write(b))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();await finished;await browser.close();writeFileSync(path.join(out,'walk-checks.json'),JSON.stringify({passed:true,frames:240,duration:8,groundedStance:true,pageErrors:errors},null,2));console.log('Rendered 8-second walking test.');
