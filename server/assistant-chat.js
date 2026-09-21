import { VOICE_TOOLS } from '../shared/voice-tools.js';

// Stateless, bounded text turns. No microphone, live session or retained provider conversation.
export function chatItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 80 || JSON.stringify(items).length > 120000) throw new Error('Invalid chat history.');
  const string = (value, max = 16000) => typeof value === 'string' && value.length <= max;
  return items.map(item => {
    if (!item || typeof item !== 'object') throw new Error('Invalid chat item.');
    if (['user', 'assistant'].includes(item.role) && string(item.content)) return { role: item.role, content: item.content };
    if (item.type === 'function_call' && VOICE_TOOLS.some(tool => tool.name === item.name) && string(item.call_id, 200) && string(item.arguments))
      return { type: item.type, call_id: item.call_id, name: item.name, arguments: item.arguments };
    if (item.type === 'function_call_output' && string(item.call_id, 200) && string(item.output, 40000))
      return { type: item.type, call_id: item.call_id, output: item.output };
    if (item.type === 'reasoning' && string(item.encrypted_content, 64000))
      return { type: 'reasoning', encrypted_content: item.encrypted_content, summary: [] };
    throw new Error('Invalid chat item.');
  });
}

export async function respondToChat({ input, apiKey, instructions, fetchImpl }) {
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5.6-luna', store: false, input, instructions,
      reasoning: { effort: 'low' }, include: ['reasoning.encrypted_content'],
      max_output_tokens: 1600, parallel_tool_calls: false, tools: VOICE_TOOLS }),
  });
  if (!response.ok) throw new Error('Provider unavailable.');
  const data = await response.json();
  if (!Array.isArray(data.output) || data.status !== 'completed') throw new Error('Incomplete response.');
  const output = data.output.flatMap(item => {
    if (item.type === 'message') {
      const content = (item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('\n');
      return content ? [{ role: 'assistant', content }] : [];
    }
    if (['function_call', 'reasoning'].includes(item.type)) return [item];
    return [];
  });
  return { output: chatItems(output) };
}
