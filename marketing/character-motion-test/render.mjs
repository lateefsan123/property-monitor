import {chromium} from '../../video/node_modules/playwright-core/index.mjs';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=import.meta.dirname,out=path.join(root,'out');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:path.join(process.env.LOCALAPPDATA,'ms-playwright/chromium-1217/chrome-win64/chrome.exe')});
const page=await browser.newPage({viewport:{width:1100,height:1250}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>window.motionTestReady);
await page.getByRole('button',{name:'Pause animation'}).click();
for(const t of [0,1.5,3,5.8]){await page.evaluate(t=>window.seekMotion(t),t);await page.locator('canvas').screenshot({path:path.join(out,`check-${t}.png`)});}
if(errors.length)throw new Error(errors.join('\n'));
if(process.argv.includes('--check')){await browser.close();process.exit(0);}
const rate=48000,seconds=7;const pcm=Buffer.alloc(rate*seconds*2);
for(let i=0;i<rate*seconds;i++){const t=i/rate;let s=0;for(const start of [1.18,1.52]){const dt=t-start;if(dt>=0&&dt<.16){const env=Math.sin(Math.PI*dt/.16)**2;s+=(Math.sin(2*Math.PI*105*dt)+.3*Math.sin(2*Math.PI*210*dt))*.085*env;}}pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,s))*32767),i*2);}
writeFileSync(path.join(out,'buzz.pcm'),pcm);
const target=path.join(out,'repeat-ai-character-motion-test.mp4');
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-i','pipe:0','-f','s16le','-ar',String(rate),'-ac','1','-i',path.join(out,'buzz.pcm'),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-t','7','-movflags','+faststart',target],{stdio:['pipe','inherit','inherit']});
const completed=new Promise((resolve,reject)=>{ff.once('error',reject);ff.once('close',c=>c===0?resolve():reject(new Error(`ffmpeg ${c}`)));});
for(let n=0;n<210;n++){await page.evaluate(t=>window.seekMotion(t),n/30);const png=await page.locator('canvas').screenshot();if(!ff.stdin.write(png))await new Promise(r=>ff.stdin.once('drain',r));}
ff.stdin.end();await completed;await browser.close();console.log(target);
