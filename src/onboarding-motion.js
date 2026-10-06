import { useEffect, useRef, useState } from "react";

// Onboarding motion, written with the Web Animations API so each step can
// sequence its own entrance: illustration pieces pop in one after another,
// the fox hops in, and its speech bubble types itself out.
const SPRING = "cubic-bezier(.34, 1.56, .64, 1)";

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// Pops every [data-pop] element inside the ref in document order. A piece
// can set data-pop-delay (ms) to hold back, or data-pop-from="left|right|up".
export function usePopIn(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion() || !root.animate) return undefined;
    const pieces = Array.from(root.querySelectorAll("[data-pop]"));
    const animations = pieces.map((piece, index) => {
      piece.style.transformBox = "fill-box";
      piece.style.transformOrigin = "center";
      const from = piece.dataset.popFrom;
      const start = from === "left" ? "translate(-24px, 0) scale(.9)"
        : from === "right" ? "translate(24px, 0) scale(.9)"
          : from === "up" ? "translate(0, 18px) scale(.9)"
            : "scale(.5)";
      return piece.animate(
        [{ opacity: 0, transform: start }, { opacity: 1, transform: "none" }],
        { duration: 520, delay: Number(piece.dataset.popDelay ?? 120 + index * 110), easing: SPRING, fill: "backwards" },
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// A small hop for the fox when a step appears, then a gentle idle bob.
export function useFoxHop(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const fox = ref.current;
    if (!fox || reducedMotion() || !fox.animate) return undefined;
    const hop = fox.animate(
      [
        { transform: "translateY(16px) scale(.85)", opacity: 0 },
        { transform: "translateY(-10px) scale(1.04)", opacity: 1, offset: 0.55 },
        { transform: "translateY(0) scale(1)", opacity: 1 },
      ],
      { duration: 620, easing: "ease-out", fill: "backwards" },
    );
    const bob = fox.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-4px)" }, { transform: "translateY(0)" }],
      { duration: 2600, delay: 700, iterations: Infinity, easing: "ease-in-out" },
    );
    return () => { hop.cancel(); bob.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

// Types the fox's line out a few characters at a time.
export function useTypewriter(text, { speed = 22, delay = 280 } = {}) {
  const [shown, setShown] = useState(() => (reducedMotion() ? text : ""));
  useEffect(() => {
    if (reducedMotion()) {
      setShown(text);
      return undefined;
    }
    setShown("");
    let index = 0;
    let timer = setTimeout(function tick() {
      index += 1;
      setShown(text.slice(0, index));
      if (index < text.length) timer = setTimeout(tick, speed);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, speed, delay]);
  return shown;
}
