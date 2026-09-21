// Local-only art reference. Uses production components with fictional records.
// No API queries or persistence actions are invoked by this fixture.
import { createRoot } from "react-dom/client";
import NewSpreadsheetModal from "../../../src/features/seller-signal/components/NewSpreadsheetModal.jsx";
import LeadCard from "../../../src/features/seller-signal/components/LeadCard.jsx";
import "../../../src/index.css";
import "../../../src/App.css";
import "./reference.css";

const noop = () => {};
const leads = [
  { id: "sample-1", name: "Alex Morgan", building: "Forte 2", bedroom: 2, unit: "1204", statusLabel: "Due today", isDue: true },
  { id: "sample-2", name: "Jamie Taylor", building: "Forte 2", bedroom: 1, unit: "805", statusLabel: "Scheduled" },
  { id: "sample-3", name: "Jordan Lee", building: "Burj Khalifa", bedroom: 2, unit: "2206", statusLabel: "Due today", isDue: true },
];

createRoot(document.getElementById("root")).render(
  <main className="product-reference">
    <section className="reference-table">
      <h1>Sellers</h1>
      <div className="lead-table-wrap"><table className="lead-table">
        <thead><tr>{["Name", "Building", "Bed", "Unit", "Status", "Phone", "Contact"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{leads.map(lead => <LeadCard key={lead.id} lead={lead} onToggleExpanded={noop} onCopyMessage={noop} onToggleSent={noop} />)}</tbody>
      </table></div>
    </section>
    <NewSpreadsheetModal onClose={noop} onSubmit={noop} onImportFile={noop} submitting={false} maxSelections={10} />
  </main>,
);
