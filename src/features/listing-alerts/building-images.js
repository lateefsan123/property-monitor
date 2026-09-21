// Exact project identities only: never substitute a nearby tower or a unit photo.
// Source images are local previews pending reuse clearance; see the source register.
const BUILDING_IMAGES = [
  { names: ['Forte', 'Forte 1', 'Forte 2', 'Forte Tower 1', 'Forte Tower 2', 'Forte Towers'], file: 'forte.jpg', alt: 'Forte complex architectural render', position: '75% 40%' },
  { names: ['Burj Khalifa'], file: 'burj-khalifa.jpg', alt: 'Burj Khalifa exterior', position: '50% 20%' },
  { names: ["One Zaabeel", "One Za'abeel", 'One Za’abeel'], file: 'one-zaabeel.jpg', alt: 'One Za’abeel exterior', position: '50% 50%' },
  { names: ['Marina Gate 1', 'Marina Gate I', 'The Residences at Marina Gate I'], file: 'marina-gate.jpg', alt: 'Marina Gate I exterior', position: '50% 25%' },
  { names: ['The St. Regis Residences Financial Center Road', 'The St. Regis Residences Financial Centre Road', 'St. Regis Financial Center Road', 'St. Regis Financial Centre Road'], file: 'st-regis.webp', alt: 'St. Regis Financial Center Road architectural render', position: '65% 45%' },
  { names: ['Jumeirah Living Business Bay'], file: 'jumeirah-business-bay.jpg', alt: 'Jumeirah Living Business Bay architectural render', position: '35% 35%' },
];

const normalizeName = name => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
const BY_NAME = new Map(BUILDING_IMAGES.flatMap(image => image.names.map(name => [normalizeName(name), image])));

export function getBuildingImage(buildingName) {
  const image = BY_NAME.get(normalizeName(buildingName));
  return image ? { src: `/landing/buildings/${image.file}`, alt: image.alt, position: image.position } : null;
}
