import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { TOUR_STEPS, readTourState, saveTourState } from "../src/components/product-tour.js";
import vm from "node:vm";
import { transform } from "esbuild";

function store() { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; }
test("new users get the tour; dismissed users resume their own step", () => {
  const storage = store();
  assert.deepEqual(readTourState(storage, "a"), { step: 0, open: true });
  saveTourState(storage, "a", 4);
  assert.deepEqual(readTourState(storage, "a"), { step: 4, open: false });
  assert.deepEqual(readTourState(storage, "b"), { step: 0, open: true });
  assert.deepEqual(readTourState(storage, null), { step: 0, open: false });
});
test("invalid and blocked storage cannot break the tour", () => {
  for (const value of ['null', '{', '{"step":99}', '{"step":-1}', '{"step":1.5}']) {
    assert.equal(readTourState({getItem: () => value}, "a").step, 0);
  }
  const blocked = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  assert.doesNotThrow(() => readTourState(blocked, "a"));
  assert.doesNotThrow(() => saveTourState(blocked, "a", 1));
});
test("seven steps use real destinations and existing product assets", () => {
  assert.equal(TOUR_STEPS.length, 7);
  for (const step of TOUR_STEPS) {
    assert.ok(["home", "sellers", "spreadsheets", "listing-alerts"].includes(step.page));
    assert.ok(existsSync(new URL(`../public/landing/${step.image}`, import.meta.url)));
    assert.ok(step.title && step.description && step.target);
  }
});
test("tour integration is authenticated, user-scoped and suppressed for shell modals", () => {
  const shell = readFileSync(new URL('../src/AppShell.jsx', import.meta.url), 'utf8');
  assert.match(shell, /!createOpen && !messageTemplatesOpen && !settingsOpen && <ProductTour key=\{userId\}/);
  const component = readFileSync(new URL('../src/components/ProductTour.jsx', import.meta.url), 'utf8');
  assert.match(component, /observer.disconnect/);
  assert.match(component, /event.key === "Escape"/);
  assert.ok(!component.includes('supabase'));
});

test("Next, Back, actions, completion, restart and Escape preserve the journey", async () => {
  const source = readFileSync(new URL('../src/components/ProductTour.jsx', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
  const { code } = await transform(source, { loader: 'jsx', format: 'cjs', jsxFactory: 'h' });
  let state; const routes = []; const actions = []; const storage = store();
  const ctx = { module: { exports: {} }, TOUR_STEPS, readTourState, saveTourState,
    window: { localStorage: storage }, requestAnimationFrame: fn => fn(),
    useRef: () => ({ current: null }), useEffect: () => {},
    useState: init => { state ??= init(); return [state, next => { state = next; }]; },
    h: (tag, props, ...children) => ({ tag, props: props || {}, children }),
  };
  vm.runInNewContext(code, ctx);
  const render = () => ctx.module.exports.default({ userId: 'test', onNavigate: p => routes.push(p), onAction: a => actions.push(a) });
  const flatten = n => Array.isArray(n) ? n.flatMap(flatten) : n && typeof n === 'object' ? [n, ...n.children.flatMap(flatten)] : [];
  const click = className => flatten(render()).find(n => n.props.className === className).props.onClick();
  click('repeat-tour-next'); assert.equal(state.step, 1); assert.equal(routes.at(-1), 'spreadsheets');
  click('repeat-tour-back'); assert.equal(state.step, 0);
  for (let i = 0; i < 4; i++) click('repeat-tour-next');
  click('repeat-tour-link'); assert.equal(actions.at(-1), 'message-template'); assert.equal(state.open, false);
  click('repeat-tour-launcher'); assert.equal(state.step, 4);
  click('repeat-tour-next'); click('repeat-tour-link'); assert.equal(actions.at(-1), 'settings');
  click('repeat-tour-launcher'); click('repeat-tour-next'); click('repeat-tour-next'); assert.equal(state.open, false);
  click('repeat-tour-launcher'); assert.equal(state.step, 0);
  render().props.onKeyDown({ key: 'Escape', stopPropagation() {} }); assert.equal(state.open, false);
});
