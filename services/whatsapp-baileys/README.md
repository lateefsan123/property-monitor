# Seller Signal WhatsApp Web Service

This service powers the low-cost WhatsApp Web beta connector for Seller Signal.
It uses Baileys as a linked-device WhatsApp Web client and exposes a small
private HTTP API for Supabase Edge Functions.

Baileys is not the official WhatsApp Business Platform. This connector should
be treated as a beta path for users who accept WhatsApp Web session risk.

## Run locally

```bash
cd services/whatsapp-baileys
cp .env.example .env
npm install
npm run dev
```

Set the same `BAILEYS_SERVICE_TOKEN` in Supabase Edge Function secrets. The
service stores linked-device auth state under `BAILEYS_AUTH_DIR`.

## API

- `GET /health`
- `POST /sessions`
- `GET /sessions/:sessionId`
- `POST /sessions/:sessionId/pairing-code`
- `POST /sessions/:sessionId/messages`
- `DELETE /sessions/:sessionId`

All routes except `/health` require `Authorization: Bearer <BAILEYS_SERVICE_TOKEN>`.

To link without a camera, call `POST /sessions/:sessionId/pairing-code` with
`{ "phoneNumber": "353..." }`, then poll `GET /sessions/:sessionId` until
`pairingCodeFormatted` is present. Enter that code in WhatsApp's Linked Devices
phone-number flow.
