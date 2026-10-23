import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './app-film-v6.css';
import wordmark from '../../mobile/assets/repeat-ai-logo.png';
import { CARD, HEAVY, UI, clamp, lerp, spring } from './motion';
import {
  AUTOMATION_COUNTER, CAMERA, CAPTIONS, CLOSE, CURSOR, CUT, DURATION, HOOK,
  MARKS, P7, P8, P9, PHONE_IN, PHONE_OUT, SCREENS, TAPS,
} from './app-pacing-v6.mjs';

const params = new URLSearchParams(location.search);
const LANDSCAPE = params.get('format') === '16x9';
const W = LANDSCAPE ? 1920 : 1080;
const H = LANDSCAPE ? 1080 : 1920;

const DTAKE = (n) => `/video/launch-film/out/desktop/takes-v6/${n}.png`;
const MTAKE = (n) => `/video/launch-film/out/app/takes-v6/${n}.png`;

// ---- Desktop geometry ----
const DESKTOP_W = 1440, DESKTOP_H = 900;
const CHROME_H = 36;

// Landscape: caption column left (~440px), desktop in remaining right area
// Desktop at scale 0.86 → 1238×774, positioned at x600 y140. Fits in 1080.
const L_SCALE = 0.86;
const L_DESK_W = Math.round(DESKTOP_W * L_SCALE); // 1238
const L_DESK_H = Math.round(DESKTOP_H * L_SCALE); // 774
const L_LEFT = 600;
const L_TOP = 140;
const L_CAP_X = 50;   // caption column
const L_CAP_Y = 300;
const L_CAP_SIZE = 46;

// Portrait: captions at ~64px, desktop below at y420 with camera zoom
const P_CAP_SIZE = 64;
const P_CAP_X = 60;
const P_CAP_Y = 100;
const P_PAD = 30;
const P_TOP = 420; // desktop frame top, below captions with >=24px gap
const P_AVAIL_W = W - P_PAD * 2;
const P_AVAIL_H = H - P_TOP - 80; // bottom safe area
const P_CAM_DUR = 0.4; // camera transition duration

// ---- Phone ----
const S = LANDSCAPE ? 1.02 : 1.4;
const SCREEN_W = 393 * S;
const STATUS_H = 54 * S;
const SCREEN_H_PX = 852 * S;
const BEZEL = LANDSCAPE ? 12 : 16;
const PHONE_W = SCREEN_W + BEZEL * 2;
const PHONE_H = STATUS_H + SCREEN_H_PX + BEZEL * 2;
const PHONE_LEFT = LANDSCAPE ? W - PHONE_W - 200 : (W - PHONE_W) / 2;
const PHONE_TOP = LANDSCAPE ? (H - PHONE_H) / 2 : 470;

const sp = (t, start, [k, d] = CARD) => spring(t - start, k, d);
const PUSH = CARD;
const FADE_DUR = 0.35;
const ease = (p) => p * p * (3 - 2 * p);
const frameTime = (t) => Math.floor(t * 60 + 1e-6) / 60;

// ---- Portrait camera zoom ----
function cameraAt(t) {
  if (!CAMERA?.length) return { x: 0, y: 0, w: DESKTOP_W, h: DESKTOP_H };
  let idx = 0;
  CAMERA.forEach(([time], i) => { if (t >= time) idx = i; });
  const [curTime, region] = CAMERA[idx];
  if (idx === 0) return region;
  const [, prevRegion] = CAMERA[idx - 1];
  const p = ease(clamp((t - curTime) / P_CAM_DUR));
  return {
    x: lerp(prevRegion.x, region.x, p),
    y: lerp(prevRegion.y, region.y, p),
    w: lerp(prevRegion.w, region.w, p),
    h: lerp(prevRegion.h, region.h, p),
  };
}

// Transform desktop coords to frame coords
function desktopToFrame(dx, dy, t) {
  if (LANDSCAPE) {
    return { x: L_LEFT + dx * L_SCALE, y: L_TOP + CHROME_H + dy * L_SCALE };
  }
  const cam = cameraAt(t);
  const scX = P_AVAIL_W / cam.w, scY = P_AVAIL_H / cam.h;
  const sc = Math.min(scX, scY);
  const frameW = cam.w * sc;
  const frameLeft = P_PAD + (P_AVAIL_W - frameW) / 2;
  return { x: frameLeft + (dx - cam.x) * sc, y: P_TOP + CHROME_H + (dy - cam.y) * sc };
}

