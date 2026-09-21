// Local visual fixture: bundle the real screens with an in-memory auth adapter.
// No credentials, network requests, user writes or checkout are used.
import { build } from "esbuild";

await build({
  entryPoints: ["docs/design/onboarding-preview/preview.jsx"],
  outfile: "tmp/onboarding-preview.js",
  bundle: true,
  format: "esm",
  jsx: "automatic",
  define: { "import.meta.env.BASE_URL": JSON.stringify("/") },
  plugins: [{ name: "isolated-onboarding-fixture", setup(build) {
    build.onResolve({ filter: /(^|\/)supabase$/ }, () => ({ path: "fixture-auth", namespace: "fixture" }));
    build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `
      export const supabase = { auth: { updateUser: async () => ({ error: null }) } };
    ` }));
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "css" }));
  } }],
});
console.log("Local-only preview: http://localhost:5182/docs/design/onboarding-preview/index.html");
