// node app-takes-v5s.mjs [take ...]  ->  out/app/takes-v5s/*.png
// The v5 takes recaptured from the current mobile app, plus the statuses update's
// new flows (status view, custom status, For Sale template, sending controls).
// Film mode on port 8093 (launch config mobile-film-v5s), so other sessions'
// film servers on 8083 are left alone. Same 1179x2556 stills as v5.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { openApp } from './app-browser.mjs';
import { TAKES } from './app-pacing-v5s.mjs';

const out = path.join(import.meta.dirname, 'out', 'app', TAKES);
mkdirSync(out, { recursive: true });

// Optional names limit the run: node app-takes.mjs ask schedule
const only = process.argv.slice(2);

// Ask Repeat by voice, scripted through mobile/film/fake-use-voice.js. The result has
// the shape of the real market_sales tool result (shared/assistant-market.js), with
// demo figures matching the spoken answer: 5 sales, median AED 2.9M, ~AED 3,000/sq ft.
const QUESTION = 'What sold in Forte 2 last month?';
const SPOKEN = 'Forte 2 had five recorded sales in August. The median was 2.9 million dirhams, about 3,000 per square foot.';
const SALES = {
  kind: 'market-sales', title: 'Forte 2 sales', total: 5, emptyState: null,
  note: '2026-08-01 – 2026-08-31 · 5 imported sales; showing up to 20. Imported coverage only.',
  summary: { count: 5, averagePriceAed: 2944000, medianPriceAed: 2900000, pricePerSqftAed: 3001, pricePerSqftSampleSize: 5 },
  items: [['2026-08-27', 3150000, '2', 1010], ['2026-08-21', 2900000, '2', 965], ['2026-08-14', 1720000, '1', 600], ['2026-08-09', 4350000, '3', 1450], ['2026-08-03', 2600000, '2', 880]]
    .map(([date, amountAed, beds, areaSqft]) => ({ name: 'Forte 2', date, amountAed, beds, areaSqft })),
};
const SCENES = {
  listening: { state: 'listening' },
  asking: { state: 'listening', captions: { you: QUESTION, assistant: '' } },
  thinking: { state: 'listening', loading: true, captions: { you: QUESTION, assistant: '' } },
  answer: { state: 'listening', captions: { you: QUESTION, assistant: SPOKEN }, result: SALES },
  // A prepared note waits for the button (prepare_lead_note; nothing is saved until Confirm change).
  confirm: { state: 'listening', preview: { kind: 'lead-note', preview: { subject: 'Add a note to Rohan Mehta', body: 'Sent the August sales in Forte 2. He may want a valuation after the tenancy ends.' } } },
};
async function take(name, steps) {
  if (only.length && !only.includes(name)) return;
  const { browser, page, settle, errors } = await openApp({ base: 'http://127.0.0.1:8093' });
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
      : kind === 'text' ? page.getByText(arg).last()
        : kind === 'exact' ? page.getByText(arg, { exact: true }).last()
        : kind === 'starts' ? page.getByText(new RegExp(`^${arg}`)).last() // plain words only
        : kind === 'find' ? page.getByLabel(arg, { exact: true }).or(page.getByText(arg)).last()
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
    else if (kind === 'scene') await page.evaluate((scene) => { window.__filmVoice = scene; window.dispatchEvent(new Event('film-voice')); }, SCENES[arg]);
    else if (kind === 'wait') await page.waitForTimeout(Number(arg));
    else if (kind === 'scroll') await page.mouse.wheel(0, Number(arg));
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
// The Introduction carries the broker card, which goes with a seller's first message.
await take('intro', ['nav:Message template', 'wait:1800', 'tap:Edit Introduction', 'wait:2000', 'grow', 'shot:tpl-intro',
  'text:Insert details', 'wait:900', 'grow', 'shot:tpl-intro-details', 'close', 'wait:900', 'grow', 'text:Preview', 'wait:1500', 'grow', 'shot:tpl-intro-preview']);
await take('listings', ['nav:Listings', 'wait:3500', 'shot:listings', 'find:Watching', 'text:Act One', 'wait:2500', 'shot:building', 'text:High floor', 'wait:2200', 'shot:listing']);
await take('schedule', ['nav:Schedule', 'wait:2500', 'shot:schedule', 'tap:Edit schedule for Opera Grand', 'wait:1200', 'shot:sched-edit',
  'tap:Opera Grand, Thursday', 'shot:sched-th', 'tap:Opera Grand, Saturday', 'shot:sched-sa', 'tap:Done', 'wait:1500', 'shot:schedule-updated']);
await take('ask', ['wait:1500', 'tap:Ask Repeat, voice or chat', 'wait:1200', 'shot:ask-open', 'find:Start voice conversation',
  'fill:Message Repeat AI=Any price drops in Act One?', 'shot:ask-typed', 'tap:Send message', 'wait:2600', 'shot:ask-reply']);
await take('voice', ['wait:1500', 'tap:Ask Repeat, voice or chat', 'wait:1200', 'scene:listening', 'shot:voice-listening',
  'scene:asking', 'shot:voice-asking', 'scene:thinking', 'shot:voice-thinking', 'scene:answer', 'wait:600', 'shot:voice-answer',
  'scene:confirm', 'wait:600', 'shot:voice-confirm', 'find:Confirm change']);
await take('integrations', ['nav:Settings', 'wait:1200', 'tap:Integrations', 'wait:2500', 'shot:integrations']);

// --- The statuses update -------------------------------------------------------
// Due today vs Scheduled, then the Filters sheet narrowed to Appraisal.
await take('status-view', ['nav:Sellers', 'wait:2500', 'shot:sv-due', 'tab:Scheduled 10', 'wait:1500', 'shot:sv-scheduled',
  'tab:Due today 24', 'wait:1200', 'tap:Seller filters', 'wait:1000', 'shot:sv-filters', 'tap:Status: All statuses', 'wait:900', 'shot:sv-status',
  'exact:Appraisal', 'wait:700', 'shot:sv-appraisal', 'starts:Show sellers', 'wait:1500', 'shot:sv-appraisals']);
// A custom status: name, colour, follow-up schedule, saved, then set on Oliver Grant.
await take('custom-status', ['nav:Settings', 'wait:1200', 'tap:Statuses', 'wait:1500', 'shot:cs-statuses', 'exact:Add status', 'wait:1000', 'shot:cs-new',
  'fill:Name=Viewing booked', 'shot:cs-named', 'tap:#0ea5a4', 'shot:cs-teal', 'scroll:600', 'wait:500', 'shot:cs-follow', 'exact:Every week', 'shot:cs-week',
  'exact:Save', 'wait:1500', 'shot:cs-saved', 'tap:Go back', 'wait:1000', 'nav:Sellers', 'wait:2500', 'text:Oliver Grant', 'wait:1500', 'shot:cs-oliver',
  'tap:Change seller status', 'wait:900', 'shot:cs-chips', 'exact:Viewing booked', 'wait:1200', 'shot:cs-set']);
// The For Sale stage has its own template.
await take('for-sale', ['nav:Message template', 'wait:1800', 'tap:Edit For sale update', 'wait:1500', 'grow', 'shot:fs-template',
  'tap:Use for seller statuses', 'wait:900', 'grow', 'shot:fs-uses', 'close', 'wait:900', 'grow', 'text:Preview', 'wait:1200', 'grow', 'shot:fs-preview']);
// Sending controls: follow-up days per status, then the gap, the hours and the daily limit.
await take('sending', ['nav:Settings', 'wait:1200', 'tap:Statuses', 'wait:1500', 'shot:sc-statuses', 'tap:Go back', 'wait:900',
  'tap:Automations', 'wait:1500', 'shot:sc-auto', 'scroll:700', 'wait:600', 'shot:sc-pacing', 'exact:10m', 'wait:600', 'shot:sc-gap10',
  'exact:15m', 'wait:600', 'shot:sc-gap15', 'starts:Send between', 'wait:1000', 'shot:sc-window', 'close', 'wait:900', 'shot:sc-limit']);
