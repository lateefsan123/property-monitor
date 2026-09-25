import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transform } from "esbuild";

const source = readFileSync(new URL("../src/LandingClosing.jsx", import.meta.url), "utf8");
const { code } = await transform(source.replace(/^import .*;\r?\n/m, ""), {
  loader: "jsx", format: "cjs", jsxFactory: "h",
});
const context = { module: { exports: {} }, h: (tag, props, ...children) => ({ tag, props: props || {}, children }) };
vm.runInNewContext(code, context);
const render = context.module.exports.default;
const flatten = (node) => node && typeof node === "object" ? [node, ...node.children.flatMap(flatten)] : [];

test("trial action starts signup for visitors and checkout for signed-in users", () => {
  let signup = 0;
  let checkout = 0;
  const props = { onGetStarted: () => signup++, onSubscribe: () => checkout++ };
  for (const isAuthenticated of [false, true]) {
    const button = flatten(render({ ...props, isAuthenticated })).find(x => x.props.className === "landing-trial-button");
    assert.equal(button.children[0], isAuthenticated ? "Continue to Stripe" : "Start for free");
    button.props.onClick();
  }
  assert.equal(signup, 1);
  assert.equal(checkout, 1);
});

test("pending checkout disables the button and billing feedback remains accessible", () => {
  const nodes = flatten(render({ checkoutPending: true, billingError: "Try again", billingMessage: "Ready" }));
  const button = nodes.find(x => x.props.className === "landing-trial-button");
  assert.equal(button.props.disabled, true);
  assert.equal(button.props["aria-busy"], true);
  assert.equal(button.children[0], "Redirecting…");
  assert.equal(nodes.find(x => x.props.role === "alert").children[0], "Try again");
  assert.equal(nodes.find(x => x.props.role === "status").children[0], "Ready");
});

test("footer preserves account, legal and download destinations", () => {
  let called = false;
  const nodes = flatten(render({ accountAction: () => { called = true; }, accountActionLabel: "Sign out" }));
  nodes.find(x => x.tag === "button" && x.children[0] === "Sign out").props.onClick();
  assert.equal(called, true);
  const links = nodes.filter(x => x.tag === "a").map(x => x.props.href);
  for (const href of ["/", "/privacy", "/terms", "/api/desktop/download", "#start-free", "#product-details", "#connected-stack"]) {
    assert.ok(links.includes(href));
  }
  assert.ok(links.includes("/pricing"));
});

test("legacy ending is removed and trial terms are retained", () => {
  const page = readFileSync(new URL("../src/LandingPage.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/landing.css", import.meta.url), "utf8");
  assert.doesNotMatch(page, /FAQS|openFaq|landing-pricing|landing-faq|landing-final-cta|landing-footer|dubai-skyline/);
  assert.doesNotMatch(css, /landing-pricing|landing-plan|landing-faq|landing-final-cta|landing-footer/);
  assert.match(source, /7 days free, then EUR 25\/month/);
  assert.doesNotMatch(source, /14-day|No credit card/);
});

test("footer places its logo above four link columns and legal links below", () => {
  const nodes = flatten(render({}));
  const inner = nodes.find(x => x.props.className === "landing-end-inner");
  assert.deepEqual(Array.from(inner.children, x => x.props.className), ["landing-end-brand", "landing-end-main", "landing-end-bottom"]);
  const columns = nodes.find(x => x.props.className === "landing-end-main");
  assert.equal(columns.children.length, 4);
  assert.ok(columns.children.every(x => x.tag === "nav"));
  const bottom = nodes.find(x => x.props.className === "landing-end-bottom");
  assert.equal(bottom.children[0].props["aria-label"], "Legal");
});

test("header is sticky and opaque with clearance for section anchors", () => {
  const css = readFileSync(new URL("../src/styles/landing.css", import.meta.url), "utf8");
  const header = css.match(/\.landing-header-frame \{([^}]+)\}/)[1];
  assert.match(header, /position: sticky/);
  assert.match(header, /top: 0/);
  assert.match(header, /background:\s*#(?:[\da-f]{6}|[\da-f]{3})\s*;/i);
  assert.match(css, /\.landing \[id\] \{\s*scroll-margin-top: 84px/);
});
