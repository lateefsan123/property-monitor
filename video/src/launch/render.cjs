const path=require('node:path'),fs=require('node:fs');
const {bundle}=require('@remotion/bundler');
const {selectComposition,renderStill,renderMedia,openBrowser}=require('@remotion/renderer');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'video/review/launch');
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const serveUrl=await bundle({entryPoint:path.join(__dirname,'index.tsx'),publicDir:path.join(root,'video/assets/launch/public'),outDir:path.join(out,'bundle'),webpackOverride:c=>({...c,module:{...c.module,rules:[...(c.module?.rules||[]),{test:/\.m?js$/,resolve:{fullySpecified:false}}]},resolve:{...c.resolve,alias:{...c.resolve?.alias,react:path.join(root,'video/node_modules/react'),'react-dom':path.join(root,'video/node_modules/react-dom')}}})});
 const browser=await openBrowser('chrome');
 try{
  const composition=await selectComposition({serveUrl,id:'RepeatAILaunch',puppeteerInstance:browser});
  const frameArg=process.argv.find(x=>x.startsWith('--frames='));
  const frames=frameArg?frameArg.slice(9).split(',').map(Number):[30,92,165,250,350,475,650,830,970,1120,1320,1490,1610,1770,1920];
  if(!process.argv.includes('--video-only'))for(const frame of frames){await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:path.join(out,`frame-${frame}.png`),imageFormat:'png',scale:2/3});console.log('FRAME',frame)}
  if(process.argv.includes('--stills'))return;
  let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(out,'repeat-ai-launch-master.mp4'),crf:17,pixelFormat:'yuv420p',audioBitrate:'320k',concurrency:3,onProgress:p=>{const pc=Math.floor(p.progress*20)*5;if(pc!==last){last=pc;console.log('RENDER',pc+'%')}}});
 }finally{await browser.close({silent:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
