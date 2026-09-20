import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const port = Number(process.env.REPEAT_RECORDER_PORT || 43127);
const origin = `http://127.0.0.1:${port}`;
const token = randomBytes(24).toString('hex');
const output = fileURLToPath(new URL('../../tmp/tab-recordings/', import.meta.url));
const template = await readFile(new URL('./tab-recorder.html', import.meta.url), 'utf8');
await mkdir(output, {recursive:true});
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.headers.host !== `127.0.0.1:${port}`) {res.writeHead(403).end(); return;}
  if (req.method === 'GET' && req.url === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(template.replace('__TOKEN__', token)); return;
  }
  if (req.method !== 'POST' || req.url !== '/recording' || req.headers.origin !== origin || req.headers['x-recorder-token'] !== token) {
    res.writeHead(403).end(); return;
  }
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 150 * 1024 * 1024) {res.writeHead(413).end('Recording too large'); return;}
      chunks.push(chunk);
    }
    if (!size) {res.writeHead(400).end('Empty recording'); return;}
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0,4).toString('hex') !== '1a45dfa3') {res.writeHead(415).end('Expected WebM'); return;}
    const file = path.join(output, `repeat-tab-${Date.now()}-${randomBytes(3).toString('hex')}.webm`);
    await writeFile(file, bytes, {flag:'wx'});
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({file, bytes:size}));
    console.log(`Saved ${file} (${size} bytes)`);
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500).end('Could not save recording');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local tab recorder: ${origin}\nSaves only to ${output}`));
