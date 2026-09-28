import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { IconCheck, IconChevronRight } from '@tabler/icons-react';
import LeadCard from '../../src/features/seller-signal/components/LeadCard';
import '../../src/styles/app-shell.css';
import '../../src/styles/home.css';
import '../../src/styles/home-overview.css';
import '../../src/styles/seller-table.css';
import './film.css';
import wordmark from '../../mobile/assets/repeat-ai-logo.png';
import { BEAT, CARD, HEAVY, UI, clamp, lerp, spring, track } from './motion';
import { COUNTS, SELLERS, insightFor } from './fixtures';

// Launch film, 20 s at 120 BPM (one beat = 0.5 s). Every frame is a pure
// function of t: window.seek(t) renders it, render.mjs captures it.
export const DURATION = 20;
const params = new URLSearchParams(location.search);
const LANDSCAPE = params.get('format') === '16x9';
const W = LANDSCAPE ? 1920 : 1080;
const H = LANDSCAPE ? 1080 : 1920;
const SEND_TIMES = [10.5, 11, 11.5, 12, 12.5];
const SELLER_SCALE = LANDSCAPE ? 1.38 : 1.9;
// Landscape splits the frame: captions on the left, product on the right.
const SELLER_LEFT = LANDSCAPE ? 960 : (W - 540 * SELLER_SCALE) / 2;
const noop = () => {};

const sp = (t, start, [k, d] = CARD) => spring(t - start, k, d);
// Counters change once per video frame, so motion-blur subframes never mix two numbers.
const frameTime = (t) => Math.floor(t * 60 + 1e-6) / 60;
const fadeIn = (t, start, length = 0.25) => clamp((t - start) / length);
const visible = (t, from, to) => t >= from - 0.01 && t < to;

