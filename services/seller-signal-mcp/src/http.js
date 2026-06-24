#!/usr/bin/env node
import "dotenv/config";

import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createSellerSignalMcpServer } from "./server.js";
import { assertDevOAuthAllowed, INSECURE_DEV_OAUTH_OPT_IN_ENV } from "./dev-oauth-policy.js";
import { SellerSignalDevOAuthProvider } from "./oauth.js";
import { assertUserHasSubscription, SubscriptionRequiredError } from "./seller-signal.js";
import { createSupabaseOAuthVerifier, loadSupabaseOAuthMetadata } from "./supabase-oauth.js";

function parsePort() {
  const raw = process.env.PORT ?? process.env.SELLER_SIGNAL_MCP_PORT ?? "8788";
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid MCP HTTP port: ${raw}`);
  }
  return port;
}

function parseAllowedHosts() {
  return process.env.SELLER_SIGNAL_MCP_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

function getHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuthMode() {
  const raw = process.env.SELLER_SIGNAL_MCP_AUTH?.trim().toLowerCase();
  if (raw === "supabase-oauth" || raw === "production-oauth") return "supabase-oauth";
  if (raw === "oauth" || raw === "dev-oauth" || process.env.SELLER_SIGNAL_MCP_ENABLE_OAUTH === "1") return "dev-oauth";
  return "none";
}

function getPublicBaseUrl(host, port) {
  const raw = process.env.SELLER_SIGNAL_MCP_PUBLIC_BASE_URL?.trim();
  if (raw) return new URL(raw.endsWith("/") ? raw : `${raw}/`);

  const protocol = host === "127.0.0.1" || host === "localhost" ? "http" : "https";
  return new URL(`${protocol}://${host}:${port}/`);
}

function getAuthenticatedRequestUserId(req) {
  const value = req.auth?.extra?.userId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when SELLER_SIGNAL_MCP_AUTH=oauth or dev-oauth.`);
  return value;
}

function getOptionalPositiveIntegerEnv(name) {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer number of seconds.`);
  }
  return value;
}

async function requireSubscription(req, res, next) {
  try {
    const userId = getAuthenticatedRequestUserId(req);
    if (!userId) {
      throw new SubscriptionRequiredError("Seller Signal subscription requires a linked Seller Signal account.");
    }

    await assertUserHasSubscription(userId);
    next();
  } catch (error) {
    if (error instanceof SubscriptionRequiredError) {
      res.status(403).json({
        error: "seller_signal_subscription_required",
        error_description: error.message,
      });
      return;
    }

    console.error("Failed to verify Seller Signal subscription:", error);
    res.status(500).json({
      error: "seller_signal_subscription_check_failed",
      error_description: "Could not verify Seller Signal subscription.",
    });
  }
}

async function main() {
  const host = process.env.SELLER_SIGNAL_MCP_HOST ?? process.env.HOST ?? "0.0.0.0";
  const port = parsePort();
  const authMode = getAuthMode();
  const sessions = new Map();

  const app = createMcpExpressApp({
    host,
    allowedHosts: parseAllowedHosts(),
  });
  app.set("trust proxy", 1);

  let authMiddleware;
  const publicBaseUrl = getPublicBaseUrl(host, port);
  const mcpServerUrl = new URL("/mcp", publicBaseUrl);

  if (authMode === "dev-oauth") {
    assertDevOAuthAllowed({
      bindHost: host,
      publicBaseUrl,
      allowInsecureDevOAuth: process.env[INSECURE_DEV_OAUTH_OPT_IN_ENV] === "1",
    });

    const provider = new SellerSignalDevOAuthProvider({
      fixedUserId: getRequiredEnv("SELLER_SIGNAL_MCP_AUTH_USER_ID"),
      fixedUserEmail: process.env.SELLER_SIGNAL_MCP_AUTH_EMAIL,
      tokenTtlSeconds: getOptionalPositiveIntegerEnv("SELLER_SIGNAL_MCP_DEV_TOKEN_TTL_SECONDS"),
    });

    app.use(mcpAuthRouter({
      provider,
      issuerUrl: publicBaseUrl,
      resourceServerUrl: mcpServerUrl,
      scopesSupported: ["seller-signal:read", "seller-signal:write"],
      resourceName: "Seller Signal MCP",
    }));

    authMiddleware = requireBearerAuth({
      verifier: provider,
      requiredScopes: [],
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
    });
  } else if (authMode === "supabase-oauth") {
    const oauthMetadata = await loadSupabaseOAuthMetadata();
    app.use(mcpAuthMetadataRouter({
      oauthMetadata,
      resourceServerUrl: mcpServerUrl,
      scopesSupported: ["openid", "email", "profile", "seller-signal:read", "seller-signal:write"],
      resourceName: "Seller Signal MCP",
    }));

    authMiddleware = requireBearerAuth({
      verifier: createSupabaseOAuthVerifier({
        expectedResource: mcpServerUrl,
        requireResourceAudience: process.env.SELLER_SIGNAL_MCP_REQUIRE_RESOURCE_AUDIENCE === "1",
      }),
      requiredScopes: [],
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
    });
  }

  app.get("/", (_req, res) => {
    res.json({
      name: "seller-signal-mcp",
      transport: "streamable-http",
      mcpEndpoint: "/mcp",
      auth: authMode,
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      auth: authMode,
      sessions: sessions.size,
    });
  });

  const mcpPostHandler = async (req, res) => {
    const sessionId = getHeader(req.headers["mcp-session-id"]);

    try {
      const existingSession = sessionId ? sessions.get(sessionId) : undefined;
      if (existingSession) {
        await existingSession.transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId || !isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: missing valid MCP session or initialize request.",
          },
          id: null,
        });
        return;
      }

      let session;
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (newSessionId) => {
          if (session) sessions.set(newSessionId, session);
        },
        onsessionclosed: async (closedSessionId) => {
          const closedSession = sessions.get(closedSessionId);
          sessions.delete(closedSessionId);
          await closedSession?.server.close();
        },
      });
      const server = createSellerSignalMcpServer({ authInfo: req.auth });
      session = { server, transport };

      transport.onclose = async () => {
        const closedSessionId = transport.sessionId;
        if (!closedSessionId) return;
        const closedSession = sessions.get(closedSessionId);
        sessions.delete(closedSessionId);
        await closedSession?.server.close();
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP HTTP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  };

  const mcpGetHandler = async (req, res) => {
    const sessionId = getHeader(req.headers["mcp-session-id"]);
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
      res.status(400).send("Invalid or missing MCP session ID.");
      return;
    }
    await session.transport.handleRequest(req, res);
  };

  const mcpDeleteHandler = async (req, res) => {
    const sessionId = getHeader(req.headers["mcp-session-id"]);
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
      res.status(400).send("Invalid or missing MCP session ID.");
      return;
    }
    await session.transport.handleRequest(req, res);
  };

  const protectedHandlers = authMiddleware
    ? [authMiddleware, requireSubscription]
    : [];
  app.post("/mcp", ...protectedHandlers, mcpPostHandler);
  app.get("/mcp", ...protectedHandlers, mcpGetHandler);
  app.delete("/mcp", ...protectedHandlers, mcpDeleteHandler);

  app.listen(port, host, (error) => {
    if (error) {
      console.error("Failed to start Seller Signal MCP HTTP server:", error);
      process.exit(1);
    }
    console.log(`Seller Signal MCP HTTP server listening at http://${host}:${port}/mcp`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