// ---- Text ----
function Words({ t, lines, x, y, size, exit, weight = 700 }) {
  return <div className="type" style={{ left: x, top: y, fontSize: size, fontWeight: weight }}>
    {lines.map((line, li) => {
      const words = line.words || line.text.split(' ').map((w, wi) => [w, line.at + wi * 0.07]);
      return <div key={li} className="line" style={{ color: line.color }}>
        {words.map(([word, at], wi) => {
          const p = sp(t, at, HEAVY);
          const out = exit == null ? 0 : sp(t, exit + li * 0.06 + wi * 0.03, UI);
          const blur = (1 - clamp(p)) * 12 + out * 10;
          return <span key={wi} style={{
            display: 'inline-block', marginRight: '0.24em', opacity: clamp(p * 1.6) * (1 - out),
            transform: `translateY(${(1 - p) * size * 0.5 - out * size * 0.3}px) scale(${lerp(0.94, 1, clamp(p))})`,
            filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
          }}>{word}</span>;
        })}
      </div>;
    })}
  </div>;
}

// ---- Desktop screen ----
function DesktopScreen({ t }) {
  const dsk = SCREENS.filter(([, , , k]) => k === 'desktop');
  let idx = -1;
  dsk.forEach(([time], i) => { if (t >= time) idx = i; });
  if (idx < 0) return null;
  const [start, take, transition] = dsk[idx];
  const prev = idx > 0 ? dsk[idx - 1][1] : null;
  const p = transition === 'push' ? sp(t, start, PUSH) : transition === 'fade' ? ease(clamp((t - start) / FADE_DUR)) : 1;
  const marks = MARKS.filter(([f, to, m]) => m === take && t >= f && t < to + 0.25);
  const enter = sp(t, dsk[0][0], CARD);

  if (LANDSCAPE) {
    // Landscape: desktop in right portion
    return <div className="desktop-frame" style={{
      left: L_LEFT, top: L_TOP, width: L_DESK_W, height: L_DESK_H + CHROME_H,
      opacity: clamp(enter * 1.5),
      transform: `translateY(${(1 - enter) * 40}px) scale(${lerp(0.97, 1, clamp(enter))})`,
    }}>
      <div className="desktop-chrome">
        <span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-dot" />
        <span className="chrome-url">app.repeatai.org</span>
      </div>
      <div className="desktop-viewport" style={{ width: L_DESK_W, height: L_DESK_H }}>
        {prev && p < 1 && <img src={DTAKE(prev)} alt="" className="desktop-img" style={{ opacity: 1 - p * 0.6 }} />}
        <img src={DTAKE(take)} alt="" className="desktop-img" style={{ opacity: transition === 'fade' ? p : 1 }} />
        {marks.map(([f, to]) => <span key={f} className="mark desktop-mark" style={{
          opacity: ease(clamp((t - f) / 0.25)) * (1 - ease(clamp((t - to) / 0.25))),
        }} />)}
      </div>
    </div>;
  }

  // Portrait: camera-zoomed region
  const cam = cameraAt(t);
  const scX = P_AVAIL_W / cam.w, scY = P_AVAIL_H / cam.h;
  const sc = Math.min(scX, scY);
  const frameW = cam.w * sc, frameH = cam.h * sc;
  const frameLeft = P_PAD + (P_AVAIL_W - frameW) / 2;

  return <div className="desktop-frame" style={{
    left: frameLeft, top: P_TOP, width: frameW, height: frameH + CHROME_H,
    opacity: clamp(enter * 1.5), transform: `translateY(${(1 - enter) * 40}px)`,
  }}>
    <div className="desktop-chrome">
      <span className="chrome-dot" /><span className="chrome-dot" /><span className="chrome-dot" />
      <span className="chrome-url">app.repeatai.org</span>
    </div>
    <div className="desktop-viewport" style={{ width: frameW, height: frameH, overflow: 'hidden' }}>
      {prev && p < 1 && <img src={DTAKE(prev)} alt="" className="desktop-img" style={{
        width: DESKTOP_W * sc, height: DESKTOP_H * sc, left: -cam.x * sc, top: -cam.y * sc, opacity: 1 - p * 0.6,
      }} />}
      <img src={DTAKE(take)} alt="" className="desktop-img" style={{
        width: DESKTOP_W * sc, height: DESKTOP_H * sc, left: -cam.x * sc, top: -cam.y * sc,
        opacity: transition === 'fade' ? p : 1,
      }} />
      {marks.map(([f, to]) => <span key={f} className="mark desktop-mark" style={{
        opacity: ease(clamp((t - f) / 0.25)) * (1 - ease(clamp((t - to) / 0.25))),
      }} />)}
    </div>
  </div>;
}

