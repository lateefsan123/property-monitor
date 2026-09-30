import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const output = await build({ entryPoints: [new URL("ui/seller-panel.js", root).pathname.replace(/^\/([A-Za-z]:)/, "$1")], bundle: true, format: "esm", minify: true, write: false, target: "es2022" });
const logo = await readFile(new URL("../..//plugins/repeat-ai/assets/icon.png", root));
const template = await readFile(new URL("ui/seller-panel.html", root), "utf8");
await writeFile(new URL("public/seller-panel.html", root), template.replace("__LOGO__", () => `data:image/png;base64,${logo.toString("base64")}`).replace("__SCRIPT__", () => output.outputFiles[0].text.replaceAll("</script", "<\\/script")));
console.log("Built seller panel");
