import { build } from "esbuild";
await build({ entryPoints: ["docs/design/tour-preview/preview.jsx"], outfile: "tmp/tour-preview.js", bundle: true, format: "esm", jsx: "automatic" });
