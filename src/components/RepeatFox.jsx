import { FOX_COLLAR, FOX_COLORS, FOX_EYES, FOX_HEAD, FOX_SUIT } from "../../shared/repeat-fox";
import "../styles/repeat-fox.css";

// Repeat, the broker fox. It blinks when idle, tilts its head while
// listening and nods while an answer is on its way ("thinking").
export default function RepeatFox({ size = 24, state = "idle", className = "", title }) {
  return (
    <svg
      className={`repeat-fox is-${state}${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g className="repeat-fox-head">
        {FOX_HEAD.map((shape) => <polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
        <g className="repeat-fox-eyes">
          {FOX_EYES.map((eye) => <circle key={eye.cx} cx={eye.cx} cy={eye.cy} r={eye.r} fill={FOX_COLORS.ink} />)}
        </g>
      </g>
      <path d={FOX_SUIT} fill={FOX_COLORS.suit} />
      {FOX_COLLAR.map((shape) => <polygon key={shape.points} points={shape.points} fill={FOX_COLORS[shape.fill]} />)}
    </svg>
  );
}
