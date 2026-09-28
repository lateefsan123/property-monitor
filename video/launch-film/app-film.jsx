import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './app-film.css';
import wordmark from '../../mobile/assets/repeat-ai-logo.png';
import { CARD, HEAVY, UI, clamp, lerp, spring } from './motion';
import { DURATION, sourceTime } from './app-pacing.mjs';

// Mobile app film: original 73-second animation re-timed to 86 seconds.
// The phone shows stills of the real app
// (captured by app-takes.mjs from film mode with demo data) plus one drawn
// WhatsApp chat; captions and taps are pure functions of t; screens are never zoomed.
// app-pacing.mjs is shared with the narration conform and sound effects.
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
const PHONE_IN = 3.3;
const PHONE_OUT = 65.6;

// Screen timeline: [time, take, transition] ('push' slides in, 'fade' dissolves). 'chat' is drawn.
const SCREENS = [
  [0, 'home'], [8, 'sheets', 'push'], [9.15, 'import-options', 'fade'], [10.35, 'import-link', 'fade'], [11.8, 'import-done', 'fade'],
  [15, 'sellers', 'push'], [19.2, 'automations', 'push'], [22.6, 'home', 'push'],
  [27.4, 'sellers', 'push'], [30.35, 'sellers-sent', 'fade'],
  [32.4, 'chat', 'push'],
  [38.6, 'template-edit', 'push'], [41.2, 'detail-message', 'push'],
  [44.4, 'listings', 'push'], [45.75, 'building', 'push'], [47.15, 'listing', 'push'],
  [50.8, 'schedule', 'push'], [52.05, 'sched-edit', 'fade'], [54, 'sched-th', 'fade'], [54.7, 'sched-sa', 'fade'], [55.95, 'schedule-updated', 'fade'],
  [57, 'home', 'push'], [57.95, 'ask-open', 'fade'], [58.6, 'ask-typed', 'fade'], [59.45, 'ask-reply', 'fade'],
  [61.2, 'integrations', 'push'],
];
// Taps in app points (393x852 space).
const TAPS = [[9, 349, 103], [10.2, 200, 606], [11.6, 197, 807], [30.2, 357, 343], [45.6, 150, 154], [47, 209, 141],
  [51.9, 197, 609], [53.9, 196, 726], [54.6, 300, 726], [55.8, 289, 803], [57.8, 298, 807], [59.3, 294, 809]];
const CAPTIONS = [
  [3.9, 7.4, ['Your day,', 'at a glance.']],
  [8.2, 14.4, ['Bring your', 'spreadsheet.']],
  [15.2, 18.6, ['Everyone due today.', 'One list.']],
  [27.6, 31.8, ['Need more?', 'Tap to send.']],
  [38.8, 43.8, ['Every message,', 'personal.']],
  [44.6, 50.2, ['Spot every', 'price drop.']],
  [51, 56.4, ['Your buildings.', 'Your days.']],
  [57.2, 60.6, ['Just ask', 'Repeat.']],
  [61.4, 65, ['Works with', 'your tools.']],
];

