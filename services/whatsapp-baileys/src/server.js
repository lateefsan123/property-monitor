import "dotenv/config";
import { createVersionResolver } from './wa-version.js';
import { registerProfilePhotoRoute } from './profile-photo.js';
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import { createClient } from "@supabase/supabase-js";
import makeWASocket, {
  Browsers,
  DEFAULT_CONNECTION_CONFIG,
  DisconnectReason,
  jidNormalizedUser,
  useMultiFileAuthState,
} from "baileys";

const PORT = Number(process.env.PORT || 8787);
const SERVICE_TOKEN = process.env.BAILEYS_SERVICE_TOKEN || "";
const AUTH_DIR = process.env.BAILEYS_AUTH_DIR || ".data/auth";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const app = express();
const sessions = new Map();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const resolveVersion = createVersionResolver({ fallback: DEFAULT_CONNECTION_CONFIG.version, logger });
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
// Replies are only saved with database access; say so at startup instead of dropping them silently.
if (!supabase) logger.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set; incoming WhatsApp replies will not be saved");

app.use(express.json({ limit: "1mb" }));

function requireToken(req, res, next) {
  if (!SERVICE_TOKEN) {
    res.status(500).json({ error: "BAILEYS_SERVICE_TOKEN is not configured" });
    return;
  }

  const expected = `Bearer ${SERVICE_TOKEN}`;
  if (req.get("authorization") !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function truthyInput(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function normalizeOwnPhone(value) {
  return normalizePhone(String(value || "").split("@")[0].split(":")[0]);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate, timeoutMs = 12000, intervalMs = 250) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return true;
    await delay(intervalMs);
  }
  return Boolean(predicate());
}

function sessionPath(sessionId) {
  return path.join(AUTH_DIR, sessionId);
}

function accountPhoneNumberId(sessionId) {
  return `baileys:${sessionId}`;
}

function getTextBody(message) {
  return message?.message?.conversation
    || message?.message?.extendedTextMessage?.text
    || message?.message?.imageMessage?.caption
    || message?.message?.videoMessage?.caption
    || "";
}

function formatPairingCode(code) {
  return String(code || "").replace(/\s+/g, "").match(/.{1,4}/g)?.join("-") || null;
}

function publicSession(session) {
  return {
    connectedAt: session.connectedAt,
    displayPhoneNumber: session.displayPhoneNumber || null,
    lastError: session.lastError || null,
    pairingCode: session.pairingCode || null,
    pairingCodeFormatted: formatPairingCode(session.pairingCode),
    pairingCodeRequestedAt: session.pairingCodeRequestedAt || null,
    pairingMode: session.pairingMode || "qr",
    qr: session.qr || null,
    qrDataUrl: session.qrDataUrl || null,
    sessionId: session.id,
    status: session.status,
    updatedAt: session.updatedAt || null,
  };
}

function setPendingPairing(session, phoneNumber, customPairingCode) {
  const phone = normalizePhone(phoneNumber);
  if (!phone) throw new Error("Phone number is required for pairing code");

  session.pendingPairingPhoneNumber = phone;
  session.pendingCustomPairingCode = customPairingCode || null;
  session.pairingCode = null;
  session.pairingCodeRequestedAt = null;
  session.pairingMode = "code";
  session.qr = null;
  session.qrDataUrl = null;
  session.updatedAt = new Date().toISOString();
}

async function maybeRequestPairingCode(session) {
  if (!session.pendingPairingPhoneNumber || session.pairingCode || session.pairingCodeRequestInFlight) return;
  if (!session.socket) return;
  if (session.socket.authState?.creds?.registered) return;
  const socket = session.socket;

  session.pairingCodeRequestInFlight = true;
  session.status = "pairing_code_requested";
  session.updatedAt = new Date().toISOString();

  try {
    const code = await socket.requestPairingCode(
      session.pendingPairingPhoneNumber,
      session.pendingCustomPairingCode || undefined,
    );
    if (session.socket !== socket) return;
    session.pairingCode = code;
    session.pairingCodeRequestedAt = new Date().toISOString();
    session.qr = null;
    session.qrDataUrl = null;
    session.status = "pairing_code";
    session.lastError = null;
  } catch (error) {
    if (session.socket !== socket) return;
    session.lastError = error instanceof Error ? error.message : "Could not request pairing code";
    session.status = "pairing_code_error";
    logger.warn({ error, sessionId: session.id }, "Could not request Baileys pairing code");
  } finally {
    session.pairingCodeRequestInFlight = false;
    session.updatedAt = new Date().toISOString();
  }
}

async function syncAccount(session) {
  if (!supabase) return;

  const patch = {
    connection_status: session.status === "connected" ? "connected" : session.status === "error" ? "error" : "pending",
    ...(session.displayPhoneNumber ? { display_phone_number: session.displayPhoneNumber } : {}),
    last_error: session.lastError || null,
    raw_account: {
      baileys: {
        connected_at: session.connectedAt || null,
        session_id: session.id,
        status: session.status,
        updated_at: session.updatedAt || null,
      },
    },
  };

  const { error } = await supabase
    .from("whatsapp_accounts")
    .update(patch)
    .eq("provider", "baileys")
    .eq("phone_number_id", accountPhoneNumberId(session.id));

  if (error) logger.warn({ error, sessionId: session.id }, "Could not sync Baileys account");
}

async function persistInboundMessage(session, message) {
  if (!supabase || message?.key?.fromMe) return;

  // WhatsApp now addresses most chats by a private "@lid" id; Baileys puts the
  // sender's phone address in remoteJidAlt. Without this every reply was skipped.
  const remoteJid = message?.key?.remoteJid || "";
  const fromJid = remoteJid.endsWith("@s.whatsapp.net") ? remoteJid : message?.key?.remoteJidAlt || "";
  if (!fromJid.endsWith("@s.whatsapp.net")) {
    if (remoteJid.endsWith("@lid")) logger.warn({ sessionId: session.id }, "Inbound message has no phone address; not saved");
    return;
  }

  const providerMessageId = message?.key?.id;
  const from = fromJid.replace("@s.whatsapp.net", "");
  if (!providerMessageId || !from) return;

  const { data: account, error: accountError } = await supabase
    .from("whatsapp_accounts")
    .select("id, user_id")
    .eq("provider", "baileys")
    .eq("phone_number_id", accountPhoneNumberId(session.id))
    .maybeSingle();

  if (accountError || !account) {
    if (accountError) logger.warn({ accountError, sessionId: session.id }, "Could not find account for inbound message");
    return;
  }

  const { error } = await supabase
    .from("whatsapp_messages")
    .insert({
      user_id: account.user_id,
      account_id: account.id,
      direction: "inbound",
      recipient_phone: from,
      message_type: "text",
      body: getTextBody(message),
      status: "received",
      meta_message_id: `baileys:${providerMessageId}`,
      raw_response: message,
    });

  if (error && error.code !== "23505") {
    logger.warn({ error, sessionId: session.id }, "Could not persist inbound message");
  }
}

async function removeSessionFiles(sessionId) {
  await fs.rm(sessionPath(sessionId), { recursive: true, force: true });
}

async function stopSessionSocket(session) {
  clearTimeout(session?.reconnectTimer);
  if (session) session.stopped = true;
  if (!session?.socket) return;

  try {
    if (session.status === "connected") {
      await session.socket.logout();
    } else {
      session.socket.end?.(new Boom("Session removed", { statusCode: DisconnectReason.loggedOut }));
    }
  } catch (error) {
    const statusCode = error?.output?.statusCode;
    const message = error instanceof Error ? error.message : "";
    const connectionAlreadyClosed = statusCode === 428 || message.includes("Connection Closed");

    if (session.status === "connected" && !connectionAlreadyClosed) throw error;
    logger.warn({ error, sessionId: session.id }, "Ignoring Baileys socket close failure during session removal");
  } finally {
    session.socket = null;
  }
}

async function resetSession(sessionId) {
  const existing = sessions.get(sessionId);
  await stopSessionSocket(existing);
  sessions.delete(sessionId);
  await removeSessionFiles(sessionId);
}

async function startSession(sessionId, options = {}) {
  const existing = sessions.get(sessionId);
  if (existing?.socket && existing.status !== "logged_out") {
    if (options.phoneNumber) {
      setPendingPairing(existing, options.phoneNumber, options.customPairingCode);
      if (existing.pairingReady) await maybeRequestPairingCode(existing);
    }
    return existing;
  }

  await fs.mkdir(sessionPath(sessionId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath(sessionId));
  const session = existing || {
    connectedAt: null,
    displayPhoneNumber: null,
    id: sessionId,
    lastError: null,
    pairingCode: null,
    pairingCodeRequestInFlight: false,
    pairingCodeRequestedAt: null,
    pairingMode: "qr",
    pendingCustomPairingCode: null,
    pendingPairingPhoneNumber: null,
    qr: null,
    qrDataUrl: null,
    socket: null,
    status: "starting",
    updatedAt: new Date().toISOString(),
  };

  session.status = "starting";
  session.stopped = false;
  session.pairingReady = false;
  session.qr = null;
  session.qrDataUrl = null;
  session.pairingCode = null;
  session.lastError = null;
  session.pairingCodeRequestInFlight = false;
  session.pendingCustomPairingCode = session.pendingCustomPairingCode || null;
  session.pendingPairingPhoneNumber = session.pendingPairingPhoneNumber || null;
  session.updatedAt = new Date().toISOString();
  if (options.phoneNumber) setPendingPairing(session, options.phoneNumber, options.customPairingCode);
  sessions.set(sessionId, session);

  const socket = makeWASocket({
    version: await resolveVersion(),
    auth: state,
    browser: Browsers.macOS("Chrome"),
    logger: logger.child({ sessionId }),
    markOnlineOnConnect: false,
    printQRInTerminal: false,
    syncFullHistory: false,
    connectTimeoutMs: 20000,
    defaultQueryTimeoutMs: 10000,
  });

  session.socket = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    if (session.stopped || sessions.get(sessionId) !== session || session.socket !== socket) return;
    const { connection, lastDisconnect, qr } = update;
    session.updatedAt = new Date().toISOString();

    if (qr) {
      session.pairingReady = true;
      session.qr = qr;
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      if (session.stopped || session.socket !== socket) return;
      if (session.pairingMode !== "code") session.status = "qr";
      await maybeRequestPairingCode(session);
    }

    if (connection === "open") {
      session.status = "connected";
      session.reconnectAttempts = 0;
      session.connectedAt = new Date().toISOString();
      session.lastError = null;
      session.pairingCode = null;
      session.pairingCodeRequestInFlight = false;
      session.pairingCodeRequestedAt = null;
      session.pendingCustomPairingCode = null;
      session.pendingPairingPhoneNumber = null;
      session.qr = null;
      session.qrDataUrl = null;
      session.displayPhoneNumber = normalizeOwnPhone(socket.user?.id || socket.authState?.creds?.me?.id);
      await syncAccount(session);
    }

    if (connection === "connecting" && !session.qr) {
      session.status = "connecting";
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
        || new Boom(lastDisconnect?.error).output.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      session.socket = null;
      session.pairingReady = false;
      session.qr = null;
      session.qrDataUrl = null;
      session.pairingCode = null;
      session.reconnectAttempts = (session.reconnectAttempts || 0) + 1;
      session.status = loggedOut ? "logged_out" : "reconnecting";
      const retry = !loggedOut && (socket.authState?.creds?.registered || session.reconnectAttempts < 5);
      if (!loggedOut && !retry) session.status = "error";
      session.lastError = lastDisconnect?.error?.message || null;
      logger.warn({ sessionId, statusCode, attempt: session.reconnectAttempts, retry }, "WhatsApp connection closed");
      await syncAccount(session);

      if (retry) {
        session.reconnectTimer = setTimeout(() => {
          session.reconnectTimer = null;
          if (session.stopped || sessions.get(sessionId) !== session) return;
          startSession(sessionId).catch((error) => {
            logger.error({ error, sessionId }, "Baileys reconnect failed");
          });
        }, Math.min(1500 * 2 ** (session.reconnectAttempts - 1), 30000));
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    // "append" carries messages that arrived while the service was offline; the
    // unique provider message id keeps a reply from being saved twice.
    if (type !== "notify" && type !== "append") return;
    for (const message of messages || []) {
      await persistInboundMessage(session, message);
    }
  });

  return session;
}

async function requestSessionPairingCode(session, phoneNumber, customPairingCode) {
  const phone = normalizePhone(phoneNumber);
  if (!phone) throw new Error("Phone number is required for pairing code");
  if (session.status === "connected") throw new Error("WhatsApp session is already connected");
  if (!session.socket) throw new Error("WhatsApp session socket is not ready");

  if (session.socket.authState?.creds?.registered) {
    throw new Error("WhatsApp session is already registered");
  }

  setPendingPairing(session, phone, customPairingCode);
  if (session.pairingReady) await maybeRequestPairingCode(session);
  await waitFor(
    () => session.pairingCode || ["pairing_code_error", "error", "logged_out", "connected"].includes(session.status),
    15000,
  );

  if (["pairing_code_error", "error", "logged_out"].includes(session.status)) {
    throw new Error(session.lastError || "Could not request pairing code");
  }

  return session;
}

async function getSession(sessionId) {
  return sessions.get(sessionId) || startSession(sessionId);
}

registerProfilePhotoRoute(app, { requireToken, sessions, restoreSession: async sessionId => {
  const creds = JSON.parse(await fs.readFile(path.join(sessionPath(sessionId), 'creds.json'), 'utf8'));
  if (!creds.registered) return null;
  return getSession(sessionId);
} });

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "seller-signal-whatsapp-baileys" });
});

