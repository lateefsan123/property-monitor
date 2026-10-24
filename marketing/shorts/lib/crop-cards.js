// Demo cards for the Repeat AI shorts: one feature at a time, big and readable, beside the character.
//
// A card is a white ink-bordered panel that rises in, holds and fades out:
//   { a, b, top, left = 60, w = 960, chip,   // film seconds on screen, placement, small label tab
//     kind: "clip", clip, c0, rate,          // a live crop of a recorded film-mode clip (lib/clips.mjs)
//           region: [x, y, w, h],            //   screenshot px (1179 wide) shown in the card
//     kind: "note", title, meta, body,       // a phone notification (the seller's side)
//     kind: "chat", items: [{ at, side: "in"|"out", text }] }   // bubbles that appear at `at`
// Clips: { name: { dir, frames, fps, taps: [{ t, x, y }] } }
(function () {
  const SRC_W = 1180;   // extracted frames are padded to 1180 px
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const out = u => 1 - Math.pow(1 - u, 3);
  const set = (el, css) => Object.assign(el.style, css);

  const CSS = `
  .cc-card { position: absolute; background: #fff; border: 7px solid #141414; border-radius: 36px; opacity: 0;
             box-shadow: 0 14px 0 rgba(20,20,20,.18); font-family: "Inter", sans-serif; color: #141414; }
  .cc-chip { position: absolute; left: 34px; top: -30px; padding: 8px 22px; border-radius: 26px; background: #141414;
             color: #fff; font: 600 26px "Inter", sans-serif; letter-spacing: .5px; white-space: nowrap; z-index: 2; }
  .cc-view { position: relative; overflow: hidden; border-radius: 29px; }
  .cc-view img { position: absolute; left: 0; top: 0; width: ${SRC_W}px; transform-origin: 0 0; }
  .cc-tap { position: absolute; width: 150px; height: 150px; margin: -75px 0 0 -75px; border-radius: 50%; opacity: 0;
            background: radial-gradient(circle, rgba(20,20,20,.28) 0%, rgba(20,20,20,.1) 55%, rgba(20,20,20,0) 72%); }
  .cc-note { padding: 40px 44px 44px; }
  .cc-note .meta { font: 600 28px "Inter", sans-serif; color: #6B6E73; margin-bottom: 14px; }
  .cc-note .title { font: 600 40px "Inter", sans-serif; margin-bottom: 10px; }
  .cc-note .body { font: 400 38px/1.35 "Inter", sans-serif; color: #2A2C30; }
  .cc-chat { padding: 44px 36px 36px; display: flex; flex-direction: column; gap: 20px; }
  .cc-bub { max-width: 78%; padding: 22px 28px; border-radius: 30px; font: 400 38px/1.3 "Inter", sans-serif; opacity: 0; }
  .cc-bub.in { align-self: flex-start; background: #F1F2F4; border-bottom-left-radius: 8px; }
  .cc-bub.out { align-self: flex-end; background: #D9FDD3; border-bottom-right-radius: 8px; }`;

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; parent && parent.appendChild(e); return e; }

  function build(root, card) {
    const box = el("div", "cc-card", root);
    if (card.chip) el("div", "cc-chip", box).textContent = card.chip;
    const w = card.w || 960, inner = w - 14;
    set(box, { left: (card.left ?? 60) + "px", top: card.top + "px", width: w + "px" });
    const node = { box };
    if (card.kind === "clip") {
      const [, , rw, rh] = card.region, k = inner / rw;
      const view = el("div", "cc-view", box);
      set(view, { width: inner + "px", height: Math.round(rh * k) + "px" });
      node.img = el("img", "", view); node.tap = el("div", "cc-tap", view); node.k = k; node.src = "";
    } else if (card.kind === "note") {
      const n = el("div", "cc-note", box);
      el("div", "meta", n).textContent = card.meta || "";
      el("div", "title", n).textContent = card.title || "";
      el("div", "body", n).textContent = card.body || "";
    } else if (card.kind === "chat") {
      const c = el("div", "cc-chat", box);
      node.bubs = card.items.map(it => { const b = el("div", "cc-bub " + it.side, c); b.textContent = it.text; return b; });
    }
    return node;
  }

  let nodes = null;
  // Render all cards at film time t. Returns a promise that resolves when clip frames are decoded.
  function render(root, cards, clips, t) {
    if (!document.getElementById("cc-css")) { const s = el("style"); s.id = "cc-css"; s.textContent = CSS; document.head.appendChild(s); }
    if (!nodes) nodes = cards.map(c => build(root, c));
    const decodes = [];
    cards.forEach((card, i) => {
      const n = nodes[i];
      const on = t >= card.a && t < card.b;
      if (!on) { set(n.box, { display: "none" }); return; }
      const u = out(clamp((t - card.a) / 0.32)), v = clamp((card.b - t) / 0.22);
      set(n.box, { display: "block", opacity: Math.min(u, v), transform: `translateY(${(1 - u) * 60}px) scale(${lerp(0.97, 1, u)})` });
      if (card.kind === "clip") {
        const c = clips[card.clip];
        const ct = clamp((card.c0 || 0) + (t - card.a) * (card.rate ?? 1), 0, (c.frames - 1) / c.fps);
        const src = `${c.dir}/${String(Math.round(ct * c.fps) + 1).padStart(5, "0")}.jpg`;
        if (n.src !== src) { n.img.src = src; n.src = src; }
        const [rx, ry] = card.region;
        set(n.img, { transform: `scale(${n.k}) translate(${-rx}px, ${-ry}px)` });
        const tp = (c.taps || []).find(x => ct >= x.t - 0.05 && ct < x.t + 0.45);
        if (tp) {
          const p = clamp((ct - tp.t + 0.05) / 0.5);
          set(n.tap, { left: (tp.x - rx) * n.k + "px", top: (tp.y - ry) * n.k + "px", opacity: 1 - p, transform: `scale(${lerp(0.6, 1.4, out(p))})` });
        } else n.tap.style.opacity = 0;
        decodes.push(n.img.decode().catch(() => {}));
      } else if (card.kind === "chat") {
        card.items.forEach((it, j) => {
          const p = out(clamp((t - it.at) / 0.28));
          set(n.bubs[j], { opacity: p, transform: `translateY(${(1 - p) * 24}px) scale(${lerp(0.94, 1, p)})` });
        });
      }
    });
    return Promise.all(decodes);
  }

  window.CropCards = { render };
})();
