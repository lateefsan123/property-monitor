import outreach from '../api/email-outreach-cron.js';
import summary from '../api/email-summary-cron.js';
import integrations from '../api/integrations/index.js';
import voice from '../api/voice/index.js';
import outreachApi from '../api/outreach/index.js';
import desktopDownload from '../api/desktop/download.js';

const handlers = new Map([
  ['/api/email-outreach-cron', outreach],
  ['/api/email-summary-cron', summary],
  ['/api/integrations', integrations],
  ['/api/voice', voice],
  ['/api/outreach', outreachApi],
  ['/api/desktop/download', desktopDownload],
]);

export async function runHandler(handler, request) {
  let requestBody = '';
  if (request.body) {
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 500000) {
        await reader.cancel();
        return new Response('Request too large', { status: 413 });
      }
      requestBody += decoder.decode(value, { stream: true });
    }
    requestBody += decoder.decode();
  }
  const headers = new Headers();
  let body = '';
  const response = {
    statusCode: 200,
    setHeader(name, value) { headers.set(name, value); },
    end(value) { body = value ?? ''; },
  };
  await handler({ method: request.method, headers: Object.fromEntries(request.headers), body: requestBody }, response);
  return new Response(request.method === 'HEAD' ? null : body, { status: response.statusCode, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const handler = handlers.get(url.pathname.replace(/\/$/, ''));
    if (handler) return runHandler(handler, request);
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && (url.pathname === '/data-deletion' ||
        (!/^\/(assets|data|favicon)/.test(url.pathname) && !url.pathname.includes('.')))) {
      url.pathname = '/index.html';
      response = await env.ASSETS.fetch(new Request(url, request));
    }
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Content-Security-Policy', "frame-ancestors 'self'");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), geolocation=()');
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(event, env, context) {
    context.waitUntil(Promise.all([...handlers].filter(([path]) => path.endsWith('-cron')).map(async ([path, handler]) => {
      const response = await runHandler(handler, new Request(`https://repeatai.org${path}`, {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }));
      if (!response.ok) throw new Error(`Scheduled job ${path} returned ${response.status}`);
    })));
  },
};
