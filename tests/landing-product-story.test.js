import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LANDING_PRODUCT_SECTIONS } from "../src/landing-product-sections.js";

test("product story covers the complete journey once, in order", () => {
  assert.deepEqual(LANDING_PRODUCT_SECTIONS.map(({ id }) => id), [
    "product-details", "seller-workspace", "market-activity",
    "message-templates", "whatsapp-follow-ups",
  ]);
  for (const section of LANDING_PRODUCT_SECTIONS) {
    assert.ok(section.title && section.description && section.alt);
    assert.match(section.alt, /sample|example|illustrative/i);
  }
});

test("fictional landing names are consistent across the Dubai seller journey", () => {
  const allAlt = LANDING_PRODUCT_SECTIONS.map(section => section.alt).join(' ');
  assert.doesNotMatch(allAlt, /Alex|Jamie|Jordan/);
  for (const name of ['Ahmed Mansoori', 'Priya Shah', 'Daniel Reed', 'Omar Hassan']) {
    assert.ok(allAlt.includes(name));
  }
  for (const section of LANDING_PRODUCT_SECTIONS.filter(section => section.id !== 'market-activity')) {
    assert.match(section.image, /dubai-v1\.png$/);
    assert.match(section.mobileImage, /dubai-v1\.png$/);
  }
});

test("every desktop and mobile artwork exists with accurate intrinsic dimensions", () => {
  for (const section of LANDING_PRODUCT_SECTIONS) {
    for (const [file, width, height] of [
      [section.image, section.width, section.height],
      [section.mobileImage, section.mobileWidth, section.mobileHeight],
    ]) {
      const data = readFileSync(new URL(`../public/landing/${file}`, import.meta.url));
      assert.equal(data.subarray(1, 4).toString(), "PNG", file);
      assert.equal(data.readUInt32BE(16), width, `${file} width`);
      assert.equal(data.readUInt32BE(20), height, `${file} height`);
    }
    assert.ok(section.width > section.height);
    assert.ok(section.mobileWidth < section.mobileHeight);
  }
});

test("page renders the shared sequence instead of obsolete screenshot features", () => {
  const page = readFileSync(new URL("../src/LandingPage.jsx", import.meta.url), "utf8");
  const story = readFileSync(new URL("../src/LandingProductStory.jsx", import.meta.url), "utf8");
  assert.equal((page.match(/<LandingProductStory\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(page, /product-spreadsheets-v1|whatsapp-agent-conversation|landing-feature-row/);
  assert.match(story, /aria-labelledby/);
  assert.match(story, /loading="lazy"/);
  assert.match(story, /decoding="async"/);
  assert.match(story, /max-width: 600px/);
});
