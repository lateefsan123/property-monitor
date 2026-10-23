// Captures real MessageTemplatesPanel screenshots for the v6 film.
// Uses the harness on ?scene=templates which mounts templates-scene.jsx.
// Run: node video/launch-film/film-harness/capture-templates.mjs
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strict as assert } from 'node:assert';

const bundled = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1217', 'chrome-win64', 'chrome.exe');
const executablePath = existsSync(bundled) ? bundled : undefined;
const base = process.env.FILM_BASE || 'http://127.0.0.1:4197';
const outDir = path.join(import.meta.dirname, '..', 'out', 'desktop', 'takes-v6');
mkdirSync(outDir, { recursive: true });

const actions = [];

function fail(msg) { console.error(`FAIL: ${msg}`); process.exit(1); }

async function shot(page, name, notes) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  actions.push({ name, notes });
  console.log(`  ✓ ${name}`);
}

async function centre(locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2), w: Math.round(box.width), h: Math.round(box.height) };
}

async function assertNoErrors(page) {
  const alerts = await page.locator('[role="alert"]').count();
  const errorTexts = await page.locator('.message-template-error').count();
  if (alerts > 0 || errorTexts > 0) {
    const text = await page.locator('[role="alert"], .message-template-error').first().textContent().catch(() => '');
    fail(`Unexpected error/alert on page: "${text}"`);
  }
}

console.log(`Templates capture: ${base}`);

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});

// Block external requests — only loopback assets
await context.route('**/*', (route) => {
  const url = route.request().url();
  if (url.startsWith('http://127.0.0.1:') || url.startsWith('data:') || url.startsWith('blob:')) {
    return route.continue();
  }
  // Allow Google Fonts for Geist
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    return route.continue();
  }
  return route.abort('blockedbyclient');
});

const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

console.log('Loading templates scene...');
await page.goto(`${base}/video/launch-film/film-harness/harness.html?scene=templates`, { waitUntil: 'load', timeout: 30000 });

// Wait for fonts
await page.evaluate(() => document.fonts.ready);

// Wait for the panel to appear
const panel = page.locator('.message-template-modal');
await panel.waitFor({ state: 'visible', timeout: 15000 });

// Wait for template library buttons to appear (means templates loaded)
const libraryButtons = page.locator('.message-template-library button');
await libraryButtons.first().waitFor({ state: 'visible', timeout: 10000 });

// Verify initial state
const state = await page.evaluate(() => window.__filmTemplateState);
assert.equal(state.count, 3, `Expected 3 templates, got ${state.count}`);
assert.equal(state.templates[0].name, 'Introduction');
assert.equal(state.templates[1].name, 'Appraisal follow-up');
assert.equal(state.templates[2].name, 'For Sale update');
assert.ok(state.templates[0].is_default, 'Introduction should be default');
assert.ok(state.templates[0].hasImage, 'Introduction should have broker card');
console.log('  Initial state verified: 3 templates, Introduction is default with image');

await assertNoErrors(page);

// ===== 1. desktop-templates: overview with Introduction selected =====
// The panel should show Introduction selected by default (first template)
const introBtn = page.locator('.message-template-library button:has-text("Introduction")');
await introBtn.waitFor({ state: 'visible' });
await introBtn.click();
await page.waitForTimeout(400);
await assertNoErrors(page);
const c_intro = await centre(introBtn);
actions.push({ name: 'click-introduction', centre: c_intro });
await shot(page, 'desktop-templates', 'Templates panel: 3 templates, Introduction selected');

// ===== 2. desktop-tpl-intro: Introduction template detail =====
// Verify we see the Introduction content with broker card in preview
const previewBubble = page.locator('.message-template-chat-bubble');
await previewBubble.waitFor({ state: 'visible' });
const previewImage = page.locator('.message-template-bubble-image img');
const hasImage = await previewImage.count();
assert.ok(hasImage > 0, 'Introduction should show broker card image in preview');
// Verify the "Use for" pills show correct statuses
const statusRow = page.locator('.message-template-status-row');
await statusRow.waitFor({ state: 'visible' });
const noStatusPill = page.locator('.message-template-status.is-on:has-text("No status")');
const prospectPill = page.locator('.message-template-status.is-on:has-text("Prospect")');
assert.ok(await noStatusPill.count() > 0, 'Introduction should be assigned to No status');
assert.ok(await prospectPill.count() > 0, 'Introduction should be assigned to Prospect');
await shot(page, 'desktop-tpl-intro', 'Introduction: broker card, Use for No status + Prospect');

// ===== 3. desktop-tpl-appraisal: select Appraisal follow-up =====
const appraisalBtn = page.locator('.message-template-library button:has-text("Appraisal follow-up")');
await appraisalBtn.click();
await page.waitForTimeout(400);
await assertNoErrors(page);
const c_appraisal = await centre(appraisalBtn);
actions.push({ name: 'click-appraisal', centre: c_appraisal });
// Verify Appraisal status assigned
const appraisalPill = page.locator('.message-template-status.is-on:has-text("Appraisal")');
assert.ok(await appraisalPill.count() > 0, 'Appraisal template should be assigned to Appraisal');
await shot(page, 'desktop-tpl-appraisal', 'Appraisal follow-up: assigned to Appraisal status');

