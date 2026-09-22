// Render the film entry with the actual app presentation components and styles.
const path = require('node:path');
const fs = require('node:fs');
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, renderMedia, openBrowser} = require('@remotion/renderer');

const root=path.resolve(__dirname,'../..');
const out=path.join(root,'video/review/final');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(root,'video/src/workflow/final-index.tsx'),publicDir:path.join(root,'video/assets/accurate/public'),webpackOverride:config=>({...config,module:{...config.module,rules:[...(config.module?.rules||[]),{test:/\.m?js$/,resolve:{fullySpecified:false}}]},resolve:{...config.resolve,alias:{...config.resolve?.alias,react:path.join(root,'video/node_modules/react'),'react-dom':path.join(root,'video/node_modules/react-dom')}}}),outDir:path.join(out,'bundle'),onProgress:p=>{if(p===100)console.log('BUNDLE READY')}});
 const browser=await openBrowser('chrome');
 try{
  const composition=await selectComposition({serveUrl,id:'RepeatAIWorkflow',puppeteerInstance:browser});
  const frameArgument=process.argv.find(arg=>arg.startsWith('--frames='));
  const frames=frameArgument?frameArgument.slice(9).split(',').map(Number):[60,150,270,370,460,600,900,1100,1400,1510,1620,1750,1830,2010,2180,2470,2860,3100,3270,3510,3750,3880,4050,4200];
  if(!process.argv.includes('--video-only')){
   for(const frame of frames){
    await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:path.join(out,`frame-${frame}.png`),imageFormat:'png',scale:.6666667});
    console.log('FRAME',frame);
   }
  }
  if(process.argv.includes('--stills'))return;
  let last=-1;
  await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(out,'repeat-ai-final-master.mp4'),crf:17,pixelFormat:'yuv420p',audioBitrate:'320k',concurrency:4,onProgress:p=>{const pc=Math.floor(p.progress*20)*5;if(pc!==last){last=pc;console.log('RENDER',pc+'%');}}});
  console.log('VIDEO READY');
 }finally{await browser.close({silent:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
