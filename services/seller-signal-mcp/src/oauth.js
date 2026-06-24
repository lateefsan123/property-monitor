import { randomUUID } from "node:crypto";
import { InvalidGrantError, InvalidRequestError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

export const DEFAULT_DEV_OAUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

class InMemoryClientsStore {
  constructor() {
    this.clients = new Map();
  }

  getClient(clientId) {
    return this.clients.get(clientId);
  }

  registerClient(client) {
    const next = {
      ...client,
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: client.token_endpoint_auth_method ?? "none",
    };
    this.clients.set(next.client_id, next);
    return next;
  }
}

export class SellerSignalDevOAuthProvider {
  clientsStore = new InMemoryClientsStore();

  constructor(config) {
    this.config = config;
    this.codes = new Map();
    this.accessTokens = new Map();
    this.refreshTokens = new Map();
    this.tokenTtlSeconds = config.tokenTtlSeconds ?? DEFAULT_DEV_OAUTH_TOKEN_TTL_SECONDS;
  }

  async authorize(client, params, res) {
    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    const code = randomUUID();
    this.codes.set(code, {
      clientId: client.client_id,
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      resource: params.resource?.toString(),
      scopes: params.scopes ?? [],
      userId: this.config.fixedUserId,
      email: this.config.fixedUserEmail,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const redirect = new URL(params.redirectUri);
    redirect.searchParams.set("code", code);
    if (params.state !== undefined) {
      redirect.searchParams.set("state", params.state);
    }
    res.redirect(redirect.toString());
  }

  async challengeForAuthorizationCode(client, authorizationCode) {
    const code = this.requireCode(client, authorizationCode);
    return code.codeChallenge;
  }

  async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri) {
    const code = this.requireCode(client, authorizationCode);
    if (redirectUri && code.redirectUri !== redirectUri) {
      throw new InvalidGrantError("Authorization code redirect_uri mismatch");
    }
    this.codes.delete(authorizationCode);
    return this.issueTokens({
      clientId: client.client_id,
      resource: code.resource,
      scopes: code.scopes,
      userId: code.userId,
      email: code.email,
    });
  }

  async exchangeRefreshToken(client, refreshToken) {
    const token = this.refreshTokens.get(refreshToken);
    if (!token || token.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    this.refreshTokens.delete(refreshToken);
    this.accessTokens.delete(token.token);
    return this.issueTokens(token);
  }

  async verifyAccessToken(token) {
    const record = this.accessTokens.get(token);
    if (!record || record.expiresAt <= Date.now()) {
      throw new InvalidGrantError("Invalid or expired access token");
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      resource: record.resource ? new URL(record.resource) : undefined,
      extra: {
        userId: record.userId,
        email: record.email,
      },
    };
  }

  async revokeToken(_client, request) {
    const record = this.accessTokens.get(request.token) ?? this.refreshTokens.get(request.token);
    if (!record) return;

    this.accessTokens.delete(record.token);
    if (record.refreshToken) {
      this.refreshTokens.delete(record.refreshToken);
    }
  }

  requireCode(client, authorizationCode) {
    const code = this.codes.get(authorizationCode);
    if (!code || code.clientId !== client.client_id || code.expiresAt <= Date.now()) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    return code;
  }

  issueTokens(input) {
    const accessToken = randomUUID();
    const refreshToken = randomUUID();
    const record = {
      token: accessToken,
      refreshToken,
      clientId: input.clientId,
      resource: input.resource,
      scopes: input.scopes,
      userId: input.userId,
      email: input.email,
      expiresAt: Date.now() + this.tokenTtlSeconds * 1000,
    };
    this.accessTokens.set(accessToken, record);
    this.refreshTokens.set(refreshToken, record);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: this.tokenTtlSeconds,
      scope: input.scopes.join(" "),
    };
  }
}
