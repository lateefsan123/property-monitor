function SellersTileIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ListingsTileIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function SpreadsheetsTileIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

const TILES = [
  {
    id: "sellers",
    title: "Sellers",
    description: "Track leads, log calls, and manage every conversation with the sellers you're working.",
    Icon: SellersTileIcon,
    accent: "tile-accent-indigo",
    preview: "preview-sellers",
  },
  {
    id: "listing-alerts",
    title: "Listing Alerts",
    description: "Browse live listings, save searches, and get notified the moment a unit matches your criteria.",
    Icon: ListingsTileIcon,
    accent: "tile-accent-rose",
    preview: "preview-listings",
  },
  {
    id: "spreadsheets",
    title: "Spreadsheets",
    description: "Import, export, and sync your Google Sheets so your pipeline stays in one place.",
    Icon: SpreadsheetsTileIcon,
    accent: "tile-accent-emerald",
    preview: "preview-spreadsheets",
  },
];

export function TilePreview({ kind }) {
  if (kind === "preview-sellers") {
    return (
      <div className="tile-preview preview-sellers">
        <img
          className="preview-sellers-img"
          src="/sellers.png"
          alt=""
          loading="lazy"
        />
      </div>
    );
  }

  if (kind === "preview-listings") {
    return (
      <div className="tile-preview preview-listings">
        <img
          className="preview-listings-img"
          src="/listings.png"
          alt=""
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="tile-preview preview-spreadsheets">
      <img
        className="preview-spreadsheets-img"
        src="https://png.pngtree.com/png-clipart/20250429/original/pngtree-spreadsheet-data-icon-for-finance-or-business-illustration-vector-png-image_20894047.png"
        alt=""
        loading="lazy"
      />
    </div>
  );
}

export default function HomePage({ displayName, onNavigate }) {
  const firstName = (displayName || "").split(" ")[0] || "there";

  return (
    <div className="home-page">
      <h1 className="home-title">Welcome back, {firstName}.</h1>

      <div className="home-tiles">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className={`home-tile ${tile.accent}`}
            onClick={() => onNavigate(tile.id)}
          >
            <div className="home-tile-visual">
              <TilePreview kind={tile.preview} />
            </div>
            <div className="home-tile-body">
              <h3 className="home-tile-title">{tile.title}</h3>
              <p className="home-tile-desc">{tile.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
