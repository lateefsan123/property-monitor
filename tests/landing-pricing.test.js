import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transform } from "esbuild";

async function component(file) {
  const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  const { code } = await transform(source.replace(/^import .*;\r?\n/gm, ""), { loader: "jsx", format: "cjs", jsxFactory: "h" });
  const context = { module: { exports: {} }, h: (tag, props, ...children) => ({ tag, props: props || {}, children }) };
  vm.runInNewContext(code, context);
  return context.module.exports.default;
}
const render = await component("LandingPricing.jsx");
const closing = await component("LandingClosing.jsx");
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === "object" ? [node, ...node.children.flatMap(flatten)] : [];
const texts = node => Array.isArray(node) ? node.map(texts).join(" ") : node && typeof node === "object" ? node.children.map(texts).join(" ") : typeof node === "string" ? node : "";

test("pricing offers only the existing monthly Pro plan and seven-day trial", () => {
  const tree = render({});
  const nodes = flatten(tree);
  assert.equal(nodes.filter(n => n.tag === "h2").length, 1);
  assert.match(texts(tree), /€25.*\/month/);
  assert.match(texts(tree), /7 days free, then €25\/month/);
  assert.match(texts(tree), /Up to 50 automated WhatsApp follow-ups a day/);
  assert.doesNotMatch(texts(tree), /Annually|Enterprise|14.day|No credit card|Unlimited/);
});

test("pricing action respects checkout pending and existing subscriptions", () => {
  let calls = 0;
  const button = flatten(render({ onGetStarted: () => calls++ })).find(n => n.tag === "button");
  button.props.onClick();
  assert.equal(calls, 1);
  const pending = flatten(render({ checkoutPending: true })).find(n => n.tag === "button");
  assert.equal(pending.props.disabled, true);
  assert.equal(pending.props["aria-busy"], true);
  assert.equal(texts(pending), "Redirecting…");
  const active = render({ hasSubscription: true });
  assert.match(texts(active), /Open your workspace/);
  assert.doesNotMatch(texts(active), /7 days free/);
});

test("billing feedback is accessible and pricing footer links return home", () => {
  const nodes = flatten(render({ billingError: "Oops", billingMessage: "Ready" }));
  assert.equal(texts(nodes.find(n => n.props.role === "alert")), "Oops");
  assert.equal(texts(nodes.find(n => n.props.role === "status")), "Ready");
  const footer = flatten(closing({ showTrial: false, homePrefix: "/" }));
  assert.ok(!footer.some(n => n.props.id === "start-free"));
  assert.ok(footer.some(n => n.props.href === "/#message-templates"));
});

test("public pricing route precedes onboarding and preserves login routing", () => {
  const root = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  const pricing = root.indexOf('=== "/pricing" && !showAuth');
  assert.ok(pricing > 0);
  assert.ok(pricing < root.indexOf("if (session && !welcomeDismissed"));
  assert.match(root, /hasSubscription=\{hasActiveBillingSubscription\}/);
});
