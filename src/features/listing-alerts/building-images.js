import exteriors from '../../../mobile/src/data/building-exteriors.json' with { type: 'json' };

// Building exteriors shared with the mobile app: the mobile registry (names,
// aliases, one reviewed image per building or complex) is the source of truth,
// and web serves the same JPEGs from mobile/assets/buildings.
// Exact project identities only: never substitute a nearby tower or a unit photo.
// Source images are local previews pending reuse clearance; see the source register
// in docs/mobile-listing-exteriors-2026-09-27.md.
let exteriorUrls = {};
try {
  exteriorUrls = import.meta.glob('../../../mobile/assets/buildings/*.jpg', { eager: true, query: '?url', import: 'default' });
} catch { /* Outside Vite (node tests) there are no bundled asset URLs. */ }

// Web-only images for buildings the mobile registry does not cover.
const WEB_IMAGES = [
  { names: ['Forte', 'Forte 1', 'Forte 2', 'Forte Tower 1', 'Forte Tower 2', 'Forte Towers'], file: 'forte.jpg', alt: 'Forte complex architectural render', position: '75% 40%' },
  { names: ['Burj Khalifa'], file: 'burj-khalifa.jpg', alt: 'Burj Khalifa exterior', position: '50% 20%' },
  { names: ["One Zaabeel", "One Za'abeel", 'One Za’abeel'], file: 'one-zaabeel.jpg', alt: 'One Za’abeel exterior', position: '50% 50%' },
  { names: ['Marina Gate 1', 'Marina Gate I', 'The Residences at Marina Gate I'], file: 'marina-gate.jpg', alt: 'Marina Gate I exterior', position: '50% 25%' },
  { names: ['The St. Regis Residences Financial Center Road', 'The St. Regis Residences Financial Centre Road', 'St. Regis Financial Center Road', 'St. Regis Financial Centre Road'], file: 'st-regis.webp', alt: 'St. Regis Financial Center Road architectural render', position: '65% 45%' },
  { names: ['Jumeirah Living Business Bay'], file: 'jumeirah-business-bay.jpg', alt: 'Jumeirah Living Business Bay architectural render', position: '35% 35%' },
];

// Same key as mobile: keeps tower numbers/letters, ignores case and punctuation.
const key = name => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const EXTERIOR_BY_NAME = new Map();
for (const exterior of exteriors) {
  for (const name of [exterior.name, ...exterior.aliases]) EXTERIOR_BY_NAME.set(key(name), exterior);
}
const WEB_BY_NAME = new Map(WEB_IMAGES.flatMap(image => image.names.map(name => [key(name), image])));

export function getBuildingExteriorEntry(buildingName) {
  return EXTERIOR_BY_NAME.get(key(buildingName)) || null;
}

export function getBuildingImage(buildingName) {
  if (!key(buildingName)) return null;
  const exterior = getBuildingExteriorEntry(buildingName);
  const exteriorUrl = exterior && exteriorUrls[`../../../mobile/assets/buildings/${exterior.asset}`];
  if (exteriorUrl) {
    const complex = exterior.scope === 'complex';
    return {
      src: exteriorUrl,
      alt: complex ? `${exterior.label} complex exterior` : `${exterior.label} exterior`,
      position: '50% 50%',
      complex,
    };
  }
  const image = WEB_BY_NAME.get(key(buildingName));
  return image ? { src: `/landing/buildings/${image.file}`, alt: image.alt, position: image.position, complex: false } : null;
}
