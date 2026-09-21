const provider = { type: 'string', enum: ['google', 'microsoft'] };
const text = { type: 'string' };
const tool = (name, description, properties) => ({
  type: 'function', name, description, strict: true,
  parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});

export const VOICE_TOOLS = [
  tool('market_locations', 'Find exact buildings in imported sales or locations on Bayut. Use source sales before market_sales, bayut before market_listings. Use returned keys; ask if multiple plausible towers. For an area-wide sales query use market_sales area instead of choosing one building.', { query: text, source: { type: 'string', enum: ['sales', 'bayut'] } }),
  tool('market_sales', 'Analyze imported CSV/market-cache SALES, not asking prices. Requires a resolved building_key OR an area name. Dates YYYY-MM-DD inclusive, max one year. Empty string means no optional filter. beds is bedroom count or studio. Size bounds in sq ft find comparable candidates. Returns calculated totals, mean, median, area-weighted AED/sqft, coverage and latest 20 sales. Never aggregate the 20 displayed rows yourself. If incomplete, narrow query: totals withheld. Compare areas/periods with separate calls and explain coverage. No claim of all Dubai sales or formal valuation.', {
    building_key: text, area: text, start_date: text, end_date: text, beds: text,
    property_type: { type: 'string', enum: ['', 'apartment', 'villa'] }, min_area_sqft: text, max_area_sqft: text,
  }),
  tool('market_listings', 'Read Bayut apartment sale listing samples for a location returned by market_locations source bayut. These are ASKING prices, not achieved sales. May be cached up to one hour and incomplete. Never infer total inventory, market averages, rental yields or sale prices from this sample. beds is bedroom count, studio, or empty.', { location_key: text, beds: text }),
  tool('account_profile', 'Read the signed-in account name and email. Not billing, credits or subscription status.', {}),
  tool('lead_details', 'Read details and saved notes for a seller ID returned by find_leads. Resolve ambiguous names first.', { lead_id: text }),
  tool('prepare_lead_note', 'Draft an appended note for a seller found by find_leads. Keep existing notes. Never save until the user presses Confirm change.', { lead_id: text, note: text }),
  tool('prepare_lead_status', 'Draft a seller status change for review. May change follow-up eligibility. Use a seller returned by find_leads; resolve ambiguous names.', { lead_id: text, status: { type: 'string', enum: ['Prospect', 'Not Interested', 'Market Appraisal', 'For Sale Available'] } }),
  tool('prepare_template', 'Draft a NEW seller message template for review. Must contain {{transactions}}. Does not replace or set the default, attach an image or send. Match the requested wording.', { name: text, content: text }),
  tool('find_leads', 'Search your sellers by name, building or phone. Empty query/status means all. offset is a numeric string starting at 0. Returns 20 with total and nextOffset; follow pages for more. Never call these due leads without cadence evidence.', { query: text, status: text, offset: text }),
  tool('price_drops', 'Show the latest recorded price drops in your watched listings. Empty building means all; never claim a live market refresh.', { building: text }),
  tool('workspace_spreadsheets', 'List your imported Repeat AI spreadsheets.', {}),
  tool('message_templates', 'Read your saved seller message templates.', {}),
  tool('automation_status', 'Read your current scheduled automation settings.', {}),
  tool('send_activity', 'Show recent outbound WhatsApp status. Queued is not sent or delivered.', {}),
  tool('prepare_automation', 'PREPARE enable or pause of existing account-wide follow-ups/reports for visible confirmation. No immediate batch send. Refuse requests for a particular subset or new schedule: these require normal settings. This never applies changes itself.', { automation: { type: 'string', enum: ['followups', 'reports'] }, action: { type: 'string', enum: ['enable', 'pause'] } }),
  tool('connected_apps', 'List this user’s connected apps and permissions before accessing data.', {}),
  tool('read_connected_app', 'Read connected email, calendar or spreadsheets. input_json is a JSON object: {} for inbox/calendar/OneDrive root; Google file search {query}; Google tabs {spreadsheetId,tabs:true}; Google rows {spreadsheetId,sheetName}; Excel folder {folderId}, tabs {fileId}, rows {fileId,sheetName}. Use IDs returned by tools, never ask users to find IDs. Rows are a bounded preview, not the entire workbook.', {
    provider, feature: { type: 'string', enum: ['email', 'calendar', 'sheets'] }, input_json: text,
  }),
  tool('prepare_email', 'Prepare an email or reply for on-screen review. This NEVER sends. The user must press Confirm and send. For replies supply reply_to_id from inbox and leave to/subject empty; otherwise leave reply_to_id empty.', {
    provider, to: text, subject: text, body: text, reply_to_id: text,
  }),
];

