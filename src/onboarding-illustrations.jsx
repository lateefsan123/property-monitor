import { FOX_COLLAR, FOX_COLORS, FOX_EYES, FOX_HEAD, FOX_SUIT } from "../shared/repeat-fox";
import { usePopIn } from "./onboarding-motion";

// Onboarding illustrations in Brilliant's style: tilted paper cards with a
// dark outline, flat colour and the mascot (our fox) in front. Every piece
// is a [data-pop] group that usePopIn brings in one after another.
const INK = "#1f1f1f";
const GREEN = "#4cc46f";
const WHATSAPP = "#25d366";

function Fox({ x, y, size = 100, tilt = 0 }) {
  const scale = size / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt} ${size / 2} ${size / 2}) scale(${scale})`}>
      <g data-pop data-pop-from="up">
        {FOX_HEAD.map((shape) => <polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
        {FOX_EYES.map((eye) => <circle key={eye.cx} cx={eye.cx} cy={eye.cy} r={eye.r} fill={FOX_COLORS.ink} />)}
        <path d={FOX_SUIT} fill={FOX_COLORS.suit} />
        {FOX_COLLAR.map((shape) => <polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
      </g>
    </g>
  );
}

// A paper card with Brilliant's dark outline and a soft offset shadow.
function Card({ x, y, w, h, tilt = 0, from, children }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt} ${w / 2} ${h / 2})`}>
      <g data-pop data-pop-from={from}>
        <rect x="3" y="5" width={w} height={h} rx="9" fill="rgba(31,31,31,.12)" />
        <rect width={w} height={h} rx="9" fill="#fff" stroke={INK} strokeWidth="2.5" />
        {children}
      </g>
    </g>
  );
}

function Rows({ x, y, count, width, gap = 16, color = "#e4e4e4" }) {
  return Array.from({ length: count }, (_, index) => (
    <rect key={index} x={x} y={y + index * gap} width={index % 2 ? width * 0.72 : width} height="6" rx="3" fill={color} />
  ));
}

