import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'../..');
const out=path.join(root,'video/assets/accurate/captures/fresh');
export default defineConfig({root,configFile:false,plugins:[react(),{
 name:'recording-fixtures',enforce:'pre',
 resolveId(source,importer){
  if(importer?.endsWith('/NewSpreadsheetModal.jsx')&&source.endsWith('/lead-import-services'))return path.join(root,'video/capture/fixtures.js');
  if(importer?.endsWith('/SchedulePage.jsx')&&source==='./useSpreadsheetBuildings')return path.join(root,'video/capture/fixtures.js');
 },
 configureServer(server){server.middlewares.use('/capture-frame',async(req,res)=>{
  if(req.method!=='POST'){res.statusCode=405;res.end();return;}
  if(req.headers.origin!=='http://127.0.0.1:4187'){res.statusCode=403;res.end();return;}
  try{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>4*1024*1024)throw Error('Frame too large');chunks.push(c)}const p=JSON.parse(Buffer.concat(chunks));
   if(!/^[a-z-]+$/.test(p.take)||!Number.isInteger(p.index))throw Error('Invalid frame');
   const dir=path.join(out,p.take);await mkdir(dir,{recursive:true});
   await writeFile(path.join(dir,String(p.index).padStart(5,'0')+'.jpg'),Buffer.from(p.data,'base64'));
   await writeFile(path.join(dir,String(p.index).padStart(5,'0')+'.json'),JSON.stringify(p.metadata));
   res.end('ok');
  }catch(error){res.statusCode=400;res.end(error.message)}
 })}
}],server:{host:'127.0.0.1',port:4187,strictPort:true},resolve:{dedupe:['react','react-dom']}});
