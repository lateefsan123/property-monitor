import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './app-film-v7.css';
import wordmark from '../../mobile/assets/repeat-ai-logo.png';
import { CARD, HEAVY, UI, clamp, lerp, spring } from './motion';
import {
  CAPTIONS, CLICKS, CLOSE, CUT, DURATION, HOOK, MARKS,
  P7, P8, P9, PHONE_IN, PHONE_OUT, SCREENS, TAKES, TAPS,
} from './app-pacing-v7.mjs';

// v7: desktop-first product film inspired by v5's immersive approach.
// The desktop fills the frame — no browser chrome wrapper, no presentation framing.
// The cursor appears only at action points, delivers a click ripple, and disappears.
// Mobile uses the proven v5 phone device. Captions are v5-style overlays.
const params = new URLSearchParams(location.search);
const LANDSCAPE = params.get('format') === '16x9';
const W = LANDSCAPE ? 1920 : 1080;
const H = LANDSCAPE ? 1080 : 1920;

const DTAKE = (n) => `/video/launch-film/out/desktop/${TAKES}/${n}.png`;
const MTAKE = (n) => `/video/launch-film/out/app/${TAKES}/${n}.png`;

// Desktop geometry: fills the frame, with room above for captions.
// Portrait: 1440 scaled to 1080w = 0.75, height 675, centred vertically with cap room
const DESK_W = 1440, DESK_H = 900;
const P_SCALE = 1080 / DESK_W; // 0.75
const P_DESK_H = Math.round(DESK_H * P_SCALE); // 675
const P_DESK_TOP = 560; // room for captions above (120 + 2×92 + gap)
// Landscape: right 75% of frame
const L_SCALE = (1920 * 0.78) / DESK_W; // ~1.04 → fills right area
const L_DESK_W = Math.round(DESK_W * L_SCALE);
const L_DESK_H = Math.round(DESK_H * L_SCALE);
const L_LEFT = 1920 - L_DESK_W - 30;
const L_TOP = (1080 - L_DESK_H) / 2;

// Phone (mobile scenes) — same as v5
const S = LANDSCAPE ? 1.02 : 1.4;
const SCREEN_W = 393 * S;
const STATUS_H = 54 * S;
const SCREEN_H_PX = 852 * S;
const BEZEL = LANDSCAPE ? 12 : 16;
const PHONE_W = SCREEN_W + BEZEL * 2;
const PHONE_H = STATUS_H + SCREEN_H_PX + BEZEL * 2;
const PHONE_LEFT = LANDSCAPE ? W - PHONE_W - 250 : (W - PHONE_W) / 2;
const PHONE_TOP = LANDSCAPE ? (H - PHONE_H) / 2 : 470;

const sp = (t, start, [k, d] = CARD) => spring(t - start, k, d);
const PUSH = CARD;
const FADE_DUR = 0.32;
const ease = (p) => p * p * (3 - 2 * p);
const frameTime = (t) => Math.floor(t * 60 + 1e-6) / 60;

// v5-style text animation
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

// Desktop fills the frame, no chrome wrapper
function DesktopScreen({ t }) {
  const dsk = SCREENS.filter(([, , , k]) => k === 'desktop');
  let idx = -1;
  dsk.forEach(([time], i) => { if (t >= time) idx = i; });
  if (idx < 0) return null;
  const [start, take, transition] = dsk[idx];
  const prev = idx > 0 ? dsk[idx - 1][1] : null;
  const p = transition === 'push' ? sp(t, start, PUSH) : transition === 'fade' ? ease(clamp((t - start) / FADE_DUR)) : 1;
  const enter = sp(t, dsk[0][0], CARD);

  const scale = LANDSCAPE ? L_SCALE : P_SCALE;
  const left = LANDSCAPE ? L_LEFT : 0;
  const top = LANDSCAPE ? L_TOP : P_DESK_TOP;
  const w = LANDSCAPE ? L_DESK_W : 1080;
  const h = LANDSCAPE ? L_DESK_H : P_DESK_H;

  // Marks — teal highlights on the desktop
  const activeMarks = MARKS.filter(([from, to, mark]) => mark === take && t >= from && t < to + 0.25);

  return <div className="desktop-stage" style={{
    left, top, width: w, height: h,
    opacity: clamp(enter * 1.5),
    transform: `translateY(${(1 - enter) * 60}px) scale(${lerp(0.96, 1, clamp(enter))})`,
  }}>
    {prev && p < 1 && <img src={DTAKE(prev)} alt="" className="desktop-img" style={{
      opacity: transition === 'push' ? 1 - p * 0.6 : 1,
      transform: transition === 'push' ? `translateX(${-p * 40}px)` : undefined,
    }} />}
    <img src={DTAKE(take)} alt="" className="desktop-img" style={{
      opacity: transition === 'push' ? 1 : transition === 'fade' ? p : 1,
      transform: transition === 'push' ? `translateX(${(1 - p) * w * 0.3}px)` : undefined,
    }} />
    {activeMarks.map(([from, to, , mTop, mLeft, mBottom, mRight]) => (
      <span key={from} className="mark" style={{
        left: mLeft * scale, top: mTop * scale,
        width: (mRight - mLeft) * scale, height: (mBottom - mTop) * scale,
        opacity: ease(clamp((t - from) / 0.25)) * (1 - ease(clamp((t - to) / 0.25))),
      }} />
    ))}
  </div>;
}

