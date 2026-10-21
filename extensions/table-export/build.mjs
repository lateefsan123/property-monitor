import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipFiles } from './src/zip.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
await build({ entryPoints: [path.join(root, 'src/agent.js')], bundle: true, format: 'iife', outfile: path.join(out, 'agent.js'), target: 'chrome102' });
await build({ entryPoints: [path.join(root, 'src/workspace.js')], bundle: true, format: 'iife', outfile: path.join(out, 'workspace.js'), target: 'chrome102' });
for (const name of ['manifest.json', 'background.js', 'workspace.html', 'workspace.css', 'README.md']) await copyFile(path.join(root, name), path.join(out, name));
await writeFile(path.join(out, 'THIRD_PARTY_NOTICES.txt'), `SheetJS Community Edition (xlsx), Copyright SheetJS LLC.\nhttps://sheetjs.com/\n\n${await readFile(new URL('../../node_modules/xlsx/LICENSE', import.meta.url), 'utf8')}`);
const names = ['manifest.json', 'background.js', 'workspace.html', 'workspace.css', 'workspace.js', 'agent.js', 'README.md', 'THIRD_PARTY_NOTICES.txt'];
await writeFile(path.join(out, 'repeat-ai-table-export.zip'), zipFiles(await Promise.all(names.map(async name => ({ name, data: new Uint8Array(await readFile(path.join(out, name))) })))));
await build({ entryPoints: [path.join(root, 'demo/demo.js')], bundle: true, format: 'esm', outfile: path.join(out, 'demo.js'), target: 'chrome102' });
await copyFile(path.join(root, 'demo/index.html'), path.join(out, 'index.html'));
console.log(`Extension and replica built: ${out}`);
