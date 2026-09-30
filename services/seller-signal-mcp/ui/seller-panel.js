/* global document */
import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import { OpenAIExtensions } from "@openai/mcp-extensions/app";

const app = new App({ name: "Repeat AI sellers", version: "0.2.0" });
const extensions = new OpenAIExtensions(app);
const $ = id => document.getElementById(id);
let selected;
let searchRevision = 0;
let selectionRevision = 0;
let connected = false;

function text(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

function status(message) { $("status").textContent = message; }
async function call(name, args = {}) {
  const result = await app.callServerTool({ name, arguments: args });
  if (result.isError) throw new Error("Repeat AI could not load this data. Check your connection and try again.");
  if (result.structuredContent) return result.structuredContent;
  const content = result.content?.find(item => item.type === "text");
  if (!content) throw new Error("Repeat AI returned an empty response.");
  return JSON.parse(content.text);
}

function renderList(data) {
  if (!Array.isArray(data?.leads)) return;
  $("leads").replaceChildren();
  $("count").textContent = data.leads.length === data.limit ? `Latest ${data.leads.length} sellers · search to narrow results` : `${data.leads.length} seller${data.leads.length === 1 ? "" : "s"}`;
  if (!data.leads.length) $("leads").append(text("p", "No sellers found. Try another name or building.", "muted empty"));
  for (const lead of data.leads) {
    const button = text("button", "", "seller");
    button.type = "button";
    button.setAttribute("aria-pressed", String(String(selected?.id) === String(lead.id)));
    button.append(text("strong", lead.name || "Unnamed seller"), text("span", [lead.building, lead.unit && `Unit ${lead.unit}`].filter(Boolean).join(" · ") || "No property details", "muted"));
    button.addEventListener("click", () => selectLead(lead.id, button));
    $("leads").append(button);
  }
  status("");
}

async function search(event) {
  event?.preventDefault();
  if (!connected) return;
  const revision = ++searchRevision;
  status("Loading sellers…");
  try {
    const data = await call("list_my_seller_leads", { search: $("search").value.trim(), status: $("filter").value, limit: 50 });
    if (revision === searchRevision) renderList(data);
  } catch (error) { if (revision === searchRevision) status(error.message); }
}

async function selectLead(id, button) {
  const revision = ++selectionRevision;
  selected = null;
  $("actions").hidden = true;
  $("detail").hidden = false;
  $("detail-title").textContent = "Loading seller…";
  $("fields").replaceChildren();
  $("messages").replaceChildren();
  for (const row of $("leads").children) row.setAttribute("aria-pressed", String(row === button));
  try {
    const lead = await call("get_my_seller_lead", { leadId: id });
    if (revision !== selectionRevision) return;
    selected = lead;
    $("detail-title").textContent = lead.name || "Unnamed seller";
    for (const [label, value] of [["Property", [lead.building, lead.unit && `Unit ${lead.unit}`].filter(Boolean).join(" · ")], ["Phone", lead.phone], ["Status", lead.status], ["Last contact", lead.lastContact], ["Notes", lead.notes]]) {
      $("fields").append(text("dt", label), text("dd", value || "—"));
    }
    $("actions").hidden = false;
    $("messages").append(text("p", "Loading messages…", "muted"));
    await app.updateModelContext({ content: [{ type: "text", text: `The user selected Repeat AI seller ID ${lead.id}.` }] }).catch(() => {});
    const history = await call("list_my_whatsapp_messages", { leadId: id, limit: 20 });
    if (revision !== selectionRevision) return;
    $("messages").replaceChildren();
    if (!history.messages?.length) $("messages").append(text("p", "No messages recorded for this seller.", "muted"));
    for (const message of history.messages || []) {
      const item = text("article", "", "message");
      const date = new Date(message.created_at);
      item.append(text("small", `${message.direction === "inbound" ? "Seller" : "You"} · ${Number.isNaN(date.getTime()) ? "" : date.toLocaleString()}`, "muted"), text("p", message.body || "Non-text message"));
      $("messages").append(item);
    }
  } catch (error) { if (revision === selectionRevision) { status(error.message); $("messages").replaceChildren(); } }
}

async function ask(kind) {
  if (!selected) return;
  const prompt = kind === "monitor"
    ? `Monitor Repeat AI seller.reply_received events for leadId "${selected.id}". Summarise new replies and suggest the next step. Do not send messages or change seller records automatically.`
    : `Read the recent WhatsApp messages for my Repeat AI seller ID ${selected.id}, summarise the conversation, and suggest the next step. Do not send a message.`;
  try {
    if (extensions.message) await extensions.message.send({ role: "user", content: [{ type: "text", text: prompt }] });
    else await app.sendMessage({ role: "user", content: [{ type: "text", text: prompt }] });
    status(kind === "monitor" ? "Monitoring request sent to ChatGPT. Check the chat for confirmation." : "Summary request sent to ChatGPT.");
  } catch { status("Could not send the request. Ask ChatGPT in the conversation."); }
}

function theme(context) {
  if (context?.theme) { applyDocumentTheme(context.theme); document.documentElement.dataset.repeatTheme = context.theme; }
  if (context?.styles?.variables) applyHostStyleVariables(context.styles.variables);
}
$("search-form").addEventListener("submit", search);
$("filter").addEventListener("change", search);
$("summarise").addEventListener("click", () => ask("summary"));
$("monitor").addEventListener("click", () => ask("monitor"));
app.ontoolresult = result => renderList(result.structuredContent);
app.onhostcontextchanged = theme;
try {
  await app.connect();
  connected = true;
  $("search-button").disabled = false;
  theme(app.getHostContext());
} catch { status("Open this seller panel from the Repeat AI plugin in ChatGPT."); }
