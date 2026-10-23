import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const base=process.env.FILM_BASE||'http://127.0.0.1:4197';
const output=path.resolve(import.meta.dirname,'../out/desktop/takes-v6');
mkdirSync(output,{recursive:true});
const executable=path.join(process.env.LOCALAPPDATA||'','ms-playwright/chromium-1217/chrome-win64/chrome.exe');
const browser=await chromium.launch({executablePath:existsSync(executable)?executable:undefined});
const context=await browser.newContext({viewport:{width:1440,height:900},colorScheme:'dark'});
const actions=[];
const errors=[];
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  return ['127.0.0.1','localhost'].includes(url.hostname)?route.continue():route.abort();
});
async function open(scene){
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(`${base}/video/launch-film/film-harness/harness.html?scene=${scene}`,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  return page;
}
async function clean(page){
  assert.equal(await page.locator('[role="alert"]:visible,.st-error:visible').count(),0,'Visible error before capture');
  assert.equal(await page.getByText('Something went wrong. Please try again.',{exact:true}).count(),0);
  assert.deepEqual(errors,[],'Runtime errors');
}
async function shot(page,name){
  await clean(page);
  await page.screenshot({path:path.join(output,`${name}.png`)});
  console.log('Captured',name);
}
async function click(page,locator,name){
  const box=await locator.boundingBox();
  assert.ok(box,name+' has bounds');
  actions.push({name,centre:{x:box.x+box.width/2,y:box.y+box.height/2,w:box.width,h:box.height}});
  await locator.click();
}
try{
  const page=await open('filters');
  await page.getByRole('tab',{name:/Due today/}).waitFor();
  assert.equal(await page.locator('tbody tr').count(),8);
  await shot(page,'desktop-sellers');
  await click(page,page.getByRole('button',{name:'Status',exact:true}),'click-status');
  await shot(page,'desktop-sellers-status');
  await click(page,page.getByRole('menuitemcheckbox',{name:'Prospect',exact:true}),'click-prospect');
  await page.getByRole('tab',{name:/Due today/}).click();
  assert.equal(await page.locator('tbody tr').count(),4,'Prospect filter changes rows');
  await shot(page,'desktop-sellers-import');
  await click(page,page.getByRole('button',{name:'Building',exact:true}),'click-building');
  await page.getByRole('searchbox',{name:'Search buildings'}).fill('Burj');
  await shot(page,'desktop-sellers-building');
  await click(page,page.getByRole('menuitemcheckbox',{name:/Burj Khalifa/}),'click-building-choice');
  await page.getByRole('tab',{name:/Due today/}).click();
  assert.equal(await page.locator('tbody tr').count(),2,'Building filter changes rows');
  await shot(page,'desktop-sellers-filtered');
  await click(page,page.getByRole('button',{name:'Saved views',exact:true}),'click-saved-views');
  page.once('dialog',dialog=>dialog.accept('Downtown Prospects'));
  await page.getByRole('button',{name:'Save current view',exact:true}).click();
  await page.getByRole('button',{name:/Downtown Prospects/}).waitFor();
  await page.getByRole('button',{name:/Downtown Prospects/}).click();
  await shot(page,'desktop-sellers-saved');
  await page.getByRole('tab',{name:/Due today/}).click();
  await page.getByRole('button',{name:/Clear [0-9]+ filters/}).click();
  assert.equal(await page.locator('tbody tr').count(),8);
  await shot(page,'desktop-sellers-due');
  await click(page,page.getByRole('tab',{name:/Scheduled/}),'click-scheduled');
  assert.equal(await page.locator('tbody tr').count(),3,'Scheduled tab changes rows');
  await shot(page,'desktop-sellers-scheduled');
  await page.close();

  const settings=await open('settings');
  await settings.getByRole('heading',{name:'Automations',exact:true}).waitFor();
  await settings.getByRole('switch',{name:'Status follow-ups',exact:true}).waitFor();
  await settings.waitForFunction(()=>document.querySelector('[aria-label="Gap between messages"] [aria-checked="true"]')?.textContent==='15m');
  await shot(settings,'desktop-automations');
  await shot(settings,'desktop-sending');
  await click(settings,settings.getByRole('button',{name:'Statuses',exact:true}),'click-statuses-nav');
  await settings.getByRole('heading',{name:'Statuses',exact:true}).waitFor();
  await shot(settings,'desktop-statuses');
  await shot(settings,'desktop-statuses-builtin');
  await click(settings,settings.getByRole('button',{name:'New status',exact:true}).first(),'click-new-status');
  await settings.getByRole('dialog').waitFor();
  await shot(settings,'desktop-status-new');
  await settings.getByPlaceholder('e.g. Hot lead').fill('Hot Lead');
  await click(settings,settings.getByRole('radio',{name:'#e8733a',exact:true}),'click-status-colour');
  await settings.getByRole('combobox',{name:'Follow up',exact:true}).selectOption('14');
  await shot(settings,'desktop-status-dialog');
  await click(settings,settings.getByRole('button',{name:'Create status',exact:true}),'click-create-status');
  await settings.getByRole('dialog').waitFor({state:'hidden'});
  const created=settings.getByRole('button',{name:/Hot Lead.*Every 2 weeks/});
  await created.waitFor();
  await shot(settings,'desktop-status-created');
  await created.click();
  assert.equal(await settings.getByPlaceholder('e.g. Hot lead').inputValue(),'Hot Lead');
  assert.equal(await settings.getByRole('combobox',{name:'Follow up',exact:true}).inputValue(),'14');
  await settings.getByRole('button',{name:'Cancel',exact:true}).click();
  await shot(settings,'desktop-controls-status');
  await settings.getByRole('button',{name:'Automations',exact:true}).click();
  const gap=settings.getByRole('radio',{name:'30m',exact:true});
  await click(settings,gap,'click-gap-30');
  await settings.waitForFunction(()=>document.querySelector('[aria-label="Gap between messages"] [aria-checked="true"]')?.textContent==='30m');
  await shot(settings,'desktop-controls-spacing');
  await settings.getByRole('combobox',{name:'End',exact:true}).selectOption('18');
  await settings.getByRole('textbox',{name:'Messages per day',exact:true}).fill('20');
  await settings.getByRole('textbox',{name:'Messages per day',exact:true}).blur();
  await settings.waitForFunction(()=>document.querySelector('[aria-label="Messages per day"]')?.value==='20');
  await settings.getByText(/up to 18 messages a day/).waitFor();
  assert.equal(await settings.getByRole('combobox',{name:'End',exact:true}).inputValue(),'18');
  await shot(settings,'desktop-controls-window');
  await settings.close();

  const assignment=await open('filters&assign=1');
  await assignment.getByRole('row',{name:'Open seller Oliver Grant',exact:true}).click();
  await click(assignment,assignment.getByRole('button',{name:'Edit seller',exact:true}),'click-edit-seller');
  await shot(assignment,'desktop-status-edit');
  await click(assignment,assignment.getByRole('radio',{name:'Hot Lead',exact:true}),'click-hot-lead');
  await shot(assignment,'desktop-status-assignment');
  await click(assignment,assignment.getByRole('button',{name:'Save changes',exact:true}),'click-save-seller');
  await assignment.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await assignment.evaluate(()=>window.__filmSellerState.leads.find(lead=>lead.name==='Oliver Grant').status),'Hot Lead');
  await shot(assignment,'desktop-status-assigned');
  await assignment.close();
  writeFileSync(path.join(output,'actions.json'),JSON.stringify(actions,null,2));
  writeFileSync(path.join(output,'desktop-checks.json'),JSON.stringify({passed:true,filters:[8,4,2],scheduled:3,statusCreated:'Hot Lead',followUpDays:14,statusAssigned:'Oliver Grant',pacing:{gap:30,end:18,dailyLimit:20,capacity:18},runtimeErrors:errors},null,2));
  console.log('Verified desktop interactions and state readbacks passed.');
}finally{await browser.close();}
