// node app-takes.mjs [take ...]  ->  out/app/takes/*.png
// Drives the real mobile app (film mode, port 8083) through each flow and
// saves 1179x2556 stills of every state the film uses.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openApp } from './app-browser.mjs';

const out = path.join(import.meta.dirname, 'out', 'app', 'takes');
mkdirSync(out, { recursive: true });

// Optional names limit the run: node app-takes.mjs ask schedule
const only = process.argv.slice(2);
async function take(name, steps) {
  if (only.length && !only.includes(name)) return;
  const { browser, page, settle, errors } = await openApp();
  await settle(2500);
  const shots = [];
  for (const step of steps) {
    if (typeof step === 'string' && step.startsWith('shot:')) {
      const file = step.slice(5);
      await settle(700);
      await page.screenshot({ path: path.join(out, `${file}.png`) });
      shots.push(file);
      continue;
    }
    const [kind, ...rest] = step.split(':');
    const arg = rest.join(':');
    // Log each tap target's centre (CSS px in the 393x852 viewport) for the film's tap ripples.
    if (kind === 'tap' || kind === 'text') {
      const target = kind === 'tap' ? page.getByLabel(arg, { exact: true }).last() : page.getByText(arg).last();
      const box = await target.boundingBox();
      if (box) console.log(`  tap ${arg}: ${Math.round(box.x + box.width / 2)},${Math.round(box.y + box.height / 2)}`);
    }
    if (kind === 'nav') { await page.getByLabel('Open navigation').first().click(); await settle(600); await page.getByLabel(arg, { exact: true }).last().click(); }
    else if (kind === 'tap') await page.getByLabel(arg, { exact: true }).last().click();
    else if (kind === 'text') await page.getByText(arg).last().click();
    else if (kind === 'fill') { const [label, value] = arg.split('='); await page.getByLabel(label).last().fill(value); }
    else if (kind === 'wait') await page.waitForTimeout(Number(arg));
    await settle();
  }
  await browser.close();
  const real = [...new Set(errors)].filter((e) => !/negative value|GCM|gcm/.test(e));
  console.log(`${name}: ${shots.join(', ')}${real.length ? `\n  errors: ${real.slice(0, 3).join(' | ')}` : ''}`);
}

await take('home', ['wait:1500', 'shot:home']);
await take('import', ['nav:Spreadsheets', 'shot:sheets', 'tap:Import spreadsheet', 'wait:600', 'shot:import-options',
  'tap:Import from URL, Google Sheets or Excel link', 'fill:Spreadsheet link=https://docs.google.com/spreadsheets/d/downtown-owners', 'shot:import-link',
  'tap:Continue', 'wait:1800', 'shot:import-done']);
await take('sellers', ['nav:Sellers', 'wait:2500', 'shot:sellers',
  'tap:Send WhatsApp message to Oliver Grant', 'wait:1400', 'shot:sellers-sent']);
await take('detail', ['nav:Sellers', 'wait:2500', 'text:Sara Haddad', 'wait:1500', 'shot:detail', 'text:Message', 'wait:1500', 'shot:detail-message']);
await take('automations', ['nav:Settings', 'wait:1200', 'tap:Automations', 'wait:1200', 'shot:automations']);
await take('templates', ['nav:Message template', 'wait:1800', 'shot:templates', 'tap:Edit Transaction update, default template', 'wait:1200', 'shot:template-edit']);
await take('listings', ['nav:Listings', 'wait:3500', 'shot:listings', 'text:Act One', 'wait:2500', 'shot:building', 'text:High floor', 'wait:2200', 'shot:listing']);
await take('schedule', ['nav:Schedule', 'wait:2500', 'shot:schedule', 'tap:Edit schedule for Opera Grand', 'wait:1200', 'shot:sched-edit',
  'tap:Opera Grand, Thursday', 'shot:sched-th', 'tap:Opera Grand, Saturday', 'shot:sched-sa', 'tap:Done', 'wait:1500', 'shot:schedule-updated']);
await take('ask', ['wait:1500', 'tap:Ask Repeat, voice or chat', 'wait:1200', 'shot:ask-open',
  'fill:Message Repeat AI=Any price drops in Act One?', 'shot:ask-typed', 'tap:Send message', 'wait:2600', 'shot:ask-reply']);
await take('integrations', ['nav:Settings', 'wait:1200', 'tap:Integrations', 'wait:2500', 'shot:integrations']);
