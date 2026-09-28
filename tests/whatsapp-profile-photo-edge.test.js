import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import vm from 'node:vm';
test('numeric seller IDs reach the owned account lookup; invalid IDs do not', async () => {
 let handler; const owners=[]; let lookupCount=0;
 const source=(await readFile('supabase/functions/whatsapp-profile-photo/index.ts','utf8')).replace(/^import .*;\r?\n/gm,'');
 const {code}=await transform(source,{loader:'ts',format:'cjs'});
 vm.runInNewContext(code,{Request,Response,URL,AbortSignal,createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>{lookupCount++;return {select(){return this},eq(key,value){if(key==='user_id')owners.push(value);return this},maybeSingle:async()=>({data:table==='leads'?{phone:'971500000001'}:{provider:'baileys',connection_status:'connected',phone_number_id:'baileys:session'}})}}}),Deno:{env:{get:()=> 'https://test.local'},serve:fn=>handler=fn},fetch:async()=>new Response(JSON.stringify({url:'https://example.com/photo.jpg'}))});
 const call=id=>handler(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({leadId:id,accountId:'account'})}));
 assert.deepEqual(await (await call(123)).json(),{url:'https://example.com/photo.jpg'});
 assert.deepEqual(owners,['owner','owner']);
 for(const id of [null,{},-1,1.5,''])assert.equal((await call(id)).status,400);
 assert.equal(lookupCount,2);
});
