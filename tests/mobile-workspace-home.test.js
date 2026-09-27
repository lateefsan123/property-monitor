import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../mobile/src/workspace/workspace-shell.js", import.meta.url), "utf8");
const { code } = transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" });

function renderShell(data, favorites) {
  const element = (type, props) => ({ type, props });
  const dependencies = {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: { useState: value => [value, () => {}], useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: () => {} },
    "react-native": { View: "View", Text: "Text", Platform: { OS: "ios" } },
    "@tanstack/react-query": { useQuery: ({ queryKey }) => ({ data: queryKey[0] === "leads" ? data : [] }) },
    "../features/seller-signal/useHomeLeadSummary": { leadsQueryKey: id => ["leads", id] },
    "../features/seller-signal/useSellerSignalPage": { leadSourcesQueryKey: id => ["sources", id] },
    "./preferences": { useWorkspacePreference: (_id, key) => ({ value: key === "seller-favorites" ? favorites : [] }) },
    "../theme": { getTheme: () => ({}) },
    "../../../src/integration-query": { integrationStatusOptions: id => ({ queryKey: ["integrations", id] }) },
  };
  const module = { exports: {} };
  runInNewContext(code, { module, require: name => dependencies[name] || {} });
  return module.exports.default({ userId: "account-a" });
}

test("home shell handles the shared leads response even with no saved favorites", () => {
  const result = renderShell({ leads: [{ id: 12 }], sentMap: {}, sentHistory: [] }, []);
  assert.equal(result.props.favoriteSellers.length, 0);
});

test("drawer selects saved sellers from the leads array, preserving numeric IDs", () => {
  const result = renderShell({ leads: [{ id: 12 }, { id: 13 }], sentMap: {}, sentHistory: [] }, ["12"]);
  assert.deepEqual(result.props.favoriteSellers, [{ id: 12 }]);
});

test("home shell renders while the leads response is still loading", () => {
  assert.equal(renderShell(undefined, ["12"]).props.favoriteSellers.length, 0);
});
