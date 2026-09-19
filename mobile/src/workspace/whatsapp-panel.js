import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWhatsAppAccounts } from "../features/seller-signal/services";
import { whatsappAccountsQueryKey } from "../features/seller-signal/useSellerSignalPage";
import BottomSheet from "../components/BottomSheet";
import { connectWhatsAppAccount } from "./whatsapp";
import { Button, Feedback, Field, Icon } from "./ui";

export default function WhatsAppPanel({ userId, colors, active = true }) {
  const client = useQueryClient();
  const accounts = useQuery({
    queryKey: whatsappAccountsQueryKey(userId),
    queryFn: () => fetchWhatsAppAccounts(userId),
    enabled: Boolean(userId),
  });
  const account = accounts.data?.find((row) => row.connection_status === "connected") || accounts.data?.[0];
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [copied, setCopied] = useState(false);
  const accountId = result?.account?.id;
  const code = result?.pairingCodeFormatted || result?.session?.pairingCodeFormatted || result?.pairingCode || result?.session?.pairingCode;
  const qr = result?.qr || result?.session?.qr;
  const qrData = result?.qrDataUrl || result?.session?.qrDataUrl;
  const connected = account?.connection_status === "connected" || result?.account?.connection_status === "connected";
  const connectedAccount = result?.account?.connection_status === "connected" ? result.account : account;
  const phoneLabel = connectedAccount?.display_phone_number || connectedAccount?.business_name || "WhatsApp number";

  useEffect(() => {
    if (!active) setSheet(null);
  }, [active]);

  useEffect(() => {
    if (!active || !waiting || !accountId) return;
    let stopped = false;
    let timer;
    const started = Date.now();
    async function poll() {
      try {
        const next = await connectWhatsAppAccount({ accountId, action: "status", quiet: true });
        if (stopped) return;
        setResult((previous) => ({ ...previous, ...next, session: { ...previous?.session, ...next?.session } }));
        if (next?.account?.connection_status === "connected") {
          setWaiting(false);
          setSheet(null);
          await client.invalidateQueries({ queryKey: whatsappAccountsQueryKey(userId) });
          return;
        }
        if (Date.now() - started > 90000) {
          setWaiting(false);
          setError(new Error("Linking timed out. Get a fresh code and try again."));
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch (failure) {
        if (!stopped) { setError(failure); setWaiting(false); }
      }
    }
    timer = setTimeout(poll, 2500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [active, waiting, accountId, userId, client]);

  async function run(action, pairingMode) {
    setError(null);
    if (action === "start" && pairingMode === "code" && !/^\+?\d[\d\s-]{7,18}$/.test(phone.trim())) {
      setError(new Error("Enter your WhatsApp number including country code."));
      return;
    }
    setBusy(true);
    setCopied(false);
    try {
      const next = await connectWhatsAppAccount({
        action,
        accountId: action === "disconnect" ? connectedAccount?.id : undefined,
        pairingMode,
        phoneNumber: pairingMode === "code" ? phone.trim() : undefined,
        resetSession: action === "start",
      });
      setResult(action === "disconnect" ? null : next);
      setWaiting(action === "start" && next?.account?.connection_status !== "connected");
      await client.invalidateQueries({ queryKey: whatsappAccountsQueryKey(userId) });
      if (action === "disconnect" || next?.account?.connection_status === "connected") setSheet(null);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  function openPairing() {
    setError(null);
    setSheet("pair");
  }

  return <View style={{ gap: 20 }}>
    <Feedback colors={colors} error={accounts.error || (!sheet && error)} loading={accounts.isPending} onRetry={accounts.refetch} />
    {!accounts.isPending && connected ? (
      <Pressable accessibilityRole="button" accessibilityLabel="Manage WhatsApp number" onPress={() => { setError(null); setSheet("manage"); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18, borderBottomWidth: 0.5, borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
        <Icon name="message" color={colors.textMuted} size={23} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>{phoneLabel}</Text>
          <Text style={{ color: colors.badgeOkText, fontSize: 13 }}>Connected</Text>
        </View>
        <Icon name="chevron" color={colors.textFaint} size={18} />
      </Pressable>
    ) : !accounts.isPending ? (
      <>
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          {waiting ? "Finish linking your number in WhatsApp." : "Link a number to send messages to your sellers."}
        </Text>
        <Pressable accessibilityRole="button" onPress={openPairing} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, borderBottomWidth: 0.5, borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
          <Icon name={waiting ? "message" : "plus"} color={colors.text} size={22} />
          <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}>{waiting ? "Continue linking" : "Add WhatsApp number"}</Text>
          <Icon name="chevron" color={colors.textFaint} size={18} />
        </Pressable>
      </>
    ) : null}

    <BottomSheet visible={Boolean(sheet) && active} onClose={() => !busy && setSheet(null)} colors={colors}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 18 }}>
        <Text accessibilityRole="header" style={{ color: colors.textName, fontSize: 21, fontWeight: "700" }}>
          {sheet === "pair" ? "Add WhatsApp number" : sheet === "disconnect" ? "Disconnect WhatsApp?" : "WhatsApp number"}
        </Text>
        <Feedback colors={colors} error={error} />
        {sheet === "pair" ? <>
          {!waiting ? <>
            <Field colors={colors} label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+971…" />
            <Button colors={colors} primary disabled={busy} onPress={() => run("start", "code")}>{busy ? "Connecting…" : "Get pairing code"}</Button>
            <Button colors={colors} disabled={busy} onPress={() => run("start", "qr")}>Use QR code</Button>
          </> : null}
          {(code || qr || qrData) ? <>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              {code ? "In WhatsApp, open Settings → Linked devices → Link a device → Link with phone number instead." : "On another device, open WhatsApp → Settings → Linked devices → Link a device, then scan this code."}
            </Text>
            {code ? <>
              <Text selectable style={{ fontSize: 28, letterSpacing: 3, textAlign: "center", color: colors.textName }}>{code}</Text>
              <Button colors={colors} onPress={async () => {
                try { await Clipboard.setStringAsync(String(code)); setCopied(true); }
                catch { setError(new Error("Could not copy the code. You can select it above.")); }
              }}>{copied ? "Copied" : "Copy code"}</Button>
            </> : null}
            {qrData ? <Image source={{ uri: qrData }} style={{ width: 220, height: 220, alignSelf: "center" }} />
              : qr ? <View style={{ alignSelf: "center", backgroundColor: "white", padding: 12 }}><QRCode value={qr} size={200} /></View> : null}
          </> : null}
          {waiting ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>Waiting for WhatsApp…</Text> : null}
        </> : sheet === "disconnect" ? <>
          <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>Automated messages will pause until you reconnect.</Text>
          <Button colors={colors} disabled={busy} onPress={() => run("disconnect")}>{busy ? "Disconnecting…" : "Disconnect"}</Button>
          <Button colors={colors} disabled={busy} onPress={() => setSheet("manage")}>Keep connected</Button>
        </> : <>
          <Text selectable style={{ color: colors.text, fontSize: 17 }}>{phoneLabel}</Text>
          <Text style={{ color: colors.badgeOkText }}>Connected</Text>
          <Button colors={colors} onPress={() => setSheet("disconnect")}>Disconnect number</Button>
        </>}
      </ScrollView>
    </BottomSheet>
  </View>;
}
