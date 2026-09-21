import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { TOUR_STEPS, readTourState, saveTourState } from "../src/components/product-tour.js";
import vm from "node:vm";
import { transform } from "esbuild";

function store() { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; }
test("Listings uses listing and price-drop artwork, not seller artwork", () => {
  assert.equal(TOUR_STEPS.find(step => step.page === "listing-alerts").image, "product-market-story-colour-v2.png");
});
test("tour is opt-in for every sign-in; users resume their own step", () => {
  const storage = store();
  assert.deepEqual(readTourState(storage, "a"), { step: 0, open: false });
  saveTourState(storage, "a", 4);
  assert.deepEqual(readTourState(storage, "a"), { step: 4, open: false });
  assert.deepEqual(readTourState(storage, "b"), { step: 0, open: false });
  assert.deepEqual(readTourState(storage, null), { step: 0, open: false });
});
test("invalid and blocked storage cannot break the tour", () => {
  for (const value of ['null', '{', '{"step":99}', '{"step":-1}', '{"step":1.5}']) {
    assert.equal(readTourState({getItem: () => value}, "a").step, 0);
  }
  const blocked = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  assert.doesNotThrow(() => readTourState(blocked, "a"));
  assert.equal(readTourState(blocked, "a").open, false);
  assert.doesNotThrow(() => saveTourState(blocked, "a", 1));
});
test("nine steps use real destinations and existing product assets", () => {
  assert.equal(TOUR_STEPS.length, 9);
  assert.equal(new Set(TOUR_STEPS.map(step => step.id)).size, 9);
  for (const step of TOUR_STEPS) {
    assert.ok(["home", "sellers", "spreadsheets", "listing-alerts"].includes(step.page));
    assert.ok(existsSync(new URL(`../public/landing/${step.image}`, import.meta.url)));
    assert.ok(step.title && step.description && step.target);
  }
});
test("tour integration is authenticated, user-scoped and suppressed for shell modals", () => {
  const shell = readFileSync(new URL('../src/AppShell.jsx', import.meta.url), 'utf8');
  assert.match(shell, /!createOpen && !messageTemplatesOpen && !settingsOpen && !assistantOpen && <ProductTour key=\{userId\}/);
  const component = readFileSync(new URL('../src/components/ProductTour.jsx', import.meta.url), 'utf8');
  assert.match(component, /observer.disconnect/);
  assert.match(component, /event.key === "Escape"/);
  assert.ok(!component.includes('supabase'));
});

test("Next, Back, actions, completion, restart and Escape preserve the journey", async () => {
  const source = readFileSync(new URL('../src/components/ProductTour.jsx', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsxFactory: 'h' });
  let state; const routes = []; const actions = []; const storage = store();
  const ctx = { module: { exports: {} }, TOUR_STEPS, readTourState, saveTourState, CircleHelp: 'help-icon',
    window: { localStorage: storage }, requestAnimationFrame: fn => fn(),
    useRef: () => ({ current: null }), useEffect: () => {},
    useState: init => { state ??= init(); return [state, next => { state = next; }]; },
    h: (tag, props, ...children) => ({ tag, props: props || {}, children }),
  };
  vm.runInNewContext(code, ctx);
  const render = () => ctx.module.exports.default({ userId: 'test', onNavigate: p => routes.push(p), onAction: a => actions.push(a) });
  const flatten = n => Array.isArray(n) ? n.flatMap(flatten) : n && typeof n === 'object' ? [n, ...n.children.flatMap(flatten)] : [];
  const click = className => flatten(render()).find(n => n.props.className === className).props.onClick();
  click('repeat-tour-launcher'); assert.equal(routes.length, 0);
  click('repeat-tour-next'); assert.equal(state.step, 1); assert.equal(routes.length, 0);
  click('repeat-tour-image-link'); assert.equal(routes.at(-1), 'spreadsheets'); assert.equal(state.open, false);
  click('repeat-tour-launcher');
  click('repeat-tour-back'); assert.equal(state.step, 0);
  for (let i = 0; i < 4; i++) click('repeat-tour-next');
  click('repeat-tour-image-link'); assert.equal(actions.at(-1), 'message-template'); assert.equal(state.open, false);
  click('repeat-tour-launcher'); assert.equal(state.step, 4);
  click('repeat-tour-next'); click('repeat-tour-link'); assert.equal(actions.at(-1), 'settings');
  click('repeat-tour-launcher');
  while (state.step < TOUR_STEPS.length - 1) click('repeat-tour-next');
  click('repeat-tour-next'); assert.equal(state.open, false);
  click('repeat-tour-launcher'); assert.equal(state.step, 0);
  render().props.onKeyDown({ key: 'Escape', stopPropagation() {} }); assert.equal(state.open, false);
});

test("assistant steps teach sources and confirmation without claiming automatic sends", () => {
  const ask = TOUR_STEPS.find(step => step.id === 'ask-repeat');
  const actions = TOUR_STEPS.find(step => step.id === 'assistant-actions');
  assert.equal(ask.target, '.assistant-launcher');
  assert.match(ask.description, /approved accounts/);
  assert.match(ask.description, /source and dates/);
  assert.match(actions.description, /Review the preview and confirm/);
  assert.equal(actions.target, '.assistant-launcher');
});

test("legacy completed tours remain complete and new steps resume by stable ID", () => {
  const storage = store();
  storage.setItem('repeat:product-tour:v1:a', JSON.stringify({ step: 6 }));
  assert.deepEqual(readTourState(storage, 'a'), { step: 8, open: false });
  saveTourState(storage, 'a', 6);
  assert.deepEqual(readTourState(storage, 'a'), { step: 6, open: false });
  storage.setItem('repeat:product-tour:v1:a', JSON.stringify({ step: 0, stepId: 'assistant-actions' }));
  assert.deepEqual(readTourState(storage, 'a'), { step: 7, open: false });
});

test("artwork retains its palette in dark mode and launcher uses a fixed-size icon", () => {
  const css = readFileSync(new URL('../src/styles/product-tour.css', import.meta.url), 'utf8');
  assert.ok(!css.includes('[data-theme="dark"] .app-shell .repeat-tour-visual'));
  assert.ok(!css.includes('brightness(.8)'));
  assert.match(css, /repeat-tour-help-icon[^}]+flex: 0 0 20px/);
  for (const colour of ['#d5ebf8', '#f6dbca', '#e0d9f1', '#dbf5eb', '#d9e6cf']) assert.ok(css.includes(colour));
});

test("seller automation clears the bottom help and assistant row", () => {
  const css = readFileSync(new URL('../src/voice/voice.css', import.meta.url), 'utf8');
  assert.match(css, /\.app-shell \.floating-action-container\s*\{[^}]*bottom: calc\(88px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});
