// Render the isolated film entry. No dependency on abandoned cuts or application components.
const path = require('node:path');
const fs = require('node:fs');
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, renderMedia, openBrowser} = require('@remotion/renderer');

const root=path.resolve(__dirname,'../..');
const out=path.join(root,'video/review/accurate');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(root,'video/src/accurate/index.tsx'),publicDir:path.join(root,'video/assets/accurate/public'),outDir:path.join(out,'bundle'),onProgress:p=>{if(p===100)console.log('BUNDLE READY')}});
 const browser=await openBrowser('chrome');
 try{
  const composition=await selectComposition({serveUrl,id:'RepeatAIAccurate',puppeteerInstance:browser});
  const frames=[120,330,780,1050,1245,1430,1980,2430,2520,2680,2880,3045,3370,3600];
  if(!process.argv.includes('--video-only')){
   for(const frame of frames){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:path.join(out,`frame-${frame}.png`),imageFormat:'png',scale:.6666667});
    console.log('FRAME',frame);
   }
  }
  if(process.argv.includes('--stills'))return;
  let last=-1;
  await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(out,'repeat-ai-accurate-master.mp4'),crf:17,pixelFormat:'yuv420p',audioBitrate:'320k',concurrency:4,onProgress:p=>{const pc=Math.floor(p.progress*20)*5;if(pc!==last){last=pc;console.log('RENDER',pc+'%');}}});
  console.log('VIDEO READY');
 }finally{await browser.close({silent:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
