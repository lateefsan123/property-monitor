import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './app-film.css';
import wordmark from '../../mobile/assets/repeat-ai-logo.png';
import { CARD, HEAVY, UI, clamp, lerp, spring, track } from './motion';

// Mobile app film, ~61 s at 120 BPM. The phone shows stills of the real app
// (captured by app-takes.mjs from film mode with demo data); captions, taps
// and camera moves are drawn here as pure functions of t.
const DURATION = 61;
const params = new URLSearchParams(location.search);
const LANDSCAPE = params.get('format') === '16x9';
const W = LANDSCAPE ? 1920 : 1080;
const H = LANDSCAPE ? 1080 : 1920;
const TAKE = (name) => `/video/launch-film/out/app/takes/${name}.png`;

// Phone geometry: screen is the 393x852 pt app at scale S, under a status bar.
const S = LANDSCAPE ? 1.02 : 1.6;
const SCREEN_W = 393 * S;
const STATUS = 54 * S;
const SCREEN_H = STATUS + 852 * S;
const BEZEL = LANDSCAPE ? 12 : 16;
const PHONE_W = SCREEN_W + BEZEL * 2;
const PHONE_H = SCREEN_H + BEZEL * 2;
const PHONE_LEFT = LANDSCAPE ? W - PHONE_W - 250 : (W - PHONE_W) / 2;
const PHONE_TOP = LANDSCAPE ? (H - PHONE_H) / 2 : 480;

const sp = (t, start, [k, d] = CARD) => spring(t - start, k, d);
const frameTime = (t) => Math.floor(t * 60 + 1e-6) / 60;

// Screen timeline: [time, take, transition] ('push' slides in, 'fade' dissolves).
const SCREENS = [
  [0, 'home'], [7, 'sheets', 'push'], [8.15, 'import-options', 'fade'], [9.35, 'import-link', 'fade'], [10.8, 'import-done', 'fade'],
  [13, 'sellers', 'push'], [18, 'automations', 'push'], [20.8, 'home', 'push'],
  [24, 'sellers', 'push'], [25.75, 'sellers-sent', 'fade'],
  [29, 'template-edit', 'push'], [31.25, 'detail-message', 'push'],
  [34, 'listings', 'push'], [35.55, 'building', 'push'], [37.35, 'listing', 'push'],
  [41, 'schedule', 'push'], [42.35, 'sched-edit', 'fade'], [43.3, 'sched-th', 'fade'], [44, 'sched-sa', 'fade'], [45.15, 'schedule-updated', 'fade'],
  [47, 'home', 'push'], [48.05, 'ask-open', 'fade'], [48.9, 'ask-typed', 'fade'], [49.85, 'ask-reply', 'fade'],
  [52, 'integrations', 'push'],
];
// Taps in app points (393x852 space).
const TAPS = [[8, 349, 103], [9.2, 200, 606], [10.6, 197, 807], [25.6, 357, 343], [35.4, 150, 154], [37.2, 209, 141],
  [42.2, 197, 609], [43.2, 196, 726], [43.9, 300, 726], [45, 289, 803], [47.9, 298, 807], [49.7, 294, 809]];
const CAPTIONS = [
  [3.4, 6.6, ['Your day,', 'at a glance.']],
  [7.2, 12.6, ['Bring your', 'spreadsheet.']],
  [13.2, 17.6, ['Everyone due today.', 'One list.']],
  [24.2, 28.6, ['Need more?', 'Tap to send.']],
  [29.2, 33.6, ['Every message,', 'personalised.']],
  [34.2, 40.6, ['Spot every', 'price drop.']],
  [41.2, 46.6, ['Your buildings.', 'Your days.']],
  [47.2, 51.6, ['Just ask', 'Repeat.']],
  [52.2, 55, ['Works with', 'your tools.']],
];

