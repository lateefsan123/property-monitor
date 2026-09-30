import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const output = await build({ entryPoints: [fileURLToPath(new URL("tests/panel-host.js", root))], bundle: true, write: false, format: "esm" });
const host = `<!doctype html><html><head><title>Repeat AI panel preview</title><style>body{font:14px system-ui;margin:20px;background:#eee}iframe{display:block;width:100%;max-width:1100px;height:840px;border:1px solid #ddd;background:white}button{padding:8px 16px;margin:0 8px 16px 0}#request{max-width:1000px}</style></head><body><p>Local preview · synthetic sample data · no external messages or monitoring</p><button id="wide">Wide panel</button><button id="narrow">Narrow panel</button><iframe title="Repeat AI seller panel"></iframe><p id="request" role="status"></p><script type="module" src="/host.js"></script></body></html>`;
createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/host.js") { res.setHeader("Content-Type", "text/javascript"); res.end(output.outputFiles[0].text); }
  else if (req.url === "/panel") { res.setHeader("Content-Type", "text/html"); res.end(await readFile(new URL("public/seller-panel.html", root))); }
  else if (req.url === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(host); }
  else { res.statusCode = 404; res.end(); }
}).listen(8791, "127.0.0.1", () => console.log("Synthetic panel preview: http://127.0.0.1:8791"));
