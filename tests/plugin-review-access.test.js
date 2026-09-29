import test from "node:test";
import assert from "node:assert/strict";
import { complimentaryAccess } from "../supabase/functions/_shared/complimentary-access.js";

test("review access is fixed-ID, bounded, and does not make the reviewer unlimited", () => {
  const id = "50b2ccdb-5bff-4bd4-a97a-9aa12744fae0";
  const access = complimentaryAccess({ id }, Date.parse("2026-09-29"));
  assert.equal(access.source, "complimentary");
  assert.equal(access.unlimited, false);
  assert.equal(complimentaryAccess({ id }, Date.parse(access.current_period_end)), null);
  assert.equal(complimentaryAccess({ id }, Date.parse("2027-01-01")), null);
  assert.equal(complimentaryAccess({ id: "unpaid", user_metadata: { id, complimentary: true }, email: "reviewer@example.com" }), null);
});

test("temporary isolation account expires independently; owner access remains unchanged", () => {
  const id = "b53185df-f9d2-417b-ac17-e91e84b00186";
  assert.ok(complimentaryAccess({ id }, Date.parse("2026-09-29")));
  assert.equal(complimentaryAccess({ id }, Date.parse("2026-10-07")), null);
  const owner = complimentaryAccess({ id: "441421f9-1089-4694-a66e-ab75b5459003" });
  assert.equal(owner.unlimited, true);
  assert.equal(owner.current_period_end, "9999-12-31T23:59:59.000Z");
});