function Words({ t, lines, x, y, size, exit, weight = 700 }) {
  return <div className="type" style={{ left: x, top: y, fontSize: size, fontWeight: weight }}>
    {lines.map((line, i) => {
      const p = sp(t, line.at, HEAVY);
      const out = exit == null ? 0 : sp(t, exit + i * 0.05, UI);
      return <div key={i} className="line" style={{ color: line.color, opacity: clamp(p * 1.4) * (1 - out) }}>
        <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * size * 0.9 - out * size * 0.8}px)` }}>{line.text}</span>
      </div>;
    })}
  </div>;
}

function StatusBar() {
  return <div className="status" style={{ height: STATUS, fontSize: 17 * S }}>
    <span className="status-time">9:41</span>
    <span className="island" style={{ width: 124 * S, height: 36 * S, top: 11 * S }} />
    <svg className="status-icons" width={78 * S} height={14 * S} viewBox="0 0 78 14" fill="#fff">
      <rect x="0" y="9" width="3.2" height="4" rx="1" /><rect x="5" y="6.5" width="3.2" height="6.5" rx="1" /><rect x="10" y="4" width="3.2" height="9" rx="1" /><rect x="15" y="1.5" width="3.2" height="11.5" rx="1" />
      <path d="M31 4.2a9.5 9.5 0 0 1 13 0l-1.5 1.6a7.3 7.3 0 0 0-10 0Zm2.7 2.9a5.6 5.6 0 0 1 7.6 0L39.8 8.7a3.4 3.4 0 0 0-4.6 0Zm2.4 2.5a2 2 0 0 1 2.8 0L37.5 11Z" />
      <rect x="51" y="1.5" width="23" height="11" rx="3.4" fill="none" stroke="#fff" strokeOpacity=".4" /><rect x="53" y="3.5" width="17" height="7" rx="1.8" /><rect x="75.5" y="5" width="1.6" height="4" rx=".8" fillOpacity=".4" />
    </svg>
  </div>;
}

function Screen({ t }) {
  let index = 0;
  SCREENS.forEach(([time], i) => { if (t >= time) index = i; });
  const [start, take, transition] = SCREENS[index];
  const previous = index > 0 ? SCREENS[index - 1][1] : null;
  const p = transition === 'push' ? sp(t, start, UI) : clamp((t - start) / 0.18);
  const tap = TAPS.find(([time]) => t >= time && t < time + 0.5);
  return <div className="screen" style={{ width: SCREEN_W, height: SCREEN_H, borderRadius: 56 * S * 0.9 }}>
    <StatusBar />
    <div className="viewport" style={{ top: STATUS, width: SCREEN_W, height: 852 * S }}>
      {previous && p < 1 && <img src={TAKE(previous)} alt="" style={{ transform: transition === 'push' ? `translateX(${-p * 30 * S}px)` : undefined, opacity: transition === 'push' ? 1 - p * 0.6 : 1 }} />}
      <img src={TAKE(take)} alt="" style={{ transform: transition === 'push' ? `translateX(${(1 - p) * SCREEN_W}px)` : undefined, opacity: transition === 'push' ? 1 : p }} />
      {tap && <span className="tap" style={{
        left: tap[1] * S, top: tap[2] * S, width: 90 * S, height: 90 * S,
        transform: `translate(-50%, -50%) scale(${0.3 + 0.9 * clamp((t - tap[0]) / 0.35)})`, opacity: 0.55 * (1 - clamp((t - tap[0] - 0.15) / 0.35)),
      }} />}
    </div>
  </div>;
}

function Phone({ t }) {
  const enter = sp(t, 2.9, HEAVY);
  const exit = sp(t, 55.5, HEAVY);
  const push = track(t, [[0, 1], [14, 1.07], [17.8, 1], [37.6, 1], [38.4, 1.05], [40.6, 1]], 60, 16);
  const tilt = (1 - enter) * 8;
  return <div className="phone" style={{
    left: PHONE_LEFT, top: PHONE_TOP, width: PHONE_W, height: PHONE_H, padding: BEZEL, borderRadius: 64 * S,
    transform: `translateY(${(1 - enter) * 900 + exit * 1100}px) rotate(${tilt}deg) scale(${push})`,
  }}>
    <Screen t={t} />
  </div>;
}

function Captions({ t }) {
  const x = LANDSCAPE ? 140 : 80;
  const y = LANDSCAPE ? 420 : 120;
  const size = LANDSCAPE ? 100 : 92;
  return <>
    {CAPTIONS.filter(([from, to]) => t >= from - 0.05 && t < to + 0.6).map(([from, to, [first, second]]) => (
      <Words key={from} t={t} x={x} y={y} size={size} exit={to} lines={[{ at: from, text: first }, { at: from + 0.45, text: second, color: 'var(--soft)' }]} />
    ))}
    {t >= 17.95 && t < 24.4 && <Automation t={t} x={x} y={y} size={size} />}
  </>;
}

// "40 automated WhatsApp messages a day": the number counts up in the chart teal.
function Automation({ t, x, y, size }) {
  const count = Math.round(40 * sp(frameTime(t), 18.4, [60, 16]));
  const p = sp(t, 18.2, HEAVY);
  const out = sp(t, 23.8, UI);
  const lines = [
    <><span className="count" style={{ color: 'var(--accent)' }}>{count}</span> automated</>,
    'WhatsApp messages',
    'a day.',
  ];
  return <div className="type" style={{ left: x, top: y - (LANDSCAPE ? 60 : 30), fontSize: size, fontWeight: 700 }}>
    {lines.map((line, i) => {
      const q = sp(t, 18.2 + i * 0.3, HEAVY);
      return <div key={i} className="line" style={{ opacity: clamp(q * 1.4) * (1 - out), color: i === 2 ? 'var(--soft)' : undefined }}>
        <span style={{ display: 'inline-block', transform: `translateY(${(1 - q) * size * 0.9 - out * size * 0.8}px)` }}>{line}</span>
      </div>;
    })}
    <div className="note" style={{ opacity: clamp(p * 1.2) * (1 - out) * clamp((t - 19.6) / 0.4) }}>What sold in their building in the last two days.</div>
  </div>;
}

function Hook({ t }) {
  const count = Math.round(2000 * sp(frameTime(t), -0.12, [60, 16]));
  const size = LANDSCAPE ? 230 : 250;
  const x = LANDSCAPE ? 140 : 80;
  return <>
    <Words t={t} x={x} y={LANDSCAPE ? 250 : 560} size={size} exit={1.5} weight={800}
      lines={[{ at: -0.18, text: clamp(count, 0, 2000).toLocaleString('en-US') }, { at: 0.5, text: 'sellers.', color: 'var(--soft)' }]} />
    <Words t={t} x={x} y={LANDSCAPE ? 280 : 600} size={size * 0.8} exit={2.55} weight={800}
      lines={[{ at: 1.55, text: 'Who’s due' }, { at: 2, text: 'today?', color: 'var(--soft)' }]} />
  </>;
}

function Close({ t }) {
  const word = sp(t, 58.1, HEAVY);
  const url = sp(t, 58.7, UI);
  const size = LANDSCAPE ? 190 : 150;
  return <>
    {t < 58.2 && <Words t={t} x={LANDSCAPE ? 140 : 80} y={LANDSCAPE ? 330 : 720} size={size} exit={57.7} weight={800}
      lines={[{ at: 55.8, text: 'Every seller.' }, { at: 56.4, text: 'Right on time.', color: 'var(--soft)' }]} />}
    <div className="lockup" style={{ top: H / 2 - 90 }}>
      <img src={wordmark} alt="Repeat AI" style={{ height: LANDSCAPE ? 110 : 118, transform: `scale(${lerp(0.84, 1, word)})`, opacity: clamp(word * 1.5) }} />
      <div className="url" style={{ opacity: clamp(url * 1.4), transform: `translateY(${(1 - url) * 30}px)` }}>repeatai.org</div>
    </div>
  </>;
}

function Film({ t }) {
  return <div className="stage" style={{ width: W, height: H }}>
    <div className="glow" style={{ transform: `translate(${Math.sin(t * 0.3) * 140}px, ${Math.cos(t * 0.23) * 110}px)` }} />
    {t < 3 && <Hook t={t} />}
    {t >= 2.8 && t < 57 && <Phone t={t} />}
    <Captions t={t} />
    {t >= 55.5 && <Close t={t} />}
  </div>;
}

let setTime = () => {};
function App() {
  const [t, setT] = useState(Number(params.get('t') || 0));
  setTime = (value) => flushSync(() => setT(value));
  return <Film t={t} />;
}

createRoot(document.getElementById('root')).render(<App />);
window.seek = (t) => { setTime(t); return true; };
window.filmSize = { width: W, height: H, duration: DURATION };
// Every take is decoded before capture starts, so no frame shows a blank screen.
window.filmReady = Promise.all([...new Set(SCREENS.map(([, take]) => take)), 'wordmark'].map((take) => new Promise((resolve) => {
  const image = new Image();
  image.onload = image.onerror = resolve;
  image.src = take === 'wordmark' ? wordmark : TAKE(take);
})));

if (!navigator.webdriver && params.get('play') !== '0') {
  const t0 = performance.now();
  const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