app.post("/sessions", requireToken, async (req, res) => {
  try {
    const requestedId = String(req.body?.sessionId || "").trim();
    const sessionId = requestedId || crypto.randomUUID();
    if (requestedId && truthyInput(req.body?.resetSession ?? req.body?.reset_session)) {
      await resetSession(sessionId);
    }

    const wantsPairingCode = Boolean(req.body?.phoneNumber || req.body?.pairingMode === "code");
    const session = await startSession(
      sessionId,
      wantsPairingCode
        ? { phoneNumber: req.body?.phoneNumber, customPairingCode: req.body?.customPairingCode }
        : {},
    );
    if (wantsPairingCode) {
      await waitFor(
        () => session.pairingCode || ["pairing_code_error", "error", "logged_out", "connected"].includes(session.status),
        15000,
      );
      if (["pairing_code_error", "error", "logged_out"].includes(session.status)) {
        throw new Error(session.lastError || "Could not request pairing code");
      }
    }
    res.json(publicSession(session));
  } catch (error) {
    logger.error({ error }, "Could not create Baileys session");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/sessions/:sessionId", requireToken, async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    res.json(publicSession(session));
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, "Could not get Baileys session");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/sessions/:sessionId/pairing-code", requireToken, async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    await requestSessionPairingCode(session, req.body?.phoneNumber, req.body?.customPairingCode);
    res.json(publicSession(session));
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, "Could not request Baileys pairing code");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.post("/sessions/:sessionId/messages", requireToken, async (req, res) => {
  try {
    const to = normalizePhone(req.body?.to);
    const text = String(req.body?.text || "").trim();
    const imageUrl = String(req.body?.imageUrl || "").trim();
    if (!to) {
      res.status(400).json({ error: "Recipient phone number is required" });
      return;
    }
    if (!text) {
      res.status(400).json({ error: "Message text is required" });
      return;
    }
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      res.status(400).json({ error: "Image URL must use HTTPS" });
      return;
    }

    const session = await getSession(req.params.sessionId);
    if (session.status !== "connected" || !session.socket) {
      res.status(409).json({ error: "WhatsApp session is not connected", session: publicSession(session) });
      return;
    }

    const jid = jidNormalizedUser(`${to}@s.whatsapp.net`);
    const response = await session.socket.sendMessage(
      jid,
      imageUrl
        ? { image: { url: imageUrl }, caption: text }
        : { text },
    );
    res.json({
      messageId: response?.key?.id ? `baileys:${response.key.id}` : null,
      raw: response,
      sent: true,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, "Could not send Baileys message");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.delete("/sessions/:sessionId", requireToken, async (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    await stopSessionSocket(session);
    sessions.delete(req.params.sessionId);
    await removeSessionFiles(req.params.sessionId);
    res.json({ removed: true });
  } catch (error) {
    logger.error({ error, sessionId: req.params.sessionId }, "Could not delete Baileys session");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Reconnect every linked WhatsApp on startup so replies keep arriving after a
// restart, not only once the next message is sent. Only paired logins (creds.me).
async function restoreLinkedSessions() {
  let entries = [];
  try { entries = await fs.readdir(AUTH_DIR, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (!entry.isDirectory() || sessions.has(entry.name)) continue;
    try {
      const creds = JSON.parse(await fs.readFile(path.join(sessionPath(entry.name), "creds.json"), "utf8"));
      if (!creds?.me?.id) continue;
      await startSession(entry.name);
      logger.info({ sessionId: entry.name }, "Restored linked WhatsApp session");
    } catch (error) {
      logger.warn({ error, sessionId: entry.name }, "Could not restore WhatsApp session");
    }
  }
}

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Seller Signal WhatsApp Baileys service listening");
  void restoreLinkedSessions();
});
