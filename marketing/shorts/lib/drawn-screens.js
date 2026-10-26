// Drawn phone screens for lib/app-phone.js beats ({ screen: … }), in screenshot px (1179 × 2556,
// below the status bar). Used for what isn't Repeat: plain WhatsApp, and the seller's own phone.
//   { kind: "wa", id, name, sub, dark, bottom, items: [{ at, side: "in"|"out", text, img }],   // dark: WhatsApp's dark theme; bottom: newest message at the foot
//     typing: { text, ta, tb, clear }, keyboard: true } // a WhatsApp chat; `typing` fills the input (ta = tb: pasted)
//   { kind: "lock", id, time, date, note: { at, app, title, body } }   // a lock screen notification
//   { kind: "lock", …, notes: [{ at, app, title, body, when }] }   // or several, stacked newest on top
//   { kind: "chats", id, chats: [{ name, last, time }], scroll: [t0, t1, px] }   // a WhatsApp chat list
//   { kind: "splash", id, at }                         // the Repeat launch screen (app.json: black, icon 200 pt), icon lands at `at`
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const out = u => 1 - Math.pow(1 - u, 3);
  const set = (el, css) => Object.assign(el.style, css);
  const F = '"Inter", sans-serif';

  const CSS = `
  .ds { position: absolute; inset: 0; display: flex; flex-direction: column; font-family: ${F}; color: #141414; background: #fff; }
  .ds-head { height: 210px; flex: none; display: flex; align-items: center; gap: 34px; padding: 0 48px; background: #fff; border-bottom: 2px solid #E4E5E8; }
  .ds-head .back { font: 400 96px ${F}; color: #1FA855; margin-top: -14px; }
  .ds-head .name { font: 600 54px ${F}; }
  .ds-head .sub { font: 400 40px ${F}; color: #6B6E73; margin-top: 6px; }
  .ds-wall { flex: 1; background: #EFE7DD; display: flex; flex-direction: column; gap: 30px; padding: 60px 48px; }
  .ds-bub { max-width: 80%; padding: 30px 40px; border-radius: 42px; font: 400 52px/1.32 ${F}; opacity: 0;
            box-shadow: 0 2px 0 rgba(0,0,0,.08); }
  .ds-bub { white-space: pre-line; }
  .ds .ds-bub img { position: static; display: block; width: 100%; height: auto; border-radius: 26px; margin-bottom: 18px; }
  .ds.bottom .ds-wall { justify-content: flex-end; overflow: hidden; }
  .ds.bottom .ds-bub { flex: none; }
  .ds.dark { background: #0B141A; color: #E9EDEF; }
  .ds.dark .ds-head, .ds.dark .ds-input { background: #1F2C33; border-color: #2A3942; }
  .ds.dark .ds-head .sub { color: #8696A0; }
  .ds.dark .ds-wall { background: #0B141A; }
  .ds.dark .ds-bub.in { background: #202C33; color: #E9EDEF; }
  .ds.dark .ds-bub.out { background: #005C4B; color: #E9EDEF; }
  .ds.dark .ds-field { background: #2A3942; border-color: #2A3942; color: #E9EDEF; }
  .ds.dark .ds-field .ph { color: #8696A0; }
  .ds.dark .ds-kb { background: #1C1C1E; }
  .ds.dark .ds-kb .k { background: #3A3A3C; color: #fff; box-shadow: 0 3px 0 #111; }
  .ds.dark .ds-kb .k.w { background: #2C2C2E; }
  .ds-bub.in { align-self: flex-start; background: #fff; border-top-left-radius: 10px; }
  .ds-bub.out { align-self: flex-end; background: #D9FDD3; border-top-right-radius: 10px; }
  .ds-input { flex: none; display: flex; align-items: flex-end; gap: 30px; padding: 26px 40px 34px; background: #F6F6F7; border-top: 2px solid #E4E5E8; }
  .ds-field { flex: 1; min-height: 104px; box-sizing: border-box; background: #fff; border: 2px solid #E1E2E6; border-radius: 52px; padding: 22px 40px;
              font: 400 52px/1.3 ${F}; }
  .ds-field .ph { color: #A3A6AB; }
  .ds-caret { display: inline-block; width: 4px; height: 58px; margin-left: 3px; vertical-align: -10px; background: #1FA855; }
  .ds-send { font: 600 64px ${F}; color: #1FA855; padding-bottom: 18px; }
  .ds-kb { flex: none; height: 860px; background: #D3D5DB; padding: 30px 10px 0; display: flex; flex-direction: column; gap: 34px; }
  .ds-kb .row { display: flex; justify-content: center; gap: 18px; }
  .ds-kb .k { width: 98px; height: 140px; border-radius: 16px; background: #fff; box-shadow: 0 3px 0 #9A9CA3;
              display: flex; align-items: center; justify-content: center; font: 400 64px ${F}; }
  .ds-kb .k.w { width: 160px; background: #ADB1BA; font-size: 40px; }
  .ds-kb .k.sp { width: 560px; font-size: 44px; }
  .ds-lock .notes { position: absolute; left: 44px; right: 44px; top: 700px; display: flex; flex-direction: column; gap: 22px; }
  .ds-lock .notes .ds-note { position: relative; left: 0; right: 0; top: 0; }
  .ds-chats { position: absolute; inset: 0; background: #fff; font-family: ${F}; color: #141414; overflow: hidden; }
  .ds-chats .bar { position: absolute; left: 0; right: 0; top: 0; height: 250px; background: #fff; z-index: 2; padding: 40px 48px 0; border-bottom: 2px solid #E4E5E8; }
  .ds-chats .bar h2 { font: 600 84px ${F}; letter-spacing: -1px; }
  .ds-chats .list { position: absolute; left: 0; right: 0; top: 250px; }
  .ds-chats .row { display: flex; gap: 34px; align-items: center; padding: 34px 48px; border-bottom: 2px solid #EEF0F2; }
  .ds-chats .ds-av { flex: none; width: 128px; height: 128px; border-radius: 50%; background: #DCE5E1; display: flex; align-items: center; justify-content: center; font: 600 48px ${F}; color: #4F6B60; }
  .ds-chats .txt { flex: 1; min-width: 0; }
  .ds-chats .top { display: flex; justify-content: space-between; font: 600 50px ${F}; }
  .ds-chats .top span { font: 400 36px ${F}; color: #6B6E73; }
  .ds-chats .last { margin-top: 8px; font: 400 42px ${F}; color: #5F6368; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ds-splash { position: absolute; inset: 0; background: #000; }
  .ds-splash img { position: absolute; left: 289px; top: 978px; width: 600px; height: 600px; }
  .ds-lock { position: absolute; inset: 0; background: linear-gradient(180deg, #CFDCE6 0%, #E9E3D8 70%, #E4D6C4 100%); font-family: ${F}; color: #1D2430; text-align: center; }
  .ds-lock .date { position: absolute; left: 0; right: 0; top: 170px; font: 600 58px ${F}; opacity: .8; }
  .ds-lock .time { position: absolute; left: 0; right: 0; top: 240px; font: 600 300px/1 ${F}; letter-spacing: -6px; }
  .ds-note { position: absolute; left: 44px; right: 44px; top: 720px; padding: 40px 48px 46px; border-radius: 56px; background: rgba(255,255,255,.92);
             text-align: left; box-shadow: 0 10px 40px rgba(0,0,0,.12); opacity: 0; }
  .ds-note .meta { display: flex; justify-content: space-between; font: 600 40px ${F}; color: #6B6E73; margin-bottom: 14px; }
  .ds-note .title { font: 600 52px ${F}; margin-bottom: 10px; }
  .ds-note .body { font: 400 50px/1.34 ${F}; color: #2A2C30; }`;

  function el(tag, cls, parent, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; parent && parent.appendChild(e); return e; }

  const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  function build(root, sc) {
    root.innerHTML = "";
    const n = {};
    if (sc.kind === "splash") {
      const sp = el("div", "ds-splash", root);
      n.icon = el("img", "", sp); n.icon.src = "../../../mobile/assets/repeat-ai-icon.png";
      return n;
    }
    if (sc.kind === "chats") {
      const C = el("div", "ds-chats", root);
      el("h2", "", el("div", "bar", C), "Chats");
      n.list = el("div", "list", C);
      for (const c of sc.chats) {
        const r = el("div", "row", n.list);
        el("div", "ds-av", r, c.name.split(" ").map(x => x[0]).join("").slice(0, 2));
        const tx = el("div", "txt", r), top = el("div", "top", tx);
        el("b", "", top, c.name); el("span", "", top, c.time);
        el("div", "last", tx, c.last);
      }
      return n;
    }
    if (sc.kind === "lock" && sc.notes) {
      const L = el("div", "ds-lock", root);
      el("div", "date", L, sc.date); el("div", "time", L, sc.time);
      const box = el("div", "notes", L);
      n.notes = sc.notes.map(nt => {
        const d = el("div", "ds-note", box);
        const m = el("div", "meta", d); el("span", "", m, nt.app); el("span", "", m, nt.when || "now");
        el("div", "title", d, nt.title); el("div", "body", d, nt.body);
        return d;
      });
      return n;
    }
    if (sc.kind === "lock") {
      const L = el("div", "ds-lock", root);
      el("div", "date", L, sc.date); el("div", "time", L, sc.time);
      n.note = el("div", "ds-note", L);
      const m = el("div", "meta", n.note); el("span", "", m, sc.note.app); el("span", "", m, "now");
      el("div", "title", n.note, sc.note.title); el("div", "body", n.note, sc.note.body);
      return n;
    }
    const S = el("div", "ds" + (sc.dark ? " dark" : "") + (sc.bottom ? " bottom" : ""), root);
    const head = el("div", "ds-head", S);
    el("div", "back", head, "‹");
    const who = el("div", "", head); el("div", "name", who, sc.name); el("div", "sub", who, sc.sub || "");
    const wall = el("div", "ds-wall", S);
    n.bubs = (sc.items || []).map(it => {
      const b = el("div", "ds-bub " + it.side, wall);
      if (it.img) el("img", "", b).src = it.img;
      b.appendChild(document.createTextNode(it.text));
      return b;
    });
    const bar = el("div", "ds-input", S);
    const field = el("div", "ds-field", bar);
    n.typed = el("span", "", field); n.caret = el("span", "ds-caret", field); n.ph = el("span", "ph", field, "Message");
    el("div", "ds-send", bar, "➤");
    if (sc.keyboard) {
      const kb = el("div", "ds-kb", S);
      KEYS.forEach((r, i) => {
        const row = el("div", "row", kb);
        if (i === 2) el("div", "k w", row, "⇧");
        for (const c of r) el("div", "k", row, c);
        if (i === 2) el("div", "k w", row, "⌫");
      });
      const row = el("div", "row", kb);
      el("div", "k w", row, "123"); el("div", "k sp", row, "space"); el("div", "k w", row, "return");
    }
    return n;
  }

  function paint(root, sc, t) {
    if (!document.getElementById("ds-css")) { const s = el("style"); s.id = "ds-css"; s.textContent = CSS; document.head.appendChild(s); }
    if (root.dataset.id !== sc.id) { root._n = build(root, sc); root.dataset.id = sc.id; }
    const n = root._n;
    if (sc.kind === "splash") {
      const u = out(clamp((t - sc.at) / 0.35));
      set(n.icon, { opacity: u, transform: `scale(${0.82 + 0.18 * u})` });
      return;
    }
    if (sc.kind === "chats") {
      const [t0, t1, px] = sc.scroll || [0, 1, 0];
      const u = clamp((t - t0) / (t1 - t0));
      set(n.list, { transform: `translateY(${-px * (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2)}px)` });
      return;
    }
    if (sc.kind === "lock" && sc.notes) {
      // newest on top: notes arrive in order, each pushing the earlier ones down
      sc.notes.forEach((nt, j) => {
        const u = out(clamp((t - nt.at) / 0.45));
        set(n.notes[j], { display: t >= nt.at ? "block" : "none", order: String(-j), opacity: u, transform: `translateY(${(1 - u) * -60}px) scale(${0.96 + 0.04 * u})` });
      });
      return;
    }
    if (sc.kind === "lock") {
      const u = out(clamp((t - sc.note.at) / 0.6));
      set(n.note, { opacity: u, transform: `translateY(${(1 - u) * -80}px) scale(${0.96 + 0.04 * u})` });
      return;
    }
    (sc.items || []).forEach((it, j) => {
      const p = out(clamp((t - it.at) / 0.45));
      set(n.bubs[j], { opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.94 + 0.06 * p})` });
    });
    const ty = sc.typing;
    // typing.clear: the field empties (the message was sent)
    const k = ty && !(ty.clear !== undefined && t >= ty.clear) ? Math.round(ty.text.length * clamp((t - ty.ta) / Math.max(0.01, ty.tb - ty.ta))) : 0;
    n.typed.textContent = ty ? ty.text.slice(0, k) : "";
    n.ph.style.display = k ? "none" : "inline";
    n.caret.style.display = ty ? "inline-block" : "none";
    n.caret.style.opacity = (ty && k < ty.text.length && t >= ty.ta) || (t * 2) % 1 < 0.6 ? 1 : 0;
  }

  window.DrawnScreens = { paint };
})();