// Kinetic type: each word springs up from below on its own beat.
function Words({ t, lines, x, y, size, weight = 800, exit, align = 'left' }) {
  return <div className="film-type" style={{ left: x, top: y, fontSize: size, fontWeight: weight, textAlign: align, width: align === 'center' ? W - 2 * x : undefined }}>
    {lines.map((line, i) => {
      const p = sp(t, line.at, HEAVY);
      const out = exit == null ? 0 : sp(t, exit + i * 0.05, UI);
      return <div key={i} className="film-line" style={{ color: line.color, opacity: clamp(p * 1.4) * (1 - out) }}>
        <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * size * 0.9 - out * size * 0.8}px)` }}>{line.text}</span>
      </div>;
    })}
  </div>;
}

function Hook({ t }) {
  const count = Math.round(2000 * sp(frameTime(t), -0.12, [60, 16]));
  const swap = 1.5;
  return <>
    <Words t={t} x={LANDSCAPE ? 140 : 80} y={LANDSCAPE ? 250 : 560} size={LANDSCAPE ? 250 : 260} exit={swap}
      lines={[{ at: -0.18, text: clamp(count, 0, 2000).toLocaleString('en-US') }, { at: 0.5, text: 'sellers.', color: '#8a8a8a' }]} />
    <Words t={t} x={LANDSCAPE ? 140 : 80} y={LANDSCAPE ? 280 : 600} size={LANDSCAPE ? 210 : 200} exit={2.5}
      lines={[{ at: swap + 0.05, text: 'Who’s due' }, { at: 2, text: 'today?', color: 'var(--film-accent)' }]} />
  </>;
}

function Summary({ t }) {
  const enter = sp(t, 2.5);
  const exit = sp(t, 4.9, HEAVY);
  const due = Math.round(COUNTS.due * sp(frameTime(t), 2.75, [90, 18]));
  const scheduled = Math.round(COUNTS.scheduled * sp(frameTime(t), 2.9, [90, 18]));
  const pressed = t > 4.5 && t < 4.7;
  return <div className="film-ui" style={{
    width: 560, left: (W - 560) / 2, top: LANDSCAPE ? 170 : 600,
    transform: `translateY(${(1 - enter) * 420}px) scale(${(LANDSCAPE ? 2 : 1.75) + exit * 0.8})`,
    opacity: clamp(enter * 1.5) * (1 - clamp(exit * 1.6)),
  }}>
    <header className="home-greeting" style={{ opacity: fadeIn(t, 2.6), marginBottom: 26 }}>
      <span className="home-muted">Monday 28 September</span>
      <h1 className="home-title">Hello, Sara</h1>
    </header>
    <section className="home-summary">
      <div className="home-summary-metrics">
        {[['Due today', due], ['Scheduled', scheduled], ['Sent today', 0]].map(([label, value]) => (
          <div key={label} className="home-summary-metric"><span className="home-muted home-small">{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="home-summary-link" style={{ opacity: pressed ? 0.6 : 1 }}><span>View sellers</span><IconChevronRight size={17} stroke={2} /></div>
    </section>
    <Cursor x={track(t, [[0, 700], [3.6, 700], [3.7, 480]], 90, 18)} y={track(t, [[0, 520], [3.6, 520], [3.7, 222]], 90, 18)} show={t > 3.6} pressed={pressed} />
  </div>;
}

function Cursor({ x, y, show, pressed }) {
  return <div className="film-cursor" style={{ transform: `translate(${x}px, ${y}px) scale(${pressed ? 0.86 : 1})`, opacity: show ? 1 : 0 }}>
    <svg width="30" height="38" viewBox="0 0 23 30"><path d="M2 2 L2 23 L8 18 L13 28 L17 26 L12 16 L21 16 Z" fill="white" stroke="#252525" strokeWidth="1.5" /></svg>
  </div>;
}

const measured = { buttons: null };

function Sellers({ t }) {
  const box = useRef(null);
  const sent = SEND_TIMES.filter((time) => t >= time).length;
  const done = t >= 13;
  const dueCount = done ? Math.max(0, Math.round((COUNTS.due - 5) * (1 - sp(frameTime(t), 13, [90, 20])))) : COUNTS.due - sent;
  const enter = sp(t, 5);
  const exit = sp(t, 14, HEAVY);
  const push = 1 + 0.06 * clamp((t - 7) / 3);
  useLayoutEffect(() => {
    const rows = box.current?.querySelectorAll('.seller-row') || [];
    rows.forEach((row, i) => {
      const p = sp(t, 5.5 + i * 0.25, UI);
      row.style.opacity = String(clamp(p * 1.3));
      row.style.transform = `translateX(${(1 - p) * 90}px)`;
    });
    if (!measured.buttons && rows.length) {
      const origin = box.current.getBoundingClientRect();
      const scale = origin.width / box.current.offsetWidth;
      measured.buttons = [...rows].map((row) => {
        // Measure the resting position, not mid slide-in.
        const moving = row.style.transform;
        row.style.transform = 'none';
        const rect = row.querySelector('.seller-send-btn').getBoundingClientRect();
        row.style.transform = moving;
        return [(rect.left - origin.left + rect.width * 0.45) / scale, (rect.top - origin.top + rect.height * 0.55) / scale];
      });
    }
  });
  const keys = measured.buttons ? [[0, measured.buttons[0][0] + 160], [9.8, measured.buttons[0][0] + 160], ...SEND_TIMES.map((time, i) => [time - 0.3, measured.buttons[i][0]])] : [[0, 0]];
  const keysY = measured.buttons ? [[0, measured.buttons[0][1] + 260], [9.8, measured.buttons[0][1] + 260], ...SEND_TIMES.map((time, i) => [time - 0.3, measured.buttons[i][1]])] : [[0, 0]];
  const pressed = SEND_TIMES.some((time) => t >= time - 0.05 && t < time + 0.12);
  return <div ref={box} className="film-ui film-sellers" style={{
    width: 540, left: SELLER_LEFT, top: LANDSCAPE ? 100 : 500, transformOrigin: 'top left',
    transform: `translateY(${(1 - enter) * 500 + exit * -120}px) scale(${SELLER_SCALE * push * (1 - exit * 0.12)})`,
    opacity: clamp(enter * 1.5) * (1 - clamp(exit * 1.4)), filter: `blur(${exit * 14}px)`,
  }}>
    <div className="seller-page-head" style={{ marginBottom: 18 }}>
      <h1>Sellers</h1>
      <div className="seller-view-switch" role="tablist">
        <button type="button" className="is-active">{dueCount === 0 && done ? <>All caught up <IconCheck size={15} stroke={2.6} /></> : <>Due today<span>{dueCount}</span></>}</button>
        <button type="button">Scheduled<span>{COUNTS.scheduled + sent}</span></button>
      </div>
    </div>
    <div className="seller-table-card">
      <div className="seller-table-meta">{COUNTS.due} sellers due today</div>
      <table className="seller-table">
        <thead><tr><th>Seller</th><th>Unit</th><th>Status</th><th>Phone</th><th>Contact</th><th /></tr></thead>
        <tbody>
          {SELLERS.map((lead, i) => (
            <LeadCard key={lead.id} lead={lead} insight={insightFor(lead)} isSent={t >= (SEND_TIMES[i] ?? Infinity)}
              whatsappConnected onSendWhatsApp={noop} onToggleExpanded={noop} onCopyMessage={noop} onHandoff={noop} />
          ))}
        </tbody>
      </table>
    </div>
    {measured.buttons && <Cursor x={track(t, keys, 260, 28)} y={track(t, keysY, 260, 28)} show={t > 9.8 && t < 13.4} pressed={pressed} />}
  </div>;
}

function CaughtUp({ t }) {
  const p = sp(t, 13.25, [200, 16]);
  const out = sp(t, 14, UI);
  return <div className="film-badge" style={{ left: LANDSCAPE ? SELLER_LEFT + 540 * SELLER_SCALE / 2 - 120 : W / 2 - 120, top: LANDSCAPE ? 460 : 1290, transform: `scale(${p * (1 - out)})` }}>
    <IconCheck size={130} stroke={2.4} />
  </div>;
}

function Captions({ t }) {
  const x = LANDSCAPE ? 120 : 80;
  const y = LANDSCAPE ? 380 : 190;
  const size = LANDSCAPE ? 88 : 104;
  return <>
    {visible(t, 7, 10.25) && <Words t={t} x={x} y={y} size={size} exit={9.75}
      lines={[{ at: 7.5, text: 'Everyone due today.' }, { at: 8, text: 'One list.', color: 'var(--film-accent)' }]} />}
    {visible(t, 10, 14.25) && <Words t={t} x={x} y={y} size={size} exit={13.75}
      lines={[{ at: 10.1, text: 'Follow up' }, { at: 10.6, text: 'in one tap.', color: 'var(--film-accent)' }]} />}
  </>;
}

function Tagline({ t }) {
  return <>
    <Words t={t} x={LANDSCAPE ? 140 : 80} y={LANDSCAPE ? 300 : 700} size={LANDSCAPE ? 190 : 150} exit={16.6}
      lines={[{ at: 14.25, text: 'Every seller.' }, { at: 15, text: 'Right on time.', color: 'var(--film-accent)' }]} />
    <div className="film-bar" style={{ left: LANDSCAPE ? 140 : 80, top: LANDSCAPE ? 760 : 1120, width: (LANDSCAPE ? 900 : 760) * sp(t, 15.3, UI) * (1 - sp(t, 16.6, UI)) }} />
  </>;
}

function Lockup({ t }) {
  const mark = sp(t, 17, HEAVY);
  const word = sp(t, 17.35, CARD);
  const url = sp(t, 17.9, UI);
  const size = LANDSCAPE ? 180 : 200;
  return <div className="film-lockup" style={{ top: H / 2 - size / 2 - 60 }}>
    <img src={wordmark} alt="Repeat AI" className="film-wordmark" style={{ height: size * 0.62, transform: `scale(${lerp(0.82, 1, mark)}) translateY(${(1 - word) * 40}px)`, opacity: clamp(mark * 1.5) }} />
    <div className="film-url" style={{ opacity: clamp(url * 1.4), transform: `translateY(${(1 - url) * 30}px)` }}>repeatai.org</div>
  </div>;
}

function Film({ t }) {
  return <div className="film-stage" style={{ width: W, height: H }}>
    <div className="film-glow" style={{ transform: `translate(${Math.sin(t * 0.35) * 120}px, ${Math.cos(t * 0.27) * 90}px)` }} />
    {visible(t, 0, 3) && <Hook t={t} />}
    {visible(t, 2.4, 5.6) && <Summary t={t} />}
    {visible(t, 4.9, 15.2) && <Sellers t={t} />}
    {visible(t, 13, 14.5) && <CaughtUp t={t} />}
    <Captions t={t} />
    {visible(t, 14, 17.2) && <Tagline t={t} />}
    {visible(t, 16.9, 20.1) && <Lockup t={t} />}
  </div>;
}

let setTime = () => {};
function App() {
  const [t, setT] = useState(Number(params.get('t') || 0));
  const [, setTick] = useState(0);
  setTime = (value) => { flushSync(() => setT(value)); flushSync(() => setTick((n) => n + 1)); };
  return <Film t={t} />;
}

createRoot(document.getElementById('root')).render(<App />);
window.seek = (t) => { setTime(t); return true; };
window.filmSize = { width: W, height: H, duration: DURATION, beat: BEAT };

// Live preview in a normal browser; headless capture drives seek() instead.
if (!navigator.webdriver && params.get('play') !== '0') {
  const t0 = performance.now();
  const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
