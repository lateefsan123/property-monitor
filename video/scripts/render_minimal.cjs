// Render the isolated film entry. No dependency on abandoned cuts or application components.
const path = require('node:path');
const fs = require('node:fs');
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, renderMedia, openBrowser} = require('@remotion/renderer');

const root=path.resolve(__dirname,'../..');
const out=path.join(root,'video/review/minimal');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(root,'video/src/minimal/index.tsx'),publicDir:path.join(root,'video/assets/minimal/public'),outDir:path.join(out,'bundle'),onProgress:p=>{if(p===100)console.log('BUNDLE READY')}});
 const browser=await openBrowser('chrome');
 try{
  const composition=await selectComposition({serveUrl,id:'RepeatAIMinimal',puppeteerInstance:browser});
  const frames=[120,270,351,555,760,866,1015,1125,1305,1360,1600,1810,1960];
  if(!process.argv.includes('--video-only')){
   for(const frame of frames){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:path.join(out,`frame-${frame}.png`),imageFormat:'png',scale:.6666667});
    console.log('FRAME',frame);
   }
  }
  if(process.argv.includes('--stills'))return;
  let last=-1;
  await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(out,'repeat-ai-minimal-master.mp4'),crf:17,pixelFormat:'yuv420p',audioBitrate:'320k',concurrency:4,onProgress:p=>{const pc=Math.floor(p.progress*20)*5;if(pc!==last){last=pc;console.log('RENDER',pc+'%');}}});
  console.log('VIDEO READY');
 }finally{await browser.close({silent:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
