import { executeVoiceTool } from './voice-tools.js';

export async function runAssistantChat({ text, history = [], request, integrationRequest, workspace, signal, onResult, onPreview }) {
  if (!text.trim() || text.length > 4000) throw new Error('Use a message between 1 and 4,000 characters.');
  const input = [...history, { role: 'user', content: text.trim() }];
  const seen = new Set();
  let answer = '';
  for (let step = 0; step < 8; step++) {
    if (signal.aborted) throw new Error('Chat stopped.');
    const response = await request({ action: 'chat', input }, signal);
    if (signal.aborted) throw new Error('Chat stopped.');
    if (!Array.isArray(response.output)) throw new Error('Chat returned an invalid response.');
    input.push(...response.output);
    answer += response.output.filter(item => item.role === 'assistant').map(item => item.content).join('\n');
    const calls = response.output.filter(item => item.type === 'function_call');
    if (!calls.length) return { history: input, answer: answer || 'No answer was returned. Please try again.' };
    for (const call of calls) {
      if (seen.has(call.call_id)) throw new Error('Repeated action stopped. Check the current result before trying again.');
      seen.add(call.call_id);
      let result;
      try { result = await executeVoiceTool(call.name, JSON.parse(call.arguments), {
        request: integrationRequest, workspace, signal, onResult, onPreview,
      }); } catch { result = { error: 'This action could not be completed. Nothing was confirmed. Check the current result or clarify your request.' }; }
      if (signal.aborted) throw new Error('Chat stopped.');
      const output = JSON.stringify(result);
      input.push({ type: 'function_call_output', call_id: call.call_id,
        output: output.length <= 40000 ? output : JSON.stringify({ error: 'Result too large. Narrow the lookup.' }) });
      if (result.status === 'awaiting_user_confirmation') return { history: input, answer: 'Ready for review below. Nothing has been changed or sent yet.' };
    }
  }
  throw new Error('That needed too many lookups. Please narrow your request.');
}
