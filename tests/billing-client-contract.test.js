import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Execute the actual client wrappers with a fake transport, without loading
// Vite's browser-only Supabase configuration in Node.
const source = await readFile(new URL("../src/billing.js", import.meta.url), "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function wrapper(name, response) {
  const declaration = source.match(new RegExp(`export async function ${name}\\([^]*?\\n\\}`, "m"));
  assert.ok(declaration, `Missing client wrapper: ${name}`);
  return new AsyncFunction("supabase", `${declaration[0].replace("export ", "")}\nreturn ${name}();`)(
    { functions: { invoke: async () => response } },
  );
}

test("shared access unwraps subscription, not the API envelope", async () => {
  const subscription = { source: "stripe", status: "active", raw: { livemode: true } };
  assert.deepEqual(await wrapper("fetchBillingSubscription", { data: { subscription } }), subscription);
  assert.equal(await wrapper("fetchBillingSubscription", { data: { subscription: null } }), null);
});

test("billing portal preserves the portal URL response", async () => {
  const data = { portalUrl: "https://billing.stripe.com/example" };
  assert.deepEqual(await wrapper("createBillingPortalSession", { data }), data);
  await assert.rejects(wrapper("createBillingPortalSession", { data: {} }), /portal URL/);
});
