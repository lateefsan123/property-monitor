import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

loadInter();

const FPS = 30;
const seconds = (value: number) => Math.round(value * FPS);

export const REPEAT_AI_DURATION_IN_FRAMES = seconds(104);

const colors = {
  ink: "#151515",
  muted: "#6f716e",
  line: "#e8e8e3",
  paper: "#fbfbf7",
  white: "#ffffff",
  green: "#3f6c53",
  greenSoft: "#e8f0e9",
  sand: "#f1eadf",
  peach: "#f3ded2",
  blue: "#dfeaec",
};

const font = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const fade = (frame: number, duration: number) =>
  interpolate(frame, [0, 18, duration - 18, duration], [0, 1, 1, 0], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      color: colors.green,
      fontFamily: font,
      fontSize: 19,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </div>
);

const BrowserFrame: React.FC<{
  src: string;
  duration: number;
  crop?: "cover" | "contain";
}> = ({ src, duration, crop = "cover" }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, duration], [1.035, 1.085], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lift = spring({ frame, fps: FPS, config: { damping: 18, stiffness: 90 } });

  return (
    <div
      style={{
        width: 1460,
        height: 820,
        borderRadius: 26,
        overflow: "hidden",
        background: colors.white,
        border: `1px solid ${colors.line}`,
        boxShadow: "0 30px 80px rgba(30, 39, 33, 0.14)",
        transform: `translateY(${interpolate(lift, [0, 1], [36, 0])}px)`,
      }}
    >
      <div
        style={{
          height: 50,
          display: "flex",
          alignItems: "center",
          gap: 9,
          paddingLeft: 22,
          borderBottom: `1px solid ${colors.line}`,
          background: "#fafafa",
        }}
      >
        {["#ff6b62", "#f6bf4f", "#62c554"].map((color) => (
          <span key={color} style={{ width: 11, height: 11, borderRadius: 20, background: color }} />
        ))}
      </div>
      <div style={{ height: 770, overflow: "hidden", background: colors.white }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: crop,
            objectPosition: "center top",
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
};

const ProblemScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const items = [
    { label: "Portal alerts", x: 145, y: 160, r: -5, color: colors.blue },
    { label: "Seller spreadsheet", x: 1160, y: 125, r: 4, color: colors.sand },
    { label: "Call notes", x: 200, y: 705, r: 3, color: colors.peach },
    { label: "WhatsApp chats", x: 1230, y: 720, r: -4, color: colors.greenSoft },
  ];

  return (
    <AbsoluteFill style={{ background: colors.paper, opacity: fade(frame, duration) }}>
      {items.map((item, index) => {
        const enter = spring({ frame: frame - index * 8, fps: FPS, config: { damping: 16, stiffness: 100 } });
        return (
          <div
            key={item.label}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              width: 360,
              height: 145,
              borderRadius: 18,
              background: item.color,
              border: `1px solid ${colors.line}`,
              boxShadow: "0 16px 40px rgba(50,50,45,.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.ink,
              fontFamily: font,
              fontSize: 30,
              fontWeight: 600,
              transform: `rotate(${item.r}deg) scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
              opacity: enter,
            }}
          >
            {item.label}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 440px",
          color: colors.ink,
          fontFamily: font,
          fontSize: 75,
          lineHeight: 1.02,
          fontWeight: 650,
          letterSpacing: "-0.05em",
        }}
      >
        Dubai property moves fast.
      </div>
    </AbsoluteFill>
  );
};

const FlowScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [38, duration - 28], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const steps = ["Market signal", "Right seller", "Useful message", "Real reply"];

  return (
    <AbsoluteFill
      style={{
        background: colors.white,
        opacity: fade(frame, duration),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 64 }}>
        <Img src={staticFile("brand/repeat-ai-icon-black.png")} style={{ width: 76, height: 76, objectFit: "contain" }} />
        <div style={{ fontFamily: font, fontWeight: 750, fontSize: 48, color: colors.ink, letterSpacing: "-0.04em" }}>
          Repeat AI
        </div>
      </div>
      <div style={{ fontFamily: font, fontSize: 66, fontWeight: 620, letterSpacing: "-0.045em", color: colors.ink, marginBottom: 88 }}>
        One calm workflow.
      </div>
      <div style={{ display: "flex", alignItems: "center", width: 1500, justifyContent: "space-between", position: "relative" }}>
        <div style={{ position: "absolute", height: 3, left: 110, right: 110, top: 35, background: colors.line }} />
        <div style={{ position: "absolute", height: 3, left: 110, top: 35, width: 1280 * progress, background: colors.green }} />
        {steps.map((step, index) => {
          const visible = progress >= index / (steps.length - 1) - 0.03;
          return (
            <div key={step} style={{ width: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, zIndex: 1 }}>
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 70,
                  background: visible ? colors.green : colors.white,
                  border: `3px solid ${visible ? colors.green : colors.line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.white,
                  fontFamily: font,
                  fontSize: 27,
                  fontWeight: 700,
                }}
              >
                {visible ? "✓" : index + 1}
              </div>
              <div style={{ fontFamily: font, color: colors.ink, fontSize: 27, fontWeight: 620 }}>{step}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ProductScene: React.FC<{
  duration: number;
  eyebrow: string;
  title: string;
  src: string;
}> = ({ duration, eyebrow, title, src }) => {
  const frame = useCurrentFrame();
  const copy = spring({ frame: frame - 6, fps: FPS, config: { damping: 18, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: colors.paper, opacity: fade(frame, duration) }}>
      <div style={{ position: "absolute", left: 110, top: 80, zIndex: 3, opacity: copy }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <div
          style={{
            marginTop: 14,
            width: 780,
            fontFamily: font,
            fontSize: 54,
            lineHeight: 1.06,
            fontWeight: 650,
            letterSpacing: "-0.045em",
            color: colors.ink,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ position: "absolute", left: 230, top: 235 }}>
        <BrowserFrame src={src} duration={duration} />
      </div>
    </AbsoluteFill>
  );
};

const MessageScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const arrow = interpolate(frame, [45, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: colors.paper, opacity: fade(frame, duration), alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: 110, top: 78 }}>
        <Eyebrow>Close the loop</Eyebrow>
        <div style={{ marginTop: 14, fontFamily: font, fontSize: 58, fontWeight: 650, letterSpacing: "-0.045em", color: colors.ink }}>
          Turn the signal into a conversation.
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 90, marginTop: 120 }}>
        <div style={{ width: 540, padding: 42, borderRadius: 28, background: colors.white, border: `1px solid ${colors.line}`, boxShadow: "0 25px 70px rgba(35,45,38,.11)" }}>
          <div style={{ fontFamily: font, fontSize: 19, fontWeight: 750, color: colors.green, letterSpacing: ".14em", textTransform: "uppercase" }}>Market signal</div>
          <div style={{ fontFamily: font, fontSize: 42, lineHeight: 1.08, fontWeight: 650, color: colors.ink, marginTop: 22 }}>A relevant price change appears.</div>
          <div style={{ marginTop: 30, padding: "18px 20px", borderRadius: 14, background: colors.greenSoft, fontFamily: font, fontSize: 24, color: colors.green }}>Matched to the right seller ✓</div>
        </div>
        <div style={{ width: 190, height: 3, background: colors.line, position: "relative", overflow: "visible" }}>
          <div style={{ height: 3, width: 190 * arrow, background: colors.green }} />
          <div style={{ position: "absolute", right: -4, top: -10, color: colors.green, fontSize: 28 }}>›</div>
        </div>
        <div style={{ width: 650, height: 520, borderRadius: 28, overflow: "hidden", background: colors.white, boxShadow: "0 25px 70px rgba(35,45,38,.13)", border: `1px solid ${colors.line}` }}>
          <Img src={staticFile("landing/whatsapp-agent-conversation.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TrustScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const points = ["Built for Dubai brokers", "Seller data stays scoped to your account", "Web, Windows, and mobile"];
  return (
    <AbsoluteFill style={{ background: colors.white, opacity: fade(frame, duration), alignItems: "center", justifyContent: "center" }}>
      <Eyebrow>Made for the way you work</Eyebrow>
      <div style={{ marginTop: 30, fontFamily: font, fontSize: 72, fontWeight: 650, letterSpacing: "-0.05em", color: colors.ink }}>Focused, private, and ready anywhere.</div>
      <div style={{ display: "flex", gap: 28, marginTop: 82 }}>
        {points.map((point, index) => {
          const enter = spring({ frame: frame - 24 - index * 12, fps: FPS, config: { damping: 18, stiffness: 90 } });
          return (
            <div key={point} style={{ width: 430, minHeight: 170, padding: 34, borderRadius: 22, background: [colors.sand, colors.greenSoft, colors.blue][index], opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 40, background: colors.green, color: colors.white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 22, fontWeight: 700 }}>✓</div>
              <div style={{ fontFamily: font, color: colors.ink, fontSize: 26, lineHeight: 1.25, fontWeight: 590 }}>{point}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: FPS, config: { damping: 20, stiffness: 80 } });
  return (
    <AbsoluteFill style={{ background: colors.ink, opacity: fade(frame, duration), alignItems: "center", justifyContent: "center", color: colors.white }}>
      <Img src={staticFile("brand/repeat-ai-icon.png")} style={{ width: 118, height: 92, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: enter }} />
      <div style={{ marginTop: 32, fontFamily: font, fontSize: 84, fontWeight: 720, letterSpacing: "-0.055em" }}>Repeat AI</div>
      <div style={{ marginTop: 24, fontFamily: font, fontSize: 38, color: "#d5d6d2", fontWeight: 450 }}>Seller follow-up, done properly.</div>
      <div style={{ marginTop: 62, padding: "18px 34px", borderRadius: 999, background: colors.white, color: colors.ink, fontFamily: font, fontSize: 24, fontWeight: 700 }}>Start your 7-day free trial</div>
    </AbsoluteFill>
  );
};

export const RepeatAIExplainer: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: colors.paper }}>
      <Audio src={staticFile("repeat-ai-explainer-voice.mp3")} volume={1} />
      <Sequence from={seconds(0)} durationInFrames={seconds(9)}><ProblemScene duration={seconds(9)} /></Sequence>
      <Sequence from={seconds(8)} durationInFrames={seconds(14)}><FlowScene duration={seconds(14)} /></Sequence>
      <Sequence from={seconds(21)} durationInFrames={seconds(13)}><ProductScene duration={seconds(13)} eyebrow="Start with clarity" title="Know what needs attention today." src="landing/home.png" /></Sequence>
      <Sequence from={seconds(33)} durationInFrames={seconds(14)}><ProductScene duration={seconds(14)} eyebrow="See the change" title="Track the listings that actually matter." src="landing/listings.png" /></Sequence>
      <Sequence from={seconds(46)} durationInFrames={seconds(18)}><ProductScene duration={seconds(18)} eyebrow="Keep the context" title="Every seller. Every note. Every next step." src="landing/sellers.png" /></Sequence>
      <Sequence from={seconds(63)} durationInFrames={seconds(13)}><ProductScene duration={seconds(13)} eyebrow="Bring your data" title="Your spreadsheets, without the mess." src="landing/spreadsheets.png" /></Sequence>
      <Sequence from={seconds(75)} durationInFrames={seconds(14)}><MessageScene duration={seconds(14)} /></Sequence>
      <Sequence from={seconds(88)} durationInFrames={seconds(10)}><TrustScene duration={seconds(10)} /></Sequence>
      <Sequence from={seconds(97)} durationInFrames={seconds(7)}><ClosingScene duration={seconds(7)} /></Sequence>
    </AbsoluteFill>
  );
};
