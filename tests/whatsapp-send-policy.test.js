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

test("handoff confirmation names one seller or counts several", async () => {
  const { handoffConfirmation } = await import("../shared/whatsapp-send-policy.js");
  assert.equal(handoffConfirmation(["Alex Morgan"]).title, "Did you send it to Alex Morgan?");
  assert.equal(handoffConfirmation([""]).title, "Did you send it to this seller?");
  assert.equal(handoffConfirmation(["A", "B", "C"]).title, "Did you send it to 3 sellers?");
  assert.equal(handoffConfirmation(["A"]).confirm, "Mark as sent");
});

test("opening WhatsApp or copying never records contact without confirmation", () => {
  const files = [
    "../src/features/seller-signal/useSellerSignalActions.js",
    "../src/features/seller-signal/components/LeadCard.jsx",
    "../src/features/seller-signal/components/LeadModal.jsx",
    "../mobile/src/features/seller-signal/useSellerSignalPage.js",
    "../mobile/src/features/seller-signal/components/LeadCard.js",
    "../mobile/src/features/seller-signal/components/LeadDetailSheet.js",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /onToggleSent\(lead\.id\)/, file);
    assert.doesNotMatch(source, /(wa\.me|copyMessage)[^\n]*\n[^\n]*toggleSent\(lead\.id\)/, file);
  }
});
