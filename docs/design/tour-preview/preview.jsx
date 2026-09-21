import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import ProductTour from "../../../src/components/ProductTour";
function Preview() {
  const [page, setPage] = useState("home");
  const [action, setAction] = useState("");
  return <><main className="app-main"><header><button className="app-topbar-toggle">Navigation</button><button className="app-crumb-home">Home</button><button className="app-crumb-page">{page}</button><button className="sheet-topbar-new-btn">+</button></header><h1>{page}</h1><p>Local tour preview. Navigation is simulated; no account data is changed.</p>{action && <p role="status">Opened {action}</p>}</main><ProductTour userId="local-tour-preview" onNavigate={setPage} onAction={setAction}/></>;
}
createRoot(document.getElementById("root")).render(<Preview/>);
