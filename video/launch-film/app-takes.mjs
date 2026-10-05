// node app-takes.mjs [take ...]  ->  out/app/<TAKES>/*.png
// Drives the real mobile app (film mode, port 8083) through each flow and
// saves 1179x2556 stills of every state the film uses.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openApp } from './app-browser.mjs';
import { TAKES } from './app-pacing.mjs';

const out = path.join(import.meta.dirname, 'out', 'app', TAKES);
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
    const target = kind === 'tap' ? page.getByLabel(arg, { exact: true }).last()
      : kind === 'text' || kind === 'find' ? page.getByText(arg).last()
        : kind === 'tab' ? page.getByRole('tab', { name: arg, exact: true }).last() : null;
    // Log each tap target's centre (CSS px in the 393x852 viewport) for the film's tap ripples.
    if (target) {
      const box = await target.boundingBox();
      if (box) console.log(`  ${kind} ${arg}: ${Math.round(box.x + box.width / 2)},${Math.round(box.y + box.height / 2)}`);
    }
    if (kind === 'nav') { await page.getByLabel('Open navigation').first().click(); await settle(600); await page.getByLabel(arg, { exact: true }).last().click(); }
    else if (kind === 'find') continue; // log the position only
    else if (target) await target.click();
    // Bottom sheets close from their backdrop, above the sheet.
    else if (kind === 'close') await page.getByLabel('Close dialog').last().click({ position: { x: 196, y: 80 } });
    else if (kind === 'fill') { const [label, value] = arg.split('='); await page.getByLabel(label).last().fill(value); }
    else if (kind === 'wait') await page.waitForTimeout(Number(arg));
    // Multiline inputs grow with their text on iOS; react-native-web keeps them at
    // their minimum height, so size them to their content before a shot.
    else if (kind === 'grow') await page.evaluate(() => document.querySelectorAll('textarea').forEach((area) => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight}px`; }));
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
// Oliver Grant is a Prospect, so his message uses the Introduction template.
await take('sellers', ['nav:Sellers', 'wait:2500', 'shot:sellers', 'text:Oliver Grant', 'wait:1500', 'shot:oliver', 'tab:Message', 'wait:1500', 'shot:oliver-message', 'find:Send via WhatsApp']);
await take('whatsapp', ['nav:Settings', 'wait:1200', 'shot:settings', 'tap:WhatsApp', 'wait:2500', 'shot:whatsapp']);
await take('automations', ['nav:Settings', 'wait:1200', 'tap:Automations', 'wait:1200', 'shot:automations']);
// Appraisal is assigned on camera: the sheet before and after the switch, then
// the follow-up with its placeholders and preview.
await take('templates', ['nav:Message template', 'wait:1800', 'shot:templates',
  'tap:Edit Appraisal follow-up', 'wait:1200', 'grow', 'shot:tpl-appraisal',
  'tap:Use for seller statuses', 'wait:900', 'grow', 'shot:tpl-uses', 'tap:Use for Appraisal', 'wait:600', 'grow', 'shot:tpl-uses-on',
  'close', 'wait:900', 'grow', 'shot:tpl-followup', 'text:Insert details', 'wait:900', 'grow', 'shot:tpl-details',
  'close', 'wait:900', 'grow', 'text:Preview', 'wait:900', 'grow', 'shot:tpl-preview']);
await take('intro', ['nav:Message template', 'wait:1800', 'tap:Edit Introduction', 'wait:1200', 'grow', 'shot:tpl-intro']);
await take('listings', ['nav:Listings', 'wait:3500', 'shot:listings', 'text:Act One', 'wait:2500', 'shot:building', 'text:High floor', 'wait:2200', 'shot:listing']);
await take('schedule', ['nav:Schedule', 'wait:2500', 'shot:schedule', 'tap:Edit schedule for Opera Grand', 'wait:1200', 'shot:sched-edit',
  'tap:Opera Grand, Thursday', 'shot:sched-th', 'tap:Opera Grand, Saturday', 'shot:sched-sa', 'tap:Done', 'wait:1500', 'shot:schedule-updated']);
await take('ask', ['wait:1500', 'tap:Ask Repeat, voice or chat', 'wait:1200', 'shot:ask-open',
  'fill:Message Repeat AI=Any price drops in Act One?', 'shot:ask-typed', 'tap:Send message', 'wait:2600', 'shot:ask-reply']);
await take('integrations', ['nav:Settings', 'wait:1200', 'tap:Integrations', 'wait:2500', 'shot:integrations']);