// ===== 4. desktop-tpl-forsale: select For Sale update =====
const forsaleBtn = page.locator('.message-template-library button:has-text("For Sale update")');
await forsaleBtn.click();
await page.waitForTimeout(400);
await assertNoErrors(page);
const c_forsale = await centre(forsaleBtn);
actions.push({ name: 'click-forsale', centre: c_forsale });
const forsalePill = page.locator('.message-template-status.is-on:has-text("For Sale")');
assert.ok(await forsalePill.count() > 0, 'For Sale template should be assigned to For Sale');
await shot(page, 'desktop-tpl-forsale', 'For Sale update: assigned to For Sale status');

// ===== 5. desktop-tpl-uses: status assignment interaction =====
// Go back to Introduction to show the "Use for" section clearly
await introBtn.click();
await page.waitForTimeout(400);
await assertNoErrors(page);
// Now toggle the Appraisal pill ON for Introduction (move from Appraisal template)
const appraisalToggle = page.locator('.message-template-status-row .message-template-status:has-text("Appraisal")');
const c_toggle = await centre(appraisalToggle);
actions.push({ name: 'click-use-for-appraisal', centre: c_toggle });
await appraisalToggle.click();
await page.waitForTimeout(300);
await assertNoErrors(page);
// Verify it's now on
const appraisalOn = page.locator('.message-template-status.is-on:has-text("Appraisal")');
assert.ok(await appraisalOn.count() > 0, 'Appraisal should now be toggled ON for Introduction');
await shot(page, 'desktop-tpl-uses', 'Use for: Appraisal toggled ON for Introduction');

// Save to persist the change
const saveBtn = page.locator('.message-template-save');
await saveBtn.click();
await page.waitForTimeout(600);
// Verify saved notice
const notice = page.locator('.message-template-notice');
const noticeText = await notice.textContent().catch(() => '');
assert.ok(noticeText.includes('saved'), `Expected save notice, got: "${noticeText}"`);
console.log('  Save confirmed: status assignment persisted');

// Read back fixture state to verify
const postSaveState = await page.evaluate(() => window.__filmTemplateState);
const introState = postSaveState.templates.find((t) => t.name === 'Introduction');
assert.ok(introState.statuses.includes('market_appraisal'), 'Introduction should now include market_appraisal');
assert.equal(postSaveState.templates.filter(t=>t.statuses.includes('market_appraisal')).length,1,'One template owns each status, matching the product service');
console.log('  Fixture readback: Introduction statuses =', introState.statuses);

// Restore: toggle Appraisal back off from Introduction
await appraisalToggle.click();
await page.waitForTimeout(300);
await saveBtn.click();
await page.waitForTimeout(600);
console.log('  Restored: Appraisal toggled back for demo configuration');
await appraisalBtn.click();
await appraisalToggle.click();
await saveBtn.click();
await page.waitForFunction(()=>window.__filmTemplateState.templates.find(t=>t.name==='Appraisal follow-up').statuses.includes('market_appraisal'));

// ===== 6. desktop-tpl-fields: show merge field tokens =====
// Select Introduction again and focus on the insert-variable row
await introBtn.click();
await page.waitForTimeout(400);
await assertNoErrors(page);
const tokenRow = page.locator('.message-template-token-row');
await tokenRow.waitFor({ state: 'visible' });
// Verify the actual tokens the product uses
const tokens = await tokenRow.locator('.message-template-token').allTextContents();
assert.ok(tokens.includes('{{name}}'), 'Missing {{name}} token');
assert.ok(tokens.includes('{{building}}'), 'Missing {{building}} token');
assert.ok(tokens.includes('{{transactions}}'), 'Missing {{transactions}} token');
console.log('  Tokens verified:', tokens.join(', '));
await shot(page, 'desktop-tpl-fields', 'Insert variable: {{name}}, {{building}}, {{transactions}}');

// ===== 7. desktop-tpl-card: broker card in the preview =====
// Still on Introduction — scroll/focus on the preview area
await previewBubble.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await assertNoErrors(page);
const c_card = await centre(previewImage.first());
actions.push({ name: 'broker-card-preview', centre: c_card });
await shot(page, 'desktop-tpl-card', 'Broker card image in WhatsApp preview bubble');

// ===== 8. desktop-tpl-preview: full composed message preview =====
// The preview shows the rendered message with placeholders filled
const previewText = await previewBubble.locator('p').textContent();
assert.ok(previewText.includes('Alex'), 'Preview should fill {{name}} with "Alex"');
assert.ok(previewText.includes('Forte 2'), 'Preview should fill {{building}} with "Forte 2"');
assert.ok(previewText.includes('AED'), 'Preview should fill {{transactions}} with transaction data');
console.log('  Preview verified: name=Alex, building=Forte 2, transactions filled');
await shot(page, 'desktop-tpl-preview', 'Composed preview: Alex, Forte 2, AED transaction data');

await browser.close();

// Check for real page errors (not font/websocket noise)
const realErrors = pageErrors.filter((e) => !/WebSocket|websocket|fonts\.gstatic|blockedbyclient/.test(e));
if (realErrors.length) {
  console.log('\nPage errors:');
  realErrors.forEach((e) => console.log('  ' + e));
}

// Write actions log
const actionsPath = path.join(outDir, 'template-actions.json');
writeFileSync(actionsPath, JSON.stringify(actions, null, 2));

console.log(`\nTemplate captures complete: ${actions.filter((a) => !a.centre).length} screenshots`);
console.log(`Actions log: ${actionsPath}`);
console.log('All assertions passed.');
