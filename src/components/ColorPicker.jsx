import { useState } from "react";
import { hexToHsv, hsvToHex, hueToHex, normalizeHex } from "../../shared/color.js";
import "../styles/color-picker.css";

// A colour picker after Play's "New Color" sheet (Mobbin 6536987f): a
// saturation/brightness square, a hue slider under it, the hex code and a row
// of quick swatches. Drag with mouse, touch or pen; arrow keys nudge.
function dragHandlers(onMove) {
  function point(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    onMove(x, y);
  }
  return {
    onPointerDown(event) {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      point(event);
    },
    onPointerMove(event) {
      if (event.buttons || event.pointerType === "touch") point(event);
    },
  };
}

export default function ColorPicker({ value, onChange, swatches = [] }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  // HSV is kept here (not derived from `value`) so greys keep their hue while
  // dragging; every colour change comes from this picker.
  const [hexText, setHexText] = useState((normalizeHex(value) || "#3b82f6").slice(1));

  function update(next) {
    const merged = { ...hsv, ...next };
    setHsv(merged);
    const hex = hsvToHex(merged);
    setHexText(hex.slice(1));
    onChange(hex);
  }

  function pick(swatch) {
    setHsv(hexToHsv(swatch));
    setHexText(swatch.slice(1));
    onChange(swatch);
  }

  const square = dragHandlers((x, y) => update({ s: x, v: 1 - y }));
  const hue = dragHandlers((x) => update({ h: x * 360 }));
  const hex = hsvToHex(hsv);

  function nudge(event, keys) {
    const step = event.shiftKey ? 0.1 : 0.02;
    const change = keys[event.key];
    if (!change) return;
    event.preventDefault();
    update(change(step));
  }

  return (
    <div className="cpk">
      <div
        {...square}
        className="cpk-square"
        style={{ "--cpk-hue": hueToHex(hsv.h) }}
        role="slider"
        tabIndex={0}
        aria-label="Shade and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onKeyDown={(event) => nudge(event, {
          ArrowLeft: (step) => ({ s: Math.max(0, hsv.s - step) }),
          ArrowRight: (step) => ({ s: Math.min(1, hsv.s + step) }),
          ArrowUp: (step) => ({ v: Math.min(1, hsv.v + step) }),
          ArrowDown: (step) => ({ v: Math.max(0, hsv.v - step) }),
        })}
      >
        <span className="cpk-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
      </div>
      <div
        {...hue}
        className="cpk-hue"
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={(event) => nudge(event, {
          ArrowLeft: (step) => ({ h: Math.max(0, hsv.h - step * 360) }),
          ArrowRight: (step) => ({ h: Math.min(360, hsv.h + step * 360) }),
        })}
      >
        <span className="cpk-thumb" style={{ left: `${(hsv.h / 360) * 100}%`, top: "50%", background: hueToHex(hsv.h) }} />
      </div>
      <div className="cpk-row">
        <label className="cpk-hex">
          <span aria-hidden="true">#</span>
          <input value={hexText} maxLength={6} spellCheck={false} aria-label="Hex colour"
            onChange={(event) => {
              const text = event.target.value.replace(/[^0-9a-fA-F]/g, "");
              setHexText(text);
              const next = normalizeHex(text);
              if (next && text.length === 6) {
                setHsv(hexToHsv(next));
                onChange(next);
              }
            }}
            onBlur={() => setHexText(hex.slice(1))} />
        </label>
        <span className="cpk-preview" style={{ background: hex }} aria-hidden="true" />
      </div>
      {swatches.length ? (
        <div className="cpk-swatches" role="radiogroup" aria-label="Quick colours">
          {swatches.map((swatch) => (
            <button key={swatch} type="button" role="radio" aria-checked={hex === swatch} aria-label={swatch}
              className={`cpk-swatch${hex === swatch ? " is-active" : ""}`} style={{ "--swatch": swatch }}
              onClick={() => pick(swatch)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
