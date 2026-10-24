import { openApp } from '../../../video/launch-film/app-browser.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=import.meta.dirname;
const {page,browser,settle,errors}=await openApp();
try {
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  return ['127.0.0.1','localhost'].includes(u.hostname)||!['http:','https:'].includes(u.protocol)?route.continue():route.abort();
 });
 // Freeze only the demo browser's Date so the fixture sale matches the script.
 await page.addInitScript(()=>{
  const RealDate=Date, offset=RealDate.parse('2026-10-23T12:00:00Z')-RealDate.now();
  window.Date=class extends RealDate {
   constructor(...args){super(...(args.length?args:[RealDate.now()+offset]));}
   static now(){return RealDate.now()+offset;}
  };
 });
 await page.reload({waitUntil:'load'});
 await page.getByLabel('Open navigation').first().waitFor();
 await page.getByLabel('Open navigation').first().click();
 await page.getByLabel('Sellers',{exact:true}).last().click();
 await page.getByText('Oliver Grant',{exact:true}).click();
 await page.getByRole('tab',{name:'Details',exact:true}).waitFor();
 const sales=page.getByText('Sales in Burj Khalifa',{exact:true});
 await sales.waitFor({timeout:30000});
 await sales.scrollIntoViewIfNeeded(); await settle(1000);
 const section=sales.locator('..');
 await section.evaluate(e=>e.scrollIntoView({block:'center'}));
 await settle(400);
 const box=await section.boundingBox();
 assert(box&&box.y>=0&&box.y+box.height<=852,'Entire sales section visible');
 const salesText=await section.innerText();
 await page.screenshot({path:path.join(out,'app-oliver-sales.png')});
 await page.getByRole('tab',{name:'Message',exact:true}).click();
 const message=page.getByLabel('Seller message',{exact:true}); await message.waitFor();
 await message.evaluate(e=>{e.style.height='auto';e.style.height=`${e.scrollHeight}px`;});
 await message.scrollIntoViewIfNeeded(); await settle(600);
 const messageText=await message.inputValue();
 const mb=await message.boundingBox();
 assert(mb&&mb.y>=0&&mb.y+mb.height<=852,'Full message text visible');
 await page.screenshot({path:path.join(out,'app-oliver-message.png')});
 writeFileSync(path.join(out,'capture-checks.json'),JSON.stringify({source:'Current Expo web mobile components, EXPO_PUBLIC_FILM=1, offline mobile/film fixtures',commit:'6231dcab',demoClock:'2026-10-23T12:00:00Z, fixed browser Date for scripted sale date',viewport:[393,852],scale:3,pixels:[1179,2556],theme:'dark',salesText,messageText,salesBounds:box,messageBounds:mb,errors,physicalDeviceTest:false},null,2));
 console.log(salesText,messageText,errors);
} finally {await browser.close();}
