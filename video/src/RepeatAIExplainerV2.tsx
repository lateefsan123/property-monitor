import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadInter();

const FPS = 30;
const s = (seconds: number) => Math.round(seconds * FPS);
export const REPEAT_AI_V2_DURATION_IN_FRAMES = s(84);

const ink = "#161714";
const green = "#0e6f3f";
const paper = "#fbfbf7";
const muted = "#73766f";
const line = "#e5e6df";
const font = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const asset = (name: string) => staticFile(`video/repeat-ai-v2/sketches/${name}`);

const opacityFor = (frame: number, duration: number) =>
  interpolate(frame, [0, 14, duration - 14, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

const Wordmark: React.FC<{ light?: boolean }> = ({ light = false }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <Img
      src={staticFile("brand/repeat-ai-icon.png")}
      style={{ width: 48, height: 48, objectFit: "contain", filter: light ? undefined : "invert(1)" }}
    />
    <span style={{ fontFamily: font, color: light ? "white" : ink, fontSize: 31, fontWeight: 760, letterSpacing: "-0.04em" }}>
      Repeat AI
    </span>
  </div>
);

const Sketch: React.FC<{
  src: string;
  width: number;
  x: number;
  y: number;
  delay?: number;
  rotate?: number;
  float?: number;
}> = ({ src, width, x, y, delay = 0, rotate = 0, float = 0 }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame: frame - delay, fps: FPS, config: { damping: 15, stiffness: 105, mass: 0.8 } });
  const drift = Math.sin((frame + delay) / 22) * float;
  return (
    <Img
      src={asset(src)}
      style={{
        position: "absolute",
        width,
        left: x,
        top: y + drift,
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.72, 1])}) rotate(${rotate + drift * 0.18}deg)`,
        transformOrigin: "center",
      }}
    />
  );
};

const ChaosScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const title = spring({ frame: frame - 30, fps: FPS, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: paper, opacity: opacityFor(frame, duration), overflow: "hidden" }}>
      <Sketch src="broker-overwhelmed.png" width={430} x={745} y={285} delay={0} float={5} />
      <Sketch src="property-card.png" width={370} x={145} y={125} delay={10} rotate={-6} float={8} />
      <Sketch src="spreadsheet.png" width={390} x={1360} y={105} delay={18} rotate={5} float={7} />
      <Sketch src="phone-messages.png" width={270} x={220} y={625} delay={26} rotate={-4} float={9} />
      <Sketch src="checklist.png" width={275} x={1390} y={625} delay={34} rotate={4} float={8} />
      <div
        style={{
          position: "absolute",
          top: 74,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: title,
          transform: `translateY(${interpolate(title, [0, 1], [20, 0])}px)`,
          fontFamily: font,
          fontSize: 66,
          fontWeight: 680,
          letterSpacing: "-0.05em",
          color: ink,
        }}
      >
        Seller follow-up gets complicated.
      </div>
    </AbsoluteFill>
  );
};

const MatchScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [54, 178], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const pulse = 1 + Math.sin(frame / 8) * 0.07;
  return (
    <AbsoluteFill style={{ background: "white", opacity: opacityFor(frame, duration), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 100, top: 78 }}><Wordmark /></div>
      <div style={{ position: "absolute", left: 100, top: 190, fontFamily: font, color: ink, fontSize: 76, fontWeight: 680, letterSpacing: "-0.055em", lineHeight: 1.02, width: 780 }}>
        One signal.<br />The right seller.
      </div>
      <Img src={asset("property-card.png")} style={{ position: "absolute", left: 935, top: 150, width: 440, transform: "rotate(-3deg)" }} />
      <Img src={asset("seller-card.png")} style={{ position: "absolute", left: 1320, top: 610, width: 430, transform: "rotate(3deg)" }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path d="M 1220 485 C 1450 480, 1450 650, 1515 690" fill="none" stroke={line} strokeWidth="6" strokeLinecap="round" />
        <path d="M 1220 485 C 1450 480, 1450 650, 1515 690" fill="none" stroke={green} strokeWidth="7" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      </svg>
      <div style={{ position: "absolute", left: 1194, top: 459, width: 52, height: 52, borderRadius: 99, background: green, transform: `scale(${pulse})`, boxShadow: "0 0 0 12px rgba(14,111,63,.10)" }} />
    </AbsoluteFill>
  );
};

const Browser: React.FC<{ src: string; duration: number }> = ({ src, duration }) => {
  const frame = useCurrentFrame();
  const rise = spring({ frame, fps: FPS, config: { damping: 18, stiffness: 90 } });
  const zoom = interpolate(frame, [0, duration], [1.015, 1.07], { extrapolateRight: "clamp" });
  return (
    <div style={{ width: 1500, height: 840, borderRadius: 26, overflow: "hidden", background: "white", boxShadow: "0 28px 80px rgba(30,35,31,.16)", border: `1px solid ${line}`, transform: `translateY(${interpolate(rise, [0, 1], [45, 0])}px)` }}>
      <div style={{ height: 46, background: "#fafafa", borderBottom: `1px solid ${line}`, display: "flex", alignItems: "center", paddingLeft: 20, gap: 8 }}>
        {["#ff6d65", "#f5c04f", "#61c654"].map((color) => <span key={color} style={{ width: 10, height: 10, borderRadius: 10, background: color }} />)}
      </div>
      <div style={{ height: 794, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", transform: `scale(${zoom})` }} />
      </div>
    </div>
  );
};

const ProductScene: React.FC<{ duration: number; label: string; title: string; src: string }> = ({ duration, label, title, src }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: paper, opacity: opacityFor(frame, duration), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 100, top: 55, zIndex: 2 }}>
        <div style={{ fontFamily: font, color: green, fontSize: 17, textTransform: "uppercase", letterSpacing: ".17em", fontWeight: 760 }}>{label}</div>
        <div style={{ marginTop: 10, fontFamily: font, color: ink, fontSize: 54, fontWeight: 680, letterSpacing: "-0.05em" }}>{title}</div>
      </div>
      <div style={{ position: "absolute", left: 210, top: 205 }}><Browser src={src} duration={duration} /></div>
    </AbsoluteFill>
  );
};

const OutreachScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const phone = spring({ frame: frame - 18, fps: FPS, config: { damping: 15, stiffness: 95 } });
  const reply = spring({ frame: frame - 76, fps: FPS, config: { damping: 14, stiffness: 100 } });
  return (
    <AbsoluteFill style={{ background: "white", opacity: opacityFor(frame, duration), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 110, top: 96, fontFamily: font, fontSize: 74, fontWeight: 690, letterSpacing: "-0.055em", color: ink, lineHeight: 1.02, width: 760 }}>
        Turn the update<br />into a conversation.
      </div>
      <Img src={asset("phone-messages.png")} style={{ position: "absolute", left: 980, top: 155, width: 430, opacity: phone, transform: `translateY(${interpolate(phone, [0, 1], [55, 0])}px) rotate(-4deg)` }} />
      <Img src={asset("seller-card.png")} style={{ position: "absolute", left: 1325, top: 560, width: 390, opacity: reply, transform: `translateX(${interpolate(reply, [0, 1], [90, 0])}px) rotate(3deg)` }} />
      <div style={{ position: "absolute", left: 210, bottom: 140, padding: "20px 28px", borderRadius: 18, background: "#eaf3ed", color: green, fontFamily: font, fontSize: 27, fontWeight: 650 }}>
        Signal → seller → message → reply
      </div>
    </AbsoluteFill>
  );
};

const OutcomeScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: FPS, config: { damping: 17, stiffness: 85 } });
  const trail = interpolate(frame, [45, 145], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: paper, opacity: opacityFor(frame, duration), overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 110, top: 110 }}><Wordmark /></div>
      <div style={{ position: "absolute", left: 110, top: 260, fontFamily: font, color: ink, fontSize: 82, lineHeight: 1.02, fontWeight: 680, letterSpacing: "-0.06em", width: 870 }}>
        Less chasing.<br />More timely conversations.
      </div>
      <div style={{ position: "absolute", left: 115, top: 520, fontFamily: font, color: muted, fontSize: 29, lineHeight: 1.4, width: 670 }}>
        Seller follow-up, done properly.
      </div>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <path d="M 760 735 C 960 660, 1120 760, 1330 610" fill="none" stroke={green} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray=".035 .03" strokeDashoffset={1 - trail} />
      </svg>
      <Img src={asset("broker-calm.png")} style={{ position: "absolute", right: 160, top: 105, height: 890, opacity: enter, transform: `translateX(${interpolate(enter, [0, 1], [70, 0])}px)` }} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: FPS, config: { damping: 18, stiffness: 80 } });
  return (
    <AbsoluteFill style={{ background: ink, opacity: opacityFor(frame, duration), alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Wordmark light />
        <div style={{ marginTop: 36, color: "white", fontFamily: font, fontSize: 75, fontWeight: 680, letterSpacing: "-0.055em" }}>Seller follow-up, done properly.</div>
        <div style={{ marginTop: 55, background: "white", color: ink, borderRadius: 999, padding: "17px 31px", fontFamily: font, fontSize: 23, fontWeight: 720 }}>Start your 7-day free trial</div>
      </div>
    </AbsoluteFill>
  );
};

export const RepeatAIExplainerV2: React.FC = () => (
  <AbsoluteFill style={{ background: paper }}>
    <Sequence from={s(0)} durationInFrames={s(13)}><ChaosScene duration={s(13)} /></Sequence>
    <Sequence from={s(12)} durationInFrames={s(11)}><MatchScene duration={s(11)} /></Sequence>
    <Sequence from={s(22)} durationInFrames={s(13)}><ProductScene duration={s(13)} label="Start with clarity" title="Know what needs attention today." src="landing/home.png" /></Sequence>
    <Sequence from={s(34)} durationInFrames={s(12)}><ProductScene duration={s(12)} label="See the change" title="Track the listings that matter." src="landing/listings.png" /></Sequence>
    <Sequence from={s(45)} durationInFrames={s(12)}><ProductScene duration={s(12)} label="Keep the context" title="Every seller. Every next step." src="landing/sellers.png" /></Sequence>
    <Sequence from={s(56)} durationInFrames={s(12)}><OutreachScene duration={s(12)} /></Sequence>
    <Sequence from={s(67)} durationInFrames={s(11)}><OutcomeScene duration={s(11)} /></Sequence>
    <Sequence from={s(77)} durationInFrames={s(7)}><EndCard duration={s(7)} /></Sequence>
  </AbsoluteFill>
);