// ---- Cursor ----
function DesktopCursor({ t }) {
  let prev = null, next = null;
  for (let i = 0; i < CURSOR.length; i++) {
    if (CURSOR[i][0] <= t) prev = CURSOR[i];
    if (CURSOR[i][0] > t && !next) next = CURSOR[i];
  }
  if (!prev) return null;
  let cx = prev[1], cy = prev[2];
  if (next && next[0] > prev[0]) {
    const p = ease(clamp((t - prev[0]) / (next[0] - prev[0])));
    cx = lerp(prev[1], next[1], p); cy = lerp(prev[2], next[2], p);
  }
  const { x: fx, y: fy } = desktopToFrame(cx, cy, t);

  // Hide if outside camera in portrait
  if (!LANDSCAPE) {
    const cam = cameraAt(t);
    if (cx < cam.x || cx > cam.x + cam.w || cy < cam.y || cy > cam.y + cam.h) return null;
  }

  // Click ripple: project the STORED click coordinates, not the moving cursor
  const recentClick = CURSOR.filter(([ct, , , a]) => a === 'click' && t >= ct && t < ct + 0.5).pop();
  let ripple = null;
  if (recentClick) {
    const { x: rx, y: ry } = desktopToFrame(recentClick[1], recentClick[2], t);
    const age = t - recentClick[0];
    ripple = { x: rx, y: ry, opacity: 0.6 * (1 - clamp(age / 0.5)), scale: 0.4 + 0.6 * clamp(age / 0.3) };
  }

  return <>
    <svg className="cursor-arrow" style={{ left: fx, top: fy }} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.65c.45 0 .67-.54.35-.85L5.85 2.35c-.31-.31-.85-.1-.85.36l0 .5z" fill="#fff" stroke="#111" strokeWidth="1.5"/>
    </svg>
    {ripple && <span className="cursor-ripple" style={{
      left: ripple.x, top: ripple.y, transform: `translate(-50%, -50%) scale(${ripple.scale})`, opacity: ripple.opacity,
    }} />}
  </>;
}

// ---- Phone ----
function PhoneStatusBar() {
  return <div className="status" style={{ height: STATUS_H, fontSize: 17 * S }}>
    <span className="status-time">9:41</span>
    <span className="island" style={{ width: 124 * S, height: 36 * S, top: 11 * S }} />
    <svg className="status-icons" width={78 * S} height={14 * S} viewBox="0 0 78 14" fill="#fff">
      <rect x="0" y="9" width="3.2" height="4" rx="1" /><rect x="5" y="6.5" width="3.2" height="6.5" rx="1" />
      <rect x="10" y="4" width="3.2" height="9" rx="1" /><rect x="15" y="1.5" width="3.2" height="11.5" rx="1" />
      <path d="M31 4.2a9.5 9.5 0 0 1 13 0l-1.5 1.6a7.3 7.3 0 0 0-10 0Zm2.7 2.9a5.6 5.6 0 0 1 7.6 0L39.8 8.7a3.4 3.4 0 0 0-4.6 0Zm2.4 2.5a2 2 0 0 1 2.8 0L37.5 11Z" />
      <rect x="51" y="1.5" width="23" height="11" rx="3.4" fill="none" stroke="#fff" strokeOpacity=".4" />
      <rect x="53" y="3.5" width="17" height="7" rx="1.8" /><rect x="75.5" y="5" width="1.6" height="4" rx=".8" fillOpacity=".4" />
    </svg>
  </div>;
}

