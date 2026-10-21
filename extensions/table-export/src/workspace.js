/* global chrome */
import { mountWorkspace } from './ui.js';

const tabId = Number(new URLSearchParams(location.search).get('tab'));
let frameId = 0;
async function call(method, ...args) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func: (name, params) => globalThis.__repeatTableExporter?.[name](...params), args: [method, args],
  });
  const value = results[0]?.result;
  if (value === undefined && !['cancel', 'clear'].includes(method)) throw new Error('The source page changed or closed. Open your sheet, then click the extension again.');
  return value;
}
const bridge = {
  async discover() {
    // The same-origin frames covered by activeTab can contain embedded tables.
    // Cross-origin frames need their own user activation; no broad host grant.
    let frames = await chrome.scripting.executeScript({ target: { tabId }, files: ['agent.js'] });
    try { frames = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['agent.js'] }); }
    catch { /* An inaccessible embedded frame must not hide the main table. */ }
    const tables = [];
    for (const frame of frames) {
      frameId = frame.frameId;
      const found = await call('discover');
      tables.push(...found.map(t => ({ ...t, id: `${frame.frameId}:${t.id}` })));
    }
    return tables;
  },
  async start(id, options) { const [frame, table] = id.split(':').map(Number); frameId = frame; return call('start', table, options); },
  poll: () => call('poll'), cancel: () => call('cancel'), clear: () => call('clear'),
};
mountWorkspace(document.getElementById('app'), bridge);
