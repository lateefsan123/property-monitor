// Phone-first app sections for the shorts (the look the user chose on Short 001):
// a big light-theme phone on a warm set, the broker standing small in the bottom-left corner,
// no tags, unhurried pushes. Call PhoneFirst.setup(appLayer) once, then PhoneFirst.frame(t, …)
// each frame of the app shot; pass the returned `place` to AppPhone.render.
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const out = u => 1 - Math.pow(1 - u, 3);
  const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  const set = (el, css) => Object.assign(el.style, css);
  // the standing broker with his phone (Short 006's pose-broker-tablet-phone.png), alpha bounds
  const POSE = { src: "../006-next-month/pose-broker-tablet-phone.png", x0: 507, y0: 24, x1: 884, y1: 1112 };
  let corner = null, layer = null;

  function setup(appLayer, opts = {}) {
    layer = appLayer;
    corner = document.createElement("img");
    corner.src = opts.pose || POSE.src;
    set(corner, { position: "absolute", left: 0, top: 0, transformOrigin: "0 0", zIndex: 40, display: "none" });
    appLayer.appendChild(corner);
    const tb = appLayer.querySelector("#topband");
    if (tb) tb.dataset.pfBg = "linear-gradient(to bottom, #EDE5D7 0%, rgba(237,229,215,.94) 62%, rgba(237,229,215,0) 100%)";
  }

  // on: inside the app shot (not the end card); enter: the shot's start time
  function frame(t, { on, enter }) {
    const tb = layer.querySelector("#topband");
    if (!on) {
      corner.style.display = "none";
      if (tb) tb.style.background = "";
      set(layer, { background: "#0B0C0D" });
      return { push: 0.28 };
    }
    set(layer, { background: "linear-gradient(to bottom, #EDE5D7 0%, #EDE5D7 74%, #D9C7A6 74%, #D3BF9B 100%)" });
    if (tb) tb.style.background = tb.dataset.pfBg;
    const u = out(clamp((t - enter) / 0.8));
    const breathe = 1 + 0.004 * Math.sin(t * 2.2);
    const s = 760 / (POSE.y1 - POSE.y0), x = 112 - (POSE.x0 + POSE.x1) / 2 * s, y = 2110 - POSE.y1 * s + (1 - u) * 500;
    set(corner, { display: "block", transform: `translate(${x}px, ${y + POSE.y1 * s * (1 - breathe)}px) scale(${s}, ${s * breathe})` });
    return { dy: (1 - ease(clamp((t - enter) / 0.8))) * 1700, dx: 90, zMul: 0.88, push: 0.6 };
  }

  window.PhoneFirst = { setup, frame };
})();
