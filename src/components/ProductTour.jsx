import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { TOUR_STEPS, readTourState, saveTourState } from "./product-tour";
import "../styles/product-tour.css";

export default function ProductTour({ userId, onNavigate, onAction }) {
  const [state, setState] = useState(() => {
    try { return readTourState(window.localStorage, userId); } catch { return { step: 0, open: false }; }
  });
  const heading = useRef(null);
  const launcher = useRef(null);
  const step = TOUR_STEPS[state.step];
  const destinationLabel = step.cta || `Open ${({ home: 'home', spreadsheets: 'spreadsheets', sellers: 'sellers', 'listing-alerts': 'listings' })[step.page]}`;

  useEffect(() => {
    if (!state.open) return;
    heading.current?.focus({ preventScroll: true });
    let highlighted;
    const highlight = () => {
      const next = document.querySelector(step.target);
      if (highlighted !== next) {
        highlighted?.classList.remove("repeat-tour-target");
        next?.classList.add("repeat-tour-target");
        highlighted = next;
      }
    };
    highlight();
    const observer = new MutationObserver(highlight);
    observer.observe(document.querySelector(".app-main") || document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); highlighted?.classList.remove("repeat-tour-target"); };
  }, [state.open, step]);

  function close() {
    persist(state.step);
    setState({ ...state, open: false });
    requestAnimationFrame(() => launcher.current?.focus());
  }

  function persist(index) {
    try { saveTourState(window.localStorage, userId, index); } catch { /* Storage may be disabled. */ }
  }

  function move(index) {
    const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
    persist(next);
    setState({ step: next, open: true });
  }

  function openDestination() {
    close();
    if (step.action) onAction(step.action);
    else onNavigate(step.page);
  }

  return (
    <div className="repeat-tour" onKeyDown={event => { if (event.key === "Escape" && state.open) { event.stopPropagation(); close(); } }}>
      {state.open ? (
        <section className="repeat-tour-card" role="region" aria-labelledby="repeat-tour-heading">
          <div className="repeat-tour-visual">
            <button type="button" className="repeat-tour-image-link" aria-label={destinationLabel} onClick={openDestination}>
              <img src={`/landing/${step.image}`} alt="" />
            </button>
            <button type="button" className="repeat-tour-close" aria-label="Close tour" onClick={close}>×</button>
          </div>
          <div className="repeat-tour-copy">
            <h2 id="repeat-tour-heading" tabIndex={-1} ref={heading}>{step.title}</h2>
            <p>{step.description}</p>
            <button type="button" className="repeat-tour-link" onClick={openDestination}>{destinationLabel} ↗</button>
            <div className="repeat-tour-controls">
              <progress aria-label="Tour progress" max={TOUR_STEPS.length} value={state.step + 1} />
              <span className="repeat-tour-count">{state.step + 1} / {TOUR_STEPS.length}</span>
              {state.step > 0 && <button type="button" className="repeat-tour-back" onClick={() => move(state.step - 1)}>Back</button>}
              <button type="button" className="repeat-tour-next" onClick={() => state.step === TOUR_STEPS.length - 1 ? close() : move(state.step + 1)}>{state.step === TOUR_STEPS.length - 1 ? "Done" : "Next"}</button>
            </div>
          </div>
        </section>
      ) : (
        <button ref={launcher} type="button" className="repeat-tour-launcher" aria-label="Open product tour" onClick={() => move(state.step === TOUR_STEPS.length - 1 ? 0 : state.step)}><CircleHelp className="repeat-tour-help-icon" size={20} strokeWidth={1.75} aria-hidden="true" />Quick tour</button>
      )}
    </div>
  );
}
