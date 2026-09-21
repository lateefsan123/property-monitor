import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPublicAuthLocation, publicAuthUrl } from "../src/public-auth-navigation.js";

test("public homepage and section links do not select login", () => {
  for (const hash of ["", "#start-free", "#product-details", "#connected-stack", "#access_token=example"]) {
    assert.equal(isPublicAuthLocation({ hash }), false);
  }
  assert.equal(isPublicAuthLocation({ hash: "#login" }), true);
});

test("auth navigation preserves the path and query without carrying an old section hash", () => {
  assert.equal(publicAuthUrl("https://repeatai.org/?campaign=trial#start-free", true), "/?campaign=trial#login");
  assert.equal(publicAuthUrl("https://repeatai.org/?campaign=trial#login", false), "/?campaign=trial");
});

test("checkout storage remains separate from page selection, and browser navigation is cleaned up", () => {
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(main, /\[showAuth, setShowAuth\] = useState\(\(\) => isPublicAuthLocation\(window.location\)\)/);
  assert.match(main, /\[postAuthAction, setPostAuthAction\] = useState\(\(\) => readStoredPostAuthAction\(\)\)/);
  for (const event of ["popstate", "hashchange"]) {
    assert.ok(main.includes(`addEventListener("${event}", syncPublicPage)`));
    assert.ok(main.includes(`removeEventListener("${event}", syncPublicPage)`));
  }
  assert.match(main, /function returnToLanding\(\) \{\s*updatePostAuthAction\(null\)/);
  assert.match(main, /onBack=\{returnToLanding\}/);
});

test("login and verification screens both offer an optional home action", () => {
  const auth = readFileSync(new URL("../src/Auth.jsx", import.meta.url), "utf8");
  assert.equal((auth.match(/onClick=\{onBack\}/g) || []).length, 2);
  assert.equal((auth.match(/← Back to home/g) || []).length, 2);
});

test("home actions sit outside the centered login and verification forms", () => {
  const auth = readFileSync(new URL("../src/Auth.jsx", import.meta.url), "utf8");
  assert.equal((auth.match(/className="auth-pane auth-pane--form">\s*\{onBack/g) || []).length, 2);
  assert.doesNotMatch(auth, /className="auth-form-container">\s*\{onBack/);
});

test("auth controls have visible borders and keyboard focus", () => {
  const css = readFileSync(new URL("../src/styles/auth.css", import.meta.url), "utf8");
  assert.match(css, /--auth-control-border: #858585/);
  for (const selector of ["auth-google-btn", "profile-avatar-btn", "referral-option"]) {
    assert.match(css.match(new RegExp(`\\.${selector} \\{([^}]+)\\}`))[1], /border: 1px solid var\(--auth-control-border\)/);
  }
  assert.match(css, /:is\(button, a, input\):focus-visible/);
});