// Cursor: appears only at click points, springs in, delivers ripple, fades out.
// No persistent cursor. No moving pointer between actions.
function ClickIndicator({ t }) {
  // Find the most recent click within 0.8s
  const recent = CLICKS.filter(([ct]) => t >= ct && t < ct + 0.8).pop();
  if (!recent) return null;
  const [clickTime, cx, cy] = recent;
  const age = t - clickTime;

  const scale = LANDSCAPE ? L_SCALE : P_SCALE;
  const left = LANDSCAPE ? L_LEFT : 0;
  const top = LANDSCAPE ? L_TOP : P_DESK_TOP;
  const fx = left + cx * scale;
  const fy = top + cy * scale;

  // Spring in, hold, fade out
  const enterP = clamp(age / 0.1);
  const exitP = clamp((age - 0.3) / 0.5);
  const opacity = enterP * (1 - exitP) * 0.7;
  const ringScale = 0.3 + 0.7 * clamp(age / 0.2);

  return <span className="click-ring" style={{
    left: fx, top: fy,
    transform: `translate(-50%, -50%) scale(${ringScale})`,
    opacity,
  }} />;
}

// Phone — identical to v5
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
  const enter = sp(t, PHONE_IN - 0.1, HEAVY);
  const exit = sp(t, PHONE_OUT, HEAVY);
  return <div className="phone" style={{
    left: PHONE_LEFT, top: PHONE_TOP, width: PHONE_W, height: PHONE_H, padding: BEZEL, borderRadius: 64 * S,
    transform: `translateY(${(1 - enter) * 900 + exit * 1100}px) rotate(${(1 - enter) * 8}deg)`,
  }}>
    <MobileScreen t={t} />
  </div>;
}

// Captions — v5 style: clean overlays positioned above the content
function CaptionLayer({ t }) {
  const x = LANDSCAPE ? 80 : 80;
  const y = LANDSCAPE ? 380 : 120;
  const size = LANDSCAPE ? 80 : 82;
  return <>
    {CAPTIONS.filter(([from, to]) => t >= from - 0.05 && t < to + 0.8).map(([from, to, [first, second]]) => (
      <Words key={from} t={t} x={x} y={y} size={size} exit={to} lines={[
        { at: from, text: first },
        { at: from + 0.45, text: second, color: 'var(--soft)' },
      ]} />
    ))}
    {/* Early access qualifier on Ask Repeat */}
    {t >= P8.at && t < P8.end + 0.5 && <div className="early-access" style={{
      left: x, top: y + size * 2.5,
      opacity: clamp(sp(t, P8.at + 0.6, UI) * 1.5) * (1 - clamp(sp(t, P8.end, UI))),
    }}>Early access</div>}
  </>;
}

// Hook — same as v5
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

// Close — same as v5
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

// Film
function Film({ t }) {
  const firstScreen = SCREENS[0]?.[0] ?? Infinity;
  const isDesktop = t >= firstScreen && t < P7.at;
  const isMobile = t >= PHONE_IN && t < PHONE_OUT + 1.5;
  return <div className="stage" style={{ width: W, height: H }}>
    <div className="glow" style={{ transform: `translate(${Math.sin(t * 0.3) * 140}px, ${Math.cos(t * 0.23) * 110}px)` }} />
    {t < firstScreen && <HookScene t={t} />}
    {isDesktop && <><DesktopScreen t={t} /><ClickIndicator t={t} /></>}
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
