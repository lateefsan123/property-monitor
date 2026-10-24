// Shared "real app" phone for the Repeat AI shorts.
//
// Plays recorded film-mode clips (extracted to JPEG frames by lib/clips.mjs) or stills inside a
// phone frame, with a camera (which part of the screen is in frame, and how big), highlight
// boxes, tap ripples from the clip's event JSON, and a short push between beats.
//
// Beat: { a, b,                       // film seconds the beat is on screen
//         clip: "name" | still: "src", // recorded clip, or a still screenshot
//         c0: 0, rate: 1,              // clip seconds at `a`, playback rate
//         cam: { sx, sy, z, cy } | camKeys: [[t, cam], …],   // screenshot px → canvas
//         hl: [{ a, b, box: [x, y, w, h] }],                 // screenshot px
//         screen: { kind, … } }        // or a drawn screen (lib/drawn-screens.js) instead of a clip
// Clips: { name: { dir, frames, fps, taps: [{ t, x, y }] } }
(function () {
  const W = 1179, H = 2556, SCREEN_W = 972, K = SCREEN_W / W, BAR = 80;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const out = u => 1 - Math.pow(1 - u, 3);
  const set = (el, css) => Object.assign(el.style, css);

  const CSS = `
  .ap-phone { position: absolute; left: 0; top: 0; transform-origin: 0 0; width: 1000px; border-radius: 118px; background: #1C1D20; padding: 14px;
              box-shadow: 0 0 0 3px #2E3034, 0 40px 120px rgba(0,0,0,.55); }
  .ap-screen { position: relative; width: ${SCREEN_W}px; height: ${Math.round(H * K) + BAR}px; border-radius: 104px; overflow: hidden; background: #0E0E0F; }
  .ap-bar { position: absolute; left: 0; top: 0; width: ${SCREEN_W}px; height: ${BAR}px; background: #0E0E0F; z-index: 5; font: 600 34px "Inter", sans-serif; color: #fff; }
  .ap-bar .time { position: absolute; left: 92px; top: 26px; }
  .ap-bar .island { position: absolute; left: 376px; top: 18px; width: 220px; height: 54px; border-radius: 30px; background: #000; }
  .ap-bar .icons { position: absolute; right: 80px; top: 30px; display: flex; gap: 12px; align-items: flex-end; }
  .ap-bar .bars i { display: inline-block; width: 7px; margin-right: 3px; background: #fff; border-radius: 2px; }
  .ap-bar .batt { width: 52px; height: 24px; border: 3px solid rgba(255,255,255,.8); border-radius: 7px; padding: 2px; }
  .ap-bar .batt b { display: block; height: 100%; width: 78%; background: #fff; border-radius: 3px; }
  .ap-layer { position: absolute; left: 0; top: ${BAR}px; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
  .ap-layer img { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
  .ap-hl { display: none; position: absolute; border: 6px solid #3FD3C0; border-radius: 26px; opacity: 0;
           box-shadow: 0 0 0 6px rgba(63,211,192,.18), 0 0 40px rgba(63,211,192,.35); }
  .ap-tap { position: absolute; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; opacity: 0;
            background: radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(255,255,255,.18) 55%, rgba(255,255,255,0) 72%); }
  .ap-drawn { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; display: none; overflow: hidden; }
  .ap-phone.light .ap-screen, .ap-phone.light .ap-bar { background: #fff; color: #141414; }
  .ap-phone.light .ap-bar .bars i, .ap-phone.light .ap-bar .batt b { background: #141414; }
  .ap-phone.light .ap-bar .batt { border-color: rgba(20,20,20,.8); }
  .ap-phone.light .ap-tap { background: radial-gradient(circle, rgba(20,20,20,.3) 0%, rgba(20,20,20,.1) 55%, rgba(20,20,20,0) 72%); }`;

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; parent && parent.appendChild(e); return e; }

  function create(parent, opts = {}) {
    if (!document.getElementById("ap-css")) { const s = el("style"); s.id = "ap-css"; s.textContent = CSS; document.head.appendChild(s); }
    const phone = el("div", "ap-phone" + (opts.light ? " light" : ""), parent);
    const screen = el("div", "ap-screen", phone);
    const bar = el("div", "ap-bar", screen);
    bar.innerHTML = `<span class="time">9:41</span><span class="island"></span><span class="icons"><span class="bars"><i style="height:12px"></i><i style="height:17px"></i><i style="height:22px"></i><i style="height:27px"></i></span><span class="batt"><b></b></span></span>`;
    // two layers so beats can push from one to the next
    const layers = [0, 1].map(() => {
      const L = el("div", "ap-layer", screen);
      const img = el("img", "", L);
      const hls = [0, 1, 2].map(() => el("div", "ap-hl", L));
      const tap = el("div", "ap-tap", L);
      const drawn = el("div", "ap-drawn", L);
      return { L, img, hls, tap, drawn, src: "" };
    });
    return { phone, layers };
  }

  function camAt(beat, t) {
    if (beat.cam) return beat.cam;
    const k = beat.camKeys;
    if (t <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      if (t <= k[i + 1][0]) {
        const u = ease((t - k[i][0]) / (k[i + 1][0] - k[i][0])), a = k[i][1], b = k[i + 1][1];
        return { sx: lerp(a.sx, b.sx, u), sy: lerp(a.sy, b.sy, u), z: lerp(a.z, b.z, u), cx: lerp(a.cx ?? 540, b.cx ?? 540, u), cy: lerp(a.cy ?? 1180, b.cy ?? 1180, u), rot: lerp(a.rot || 0, b.rot || 0, u) };
      }
    }
    return k[k.length - 1][1];
  }

  function frameSrc(beat, clips, t) {
    if (beat.still) return { src: beat.still, ct: 0 };
    const c = clips[beat.clip];
    const ct = clamp((beat.c0 || 0) + (t - beat.a) * (beat.rate ?? 1), 0, (c.frames - 1) / c.fps);
    const n = Math.round(ct * c.fps) + 1;
    return { src: `${c.dir}/${String(n).padStart(5, "0")}.jpg`, ct };
  }

  // Fill one layer for a beat at film time t
  function paint(layer, beat, clips, t) {
    if (beat.screen) {
      set(layer.img, { display: "none" }); set(layer.drawn, { display: "block" });
      layer.hls.forEach(h => h.style.opacity = 0); layer.tap.style.opacity = 0;
      window.DrawnScreens.paint(layer.drawn, beat.screen, t);
      return { decode: () => Promise.resolve() };
    }
    set(layer.img, { display: "block" }); set(layer.drawn, { display: "none" });
    const { src, ct } = frameSrc(beat, clips, t);
    if (layer.src !== src) { layer.img.src = src; layer.src = src; }
    (beat.hl || []).concat([{}, {}, {}]).slice(0, 3).forEach((h, i) => {
      const box = layer.hls[i];
      if (!h.box) { box.style.opacity = 0; return; }
      const u = out(clamp((t - h.a) / 0.28)) * (1 - clamp((t - (h.b - 0.2)) / 0.2));
      set(box, { left: h.box[0] + "px", top: h.box[1] + "px", width: h.box[2] + "px", height: h.box[3] + "px", opacity: u, transform: `scale(${lerp(1.04, 1, u)})` });
    });
    // tap ripple: shows for 0.45 s from each recorded tap
    const taps = beat.clip ? (clips[beat.clip].taps || []) : [];
    const tp = taps.find(x => ct >= x.t - 0.05 && ct < x.t + 0.45);
    if (tp) {
      const u = clamp((ct - tp.t + 0.05) / 0.5);
      set(layer.tap, { left: tp.x + "px", top: tp.y + "px", opacity: 1 - u, transform: `scale(${lerp(0.6, 1.5, out(u))})` });
    } else layer.tap.style.opacity = 0;
    return layer.img;
  }

  // Render the phone at film time t. Returns a promise that resolves when the frame is decoded.
  function render(ph, beats, clips, t, place = {}) {
    let i = beats.findIndex(b => t >= b.a && t < b.b);
    if (i < 0) i = t < beats[0].a ? 0 : beats.length - 1;
    const beat = beats[i];
    // place.cam overrides the beat's camera (e.g. a match-cut out of a drawn phone)
    const cam = place.cam || camAt(beat, t);
    const lx = 14 + cam.sx * K, ly = 14 + BAR + cam.sy * K;
    const z = cam.z * (place.zMul || 1);
    const cx = cam.cx ?? 540, cy = (cam.cy ?? 1180) + (place.dy || 0);
    set(ph.phone, { transform: `translate(${cx}px, ${cy}px) rotate(${cam.rot || 0}deg) scale(${z}) translate(${-lx}px, ${-ly}px)` });

    const cur = ph.layers[i % 2], prev = ph.layers[(i + 1) % 2];
    const decodes = [paint(cur, beat, clips, t)];
    const push = i > 0 && !beat.cut ? ease(clamp((t - beat.a) / (place.push || 0.28))) : 1;
    set(cur.L, { opacity: push, transform: `translateX(${(1 - push) * 300}px) scale(${K})`, zIndex: 2 });
    if (push < 1) {
      decodes.push(paint(prev, beats[i - 1], clips, beats[i - 1].b - 0.001));
      set(prev.L, { opacity: clamp(1 - push * 1.8), transform: `translateX(${-push * 200}px) scale(${K})`, zIndex: 1 });
    } else set(prev.L, { opacity: 0 });
    return Promise.all(decodes.map(img => img.decode().catch(() => {})));
  }

  window.AppPhone = { create, render, camAt, K, W, H };
})();
