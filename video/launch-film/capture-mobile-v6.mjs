import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {openApp} from './app-browser.mjs';

const output=path.resolve(import.meta.dirname,'out/app/takes-v6');
mkdirSync(output,{recursive:true});
const actions=[],warnings=[];
const only=process.argv[2];
async function run(callback){
  const app=await openApp();
  const fatal=[];
  app.page.on('pageerror',error=>fatal.push(String(error)));
  try{
    await callback(app);
    assert.deepEqual(fatal,[],'Mobile runtime exceptions');
    warnings.push(...app.errors);
  }finally{await app.browser.close();}
}
async function click(page,locator,name){
  const box=await locator.boundingBox();
  assert.ok(box,name+' is visible');
  actions.push({name,centre:{x:box.x+box.width/2,y:box.y+box.height/2,w:box.width,h:box.height}});
  await locator.click();
}
async function nav(page,label){
  await click(page,page.getByLabel('Open navigation').first(),'open-navigation');
  await page.getByLabel(label,{exact:true}).last().click();
}
async function shot(page,name){
  assert.equal(await page.getByText('Something went wrong. Please try again.',{exact:true}).count(),0);
  await page.screenshot({path:path.join(output,`${name}.png`)});
  console.log('Captured',name);
}

if(!only||only==='sellers') await run(async({page,settle})=>{
  await nav(page,'Sellers');
  await page.getByText('Oliver Grant',{exact:true}).waitFor();
  await settle(500);
  await shot(page,'mobile-sellers');
  await shot(page,'mobile-sellers-check');
  await click(page,page.getByText('Oliver Grant',{exact:true}),'mobile-open-seller');
  await page.getByRole('tab',{name:'Message',exact:true}).waitFor();
  await settle(400);
  await shot(page,'mobile-seller-sheet');
  await click(page,page.getByRole('tab',{name:'Message',exact:true}),'mobile-message-tab');
  await page.getByLabel('Seller message',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Send (via WhatsApp|follow-up)/}).waitFor();
  await settle(400);
  await shot(page,'mobile-send');
});

if(!only||only==='activity') await run(async({page,settle})=>{
  await nav(page,'Settings');
  await page.getByText('Send activity',{exact:true}).last().click();
  await page.getByText('Send activity',{exact:true}).first().waitFor();
  await settle(1200);
  assert.ok((await page.locator('body').innerText()).match(/Sent|Delivered|Read|sent|delivered|read/),'Send activity shows recorded demo messages');
  await shot(page,'mobile-activity');
});

const question='Show September sales in Forte 2.';
const answer='Five imported sales in September. Median price: 2.9 million dirhams. This is imported coverage, not the whole market.';
const result={kind:'market-sales',title:'Forte 2 sales',total:5,emptyState:null,
  note:'1–30 September 2026 · 5 imported sales · Demo data',
  summary:{count:5,averagePriceAed:2944000,medianPriceAed:2900000,pricePerSqftAed:3001,pricePerSqftSampleSize:5},
  items:[['2026-09-27',3150000,'2',1010],['2026-09-21',2900000,'2',965],['2026-09-14',1720000,'1',600],['2026-09-09',4350000,'3',1450],['2026-09-03',2600000,'2',880]]
    .map(([date,amountAed,beds,areaSqft])=>({name:'Forte 2',date,amountAed,beds,areaSqft})),
};
if(!only||only==='ask') await run(async({page,settle})=>{
  await click(page,page.getByLabel('Ask Repeat, voice or chat',{exact:true}),'mobile-open-ask');
  await page.getByLabel('Start voice conversation',{exact:true}).waitFor();
  await settle(400);
  await shot(page,'mobile-ask');
  await page.evaluate(scene=>{window.__filmVoice=scene;window.dispatchEvent(new Event('film-voice'));},
    {state:'listening',captions:{you:question,assistant:''},loading:false,result:null});
  await page.getByText(question,{exact:true}).waitFor();
  await shot(page,'mobile-ask-typed');
  await page.evaluate(scene=>{window.__filmVoice=scene;window.dispatchEvent(new Event('film-voice'));},
    {state:'listening',captions:{you:question,assistant:answer},loading:false,result});
  await page.getByText(/Forte 2 sales/).waitFor();
  await page.getByText(/Forte 2 sales/).scrollIntoViewIfNeeded();
  await settle(400);
  await shot(page,'mobile-ask-result');
});

writeFileSync(path.join(output,'actions.json'),JSON.stringify(actions,null,2));
writeFileSync(path.join(output,'mobile-checks.json'),JSON.stringify({passed:true,source:'Current Expo app, EXPO_PUBLIC_FILM=1',voiceDemo:'Scripted fixture result rendered by the actual voice panel; no live query',knownWebWarnings:[...new Set(warnings)]},null,2));
console.log('Current mobile app captures complete. Known web warnings recorded in mobile-checks.json.');
