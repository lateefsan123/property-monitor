function hashSeed(value) {
  const str = String(value ?? "");
  let hash = 2166136261;
  for (let index = 0; index < str.length; index += 1) {
    hash ^= str.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function rand() {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const SHEET_PALETTE = [
  "#c7d7fe",
  "#bfe3c9",
  "#fcd9b6",
  "#f4c2d6",
  "#d8c9f0",
  "#ffe5a3",
  "#b9e4ec",
  "#f3bdbd",
];

const SELLER_PALETTE = [
  "#adc4ff",
  "#b7e4c7",
  "#ffcf99",
  "#f0bdd6",
  "#cdbcf6",
  "#ffd870",
  "#9fd9e3",
  "#f2b0a9",
];

function buildSheetCells(rand, rows = 5, cols = 10) {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    const density = 0.75 - (row / (rows - 1)) * 0.5;
    for (let col = 0; col < cols; col += 1) {
      cells.push(rand() < density);
    }
  }
  return cells;
}

function buildIdenticonCells(rand, rows = 5, cols = 5) {
  const cells = [];
  const half = Math.ceil(cols / 2);

  for (let row = 0; row < rows; row += 1) {
    const leftSide = Array.from({ length: half }, () => rand() < 0.58);
    const mirrored = leftSide.slice(0, cols - half).reverse();
    cells.push(...leftSide, ...mirrored);
  }

  return cells;
}

function MosaicCells({ cells, color }) {
  return cells.map((filled, index) => (
    <span
      key={index}
      className={`sheet-mosaic-cell${filled ? " is-filled" : ""}`}
      style={filled ? { background: color } : undefined}
    />
  ));
}

export function SheetPreviewThumb({ seed }) {
  const rand = mulberry32(hashSeed(seed));
  const color = SHEET_PALETTE[Math.floor(rand() * SHEET_PALETTE.length)];
  const cells = buildSheetCells(rand);

  return (
    <div className="sheet-card-preview sheet-card-preview-sheet" aria-hidden>
      <div className="sheet-card-mosaic sheet-card-mosaic-sheet">
        <MosaicCells cells={cells} color={color} />
      </div>
    </div>
  );
}

export function SellerPreviewThumb({ seed }) {
  const rand = mulberry32(hashSeed(seed));
  const color = SELLER_PALETTE[Math.floor(rand() * SELLER_PALETTE.length)];
  const cells = buildIdenticonCells(rand);

  return (
    <div className="sheet-card-preview home-seller-preview" aria-hidden>
      <div className="sheet-card-avatar-frame">
        <div className="sheet-card-mosaic sheet-card-mosaic-avatar">
          <MosaicCells cells={cells} color={color} />
        </div>
      </div>
    </div>
  );
}
