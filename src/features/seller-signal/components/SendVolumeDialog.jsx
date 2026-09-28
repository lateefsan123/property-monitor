import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { DAILY_SEND_WARNING, answerSendVolume, subscribeSendVolume } from "../send-volume-guard";
import "../../../styles/send-volume-dialog.css";

// Shown before a manual WhatsApp send once today's sends reach 40.
export default function SendVolumeDialog() {
  const [request, setRequest] = useState(null);
  const [skip, setSkip] = useState(false);
  const sendRef = useRef(null);
  useEffect(() => subscribeSendVolume((next) => { setRequest(next); setSkip(false); }), []);
  useEffect(() => {
    if (!request) return undefined;
    sendRef.current?.focus();
    function onKey(event) { if (event.key === "Escape") answerSendVolume(false, false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [request]);
  if (!request) return null;
  const count = request.sentToday;
  return (
    <div className="svd-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) answerSendVolume(false, false); }}>
      <div className="svd-dialog" role="alertdialog" aria-modal="true" aria-labelledby="svd-title" aria-describedby="svd-body">
        <span className="svd-icon" aria-hidden="true"><IconAlertTriangle size={24} stroke={1.8} /></span>
        <h2 id="svd-title">You’ve sent {count} messages today</h2>
        <p id="svd-body">
          Repeat AI sends up to {DAILY_SEND_WARNING} automated WhatsApp messages per day. Sending a lot more from one number
          raises the chance WhatsApp limits or bans it. You can still send this message.
        </p>
        <label className="svd-skip">
          <input type="checkbox" checked={skip} onChange={(event) => setSkip(event.target.checked)} />
          Don’t ask again today
        </label>
        <div className="svd-actions">
          <button type="button" className="svd-btn" onClick={() => answerSendVolume(false, false)}>Don’t send</button>
          <button ref={sendRef} type="button" className="svd-btn is-primary" onClick={() => answerSendVolume(true, skip)}>Send anyway</button>
        </div>
      </div>
    </div>
  );
}
