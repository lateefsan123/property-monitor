/* global document */
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
const frame = document.querySelector("iframe");
const leads = [
  { id: 54014, name: "Alex Demo", building: "Review Tower", unit: "101", status: "Interested", notes: "Synthetic review record. Call next Tuesday.", lastContact: "2026-09-29" },
  { id: 54015, name: "Jordan Demo", building: "Example Residences", unit: "202", status: "Follow up", notes: "Synthetic review record.", sentAt: "2026-09-28" },
];
const bridge = new AppBridge(null, { name: "Local synthetic preview", version: "1" }, { serverTools: {}, message: {}, updateModelContext: {} }, { hostContext: { theme: "light", displayMode: "pip", availableDisplayModes: ["pip", "fullscreen"] } });
bridge.oninitialized = () => bridge.sendToolResult({ content: [], structuredContent: { leads, limit: 50 } });
bridge.oncalltool = async ({ name, arguments: args }) => {
  let data;
  if (args.search === "error") return { isError: true, content: [] };
  if (name === "list_my_seller_leads") data = { leads: leads.filter(lead => (!args.search || JSON.stringify(lead).toLowerCase().includes(args.search.toLowerCase())) && (args.status === "all" || (args.status === "done" ? lead.sentAt : !lead.sentAt))), limit: 50 };
  else if (name === "get_my_seller_lead") data = leads.find(lead => String(lead.id) === String(args.leadId));
  else if (name === "list_my_whatsapp_messages") data = { messages: String(args.leadId) === "54014" ? [{ direction: "inbound", created_at: "2026-09-29T10:30:00Z", body: "Could we speak tomorrow about the property? <script>This should stay plain text.</script>" }] : [] };
  else return { isError: true, content: [] };
  return { content: [], structuredContent: data };
};
bridge.onupdatemodelcontext = async () => ({});
bridge.onmessage = async ({ content }) => { document.getElementById("request").textContent = content.map(item => item.text || "").join(" "); return {}; };
document.getElementById("wide").onclick = () => { frame.style.width = "100%"; };
document.getElementById("narrow").onclick = () => { frame.style.width = "390px"; };
await bridge.connect(new PostMessageTransport(frame.contentWindow, frame.contentWindow));
frame.src = "/panel";
