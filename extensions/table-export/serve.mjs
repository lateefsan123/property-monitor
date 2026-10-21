import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const allowed = new Set(['index.html', 'demo.js', 'workspace.css', 'repeat-ai-table-export.zip']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.zip': 'application/zip' };
http.createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!allowed.has(name)) { response.writeHead(404).end(); return; }
  try { response.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-store' }); response.end(await readFile(path.join(root, name))); }
  catch { response.writeHead(404).end('Run the extension build first.'); }
}).listen(4186, '127.0.0.1', () => console.log('Replica ready: http://127.0.0.1:4186'));
