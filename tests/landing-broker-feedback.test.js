import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transform } from "esbuild";

const source = readFileSync(new URL("../src/LandingBrokerFeedback.jsx", import.meta.url), "utf8");

async function renderDraft(dev) {
  const { code } = await transform(source.replace(/^import .*;\r?\n/m, ""), {
    loader: "jsx",
    format: "cjs",
    jsxFactory: "h",
    define: { "import.meta.env.DEV": String(dev) },
  });
  const context = {
    module: { exports: {} },
    h: (tag, props, ...children) => ({ tag, props, children }),
  };
  vm.runInNewContext(code, context);
  return context.module.exports.default();
}

test("fictional feedback never renders in production", async () => {
  assert.equal(await renderDraft(false), null);
});

test("development preview clearly discloses fictional names and quotes", async () => {
  const draft = await renderDraft(true);
  assert.equal(draft.props.id, "broker-feedback");
  assert.equal(draft.props["aria-describedby"], "landing-feedback-draft");
  assert.match(JSON.stringify(draft), /Fictional names and quotes, not customer reviews/);
  assert.equal((source.match(/<blockquote>/g) || []).length, 3);
  assert.doesNotMatch(source, /<img|<svg|<button|<a\s/);
});
