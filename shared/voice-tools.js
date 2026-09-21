const provider = { type: 'string', enum: ['google', 'microsoft'] };
const text = { type: 'string' };
const tool = (name, description, properties) => ({
  type: 'function', name, description, strict: true,
  parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});

export const VOICE_TOOLS = [
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
export async function executeVoiceTool(name, args, { request, onPreview, signal }) {
  const spec = VOICE_TOOLS.find(item => item.name === name);
  if (!spec || !args || typeof args !== 'object' || Array.isArray(args)
    || Object.keys(args).some(key => !Object.hasOwn(spec.parameters.properties, key))
    || spec.parameters.required.some(key => !Object.hasOwn(args, key))) throw new Error('Unsupported voice action.');
  for (const [key, value] of Object.entries(args)) {
    const schema = spec.parameters.properties[key];
    if (typeof value !== 'string' || value.length > 8000 || (schema.enum && !schema.enum.includes(value))) throw new Error('Invalid voice action.');
  }
  if (signal?.aborted) throw new Error('Conversation ended.');
  if (name === 'connected_apps') return request({ action: 'status' }, signal);
  if (name === 'read_connected_app') {
    let input;
    try { input = JSON.parse(args.input_json); } catch { throw new Error('Invalid lookup.'); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid lookup.');
    return request({ action: 'read', provider: args.provider, feature: args.feature, input }, signal);
  }
  const input = args.reply_to_id ? { replyToId: args.reply_to_id, body: args.body } : { to: args.to, subject: args.subject, body: args.body };
  const prepared = await request({ action: 'prepare_email', provider: args.provider, feature: 'email', input }, signal);
  if (signal?.aborted) throw new Error('Conversation ended.');
  if (!prepared?.confirmation || !prepared?.preview) throw new Error('Email preview unavailable.');
  onPreview({ ...prepared, provider: args.provider });
  // Never give the approval token to the model. Only the human-facing UI gets it.
  return { status: 'awaiting_user_confirmation', preview: prepared.preview, message: 'Email prepared, NOT sent. Review the on-screen card and press Confirm and send.' };
}
