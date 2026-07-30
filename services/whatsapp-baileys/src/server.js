import "dotenv/config";
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
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const DISCONNECT_DETAILS = new Map([
  [DisconnectReason.loggedOut, {
    reasonCode: "logged_out",
    reasonLabel: "WhatsApp logged this device out",
    recoverable: false,
    recoveryAction: "Link the number again in Repeat AI.",
  }],
  [DisconnectReason.connectionReplaced, {
    reasonCode: "connection_replaced",
    reasonLabel: "Another WhatsApp session replaced this connection",
    recoverable: false,
    recoveryAction: "Review Linked devices in WhatsApp, then reconnect Repeat AI.",
  }],
  [DisconnectReason.multideviceMismatch, {
    reasonCode: "multidevice_mismatch",
    reasonLabel: "WhatsApp rejected the linked-device session",
    recoverable: false,
    recoveryAction: "Remove the old linked device and link Repeat AI again.",
  }],
  [DisconnectReason.badSession, {
    reasonCode: "bad_session",
    reasonLabel: "The saved WhatsApp session became invalid",
    recoverable: false,
    recoveryAction: "Link the number again to create a fresh session.",
  }],
  [DisconnectReason.forbidden, {
    reasonCode: "forbidden",
    reasonLabel: "WhatsApp refused access to this session",
    recoverable: false,
    recoveryAction: "Check the WhatsApp account and linked devices before reconnecting.",
  }],
  [DisconnectReason.unavailableService, {
    reasonCode: "service_unavailable",
    reasonLabel: "WhatsApp was temporarily unavailable",
    recoverable: true,
    recoveryAction: "Repeat AI will retry automatically.",
  }],
  [DisconnectReason.restartRequired, {
    reasonCode: "restart_required",
    reasonLabel: "WhatsApp requested a connection restart",
    recoverable: true,
    recoveryAction: "Repeat AI will reconnect automatically.",
  }],
  [DisconnectReason.connectionLost, {
    reasonCode: "connection_lost",
    reasonLabel: "The connection timed out or was lost",
    recoverable: true,
    recoveryAction: "Repeat AI will reconnect automatically.",
  }],
  [DisconnectReason.connectionClosed, {
    reasonCode: "connection_closed",
    reasonLabel: "The WhatsApp connection closed unexpectedly",
    recoverable: true,
    recoveryAction: "Repeat AI will reconnect automatically.",
  }],
]);

const INTENTIONAL_DISCONNECT_DETAILS = {
  manual_disconnect: {
    reasonCode: "manual_disconnect",
    reasonLabel: "Disconnected from Repeat AI",
    recoverable: false,
    recoveryAction: "Reconnect the number when you want to use it again.",
  },
  session_reset: {
    reasonCode: "session_reset",
    reasonLabel: "Session reset for a new link",
    recoverable: false,
    recoveryAction: "Finish linking the number again.",
  },
};

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
    lastDisconnect: session.lastDisconnect || null,
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

function getDisconnectStatusCode(error) {
  const directStatus = Number(error?.output?.statusCode);
  if (Number.isFinite(directStatus)) return directStatus;

  try {
    const boomStatus = Number(new Boom(error).output.statusCode);
    return Number.isFinite(boomStatus) ? boomStatus : null;
  } catch {
    return null;
  }
}

