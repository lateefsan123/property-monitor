import { formatBedsLabel, formatDate, formatPrice, formatPsf, formatRange } from "../formatters";
import { buildMessage, formatPhoneForWhatsApp } from "../insight-utils";
import { formatBuildingLabel } from "../lead-utils";

function MessagePreview({ value }) {
  return <div className="message-preview">{value}</div>;
}

function HomeIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
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

export default function LeadCard({
  buildingImageUrl,
  copiedLeadId,
  insight,
  isExpanded,
  isSent,
  lead,
  onCopyMessage,
  onToggleExpanded,
  onToggleSent,
}) {
  const message = insight?.message || buildMessage(lead, insight);
  const whatsappPhone = formatPhoneForWhatsApp(lead.phone);
  const whatsappUrl = whatsappPhone
    ? `https://web.whatsapp.com/send?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`
    : null;

  function handleHeaderKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleExpanded(lead.id);
    }
  }

  return (
    <article className={`lead-card${isSent ? " lead-sent" : ""}${isExpanded ? " lead-expanded" : ""}`}>
      <div
        className="lead-top"
        role="button"
        tabIndex={0}
        onClick={() => onToggleExpanded(lead.id)}
        onKeyDown={handleHeaderKeyDown}
      >
        {buildingImageUrl && (
          <img
            className="lead-building-img"
            src={buildingImageUrl}
            alt={lead.building}
            loading="lazy"
          />
        )}
        <div className="lead-top-info">
          <div>
            <span className="lead-name">{lead.name || "Unnamed"}</span>
            <span className="lead-building">
              <HomeIcon /> {formatBuildingLabel(lead.building) || lead.building || "-"}
            </span>
          </div>

          <div className="lead-top-actions">
            <div className="badge-row">
              <span className="badge">{lead.statusLabel}</span>
              <span className={`badge ${lead.isDue ? "due" : "ok"}`}>{lead.dueLabel}</span>
              {insight?.status === "ready" && <span className="badge ok">Enriched</span>}
              {lead.newTxSinceSent && <span className="badge due">{lead.newTxSinceSent} new txns</span>}
            </div>

            {whatsappUrl ? (
              <a
                className="btn-sm btn-wa"
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isSent) void onToggleSent(lead.id);
                }}
              >
                <WhatsAppIcon />
                {isSent ? "Sent" : "Send"}
              </a>
            ) : (
              <button
                type="button"
                className="btn-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  void onCopyMessage(lead.id, message);
                }}
              >
                {copiedLeadId === lead.id ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="lead-meta">
            <span>{lead.bedroom || "-"}</span>
            <span>{formatDate(lead.lastContactDate)}</span>
            {lead.phone && <span>{lead.phone}</span>}
          </div>

          {insight?.status === "ready" && (
            <>
              <div className="bayut-row">
                <span>{insight.count} txns</span>
                <span>Avg {formatPrice(insight.avg)}</span>
                <span>{formatPsf(insight.psf)}</span>
                <span>{formatRange(insight.min, insight.max)}</span>
              </div>
              <TransactionTable insight={insight} lead={lead} />
            </>
          )}

          {insight?.status === "loading" && <p className="muted">Loading Bayut data...</p>}
          {insight?.status === "error" && <p className="error-sm">{insight.error}</p>}

          <div className="msg-block">
            <p className="msg-label">Message Preview</p>
            <MessagePreview value={message} />
          </div>
        </>
      )}
    </article>
  );
}
