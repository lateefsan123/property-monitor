// Meta pixel for ad measurement. It loads only when VITE_META_PIXEL_ID is set,
// so local and preview builds without the ID send nothing to Meta.
const pixelId = import.meta.env.VITE_META_PIXEL_ID;

function loadPixel() {
  if (!pixelId || typeof window === "undefined" || window.fbq) return;
  const fbq = function (...args) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

loadPixel();

export function trackPixel(event, params) {
  if (pixelId && window.fbq) window.fbq("track", event, params);
}
