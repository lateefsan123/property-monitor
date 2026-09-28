import process from 'node:process';
import { createIntegrationRuntime } from '../server/integration-runtime.js';
import { createEmailSummaryCron } from '../server/email-summary-cron.js';

export const config = { maxDuration: 300 };
let runtime;
export default function emailSummaryCron(req, res) {
  return createEmailSummaryCron({ secret: process.env.CRON_SECRET,
    service: () => (runtime ||= createIntegrationRuntime(process.env)).summaries })(req, res);
}
