import "./styles/landing-connected-stack.css";

const panels = [
  {
    id: "tools",
    caption: "Connect your spreadsheets, market data and WhatsApp",
    alt: "Excel, Google Sheets, WhatsApp and Bayut arranged as four connected-workspace tools.",
  },
  {
    id: "data",
    caption: "Keep sellers, buildings, notes and follow-ups together",
    alt: "Four joined pieces represent sellers, buildings, notes and follow-ups.",
  },
  {
    id: "ai",
    caption: "Work with your sellers in Claude or ChatGPT via MCP",
    alt: "Illustrative prompt beside Claude and ChatGPT symbols: Show my sellers in Forte 2. Requires an MCP connection; not an interactive chat.",
  },
  {
    id: "devices",
    caption: "Take your workspace from desktop to mobile",
    alt: "A desktop monitor and phone display the same simplified sample seller list.",
  },
];

const connectedPanels = panels.map((panel) => (
  <li className="landing-stack-panel" key={panel.id}>
    <img
      src={`/landing/stack-${panel.id}${panel.id === "devices" ? "-dubai" : ""}-v1.png`}
      alt={panel.alt}
      width="1499"
      height="1049"
      loading="lazy"
      decoding="async"
    />
    <h3>{panel.caption}</h3>
  </li>
));

export default function LandingConnectedStack() {
  return (
    <section className="landing-stack" id="connected-stack" aria-labelledby="landing-stack-heading">
      <div className="landing-stack-inner">
        <h2 id="landing-stack-heading">One workspace. Connected to your tools.</h2>
        <ul className="landing-stack-grid" tabIndex={0} aria-label="Connected workspace capabilities">
          {connectedPanels}
        </ul>
      </div>
    </section>
  );
}
