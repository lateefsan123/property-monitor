import { readFileSync } from "node:fs";

export const PANEL_URI = "ui://repeat-ai/sellers-v1.html";
export const PANEL_META = {
  ui: { resourceUri: PANEL_URI },
  "openai/outputTemplate": PANEL_URI,
  "openai/widgetAccessible": true,
  "openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] },
};

export function panelResource() {
  return {
    contents: [{
      uri: PANEL_URI,
      mimeType: "text/html;profile=mcp-app",
      text: readFileSync(new URL("../public/seller-panel.html", import.meta.url), "utf8"),
      _meta: {
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
        "openai/widgetDescription": "Search Repeat AI sellers, inspect their details and recent messages, and ask ChatGPT to summarise or monitor replies.",
        "openai/widgetCSP": { connect_domains: [], resource_domains: [] },
        "openai/ui": { preferredDisplayMode: "pip", availableDisplayModes: ["inline", "pip", "fullscreen"] },
      },
    }],
  };
}

export function toolResult(value) {
  return {
    content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }],
    structuredContent: value && typeof value === "object" && !Array.isArray(value) ? value : { items: value },
  };
}