function MobileScreen({ t }) {
  const mob = SCREENS.filter(([, , , k]) => k === 'mobile');
  let idx = -1;
  mob.forEach(([time], i) => { if (t >= time) idx = i; });
  if (idx < 0) return null;
  const [start, take, transition] = mob[idx];
  const prev = idx > 0 ? mob[idx - 1][1] : null;
  const p = transition === 'push' ? sp(t, start, PUSH) : transition === 'fade' ? ease(clamp((t - start) / FADE_DUR)) : 1;
  const tap = TAPS.find(([time]) => t >= time && t < time + 0.5);
  return <div className="screen" style={{ width: SCREEN_W, height: STATUS_H + SCREEN_H_PX, borderRadius: 56 * S * 0.9 }}>
    <PhoneStatusBar />
    <div className="viewport" style={{ top: STATUS_H, width: SCREEN_W, height: SCREEN_H_PX }}>
      {prev && p < 1 && <img src={MTAKE(prev)} alt="" style={{
        transform: transition === 'push' ? `translateX(${-p * 30 * S}px)` : undefined,
        opacity: transition === 'push' ? 1 - p * 0.6 : 1,
      }} />}
      <img src={MTAKE(take)} alt="" style={{
        transform: transition === 'push' ? `translateX(${(1 - p) * SCREEN_W}px)` : undefined,
        opacity: transition === 'push' ? 1 : p,
      }} />
      {tap && <span className="tap" style={{
        left: tap[1] * S, top: tap[2] * S, width: 90 * S, height: 90 * S,
        transform: `translate(-50%, -50%) scale(${0.3 + 0.9 * clamp((t - tap[0]) / 0.35)})`,
        opacity: 0.55 * (1 - clamp((t - tap[0] - 0.15) / 0.35)),
      }} />}
    </div>
  </div>;
}

function Phone({ t }) {
  const enter = sp(t, PHONE_IN, HEAVY);
  const exit = sp(t, PHONE_OUT, HEAVY);
  return <div className="phone" style={{
    left: PHONE_LEFT, top: PHONE_TOP, width: PHONE_W, height: PHONE_H, padding: BEZEL, borderRadius: 64 * S,
    transform: `translateY(${(1 - enter) * 900 + exit * 1100}px) rotate(${(1 - enter) * 8}deg)`,
  }}>
    <MobileScreen t={t} />
  </div>;
}

// ---- Captions ----
function CaptionLayer({ t }) {
  const x = LANDSCAPE ? L_CAP_X : P_CAP_X;
  const y = LANDSCAPE ? L_CAP_Y : P_CAP_Y;
  const size = LANDSCAPE ? L_CAP_SIZE : P_CAP_SIZE;
  return <>
    {CAPTIONS.filter(([from, to]) => t >= from - 0.05 && t < to + 0.8).map(([from, to, [first, second]]) => (
      <Words key={from} t={t} x={x} y={y} size={size} exit={to} lines={[
        { at: from, text: first },
        { at: from + 0.45, text: second, color: 'var(--soft)' },
      ]} />
    ))}
    {t >= AUTOMATION_COUNTER.at - 0.1 && t < AUTOMATION_COUNTER.out + 0.9 && <AutomationCounter t={t} x={x} y={y} size={size} />}
    {/* Early access qualifier on Ask Repeat section */}
    {t >= P8.at && t < P8.end + 0.5 && <div className="early-access" style={{
      left: x, top: y + size * 2.5,
      opacity: clamp(sp(t, P8.at + 0.6, UI) * 1.5) * (1 - clamp(sp(t, P8.end, UI))),
    }}>Early access</div>}
  </>;
}

function AutomationCounter({ t, x, y, size }) {
  const count = Math.round(AUTOMATION_COUNTER.value * sp(frameTime(t), AUTOMATION_COUNTER.count, [60, 16]));
  const { at, out } = AUTOMATION_COUNTER;
  return <Words t={t} x={x} y={y - (LANDSCAPE ? 40 : 20)} size={size} exit={out} lines={[
    { words: [[<span key="n" className="count" style={{ color: 'var(--accent)' }}>{count}</span>, at], ['messages', at + 0.12]] },
    { words: [['a', at + 0.4], ['day.', at + 0.48]], color: 'var(--soft)' },
  ]} />;
}

