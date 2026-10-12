import process from 'node:process';
import { createOutreachRuntime } from '../../server/email-outreach-runtime.js';
import { createOutreachHandler } from '../../server/email-outreach-api.js';
export const config={maxDuration:300};
let handler;
export default async function outreach(req,res) {
  try {handler ||= createOutreachHandler(createOutreachRuntime(process.env));await handler(req,res);}
  catch {res.statusCode=503;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:'Outreach server setup is needed. No email was sent.'}));}
}
