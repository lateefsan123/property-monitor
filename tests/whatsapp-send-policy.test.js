import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { manualSendRequiresTodaysTransaction } from "../shared/whatsapp-send-policy.js";

test("manual sends only claim today's transaction when the seller has one", () => {
  assert.equal(manualSendRequiresTodaysTransaction({ hasTodaysTransaction: true }), true);
  assert.equal(manualSendRequiresTodaysTransaction({ hasTodaysTransaction: false }), false);
  assert.equal(manualSendRequiresTodaysTransaction({}), false);
});

test("custom images are always ordinary follow-ups", () => {
  assert.equal(manualSendRequiresTodaysTransaction({ customImage: true, hasTodaysTransaction: true }), false);
});

test("web and mobile both build the send flag from the shared policy", () => {
  const web = readFileSync(new URL("../src/features/seller-signal/useSellerSignalActions.js", import.meta.url), "utf8");
  const mobile = readFileSync(new URL("../mobile/src/features/seller-signal/services.js", import.meta.url), "utf8");
  for (const source of [web, mobile]) {
    assert.match(source, /requireTodaysTransaction: manualSendRequiresTodaysTransaction\(/);
  }
  assert.doesNotMatch(mobile, /requireTodaysTransaction: !customImage/);
});