// Headings build word by word from a soft blur and leave with a staggered lift.
// A line is { text, at, color } or { words: [[text, at], ...], color }.
function Words({ t, lines, x, y, size, exit, weight = 700 }) {
  return <div className="type" style={{ left: x, top: y, fontSize: size, fontWeight: weight }}>
    {lines.map((line, li) => {
      const words = line.words || line.text.split(' ').map((word, wi) => [word, line.at + wi * 0.07]);
      return <div key={li} className="line" style={{ color: line.color, overflow: 'visible' }}>
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

// A WhatsApp-style chat (dark theme, drawn in app points) for the send and the reply.
// The outgoing text is the app's default template with Oliver's demo sale.
const CHAT_AT = 32.4;
const OUTGOING = [
  'Hi Oliver Grant, quick update on recent transactions in Burj Khalifa, Downtown Dubai.',
  '- Burj Khalifa | 2 Bed | 4.10M AED | 1,410 sqft | 27 Sept 2026',
  'Buyer activity remains strong, and your unit is in hot demand.',
  'If you would like to further discuss the sale of your unit, please let me know.',
];
const REPLY = 'Thanks Sara! What do you think 5507 could get right now?';
function Ticks({ read }) {
  return <svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke={read ? '#53bdeb' : '#8696a0'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6l3 3 6-7" /><path d="M6 8.5l1 .5 6-7" />
  </svg>;
}
function Chat({ t }) {
  const local = t - CHAT_AT;
  const sent = sp(local, 0.5, UI);
  const read = local >= 2;
  const typing = local >= 2.2 && local < 3.2;
  const reply = sp(local, 3.2, UI);
  const text = { color: '#e9edef', fontSize: 14.5, lineHeight: '19px', letterSpacing: 0 };
  const meta = { color: 'rgba(233,237,239,0.6)', fontSize: 11 };
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 393, height: 852, transform: `scale(${S})`, transformOrigin: '0 0', background: '#0b141a', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
    <div style={{ height: 60, background: '#1f2c34', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="#e9edef" strokeWidth="2.2" strokeLinecap="round"><path d="M10 2 2 10l8 8" /></svg>
      <div style={{ width: 38, height: 38, borderRadius: 19, background: '#6b7c85', color: '#fff', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>OG</div>
      <div>
        <div style={{ color: '#e9edef', fontSize: 16.5, fontWeight: 600 }}>Oliver Grant</div>
        <div style={{ color: '#8696a0', fontSize: 12.5 }}>{typing ? 'typing…' : 'online'}</div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
      <span style={{ background: '#182229', color: '#8696a0', fontSize: 12, padding: '5px 10px', borderRadius: 8 }}>Today</span>
    </div>
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ alignSelf: 'flex-end', maxWidth: 318, background: '#005c4b', borderRadius: '10px 2px 10px 10px', padding: '7px 9px 6px',
        opacity: clamp(sent * 1.5), transform: `translateY(${(1 - sent) * 24}px) scale(${lerp(0.96, 1, sent)})`, transformOrigin: '100% 0' }}>
        {OUTGOING.map((para, i) => <div key={i} style={{ ...text, marginBottom: i < OUTGOING.length - 1 ? 10 : 2 }}>{para}</div>)}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}><span style={meta}>9:41</span><Ticks read={read} /></div>
      </div>
      {typing && <div style={{ alignSelf: 'flex-start', background: '#1f2c34', borderRadius: '2px 10px 10px 10px', padding: '12px 14px', display: 'flex', gap: 5 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: 4, background: '#8696a0', opacity: 0.4 + 0.6 * Math.max(0, Math.sin((local - 2.2) * 9 - i * 0.9)) }} />)}
      </div>}
      {local >= 3.2 && <div style={{ alignSelf: 'flex-start', maxWidth: 300, background: '#1f2c34', borderRadius: '2px 10px 10px 10px', padding: '7px 9px 6px',
        opacity: clamp(reply * 1.5), transform: `translateY(${(1 - reply) * 20}px) scale(${lerp(0.96, 1, reply)})`, transformOrigin: '0 0' }}>
        <div style={text}>{REPLY}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={meta}>9:42</span></div>
      </div>}
    </div>
    <div style={{ position: 'absolute', left: 8, right: 8, bottom: 24, display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ flex: 1, height: 46, borderRadius: 23, background: '#1f2c34', color: '#8696a0', fontSize: 16, display: 'flex', alignItems: 'center', padding: '0 18px' }}>Message</div>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="22" viewBox="0 0 16 22" fill="#fff"><rect x="4" y="1" width="8" height="13" rx="4" /><path d="M1.5 10.5a6.5 6.5 0 0 0 13 0" fill="none" stroke="#fff" strokeWidth="1.8" /><rect x="7.1" y="16.5" width="1.8" height="4.5" rx=".9" /></svg>
      </div>
    </div>
  </div>;
}

function Layer({ take, t, style }) {
  if (take === 'chat') return <div style={{ position: 'absolute', inset: 0, ...style }}><Chat t={t} /></div>;
  return <img src={TAKE(take)} alt="" style={style} />;
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
      {previous && p < 1 && <Layer take={previous} t={t} style={{ transform: transition === 'push' ? `translateX(${-p * 30 * S}px)` : undefined, opacity: transition === 'push' ? 1 - p * 0.6 : 1 }} />}
      <Layer take={take} t={t} style={{ transform: transition === 'push' ? `translateX(${(1 - p) * SCREEN_W}px)` : undefined, opacity: transition === 'push' ? 1 : p }} />
      {tap && <span className="tap" style={{
        left: tap[1] * S, top: tap[2] * S, width: 90 * S, height: 90 * S,
        transform: `translate(-50%, -50%) scale(${0.3 + 0.9 * clamp((t - tap[0]) / 0.35)})`, opacity: 0.55 * (1 - clamp((t - tap[0] - 0.15) / 0.35)),
      }} />}
    </div>
  </div>;
}


function Phone({ t }) {
  const enter = sp(t, PHONE_IN - 0.1, HEAVY);
  const exit = sp(t, PHONE_OUT, HEAVY);
  const tilt = (1 - enter) * 8;
  return <div className="phone" style={{
    left: PHONE_LEFT, top: PHONE_TOP, width: PHONE_W, height: PHONE_H, padding: BEZEL, borderRadius: 64 * S,
    transform: `translateY(${(1 - enter) * 900 + exit * 1100}px) rotate(${tilt}deg)`,
  }}>
    <Screen t={t} />
  </div>;
}

function Captions({ t }) {
  const x = LANDSCAPE ? 140 : 80;
  const y = LANDSCAPE ? 420 : 120;
  const size = LANDSCAPE ? 100 : 92;
  const c = CHAT_AT;
  return <>
    {CAPTIONS.filter(([from, to]) => t >= from - 0.05 && t < to + 0.8).map(([from, to, [first, second]]) => (
      <Words key={from} t={t} x={x} y={y} size={size} exit={to} lines={[{ at: from, text: first }, { at: from + 0.45, text: second, color: 'var(--soft)' }]} />
    ))}
    {/* The chat caption lands on its own events: sent, read, replied. */}
    {t >= c && t < c + 6.2 && <Words t={t} x={x} y={y} size={size} exit={c + 5.6}
      lines={[{ words: [['Sent.', c + 0.55], ['Read.', c + 2]] }, { words: [['Replied.', c + 3.25]], color: 'var(--soft)' }]} />}
    {t >= 19.1 && t < 27.6 && <Automation t={t} x={x} y={y} size={size} />}
  </>;
}

// "40 automated WhatsApp messages a day": the number counts up in the chart teal.
function Automation({ t, x, y, size }) {
  const count = Math.round(40 * sp(frameTime(t), 19.6, [60, 16]));
  const at = 19.4;
  const out = 27;
  const lines = [
    { words: [[<span key="n" className="count" style={{ color: 'var(--accent)' }}>{count}</span>, at], ['automated', at + 0.12]] },
    { words: [['WhatsApp', at + 0.4], ['messages', at + 0.48]] },
    { words: [['a', at + 0.8], ['day.', at + 0.86]], color: 'var(--soft)' },
  ];
  const note = sp(t, 21.4, UI);
  const noteOut = sp(t, out + 0.1, UI);
  return <>
    <Words t={t} x={x} y={y - (LANDSCAPE ? 60 : 30)} size={size} exit={out} lines={lines} />
    <div className="note" style={{ position: 'absolute', left: x, top: y - (LANDSCAPE ? 60 : 30) + size * 3.2, zIndex: 5,
      opacity: clamp(note * 1.4) * (1 - noteOut), transform: `translateY(${(1 - note) * 16}px)`, filter: note < 0.98 ? `blur(${(1 - note) * 6}px)` : undefined }}>
      What sold in their building in the last two days.
    </div>
  </>;
}

function Hook({ t }) {
  const count = Math.round(2000 * sp(frameTime(t), -0.12, [60, 16]));
  const size = LANDSCAPE ? 230 : 250;
  const x = LANDSCAPE ? 140 : 80;
  return <>
    <Words t={t} x={x} y={LANDSCAPE ? 250 : 560} size={size} exit={1.75} weight={800}
      lines={[{ words: [[clamp(count, 0, 2000).toLocaleString('en-US'), -0.18]] }, { at: 0.55, text: 'sellers.', color: 'var(--soft)' }]} />
    <Words t={t} x={x} y={LANDSCAPE ? 280 : 600} size={size * 0.8} exit={3} weight={800}
      lines={[{ at: 1.95, text: 'Who’s due' }, { at: 2.45, text: 'today?', color: 'var(--soft)' }]} />
  </>;
}

function Close({ t }) {
  const word = sp(t, 69.4, HEAVY);
  const url = sp(t, 70, UI);
  const size = LANDSCAPE ? 190 : 150;
  return <>
    {t < 69.6 && <Words t={t} x={LANDSCAPE ? 140 : 80} y={LANDSCAPE ? 330 : 720} size={size} exit={69} weight={800}
      lines={[{ at: 65.9, text: 'Every seller.' }, { at: 66.8, text: 'Right on time.', color: 'var(--soft)' }]} />}
    <div className="lockup" style={{ top: H / 2 - 90 }}>
      <img src={wordmark} alt="Repeat AI" style={{ height: LANDSCAPE ? 110 : 118, transform: `scale(${lerp(0.84, 1, word)})`, opacity: clamp(word * 1.5), filter: word < 0.98 ? `blur(${(1 - clamp(word)) * 10}px)` : undefined }} />
      <div className="url" style={{ opacity: clamp(url * 1.4), transform: `translateY(${(1 - url) * 30}px)` }}>repeatai.org</div>
    </div>
  </>;
}

function Film({ t: playbackTime }) {
  const t = sourceTime(playbackTime);
  return <div className="stage" style={{ width: W, height: H }}>
    <div className="glow" style={{ transform: `translate(${Math.sin(t * 0.3) * 140}px, ${Math.cos(t * 0.23) * 110}px)` }} />
    {t < 3.4 && <Hook t={t} />}
    {t >= PHONE_IN - 0.2 && t < PHONE_OUT + 1.5 && <Phone t={t} />}
    <Captions t={t} />
    {t >= PHONE_OUT && <Close t={t} />}
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
window.filmReady = Promise.all([...new Set(SCREENS.map(([, take]) => take).filter((take) => take !== 'chat')), 'wordmark'].map((take) => new Promise((resolve) => {
  const image = new Image();
  image.onload = image.onerror = resolve;
  image.src = take === 'wordmark' ? wordmark : TAKE(take);
})));

if (!navigator.webdriver && params.get('play') !== '0') {
  const t0 = performance.now();
  const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