function getDisconnectInfo(error, intent) {
  const statusCode = getDisconnectStatusCode(error);
  const details = INTENTIONAL_DISCONNECT_DETAILS[intent]
    || DISCONNECT_DETAILS.get(statusCode)
    || {
      reasonCode: "unknown",
      reasonLabel: "WhatsApp closed the connection for an unknown reason",
      recoverable: true,
      recoveryAction: "Repeat AI will retry automatically. Reconnect if it does not recover.",
    };
  const rawMessage = error?.message || error?.output?.payload?.message || null;

  return {
    ...details,
    message: rawMessage ? String(rawMessage).slice(0, 500) : null,
    occurredAt: new Date().toISOString(),
    statusCode,
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

  session.pairingCodeRequestInFlight = true;
  session.status = "pairing_code_requested";
  session.updatedAt = new Date().toISOString();

  try {
    const code = await session.socket.requestPairingCode(
      session.pendingPairingPhoneNumber,
      session.pendingCustomPairingCode || undefined,
    );
    session.pairingCode = code;
    session.pairingCodeRequestedAt = new Date().toISOString();
    session.qr = null;
    session.qrDataUrl = null;
    session.status = "pairing_code";
    session.lastError = null;
  } catch (error) {
    session.lastError = error instanceof Error ? error.message : "Could not request pairing code";
    session.status = "pairing_code_error";
    logger.warn({ error, sessionId: session.id }, "Could not request Baileys pairing code");
  } finally {
    session.pairingCodeRequestInFlight = false;
    session.updatedAt = new Date().toISOString();
  }
}

async function syncAccount(session) {
  if (!supabase) return null;

  const patch = {
    connection_status: session.status === "connected" ? "connected" : session.status === "error" ? "error" : "pending",
    display_phone_number: session.displayPhoneNumber || null,
    last_error: session.lastError || null,
    raw_account: {
      baileys: {
        connected_at: session.connectedAt || null,
        session_id: session.id,
        status: session.status,
        updated_at: session.updatedAt || null,
        last_disconnect: session.lastDisconnect || null,
      },
    },
  };

  const { data, error } = await supabase
    .from("whatsapp_accounts")
    .update(patch)
    .eq("provider", "baileys")
    .eq("phone_number_id", accountPhoneNumberId(session.id))
    .select("id, user_id")
    .maybeSingle();

  if (error) logger.warn({ error, sessionId: session.id }, "Could not sync Baileys account");
  return data || null;
}

async function recordDisconnectEvent(session, account, disconnectInfo) {
  logger.warn({
    reasonCode: disconnectInfo.reasonCode,
    recoverable: disconnectInfo.recoverable,
    sessionId: session.id,
    statusCode: disconnectInfo.statusCode,
  }, "Baileys connection closed");

  if (!supabase || !account) return null;

  const { data, error } = await supabase
    .from("whatsapp_connection_events")
    .insert({
      account_id: account.id,
      details: { pairing_mode: session.pairingMode || "qr" },
      event_type: "disconnected",
      message: disconnectInfo.message,
      occurred_at: disconnectInfo.occurredAt,
      reason_code: disconnectInfo.reasonCode,
      reason_label: disconnectInfo.reasonLabel,
      recoverable: disconnectInfo.recoverable,
      recovery_action: disconnectInfo.recoveryAction,
      session_id: session.id,
      status_code: disconnectInfo.statusCode,
      user_id: account.user_id,
    })
    .select("id")
    .single();

  if (error) {
    logger.warn({ error, sessionId: session.id }, "Could not persist Baileys disconnect event");
    return null;
  }

  return data?.id || null;
}

async function markDisconnectEventsRecovered(session, account) {
  if (!supabase || !account) return;

  const recoveredAt = new Date().toISOString();
  const { error } = await supabase
    .from("whatsapp_connection_events")
    .update({ recovered_at: recoveredAt })
    .eq("account_id", account.id)
    .eq("recoverable", true)
    .is("recovered_at", null);

  if (error) {
    logger.warn({ error, sessionId: session.id }, "Could not mark Baileys disconnect as recovered");
    return;
  }

  if (session.lastDisconnect?.recoverable) {
    session.lastDisconnect = { ...session.lastDisconnect, recoveredAt };
  }
}

async function persistInboundMessage(session, message) {
  if (!supabase || message?.key?.fromMe) return;

  const fromJid = message?.key?.remoteJid || "";
  if (!fromJid.endsWith("@s.whatsapp.net")) return;

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

async function stopSessionSocket(session, intent = "manual_disconnect") {
  if (!session?.socket) return;
  session.disconnectIntent = intent;

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
  await stopSessionSocket(existing, "session_reset");
  sessions.delete(sessionId);
  await removeSessionFiles(sessionId);
}

async function startSession(sessionId, options = {}) {
  const existing = sessions.get(sessionId);
  if (existing?.socket && existing.status !== "logged_out") {
    if (options.phoneNumber) {
      setPendingPairing(existing, options.phoneNumber, options.customPairingCode);
      if (existing.qr) await maybeRequestPairingCode(existing);
    }
    return existing;
  }

  await fs.mkdir(sessionPath(sessionId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath(sessionId));
  const restoringLinkedSession = !existing && Boolean(state.creds.registered);
  const session = existing || {
    connectedAt: null,
    displayPhoneNumber: null,
    disconnectIntent: null,
    id: sessionId,
    lastError: null,
    lastDisconnect: null,
    pairingCode: null,
    pairingCodeRequestInFlight: false,
    pairingCodeRequestedAt: null,
    pairingMode: "qr",
    pendingCustomPairingCode: null,
    pendingPairingPhoneNumber: null,
    qr: null,
    qrDataUrl: null,
    socket: null,
    startupDisconnectAt: restoringLinkedSession ? new Date().toISOString() : null,
    status: "starting",
    updatedAt: new Date().toISOString(),
  };

  session.status = "starting";
  session.lastError = null;
  session.pairingCodeRequestInFlight = false;
  session.pendingCustomPairingCode = session.pendingCustomPairingCode || null;
  session.pendingPairingPhoneNumber = session.pendingPairingPhoneNumber || null;
  session.updatedAt = new Date().toISOString();
  if (options.phoneNumber) setPendingPairing(session, options.phoneNumber, options.customPairingCode);
  sessions.set(sessionId, session);

  const socket = makeWASocket({
    auth: state,
    browser: Browsers.macOS("Chrome"),
    logger: logger.child({ sessionId }),
    markOnlineOnConnect: false,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  session.socket = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    session.updatedAt = new Date().toISOString();

    if (qr) {
      session.qr = qr;
      session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      if (session.pairingMode !== "code") session.status = "qr";
      await maybeRequestPairingCode(session);
    }

    if (connection === "open") {
      const startupDisconnect = session.startupDisconnectAt
        ? {
          message: null,
          occurredAt: session.startupDisconnectAt,
          reasonCode: "service_restart",
          reasonLabel: "The Repeat AI WhatsApp service restarted",
          recoverable: true,
          recoveryAction: "Repeat AI restored the saved WhatsApp session automatically.",
          statusCode: null,
        }
        : null;
      session.status = "connected";
      session.connectedAt = new Date().toISOString();
      session.lastError = null;
      if (startupDisconnect) session.lastDisconnect = startupDisconnect;
      session.pairingCode = null;
      session.pairingCodeRequestInFlight = false;
      session.pairingCodeRequestedAt = null;
      session.pendingCustomPairingCode = null;
      session.pendingPairingPhoneNumber = null;
      session.qr = null;
      session.qrDataUrl = null;
      session.displayPhoneNumber = normalizeOwnPhone(socket.user?.id || socket.authState?.creds?.me?.id);
      const account = await syncAccount(session);
      if (startupDisconnect) {
        const eventId = await recordDisconnectEvent(session, account, startupDisconnect);
        if (eventId) session.lastDisconnect = { ...session.lastDisconnect, eventId };
      }
      await markDisconnectEventsRecovered(session, account);
      session.startupDisconnectAt = null;
    }

    if (connection === "connecting" && !session.qr) {
      session.status = "connecting";
    }

    if (connection === "close") {
      const wasConnected = session.status === "connected";
      const wasRestoring = Boolean(session.startupDisconnectAt);
      const disconnectInfo = getDisconnectInfo(lastDisconnect?.error, session.disconnectIntent);
      session.lastDisconnect = disconnectInfo;
      session.socket = null;
      session.status = disconnectInfo.recoverable ? "reconnecting" : "error";
      session.lastError = disconnectInfo.message || disconnectInfo.reasonLabel;
      const account = await syncAccount(session);

      if (wasConnected || wasRestoring) {
        const eventId = await recordDisconnectEvent(session, account, disconnectInfo);
        if (eventId) session.lastDisconnect = { ...session.lastDisconnect, eventId };
      }

      session.disconnectIntent = null;
      session.startupDisconnectAt = null;

      if (disconnectInfo.recoverable) {
        setTimeout(() => {
          startSession(sessionId).catch((error) => {
            logger.error({ error, sessionId }, "Baileys reconnect failed");
          });
        }, 1500);
      }
    }
  });

  socket.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type !== "notify") return;
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
  if (session.qr) await maybeRequestPairingCode(session);
  await waitFor(
    () => session.pairingCode || session.status === "pairing_code_error" || session.status === "connected",
    15000,
  );

  if (session.status === "pairing_code_error") {
    throw new Error(session.lastError || "Could not request pairing code");
  }

  if (!session.pairingCode && session.status !== "connected") {
    throw new Error("Timed out waiting for WhatsApp pairing code");
  }

  return session;
}

async function getSession(sessionId) {
  return startSession(sessionId);
}

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
        () => session.pairingCode || session.status === "pairing_code_error" || session.status === "connected",
        15000,
      );
      if (session.status === "pairing_code_error") {
        throw new Error(session.lastError || "Could not request pairing code");
      }
      if (!session.pairingCode && session.status !== "connected") {
        throw new Error("Timed out waiting for WhatsApp pairing code");
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

app.listen(PORT, () => {
  logger.info({ port: PORT }, "Seller Signal WhatsApp Baileys service listening");
});
