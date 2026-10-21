// Seller export how-to (16:9). Every frame is a pure function of t, painted by
// window.seek(t) for capture (video/launch-film/render.mjs --film ../export-film/film).
// The extension screens use the extension's own stylesheet and markup classes;
// the CRM is a neutral, unbranded stand-in. All sellers are fictional.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '../../extensions/table-export/workspace.css';
import './film.css';
import { clamp, lerp, spring, track } from '../launch-film/motion.js';
import { CAPTIONS, CUT, DURATION, T } from './pacing.mjs';

const W = 1920, H = 1080;
const BUILDINGS = ['Celestia A', 'Celestia B', 'Tenora'];
const FIRST = ['Omar', 'Priya', 'Daniel', 'Aisha', 'Tom', 'Lina', 'Marco', 'Sara', 'James', 'Nadia', 'Ravi', 'Elena', 'Yusuf', 'Chloe', 'Hassan', 'Mia'];
const LAST = ['Haddad', 'Nair', 'Ruiz', 'Rahman', 'Becker', 'Saleh', 'Rossi', 'Khan', 'Whitmore', 'Petrova', 'Mehta', 'Grant', 'Okafor', 'Silva', 'Ali', 'Novak'];
const ROWS = Array.from({ length: 144 }, (_, i) => ({
  name: `${FIRST[i % 16]} ${LAST[(i * 7 + 3) % 16]}`,
  building: BUILDINGS[i % 3],
  unit: String(100 + ((i * 37) % 1900)),
  beds: i % 4 === 0 ? 'Studio' : `${i % 4} bed`,
  phone: `+971 5${i % 6} ${String(1000000 + i * 7919).slice(0, 3)} ${String(1000000 + i * 7919).slice(3, 7)}`,
  status: ['Prospect', 'Appraisal', 'For sale', 'Prospect'][i % 4],
}));