function Art({ label, children }) {
  const ref = usePopIn([label]);
  return (
    <svg ref={ref} className="onb-art" viewBox="0 0 320 300" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

export function SellersArt() {
  return (
    <Art label="Spreadsheets from Excel and Google Sheets turning into your seller list">
      <Card x={52} y={28} w={112} h={130} tilt={-11} from="left">
        <rect x="0" y="0" width="112" height="30" rx="9" fill="#1d6f42" />
        <rect x="0" y="18" width="112" height="12" fill="#1d6f42" />
        <text x="16" y="21" fill="#fff" fontSize="15" fontWeight="800" fontFamily="system-ui, sans-serif">X</text>
        <Rows x={16} y={48} count={5} width={80} />
      </Card>
      <Card x={168} y={40} w={112} h={130} tilt={9} from="right">
        <rect x="0" y="0" width="112" height="30" rx="9" fill="#0f9d58" />
        <rect x="0" y="18" width="112" height="12" fill="#0f9d58" />
        <rect x="14" y="8" width="16" height="14" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M14 15H30M22 8V22" stroke="#fff" strokeWidth="2" />
        <Rows x={16} y={48} count={5} width={80} />
      </Card>
      <Card x={104} y={144} w={170} h={112} tilt={-3} from="up">
        {[0, 1, 2].map((row) => (
          <g key={row} transform={`translate(16 ${18 + row * 30})`}>
            <circle cx="9" cy="9" r="9" fill={["#f6c9a8", "#c9d8f6", "#d5ecd9"][row]} />
            <rect x="26" y="2" width="76" height="6" rx="3" fill="#d4d4d4" />
            <rect x="26" y="12" width="48" height="5" rx="2.5" fill="#ececec" />
            <circle cx="128" cy="9" r="8" fill={GREEN} />
            <path d="M124 9l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </Card>
      <Fox x={4} y={176} size={108} tilt={-6} />
    </Art>
  );
}

export function WhatsAppArt() {
  return (
    <Art label="A WhatsApp message with your broker card and a seller's reply">
      <g transform="translate(118 14) rotate(6 70 130)">
        <g data-pop data-pop-from="up">
          <rect x="4" y="6" width="140" height="262" rx="24" fill="rgba(31,31,31,.14)" />
          <rect width="140" height="262" rx="24" fill={INK} />
          <rect x="8" y="10" width="124" height="242" rx="17" fill="#0b141a" />
          <rect x="8" y="10" width="124" height="30" rx="17" fill="#1f2c34" />
          <rect x="8" y="26" width="124" height="14" fill="#1f2c34" />
          <circle cx="24" cy="25" r="8" fill="#6b7c85" />
          <rect x="38" y="20" width="44" height="5" rx="2.5" fill="#e9edef" />
          <rect x="38" y="29" width="24" height="4" rx="2" fill="#8696a0" />
        </g>
        <g data-pop data-pop-from="right">
          <rect x="34" y="52" width="92" height="104" rx="9" fill="#005c4b" />
          <rect x="39" y="57" width="82" height="34" rx="6" fill="#fff" />
          <rect x="45" y="65" width="34" height="6" rx="3" fill={INK} />
          <rect x="45" y="76" width="26" height="4" rx="2" fill="#9a9a9a" />
          <rect x="94" y="60" width="24" height="28" rx="4" fill="#e3e3e3" />
          <polygon points="98,70 106,60 114,70 106,84" fill={FOX_COLORS.fur} />
          <Rows x={41} y={100} count={4} width={74} gap={12} color="rgba(233,237,239,.75)" />
        </g>
        <g data-pop data-pop-from="left">
          <rect x="14" y="166" width="84" height="30" rx="9" fill="#1f2c34" />
          <rect x="21" y="175" width="62" height="5" rx="2.5" fill="#e9edef" />
          <rect x="21" y="184" width="40" height="5" rx="2.5" fill="#e9edef" />
        </g>
      </g>
      <g transform="translate(244 22)">
        <g data-pop>
          <circle cx="26" cy="26" r="26" fill={WHATSAPP} stroke={INK} strokeWidth="2.5" />
          <path d="M26 13a13 13 0 0 0-11.2 19.6L13 39l6.6-1.7A13 13 0 1 0 26 13Z" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M21 21.5c0 5 3.6 8.6 8.6 8.6l1.6-2.4-2.6-1.4-1.3 1.2c-1.6-.6-2.9-1.9-3.5-3.5l1.2-1.3-1.4-2.6Z" fill="#fff" />
        </g>
      </g>
      <Fox x={8} y={168} size={116} tilt={-5} />
    </Art>
  );
}

export function FollowUpArt() {
  return (
    <Art label="Up to 40 automated WhatsApp follow-ups a day, on the days you choose">
      <Card x={112} y={22} w={170} h={128} tilt={-6} from="up">
        <text x="20" y="84" fill={INK} fontSize="72" fontWeight="800" fontFamily="system-ui, sans-serif" letterSpacing="-3">40</text>
        <text x="112" y="84" fill="#5f6064" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">a day</text>
        <rect x="20" y="102" width="130" height="7" rx="3.5" fill="#e8e8e8" />
        <rect x="20" y="102" width="96" height="7" rx="3.5" fill={GREEN} />
      </Card>
      <Card x={168} y={156} w={118} h={102} tilt={7} from="right">
        <rect x="0" y="0" width="118" height="26" rx="9" fill={GREEN} />
        <rect x="0" y="16" width="118" height="10" fill={GREEN} />
        {Array.from({ length: 12 }, (_, index) => {
          const on = [1, 3, 5, 8, 10].includes(index);
          const cx = 18 + (index % 4) * 27;
          const cy = 42 + Math.floor(index / 4) * 20;
          return (
            <g key={index}>
              <rect x={cx - 9} y={cy - 7} width="18" height="14" rx="4" fill={on ? GREEN : "#eeeeee"} />
              {on && <path d={`M${cx - 4} ${cy}l3 3 5-6`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
      </Card>
      <g transform="translate(118 170)">
        <g data-pop data-pop-from="left">
          <rect width="62" height="30" rx="10" fill="#d9fdd3" stroke={INK} strokeWidth="2.5" />
          <path d="M40 19l3 3 6-7M47 19l3 3 6-7" fill="none" stroke="#53bdeb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="10" width="24" height="5" rx="2.5" fill="#7a9a74" />
        </g>
      </g>
      <Fox x={4} y={176} size={110} tilt={-4} />
    </Art>
  );
}

