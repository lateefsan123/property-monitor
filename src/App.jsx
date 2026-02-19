import { useState } from "react";
import { searchLocations, fetchTransactions } from "./api/bayut";
import "./App.css";

function formatPrice(amount) {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  // Search state
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Selected building
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Transaction state
  const [transactions, setTransactions] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchLoading(true);
    setError(null);
    setLocations([]);
    try {
      const data = await searchLocations(query);
      setLocations(data?.hits || data?.results || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSelectLocation(loc) {
    setSelectedLocation(loc);
    setLocations([]);
    setQuery("");
    await loadTransactions(loc);
  }

  async function loadTransactions(loc) {
    const locObj = loc || selectedLocation;
    if (!locObj) return;

    setTxLoading(true);
    setError(null);
    setTransactions(null);

    const locationId = locObj.id || locObj.externalID || locObj.location_id;
    try {
      const data = await fetchTransactions({
        locationIds: [locationId],
        startDate,
        endDate,
      });
      setTransactions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setTxLoading(false);
    }
  }

  // Extract transaction list from response (adapt to actual API shape)
  const txList = transactions?.hits || transactions?.results || transactions?.transactions || (Array.isArray(transactions) ? transactions : []);

  // Compute stats
  const prices = txList.map((t) => t.price || t.amount || t.sale_price || 0).filter(Boolean);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;

  return (
    <>
      <h1>Bayut API — Proof of Concept</h1>
      <p className="subtitle">Search a building, see real sale transactions</p>

      {/* Search */}
      {!selectedLocation && (
        <div className="search-section">
          <div className="search-row">
            <input
              type="text"
              placeholder="Type a building or area name (e.g. Boulevard Central)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button onClick={handleSearch} disabled={searchLoading || !query.trim()}>
              {searchLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Location results */}
          {locations.length > 0 && (
            <ul className="locations-list">
              {locations.map((loc, i) => (
                <li key={loc.id || loc.externalID || i} className="location-item" onClick={() => handleSelectLocation(loc)}>
                  <div className="location-name">{loc.name || loc.title || loc.name_l1 || "Unknown"}</div>
                  <div className="location-path">
                    {loc.full_name || loc.path || loc.location?.join(" > ") || ""}
                    {loc.id && <span> — ID: {loc.id}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected Building */}
      {selectedLocation && (
        <>
          <div className="selected-building">
            <div>
              <div className="name">{selectedLocation.name || selectedLocation.title || selectedLocation.name_l1}</div>
              <div style={{ color: "#888", fontSize: "0.85rem" }}>
                {selectedLocation.full_name || selectedLocation.path || ""}
              </div>
            </div>
            <button onClick={() => { setSelectedLocation(null); setTransactions(null); }}>
              Change
            </button>
          </div>

          {/* Filters */}
          <div className="filters">
            <label>From:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <label>To:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button onClick={() => loadTransactions()}>Fetch Transactions</button>
          </div>
        </>
      )}

      {/* Error */}
      {error && <div className="error">{error}</div>}

      {/* Loading */}
      {txLoading && <div className="loading">Loading transactions...</div>}

      {/* Results */}
      {transactions && !txLoading && (
        <>
          {txList.length > 0 ? (
            <>
              {/* Stats */}
              <div className="stats">
                <div className="stat-card">
                  <div className="label">Total Sales</div>
                  <div className="value">{txList.length}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Avg Price</div>
                  <div className="value">{formatPrice(avgPrice)}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Min</div>
                  <div className="value">{formatPrice(minPrice)}</div>
                </div>
                <div className="stat-card">
                  <div className="label">Max</div>
                  <div className="value">{formatPrice(maxPrice)}</div>
                </div>
              </div>

              {/* Table */}
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Price (AED)</th>
                    <th>Beds</th>
                    <th>Area (sqft)</th>
                    <th>Price/sqft</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.map((tx, i) => {
                    const price = tx.price || tx.amount || tx.sale_price || 0;
                    const area = tx.area || tx.built_up_area || tx.size || 0;
                    const pricePerSqft = area ? Math.round(price / area) : "—";
                    return (
                      <tr key={tx.id || i}>
                        <td>{formatDate(tx.date || tx.transaction_date || tx.created_at)}</td>
                        <td>{formatPrice(price)}</td>
                        <td>{tx.beds ?? tx.bedrooms ?? tx.rooms ?? "—"}</td>
                        <td>{area ? area.toLocaleString() : "—"}</td>
                        <td>{typeof pricePerSqft === "number" ? formatPrice(pricePerSqft) : "—"}</td>
                        <td>{tx.category || tx.property_type || tx.type || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <div className="empty">No transactions found for this location/date range.</div>
          )}

          {/* Raw JSON */}
          <div className="raw-toggle">
            <button onClick={() => setShowRaw(!showRaw)}>
              {showRaw ? "Hide" : "Show"} Raw API Response
            </button>
          </div>
          {showRaw && (
            <pre className="raw-json">{JSON.stringify(transactions, null, 2)}</pre>
          )}
        </>
      )}
    </>
  );
}

export default App;
