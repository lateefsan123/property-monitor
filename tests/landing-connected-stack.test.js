import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/LandingConnectedStack.jsx", import.meta.url), "utf8");

test("connected stack follows the product stories before feedback and closing", () => {
  const page = readFileSync(new URL("../src/LandingPage.jsx", import.meta.url), "utf8");
  assert.match(page, /<LandingProductStory \/>\s*<LandingConnectedStack \/>\s*<LandingBrokerFeedback \/>\s*<LandingClosing/);
  assert.equal((page.match(/<LandingConnectedStack \/>/g) || []).length, 1);
});

test("four illustrations have the declared dimensions", () => {
  assert.equal((source.match(/id: "/g) || []).length, 4);
  for (const name of ["tools", "data", "ai", "devices"]) {
    const image = readFileSync(new URL(`../public/landing/stack-${name}-v1.png`, import.meta.url));
    assert.equal(image.readUInt32BE(16), 1499);
    assert.equal(image.readUInt32BE(20), 1049);
  }
});

test("captions qualify AI access and the mobile strip remains keyboard accessible", () => {
  assert.match(source, /caption: "[^"\n]+via MCP"/);
  assert.match(source, /tabIndex=\{0\}/);
  assert.match(source, /aria-labelledby="landing-stack-heading"/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /decoding="async"/);
  assert.doesNotMatch(source, /<button|<a\s|Learn more|tens of integrations|public API/);
});
