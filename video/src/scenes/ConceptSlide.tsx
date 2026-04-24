import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme, type } from "../theme";

export const ConceptSlide: React.FC<{
  line: string;
  eyebrow?: string;
  sub?: string;
  size?: "md" | "lg" | "xl";
}> = ({ line, eyebrow, sub, size = "lg" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const eyebrowOp = interpolate(frame, [0, 16], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineOp = interpolate(frame, [8, 30], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineY = interpolate(frame, [8, 34], [14, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOp = interpolate(frame, [28, 52], [0, 1], {
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

  const fontSize = size === "xl" ? 124 : size === "md" ? 72 : 96;

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
          gap: 32,
          maxWidth: 1600,
          padding: "0 120px",
          textAlign: "center",
        }}
      >
        {eyebrow && (
          <div
            style={{
              ...type.mono,
              fontSize: 18,
              color: theme.muted,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              opacity: eyebrowOp,
            }}
          >
            {eyebrow}
          </div>
        )}
        <div
          style={{
            ...type.displayLight,
            fontSize,
            lineHeight: 1.06,
            color: theme.ink,
            opacity: lineOp,
            transform: `translateY(${lineY}px)`,
          }}
        >
          {line}
        </div>
        {sub && (
          <div
            style={{
              ...type.body,
              fontSize: 28,
              color: theme.muted,
              maxWidth: 1100,
              lineHeight: 1.35,
              opacity: subOp,
              marginTop: 10,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
