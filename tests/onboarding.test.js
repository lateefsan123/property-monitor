import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transform } from "esbuild";

async function harness(file, props = {}, error = null) {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  const { code } = await transform(source.replace(/^import .*;\r?\n/gm, ""), {
    loader: "jsx", format: "cjs", jsxFactory: "h", define: { "import.meta.env.BASE_URL": '"/"' },
  });
  const states = []; const calls = []; let cursor = 0;
  const context = {
    module: { exports: {} }, OnboardingFrame: "OnboardingFrame",
    useEffect: () => {}, useRef: value => ({ current: value }),
    useState: initial => { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
    h: (tag, props, ...children) => ({ tag, props: props || {}, children }),
    supabase: { auth: { updateUser: async payload => { calls.push(payload); return { error }; } } },
  };
  vm.runInNewContext(code, context);
  return { calls, render: () => { cursor = 0; return context.module.exports.default(props); } };
}
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === "object" ? [node, ...node.children.flatMap(flatten)] : [];
const button = (tree, className) => flatten(tree).find(n => n.tag === "button" && n.props.className === className);

test("welcome saves its existing completion marker, with no fake completed checklist", async () => {
  let next = 0;
  const h = await harness("WelcomeScreen.jsx", { onContinue: () => next++ });
  assert.equal(h.render().props.step, "welcome");
  assert.ok(!flatten(h.render()).some(n => n.props.className === "welcome-card"));
  await button(h.render(), "auth-submit").props.onClick();
  assert.equal(h.calls[0].data.welcomed, true);
  assert.equal(next, 1);
});

test("referral selection waits for Continue and persists the existing source id", async () => {
  let next = 0;
  const h = await harness("HowDidYouHearScreen.jsx", { onContinue: () => next++ });
  assert.equal(button(h.render(), "auth-submit").props.disabled, true);
  flatten(h.render()).find(n => n.props.className === "referral-option").props.onClick();
  assert.equal(h.calls.length, 0);
  assert.equal(button(h.render(), "auth-submit").props.disabled, false);
  await button(h.render(), "auth-submit").props.onClick();
  assert.equal(h.calls[0].data.referral_source, "search");
  assert.equal(h.calls[0].data.referral_asked, true);
  assert.equal(next, 1);
});

test("profile preserves username, optional avatar and completion callback", async () => {
  let result;
  const h = await harness("features/seller-signal/components/UsernameSetup.jsx", { initialName: " Omar ", onComplete: value => { result = value; } });
  const form = flatten(h.render()).find(n => n.tag === "form");
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(h.calls[0].data.username, "Omar");
  assert.equal(h.calls[0].data.avatar_url, null);
  assert.equal(h.calls[0].data.profile_completed, true);
  assert.equal(result.username, "Omar");
});

test("saving errors do not advance onboarding", async () => {
  let next = 0;
  const h = await harness("WelcomeScreen.jsx", { onContinue: () => next++ }, { message: "Try again" });
  await button(h.render(), "auth-submit").props.onClick();
  assert.equal(next, 0);
  assert.ok(flatten(h.render()).some(n => n.props.className === "auth-error" && n.children[0] === "Try again"));
});

test("trial retains completion marker, checkout callback and pending guard", async () => {
  let checkout = 0;
  const h = await harness("TrialOfferScreen.jsx", { onStartTrial: () => checkout++ });
  await button(h.render(), "auth-submit").props.onClick();
  assert.equal(h.calls[0].data.trial_offered, true);
  assert.equal(checkout, 1);
  const pending = await harness("TrialOfferScreen.jsx", { checkoutPending: true });
  assert.equal(button(pending.render(), "auth-submit").props.disabled, true);
});

test("preview substitutes all Supabase calls and is not a production entry", () => {
  const build = readFileSync(new URL("../scripts/build-onboarding-preview.mjs", import.meta.url), "utf8");
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(build, /fixture-auth/);
  assert.match(build, /updateUser: async \(\) => \(\{ error: null \}\)/);
  assert.doesNotMatch(main, /onboarding-preview/);
});
