import { formatBedsLabel, formatDate, formatPrice, formatPsf, formatRange } from "../formatters";

const EDIT_STATUS_OPTIONS = [
  { value: "", label: "No status" },
  { value: "Not Interested", label: "Not Interested" },
  { value: "Prospect", label: "Prospect" },
  { value: "Appraisal", label: "Appraisal" },
  { value: "For Sale", label: "For Sale" },
];

function getEditStatusOptions(currentStatus) {
  if (!currentStatus || EDIT_STATUS_OPTIONS.some((option) => option.value === currentStatus)) {
    return EDIT_STATUS_OPTIONS;
  }

  return [
    EDIT_STATUS_OPTIONS[0],
    { value: currentStatus, label: `${currentStatus} (Current)` },
    ...EDIT_STATUS_OPTIONS.slice(1),
  ];
}

function TransactionTable({ insight, lead }) {
  if (insight.recentTransactions?.length > 0) {
    return (
      <div className="tx-table-wrap">
        <p className="tx-table-title">Sales History in {insight.locationName || lead.building}</p>
        <table className="tx-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>LOCATION</th>
              <th>PRICE (AED)</th>
              <th>BEDS</th>
              <th>AREA (SQFT)</th>
            </tr>
          </thead>
          <tbody>
            {insight.recentTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="tx-date">{formatDate(transaction.date)}</td>
                <td>
                  <span className="tx-location">{transaction.locationLabel}</span>
                  {transaction.floor && <span className="tx-floor">Floor {transaction.floor}</span>}
                </td>
                <td className="tx-price">{formatPrice(transaction.price)}</td>
                <td>{formatBedsLabel(transaction.beds)}</td>
                <td>{transaction.area ? Math.round(transaction.area).toLocaleString("en-US") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <p className="muted">No priced sales found in this period.</p>;
}

export function LeadEditForm({ draft, isDeleting, isSaving, onCancel, onChange, onDelete, onSave }) {
  const statusOptions = getEditStatusOptions(draft?.status);

  return (
    <form
      className="lead-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave?.();
      }}
    >
      <div className="lead-edit-grid">
        <label className="lead-edit-field">
          <span>Name</span>
          <input
            type="text"
            value={draft?.name || ""}
            onChange={(event) => onChange?.("name", event.target.value)}
            placeholder="Seller name"
          />
        </label>

        <label className="lead-edit-field">
          <span>Building</span>
          <input
            type="text"
            value={draft?.building || ""}
            onChange={(event) => onChange?.("building", event.target.value)}
            placeholder="Building name"
          />
        </label>

        <label className="lead-edit-field">
          <span>Phone</span>
          <input
            type="tel"
            value={draft?.phone || ""}
            onChange={(event) => onChange?.("phone", event.target.value)}
            placeholder="+971..."
          />
        </label>

        <label className="lead-edit-field">
          <span>Bedroom</span>
          <input
            type="text"
            value={draft?.bedroom || ""}
            onChange={(event) => onChange?.("bedroom", event.target.value)}
            placeholder="2BR"
          />
        </label>

        <label className="lead-edit-field">
          <span>Unit</span>
          <input
            type="text"
            value={draft?.unit || ""}
            onChange={(event) => onChange?.("unit", event.target.value)}
            placeholder="Unit 1203"
          />
        </label>

        <label className="lead-edit-field">
          <span>Status</span>
          <select value={draft?.status || ""} onChange={(event) => onChange?.("status", event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value || "blank"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="lead-edit-field">
          <span>Last contact</span>
          <input
            type="date"
            value={draft?.lastContact || ""}
            onChange={(event) => onChange?.("lastContact", event.target.value)}
          />
        </label>
      </div>

      <div className="lead-edit-actions">
        <button type="submit" className="btn-sm btn-primary" disabled={isSaving || isDeleting}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="btn-sm" disabled={isSaving || isDeleting} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-sm btn-danger" disabled={isSaving || isDeleting} onClick={onDelete}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </form>
  );
}

export function OverviewPanel({ lead, bedroomLabel, unitLabel }) {
  const chips = [bedroomLabel, unitLabel].filter(Boolean);
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Overview</h3>
        <p className="lead-detail-panel-subtitle">Contact info and pipeline status.</p>
        {chips.length > 0 && (
          <div className="lead-detail-chips">
            {chips.map((chip) => (
              <span key={chip} className="lead-detail-chip">{chip}</span>
            ))}
          </div>
        )}
      </div>
      <div className="lead-detail-grid">
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Status</span>
          <span className="lead-detail-cell-value">{lead.statusLabel || "-"}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Phone</span>
          <span className="lead-detail-cell-value">{lead.phone || "-"}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Last contact</span>
          <span className="lead-detail-cell-value">{formatDate(lead.lastContactDate)}</span>
        </div>
        <div className="lead-detail-cell">
          <span className="lead-detail-cell-label">Follow-up</span>
          <span className={`lead-detail-cell-value ${lead.isDue ? "lead-detail-cell-due" : ""}`}>
            {lead.dueLabel || "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MarketPanel({ insight, lead }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Market data</h3>
        <p className="lead-detail-panel-subtitle">Recent transactions in this building.</p>
      </div>

      {insight?.status === "loading" && <p className="muted">Loading market data...</p>}
      {insight?.status === "error" && <p className="error-sm">{insight.error}</p>}
      {!insight?.status && <p className="muted">No market data available yet.</p>}

      {insight?.status === "ready" && (
        <>
          <div className="bayut-row">
            <div className="bayut-stat">
              <span className="bayut-stat-value">{insight.count}</span>
              <span className="bayut-stat-label">Transactions</span>
            </div>
            <div className="bayut-stat">
              <span className="bayut-stat-value">{formatPrice(insight.avg)}</span>
              <span className="bayut-stat-label">Avg Price</span>
            </div>
            <div className="bayut-stat">
              <span className="bayut-stat-value">{formatPsf(insight.psf)}</span>
              <span className="bayut-stat-label">Per Sqft</span>
            </div>
            <div className="bayut-stat">
              <span className="bayut-stat-value">{formatRange(insight.min, insight.max)}</span>
              <span className="bayut-stat-label">Range</span>
            </div>
          </div>
          <TransactionTable insight={insight} lead={lead} />
        </>
      )}
    </div>
  );
}

export function MessagePanel({ message }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Message</h3>
        <p className="lead-detail-panel-subtitle">Preview of the outreach message.</p>
      </div>
      <div className="message-preview">{message}</div>
    </div>
  );
}

export function NotesPanel({ value, onChange, onBlur, saving }) {
  return (
    <div className="lead-detail-panel">
      <div className="lead-detail-panel-head">
        <h3 className="lead-detail-panel-title">Notes</h3>
        <p className="lead-detail-panel-subtitle">
          {saving ? "Saving..." : "Auto-saves a second after you stop typing."}
        </p>
      </div>
      <textarea
        className="lead-detail-notes"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="Add notes about this lead..."
        rows={8}
      />
    </div>
  );
}
