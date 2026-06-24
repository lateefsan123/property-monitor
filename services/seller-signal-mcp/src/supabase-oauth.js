import { createClient } from "@supabase/supabase-js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { readSupabaseConfig } from "./config.js";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function getSupabaseUrl() {
  const { url } = readSupabaseConfig();
  const value = trimTrailingSlash(url.trim());
  if (!value) {
    throw new Error(
      "SELLER_SIGNAL_MCP_AUTH=supabase-oauth requires SUPABASE_URL, SELLER_SIGNAL_SUPABASE_URL, or VITE_SUPABASE_URL.",
    );
  }
  return value;
}

function getPublishableKey() {
  const { publishableKey } = readSupabaseConfig();
  const value = publishableKey.trim();
  if (!value) {
    throw new Error(
      "SELLER_SIGNAL_MCP_AUTH=supabase-oauth requires SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, SELLER_SIGNAL_SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_ANON_KEY.",
    );
  }
  return value;
}

function getSupabaseAuthIssuerUrl() {
  const override = process.env.SELLER_SIGNAL_SUPABASE_OAUTH_ISSUER_URL?.trim();
  if (override) return trimTrailingSlash(override);
  return `${getSupabaseUrl()}/auth/v1`;
}

function getSupabaseOAuthMetadataUrl() {
  const override = process.env.SELLER_SIGNAL_SUPABASE_OAUTH_METADATA_URL?.trim();
  if (override) return override;
  return `${getSupabaseUrl()}/.well-known/oauth-authorization-server/auth/v1`;
}

export async function loadSupabaseOAuthMetadata() {
  const issuer = getSupabaseAuthIssuerUrl();
  const metadataUrl = getSupabaseOAuthMetadataUrl();
  const response = await fetch(metadataUrl, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load Supabase OAuth metadata from ${metadataUrl} (${response.status}). Enable Supabase Auth OAuth Server first.`,
    );
  }

  const metadata = await response.json();
  return {
    ...metadata,
    issuer: metadata.issuer ?? issuer,
    authorization_endpoint: metadata.authorization_endpoint ?? `${issuer}/oauth/authorize`,
    token_endpoint: metadata.token_endpoint ?? `${issuer}/oauth/token`,
    response_types_supported: metadata.response_types_supported ?? ["code"],
    grant_types_supported: metadata.grant_types_supported ?? ["authorization_code", "refresh_token"],
    scopes_supported: metadata.scopes_supported ?? ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: metadata.token_endpoint_auth_methods_supported ?? ["none"],
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"],
  };
}

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) return {};

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function normalizeScopes(claims) {
  if (Array.isArray(claims.scp)) return claims.scp.filter(Boolean);
  if (typeof claims.scp === "string") return claims.scp.split(/\s+/).filter(Boolean);
  if (typeof claims.scope === "string") return claims.scope.split(/\s+/).filter(Boolean);
  return [];
}

function normalizeAudience(audience) {
  if (typeof audience === "string") return [audience];
  return Array.isArray(audience) ? audience.filter((value) => typeof value === "string") : [];
}

function resolveResource(claims, expectedResource) {
  const audiences = normalizeAudience(claims.aud);
  const urlAudience = audiences.find((value) => /^https?:\/\//i.test(value));
  if (urlAudience) return new URL(urlAudience);
  return expectedResource;
}

export function createSupabaseOAuthVerifier(options = {}) {
  const supabase = createClient(getSupabaseUrl(), getPublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return {
    async verifyAccessToken(token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new InvalidTokenError(error?.message ?? "Invalid Supabase access token");
      }

      const claims = decodeJwtPayload(token);
      const clientId = claims.client_id;
      if (!clientId) {
        throw new InvalidTokenError("Supabase access token was not issued to an OAuth client.");
      }

      const resource = resolveResource(claims, options.expectedResource);
      if (options.requireResourceAudience && options.expectedResource) {
        const expected = options.expectedResource.toString();
        if (!normalizeAudience(claims.aud).includes(expected)) {
          throw new InvalidTokenError(`Supabase access token audience must include ${expected}.`);
        }
      }

      return {
        token,
        clientId,
        scopes: normalizeScopes(claims),
        expiresAt: typeof claims.exp === "number" ? claims.exp : undefined,
        resource,
        extra: {
          userId: claims.user_id ?? claims.sub ?? data.user.id,
          email: claims.email ?? data.user.email,
        },
      };
    },
  };
}
