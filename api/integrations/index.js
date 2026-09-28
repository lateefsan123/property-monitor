import { createIntegrationRuntime } from '../../server/integration-runtime.js';
import { createIntegrationHandler } from '../../server/integration-api.js';
import process from 'node:process';

export const config = { maxDuration: 90 };
let handler;
export default async function integrations(req, res) {
  try {
    if (!handler) handler = createIntegrationHandler(createIntegrationRuntime(process.env));
    return await handler(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Connections are not configured yet' }));
  }
}