// Shared by web and native. There is deliberately no send/confirm/OAuth tool.
// The supplied request function authenticates every call as the current user.
export async function executeVoiceTool(name, args, { request, workspace, onResult = () => {}, onPreview, signal }) {
  const spec = VOICE_TOOLS.find(item => item.name === name);
  if (!spec || !args || typeof args !== 'object' || Array.isArray(args)
    || Object.keys(args).some(key => !Object.hasOwn(spec.parameters.properties, key))
    || spec.parameters.required.some(key => !Object.hasOwn(args, key))) throw new Error('Unsupported voice action.');
  for (const [key, value] of Object.entries(args)) {
    const schema = spec.parameters.properties[key];
    if (typeof value !== 'string' || value.length > 8000 || (schema.enum && !schema.enum.includes(value))) throw new Error('Invalid voice action.');
  }
  if (signal?.aborted) throw new Error('Conversation ended.');
  if (['market_locations', 'market_sales', 'market_listings', 'account_profile', 'find_leads', 'lead_details', 'price_drops', 'workspace_spreadsheets', 'message_templates', 'automation_status', 'send_activity'].includes(name)) {
    if (!workspace) throw new Error('Workspace unavailable.');
    const result = await workspace.read(name, args, signal);
    if (signal?.aborted) throw new Error('Conversation ended.');
    onResult(result);
    return result;
  }
  if (['prepare_automation', 'prepare_lead_note', 'prepare_lead_status', 'prepare_template'].includes(name)) {
    if (!workspace) throw new Error('Workspace unavailable.');
    const prepared = name === 'prepare_automation' ? await workspace.prepare(args, signal) : await workspace.prepareRecord(name, args, signal);
    if (signal?.aborted) { workspace.discard(); throw new Error('Conversation ended.'); }
    if (prepared.unchanged) return prepared;
    try { onPreview(prepared); } catch (error) { workspace.discard(); throw error; }
    return { status: 'awaiting_user_confirmation', preview: prepared.preview, message: 'Not changed. Press Confirm change on the visible card.' };
  }
  if (name === 'connected_apps') return request({ action: 'status' }, signal);
  if (name === 'read_connected_app') {
    let input;
    try { input = JSON.parse(args.input_json); } catch { throw new Error('Invalid lookup.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid lookup.');
    const result = await request({ action: 'read', provider: args.provider, feature: args.feature, input }, signal);
    if (signal?.aborted) throw new Error('Conversation ended.');
    onResult(result);
    return result;
  }
  const input = args.reply_to_id ? { replyToId: args.reply_to_id, body: args.body } : { to: args.to, subject: args.subject, body: args.body };
  const prepared = await request({ action: 'prepare_email', provider: args.provider, feature: 'email', input }, signal);
  if (signal?.aborted) throw new Error('Conversation ended.');
  if (!prepared?.confirmation || !prepared?.preview) throw new Error('Email preview unavailable.');
  onPreview({ ...prepared, provider: args.provider });
  // Never give the approval token to the model. Only the human-facing UI gets it.
  return { status: 'awaiting_user_confirmation', preview: prepared.preview, message: 'Email prepared, NOT sent. Review the on-screen card and press Confirm and send.' };
}