// ---- Hook ----
function HookScene({ t }) {
  const count = Math.round(2000 * sp(frameTime(t), HOOK.count, [60, 16]));
  const size = LANDSCAPE ? 230 : 250;
  const x = LANDSCAPE ? 140 : 80;
  return <>
    <Words t={t} x={x} y={LANDSCAPE ? 250 : 560} size={size} exit={HOOK.out} weight={800}
      lines={[{ words: [[clamp(count, 0, 2000).toLocaleString('en-US'), HOOK.count - 0.06]] },
              { at: HOOK.sellers, text: 'sellers.', color: 'var(--soft)' }]} />
    <Words t={t} x={x} y={LANDSCAPE ? 520 : 830} size={size * 0.38} exit={HOOK.out} weight={600}
      lines={[{ at: HOOK.question, text: 'Who needs to hear' },
              { at: HOOK.question + 0.12, text: 'from you today?', color: 'var(--soft)' }]} />
    <div className="demo-label" style={{ opacity: clamp(sp(t, 1.2, UI) * 1.5) * (1 - clamp(sp(t, HOOK.out, UI))) }}>Demo</div>
  </>;
}

// ---- Close ----
const TAGLINE = ['Stay', 'close', 'to', 'your', 'sellers.'];
function CloseScene({ t }) {
  const w = sp(t, CLOSE.logo, HEAVY);
  const u = sp(t, CLOSE.url, UI);
  return <div className="lockup" style={{ top: H / 2 - (LANDSCAPE ? 170 : 190) }}>
    <img src={wordmark} alt="Repeat AI" style={{
      height: LANDSCAPE ? 110 : 118, transform: `scale(${lerp(0.84, 1, w)})`,
      opacity: clamp(w * 1.5), filter: w < 0.98 ? `blur(${(1 - clamp(w)) * 10}px)` : undefined,
    }} />
    <div className="tagline">
      {TAGLINE.map((text, i) => {
        const p = sp(t, CLOSE.tagline[i], HEAVY);
        return <span key={text} style={{ opacity: clamp(p * 1.6), transform: `translateY(${(1 - p) * 26}px)`,
          filter: p < 0.98 ? `blur(${(1 - clamp(p)) * 10}px)` : undefined }}>{text}</span>;
      })}
    </div>
    <div className="url" style={{ opacity: clamp(u * 1.4), transform: `translateY(${(1 - u) * 30}px)` }}>repeatai.org</div>
  </div>;
}

// ---- Main ----
function Film({ t }) {
  const firstScreen = SCREENS[0]?.[0] ?? Infinity;
  const isDesktop = t >= firstScreen && t < P7.at;
  const isMobile = t >= PHONE_IN && t < PHONE_OUT + 1.5;
  return <div className="stage" style={{ width: W, height: H }}>
    <div className="glow" style={{ transform: `translate(${Math.sin(t * 0.3) * 140}px, ${Math.cos(t * 0.23) * 110}px)` }} />
    {t < firstScreen && <HookScene t={t} />}
    {isDesktop && <><DesktopScreen t={t} /><DesktopCursor t={t} /></>}
    {isMobile && <Phone t={t} />}
    <CaptionLayer t={t} />
    {t >= P9.at && <CloseScene t={t} />}
  </div>;
}

let setTime = () => {};
function App() {
  const [t, setT] = useState(Number(params.get('t') || 0));
  setTime = (v) => flushSync(() => setT(v));
  return <Film t={t} />;
}

createRoot(document.getElementById('root')).render(<App />);
window.seek = (t) => { setTime(t); return true; };
window.filmSize = { width: W, height: H, duration: DURATION, name: CUT };

const allTakes = SCREENS.map(([, n, , k]) => k === 'desktop' ? DTAKE(n) : MTAKE(n));
window.filmReady = Promise.all([...new Set(allTakes), wordmark].map((src) => new Promise((r) => {
  const img = new Image(); img.onload = img.onerror = r; img.src = src;
})));

if (!navigator.webdriver && params.get('play') !== '0') {
  const t0 = performance.now();
  const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