const ease = (x) => { const p = clamp(x); return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
const fade = (t, start, end, d = 0.45) => clamp((t - start) / d) * (end === undefined ? 1 : clamp((end - t) / d));
const MARK = <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="4.5" width="17" height="8" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="6" y="7" width="3" height="3" rx="1" fill="currentColor" /><path d="M11.5 8.5h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="12" y="19.5" width="17" height="8" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="15" y="22" width="3" height="3" rx="1" fill="currentColor" /><path d="M20.5 23.5h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M8.5 12.5v7a4 4 0 0 0 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;

// Where things sit on the 1920x1080 frame (browser window at 160,90 · 1600x900).
const BROWSER = { x: 160, y: 66, w: 1600, h: 900 };
const ICON = { x: BROWSER.x + BROWSER.w - 70, y: BROWSER.y + 62 };
// The extension window is drawn at its real 470px width, scaled up for video.
const ZOOM = 1.35;
const POPUP = { x: BROWSER.x + BROWSER.w - 30 - 470, y: BROWSER.y + 90, w: 470 };
// Click points, measured from the rendered frame (centre of each control).
const TARGETS = {
  rest: [1180, 736], addToChrome: [1384, 373], icon: [1716, 98],
  find: [1413, 388], tenora: [1162, 479], download: [1413, 569],
  dropzone: [BROWSER.x + 800, BROWSER.y + 470],
};

function Browser({ url, children, icon = 0, iconPress = 0 }) {
  return <div className="browser" style={{ left: BROWSER.x, top: BROWSER.y, width: BROWSER.w, height: BROWSER.h }}>
    <div className="browser-bar">
      <span className="dots"><i /><i /><i /></span>
      <span className="url">{url}</span>
      <span className="ext-slot" style={{ opacity: icon, transform: `scale(${(0.6 + 0.4 * icon) * (1 - 0.12 * iconPress)})` }}><span className="ext-icon">{MARK}</span></span>
    </div>
    <div className="browser-page">{children}</div>
  </div>;
}

// Repeat AI's Spreadsheets page: where the extension is offered and where files are uploaded.
function RepeatPage({ t, mode }) {
  const press = mode === 'install' ? Math.max(0, 1 - Math.abs(t - T.installClick) / 0.18) : 0;
  const added = mode === 'install' && t > T.installClick + 0.2;
  const drop = mode === 'upload' ? ease((t - T.upload - 1.4) / 0.6) : 0;
  return <div className="rpage">
    <div className="rpage-top"><span className="mark">{MARK}</span><b>Repeat AI</b></div>
    <h1 className="rpage-title">Spreadsheets</h1>
    {mode === 'install' ? <div className="rcard">
      <div><h2>Export sellers from your CRM</h2><p>Get your sellers as spreadsheets, one for each building.</p></div>
      <div className="rcard-actions">
        <button className={added ? 'secondary' : 'primary'} style={{ transform: `scale(${1 - 0.04 * press})` }}>{added ? '✓ Added to Chrome' : 'Add to Chrome'}</button>
        <button className="link">Watch how it works</button>
      </div>
    </div> : <>
      <div className="dropzone" style={{ opacity: 1 - drop * 0.6 }}>Drop spreadsheets here</div>
      <div className="rlist">{['Celestia A', 'Celestia B'].map((name, i) => {
        const show = ease((t - T.upload - 1.9 - i * 0.35) / 0.5);
        return <div key={name} className="rrow" style={{ opacity: show, transform: `translateY(${(1 - show) * 14}px)` }}>
          <span className="xls">XLSX</span><b>{name}</b><span>48 sellers</span><span className="ok">✓ Added</span>
        </div>;
      })}</div>
    </>}
  </div>;
}

// A plain CRM list. During the scan it scrolls page by page.
function CrmPage({ t }) {
  const scan = clamp((t - T.scanStart) / (T.scanEnd - T.scanStart));
  const pages = 6, page = Math.min(pages, 1 + Math.floor(scan * pages));
  const within = (scan * pages) % 1;
  const offset = scan >= 1 ? 0 : ease(clamp(within * 1.6)) * 11;
  const start = (page - 1) * 24 + Math.floor(offset);
  const rows = ROWS.slice(start, start + 14);
  return <div className="crm">
    <div className="crm-head"><h1>Sellers</h1><span>144 records</span></div>
    <table className="crm-table"><thead><tr><th>Name</th><th>Building</th><th>Unit</th><th>Bedrooms</th><th>Mobile</th><th>Status</th></tr></thead>
      <tbody style={{ transform: `translateY(${-(offset % 1) * 46}px)` }}>{rows.map((r, i) => <tr key={start + i}><td>{r.name}</td><td>{r.building}</td><td>{r.unit}</td><td>{r.beds}</td><td>{r.phone}</td><td>{r.status}</td></tr>)}</tbody></table>
    <div className="crm-foot"><span>Page {page} of {pages}</span><span className="pager">‹ Previous · Next ›</span></div>
    {t > T.scanStart && t < T.scanEnd ? <div className="scan-band" style={{ top: 120 + ((t * 260) % 620) }} /> : null}
  </div>;
}

// The extension window, using the extension's own classes.
function Popup({ t }) {
  const open = spring(t - T.popup, 220, 24);
  const findPress = Math.max(0, 1 - Math.abs(t - T.findClick) / 0.16);
  const dlPress = Math.max(0, 1 - Math.abs(t - T.downloadClick) / 0.16);
  const scanning = t >= T.scanStart && t < T.list;
  const count = Math.round(144 * ease((t - T.scanStart) / (T.scanEnd - T.scanStart - 0.3)));
  const review = t >= T.list;
  const tenora = t < T.untick;
  const done = t >= T.files;
  const barX = ((t - T.scanStart) % 1.3) / 1.3;
  const away = fade(t, T.files + 0.9, undefined, 0.4);
  return <div className="popup" style={{ left: POPUP.x, top: POPUP.y, width: POPUP.w, opacity: clamp(open * 1.4) * (1 - away), transform: `translateY(${(1 - open) * -16}px) scale(${ZOOM * (0.97 + 0.03 * open)})` }}>
    <div className="ext-app">
      <header className="top"><span className="mark">{MARK}</span><span className="brand-name">Repeat AI</span></header>
      {!review ? <section className="stage">
        <h1>{scanning ? 'Finding your sellers' : 'Export your sellers'}</h1>
        {!scanning ? <p className="lead">Open your seller list, then click below.</p> : null}
        {scanning ? <div className="progress"><div className="bar"><span style={{ left: `${lerp(-34, 100, barX)}%`, animation: 'none' }} /></div>
          <p className="count"><strong>{count}</strong> sellers found</p><p className="hint">Keep your seller list open and unchanged while we read it.</p></div>
          : <div className="actions"><button className="primary" style={{ width: '100%', transform: `scale(${1 - 0.03 * findPress})` }}>Find my sellers</button></div>}
      </section> : <section className="stage">
        <div className="review-head"><h2>144 sellers in 3 buildings</h2></div>
        <div className="buildings">{BUILDINGS.map((name) => {
          const checked = name !== 'Tenora' || tenora;
          return <label key={name} className="building"><input type="checkbox" readOnly checked={checked} /><span className="name"><span>{name}</span></span><b>48</b></label>;
        })}</div>
        <div className="footer">
          {done ? <div className="notice success" style={{ opacity: fade(t, T.files) }}>Downloaded. Now add the spreadsheets to Repeat AI.</div> : null}
          <button className="primary" style={{ transform: `scale(${1 - 0.03 * dlPress})` }}>{t >= T.downloadClick && t < T.files ? 'Downloading…' : 'Download'}</button>
        </div>
      </section>}
    </div>
  </div>;
}

// The browser's downloads panel with the two spreadsheets (Tenora was unticked).
function Files({ t }) {
  const show = spring(t - T.files - 1.0, 200, 24);
  if (t < T.files + 1.0) return null;
  return <div className="downloads" style={{ left: BROWSER.x + BROWSER.w - 30 - 560, top: BROWSER.y + 74, opacity: clamp(show * 1.5), transform: `translateY(${(1 - show) * -12}px)` }}>
    <p>Downloads</p>
    {['Celestia A.xlsx', 'Celestia B.xlsx'].map((name, i) => {
      const row = ease((t - T.files - 1.2 - i * 0.25) / 0.4);
      return <div key={name} className="file" style={{ opacity: row, transform: `translateX(${(1 - row) * 12}px)` }}><span className="xls">XLSX</span><b>{name}</b><span>48 sellers</span></div>;
    })}
  </div>;
}

function Cursor({ t }) {
  const keys = [[0, TARGETS.rest], [T.installClick - 1.1, TARGETS.addToChrome], [T.crm, TARGETS.rest], [T.iconClick - 0.9, TARGETS.icon],
    [T.findClick - 1.0, TARGETS.find], [T.scanStart + 0.4, [1180, 760]], [T.untick - 0.9, TARGETS.tenora],
    [T.downloadClick - 1.0, TARGETS.download], [T.files + 0.6, [1180, 760]], [T.upload + 0.4, TARGETS.dropzone], [T.end - 0.6, [1700, 1000]]];
  const x = track(t, keys.map(([k, v]) => [k, v[0]]), 90, 19), y = track(t, keys.map(([k, v]) => [k, v[1]]), 90, 19);
  const clicks = [T.installClick, T.iconClick, T.findClick, T.untick, T.downloadClick];
  const ring = clicks.map((c) => t - c).find((d) => d >= 0 && d < 0.5);
  const visible = t > T.install + 0.3 && t < T.end;
  return <div className="cursor" style={{ left: x, top: y, opacity: visible ? 1 : 0 }}>
    {ring !== undefined ? <span className="ring" style={{ opacity: 1 - ring / 0.5, transform: `translate(-50%,-50%) scale(${0.4 + ring * 2.2})` }} /> : null}
    <svg viewBox="0 0 24 24" width="34" height="34"><path d="M5 3l14 8.5-6.2 1.4L10 19z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
  </div>;
}

function Caption({ t }) {
  const index = CAPTIONS.findLastIndex(([at]) => t >= at);
  if (index < 0 || t >= T.end) return null;
  const [at, text] = CAPTIONS[index];
  const next = CAPTIONS[index + 1]?.[0] ?? T.end;
  return <div className="caption" style={{ opacity: fade(t, at, next, 0.35) }}>{text}</div>;
}

function Film({ t }) {
  const titleIn = fade(t, T.title + 0.2, T.install, 0.6);
  const installOn = fade(t, T.install, T.crm, 0.5);
  const crmOn = fade(t, T.crm, T.upload, 0.5);
  const uploadOn = fade(t, T.upload, T.end, 0.5);
  const endOn = fade(t, T.end, DURATION + 1, 0.6);
  const iconIn = t < T.crm ? spring(t - T.pinned, 260, 22) : 1;
  const iconPress = Math.max(0, 1 - Math.abs(t - T.iconClick) / 0.16);
  return <div className="frame" style={{ width: W, height: H }}>
    {titleIn > 0 ? <div className="titlecard" style={{ opacity: titleIn }}><span className="mark big">{MARK}</span><h1>Get your sellers out of your CRM</h1><p>and into Repeat AI, in two clicks</p></div> : null}
    {installOn > 0 ? <div className="scene" style={{ opacity: installOn }}><Browser url="repeatai.org/spreadsheets" icon={iconIn}><RepeatPage t={t} mode="install" /></Browser></div> : null}
    {crmOn > 0 ? <div className="scene" style={{ opacity: crmOn }}><Browser url="your-crm.com/sellers" icon={1} iconPress={iconPress}><CrmPage t={t} /></Browser>{t >= T.popup ? <Popup t={t} /> : null}<Files t={t} /></div> : null}
    {uploadOn > 0 ? <div className="scene" style={{ opacity: uploadOn }}><Browser url="repeatai.org/spreadsheets" icon={1}><RepeatPage t={t} mode="upload" /></Browser></div> : null}
    {endOn > 0 ? <div className="titlecard" style={{ opacity: endOn }}><span className="mark big">{MARK}</span><h1>Find the extension in Repeat AI</h1><p>Spreadsheets → Export sellers from your CRM</p></div> : null}
    <Caption t={t} />
    <Cursor t={t} />
  </div>;
}

function App() {
  const params = new URLSearchParams(location.search);
  const [t, setTime] = useState(Number(params.get('t') || 0));
  window.seek = (value) => { setTime(value); return true; };
  window.filmSize = { width: W, height: H, duration: DURATION, name: CUT };
  if (params.get('play') !== '0' && !window.__loop) {
    window.__loop = true;
    const t0 = performance.now();
    const loop = () => { setTime(((performance.now() - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  const scale = params.get('play') === '0' ? 1 : Math.min(innerWidth / W, innerHeight / H);
  return <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}><Film t={t} /></div>;
}
createRoot(document.getElementById('root')).render(<App />);
