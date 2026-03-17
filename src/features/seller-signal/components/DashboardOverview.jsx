import { formatPrice, formatPsf } from "../formatters";

export default function DashboardOverview({
  leadsCount,
  marketStats,
  onSelectBuilding,
  searchTerm,
  topBuildings,
}) {
  if (!leadsCount) return null;

  return (
    <>
      <h2 className="section-title">Market Overview</h2>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-label">Total Sellers</span>
          <span className="stat-value">{marketStats.totalSellers.toLocaleString()}</span>
          {marketStats.dueCount > 0 && <span className="stat-change due">{marketStats.dueCount} due</span>}
        </div>

        <div className="stat-card">
          <span className="stat-label">Average Price (AED)</span>
          <span className="stat-value">{marketStats.avgPrice ? formatPrice(marketStats.avgPrice) : "-"}</span>
          {marketStats.totalTransactions > 0 && (
            <span className="stat-change">{marketStats.totalTransactions} transactions</span>
          )}
        </div>

        <div className="stat-card">
          <span className="stat-label">Average Price per sqft (AED)</span>
          <span className="stat-value">{marketStats.avgPsf ? formatPsf(marketStats.avgPsf) : "-"}</span>
          {marketStats.readyCount > 0 && <span className="stat-change ok">{marketStats.readyCount} enriched</span>}
        </div>
      </div>

      {topBuildings.length > 0 && (
        <div className="section-block">
          <h3 className="section-subtitle">Top Buildings</h3>
          <div className="location-pills">
            {topBuildings.map((building) => (
              <button
                key={building.name}
                type="button"
                className={`location-pill${searchTerm === building.name ? " active" : ""}`}
                onClick={() => onSelectBuilding(building.name)}
              >
                {building.name} <span className="pill-count">({building.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
