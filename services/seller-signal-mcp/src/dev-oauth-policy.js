export const INSECURE_DEV_OAUTH_OPT_IN_ENV = "SELLER_SIGNAL_MCP_ALLOW_INSECURE_DEV_OAUTH";

function isLoopbackHost(value) {
  const normalized = value.toLowerCase();
  return normalized === "localhost"
    || normalized === "127.0.0.1"
    || normalized === "::1"
    || normalized === "0.0.0.0";
}

function isLoopbackUrl(url) {
  return isLoopbackHost(url.hostname);
}

export function assertDevOAuthAllowed({ allowInsecureDevOAuth, bindHost, publicBaseUrl }) {
  if (allowInsecureDevOAuth) return;
  if (isLoopbackHost(bindHost) && isLoopbackUrl(publicBaseUrl)) return;

  throw new Error(
    `Dev OAuth with a fixed Seller Signal user is localhost-only by default. Use SELLER_SIGNAL_MCP_AUTH=supabase-oauth for reachable deployments, or set ${INSECURE_DEV_OAUTH_OPT_IN_ENV}=1 only for a private single-user deployment.`,
  );
}
