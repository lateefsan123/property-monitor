import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme, type } from "../theme";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const wordmarkOp = interpolate(frame, [2, 20], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineOp = interpolate(frame, [18, 40], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineY = interpolate(frame, [18, 44], [16, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const metaOp = interpolate(frame, [54, 78], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outOp = interpolate(
    frame,
    [durationInFrames - 22, durationInFrames],
    [1, 0],
    { easing: Easing.in(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dotPulse = interpolate(frame % 50, [0, 25, 50], [1, 0.3, 1], {
    easing: Easing.inOut(Easing.sin),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: outOp,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 36,
          textAlign: "center",
          padding: "0 120px",
        }}
      >
        <div
          style={{
            ...type.mono,
            fontSize: 18,
            color: theme.muted,
            textTransform: "uppercase",
            letterSpacing: "0.32em",
            opacity: wordmarkOp,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: theme.ink,
              opacity: dotPulse,
            }}
          />
          Seller Signal
        </div>

        <div
          style={{
            ...type.displayLight,
            fontSize: 98,
            lineHeight: 1.04,
            color: theme.ink,
            opacity: lineOp,
            transform: `translateY(${lineY}px)`,
            maxWidth: 1500,
          }}
        >
          A calmer way to work your pipeline.
        </div>

        <div
          style={{
            ...type.body,
            fontSize: 26,
            color: theme.muted,
            opacity: metaOp,
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginTop: 14,
          }}
        >
          <span>€20 / month</span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.hairline }} />
          <span>14-day free trial</span>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.hairline }} />
          <span>Built for Dubai brokers</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
