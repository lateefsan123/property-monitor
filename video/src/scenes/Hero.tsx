import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme, type } from "../theme";

export const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const wordmarkOp = interpolate(frame, [2, 22], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineOp = interpolate(frame, [40, 64], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineY = interpolate(frame, [40, 68], [14, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outOp = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
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
          gap: 42,
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
              display: "inline-block",
            }}
          />
          Seller Signal
        </div>

        <div
          style={{
            ...type.displayLight,
            fontSize: 108,
            lineHeight: 1.05,
            color: theme.ink,
            opacity: lineOp,
            transform: `translateY(${lineY}px)`,
            maxWidth: 1500,
          }}
        >
          Seller follow-up, done properly.
        </div>
      </div>
    </AbsoluteFill>
  );
};
