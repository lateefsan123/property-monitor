import { readFile, writeFile } from 'node:fs/promises';
import { createActionRegistry } from '../services/seller-signal-mcp/src/action-registry.js';

const manifest = JSON.parse(await readFile(new URL('../plugins/repeat-ai/plugin.json', import.meta.url), 'utf8'));
const config = manifest.extensions['com.openai'];
const tools = Object.fromEntries(createActionRegistry().list().map(action => {
  const sends = action.name === 'send_seller_signal_whatsapp_message';
  const updates = action.name === 'update_my_seller_lead';
  return [action.name, {
    annotations: {
      readOnlyHint: action.readOnly,
      openWorldHint: sends,
      destructiveHint: updates || sends,
    },
    justifications: {
      read_only_justification: action.readOnly
        ? 'Reads records scoped to the authenticated Repeat AI account without modifying data or sending messages.'
        : sends
          ? 'Sends a WhatsApp message and records its delivery state after explicit confirmation.'
          : updates
            ? 'Changes an existing seller record after explicit confirmation.'
            : 'Inserts a new seller record after explicit confirmation.',
      open_world_justification: sends
        ? 'Sends a message through the connected WhatsApp provider to an external recipient.'
        : 'Queries or changes only records in the authenticated Repeat AI workspace; it does not contact external recipients.',
      destructive_justification: sends
        ? 'Creates an externally visible message that cannot reliably be undone and can update contact state.'
        : updates
          ? 'Can overwrite existing seller notes, status, last contact date, or sent state.'
          : action.readOnly
            ? 'Does not modify, delete, or overwrite records.'
            : 'Only inserts a new seller record; existing records are not overwritten or deleted.',
    },
  }];
}));

const submission = {
  $schema: 'https://developers.openai.com/plugins/schemas/chatgpt-app-submission.v1.json',
  schema_version: 1,
  app_info: {
    display_name: config.interface.displayName,
    subtitle: config.interface.shortDescription,
    description: config.interface.longDescription,
    category: 'PRODUCTIVITY',
  },
  tools,
  test_cases: config.review.test_cases.positive.map(test => ({
    description: test.description,
    user_prompt: test.prompt,
    tools_triggered: test.tools_triggered,
    expected_output: test.expected_behavior,
  })),
  negative_test_cases: [
    { description: 'Public property listing search is outside this plugin.', user_prompt: 'Find apartments currently for sale in Dubai Marina.', expected_output: 'Do not invoke Repeat AI seller workspace tools. Explain that public listing search is not supported.' },
    { description: 'Calendar scheduling is outside this plugin.', user_prompt: 'Create a calendar appointment for my property viewing tomorrow.', expected_output: 'Do not invoke Repeat AI tools or claim a calendar event was created.' },
    { description: 'Email sending is outside this plugin.', user_prompt: 'Send an email to my seller with the viewing details.', expected_output: 'Do not invoke Repeat AI tools or substitute a WhatsApp message. Email is not supported.' },
  ],
};

await writeFile(new URL('../plugins/repeat-ai/chatgpt-app-submission.json', import.meta.url), `${JSON.stringify(submission, null, 2)}\n`);
console.log(`Prepared submission with ${Object.keys(tools).length} tools, ${submission.test_cases.length} positive and ${submission.negative_test_cases.length} negative cases.`);
