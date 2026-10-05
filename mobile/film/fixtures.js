// Demo data for film mode (EXPO_PUBLIC_FILM=1). Every person, phone number,
// listing and price below is fictional; building names are real Downtown Dubai
// towers used as context. Dates are relative to today so "due" is computed by
// the app's own cadence rules (For sale 5 d, Appraisal 25 d, Prospect 75 d).
import { Asset } from 'expo-asset';
import { PRIVATE_ASSISTANT_USER_ID } from '../../shared/assistant-access';
import { buildingExteriorAssets } from '../src/features/listing-alerts/building-exterior-assets';

export const FILM_USER = {
  // The assistant pilot ID, so Ask Repeat shows in the (offline) film account.
  id: PRIVATE_ASSISTANT_USER_ID,
  email: 'sara@example.com',
  user_metadata: { username: 'Sara', full_name: 'Sara Haddad' },
};

const DAY = 86400000;
const dateKey = (daysAgo) => {
  const date = new Date(Date.now() - daysAgo * DAY);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const iso = (daysAgo, hour = 10, minute = 0) => {
  const date = new Date(Date.now() - daysAgo * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};
const CADENCE = { 'For Sale Available': 5, 'Market Appraisal': 25, Prospect: 75 };

// [name, building, bedroom, unit, status, days until due (0 = due today, <0 overdue, >0 scheduled)]
const SELLERS = [
  ['Sara Haddad', 'Act One', '2', '1204', 'For Sale Available', 0],
  ['James Whitmore', 'Boulevard Point', '1', '905', 'Prospect', 0],
  ['Aisha Al Mansoori', 'Burj Vista 1', '3', '2201', 'Market Appraisal', 0],
  ['Daniel Okafor', 'Opera Grand', '2', '1703', 'Prospect', 0],
  ['Priya Nair', 'Forte 1', '1', '612', 'For Sale Available', 0],
  ['Omar Khalil', 'The St. Regis Residences', '2', '3108', 'Market Appraisal', 0],
  ['Lina Farouk', 'Burj Khalifa', '1', '4410', 'Prospect', 0],
  ['Mateo Rossi', 'Act Two', 'Studio', '508', 'For Sale Available', -1],
  ['Hannah Clarke', 'Burj Royale', '2', '1902', 'Market Appraisal', 0],
  ['Yusuf Rahman', 'Vida Residence Downtown', '3', '2604', 'Prospect', -2],
  ['Chloe Martin', 'Boulevard Central Tower 2', '1', '1107', 'For Sale Available', 0],
  ['Karim Aziz', '29 Boulevard Tower 1', '2', '1509', 'Prospect', 0],
  ['Elena Petrova', 'Claren Tower 2', '1', '804', 'Market Appraisal', -3],
  ['Rohan Mehta', 'Forte 2', '2', '2203', 'Prospect', 0],
  ['Noura Saeed', 'Burj Crown', '3', '3301', 'For Sale Available', 0],
  ['Tom Becker', 'Grande', '2', '2510', 'Prospect', -1],
  ['Fatima Zahra', 'Burj Vista 2', '1', '1406', 'Market Appraisal', 0],
  ['Lucas Silva', 'Boulevard Point', '2', '3102', 'Prospect', 0],
  ['Maya Cohen', 'Act One', '1', '707', 'For Sale Available', -2],
  ['Ahmed Nasser', 'Opera Grand', '3', '4003', 'Prospect', 0],
  ['Grace Kim', 'The St. Regis Residences', '1', '2109', 'Market Appraisal', 0],
  ['Oliver Grant', 'Burj Khalifa', '2', '5507', 'Prospect', -4],
  ['Zainab Hussain', 'Forte 1', '2', '1810', 'For Sale Available', 0],
  ['Pierre Laurent', 'Burj Royale', '1', '1203', 'Prospect', 0],
  // Scheduled for later this cycle.
  ['Ivan Sokolov', 'Act Two', '2', '1607', 'Prospect', 12],
  ['Sofia Moretti', 'Boulevard Point', '1', '2008', 'Market Appraisal', 6],
  ['Hamza Qureshi', 'Burj Vista 1', '2', '3303', 'For Sale Available', 2],
  ['Emily Turner', 'Opera Grand', '1', '904', 'Prospect', 30],
  ['Arjun Kapoor', 'Vida Residence Downtown', '2', '1402', 'Market Appraisal', 9],
  ['Leila Hosseini', 'Burj Crown', '1', '2207', 'Prospect', 44],
  ['Samuel Adeyemi', 'Grande', '3', '3809', 'For Sale Available', 3],
  ['Nadia Petersen', 'Claren Tower 2', '2', '1305', 'Prospect', 51],
  ['Victor Chen', '29 Boulevard Tower 1', '1', '707', 'Market Appraisal', 14],
  ['Amira Khoury', 'Burj Royale', '2', '2801', 'Prospect', 20],
];

export const LEAD_SOURCES = [
  { id: 1, user_id: FILM_USER.id, label: 'Downtown sellers', type: 'sheet', building_name: null, sheet_url: 'https://docs.google.com/spreadsheets/d/film-downtown/edit', sort_order: 0 },
  { id: 2, user_id: FILM_USER.id, label: 'Boulevard owners', type: 'sheet', building_name: null, sheet_url: 'https://docs.google.com/spreadsheets/d/film-boulevard/edit', sort_order: 1 },
];

export const LEADS = SELLERS.map(([name, building, bedroom, unit, status, dueIn], index) => ({
  id: index + 1,
  user_id: FILM_USER.id,
  source_id: index % 3 === 2 ? 2 : 1,
  name, building, bedroom, unit, status,
  phone: `+971 50 555 ${String(100 + index).padStart(4, '0')}`,
  last_contact: dateKey(CADENCE[status] - dueIn),
  notes: null, message_draft: null, sent_at: null, next_follow_up_on: null,
}));

// The spreadsheet imported on camera ("Paste a Google Sheets link").
export const IMPORT_SHEET_CSV = [
  'Name,Building,Bedrooms,Unit,Phone,Status,Last contact',
  ['Rania Aboud', 'Burj Khalifa', '2', '3905', '+971 50 555 0301', 'For sale', dateKey(9)],
  ['George Palmer', 'Act One', '1', '1102', '+971 50 555 0302', 'Prospect', dateKey(90)],
  ['Mira Das', 'Opera Grand', '3', '5001', '+971 50 555 0303', 'Appraisal', dateKey(30)],
  ['Khalid Mansour', 'Forte 1', '2', '2307', '+971 50 555 0304', 'Prospect', dateKey(80)],
  ['Isabel Duarte', 'Boulevard Point', '1', '1606', '+971 50 555 0305', 'For sale', dateKey(7)],
  ['Tariq Hamdan', 'Burj Vista 1', '2', '2809', '+971 50 555 0306', 'Appraisal', dateKey(26)],
].map((row) => (Array.isArray(row) ? row.join(',') : row)).join('\n');

export const WHATSAPP_ACCOUNTS = [
  { id: 'film-account', user_id: FILM_USER.id, display_phone_number: '+971 50 555 0100', business_name: 'Sara Haddad Properties', connection_status: 'connected', connected_at: iso(20), last_error: null },
];

export const AUTOMATION_SETTINGS = [{ user_id: FILM_USER.id, auto_whatsapp_enabled: true, monthly_reports_enabled: true }];

export const BUILDING_SCHEDULES = [{
  user_id: FILM_USER.id, enabled: true, fill_unused: true,
  days: {
    Monday: ['Act One', 'Boulevard Point', 'Burj Khalifa'], Tuesday: ['Burj Vista 1', 'Opera Grand'], Wednesday: ['Burj Khalifa', 'Forte 1'],
    Thursday: ['Act One', 'Forte 1', 'The St. Regis Residences'], Friday: ['Burj Royale', 'Burj Khalifa'], Saturday: [], Sunday: [],
  },
}];

// Templates by seller status. Sara introduces herself to new contacts and gets
// straight to the update with sellers she has already spoken to. The film
// assigns Appraisal to the follow-up on camera, so it starts without a status.
export const MESSAGE_TEMPLATES = [
  {
    id: 'tpl-transactions', user_id: FILM_USER.id, name: 'Transaction update', is_default: true, statuses: [], image_path: null, created_at: iso(30), updated_at: iso(4),
    content: 'Hi {{name}}, quick update on recent sales in {{building}}.\n\n{{transactions}}\n\nBuyers are active in your building right now. Happy to share what your unit could achieve if you are thinking of selling.',
  },
  {
    id: 'tpl-intro', user_id: FILM_USER.id, name: 'Introduction', is_default: false, statuses: ['none', 'prospect'], image_path: null, created_at: iso(20), updated_at: iso(1),
    content: 'Hi {{name}}, I’m Sara, a broker specialising in {{building}}.\n\nHere are the latest transactions in your building:\n\n{{transactions}}\n\nIf you ever think about selling, I’d be happy to tell you what your unit could achieve.',
  },
  {
    id: 'tpl-appraisal', user_id: FILM_USER.id, name: 'Appraisal follow-up', is_default: false, statuses: [], image_path: null, created_at: iso(18), updated_at: iso(2),
    content: 'Hi {{name}}, hope you’re well.\n\nJust wanted to keep you updated on the latest activity in {{building}}.\n\n{{transactions}}\n\nBuyer activity is still holding up well. If selling is still on your mind, I’d be happy to update your valuation.',
  },
  {
    id: 'tpl-for-sale', user_id: FILM_USER.id, name: 'For sale update', is_default: false, statuses: ['for_sale_available'], image_path: null, created_at: iso(16), updated_at: iso(3),
    content: 'Hi {{name}}, quick update on {{building}}.\n\n{{transactions}}\n\nHappy to talk through how these compare with your asking price.',
  },
];

// 14 days of WhatsApp activity: automation sends up to 40 a day, plus manual.
const DAILY = [31, 40, 38, 22, 40, 35, 12, 40, 36, 40, 27, 40, 33, 14];
export const WHATSAPP_MESSAGES = DAILY.flatMap((count, day) => Array.from({ length: count }, (_, i) => {
  const sentAt = iso(13 - day, 9, 0);
  const at = new Date(new Date(sentAt).getTime() + i * 5 * 60000).toISOString();
  return { id: `msg-${day}-${i}`, user_id: FILM_USER.id, direction: 'outbound', status: 'delivered', queued_at: at, sent_at: at, lead_id: (i % LEADS.length) + 1, send_source: i % 9 === 0 ? 'manual' : 'auto', initiated_via: 'app' };
}));

// Watched buildings and fictional listings (bundled exterior photos).
// The listing gallery only shows absolute http(s) URLs, so resolve the bundled
// asset against the dev server origin.
const photo = (file) => {
  try {
    const uri = Asset.fromModule(buildingExteriorAssets[file]).uri;
    return typeof location === 'undefined' ? uri : new URL(uri, location.origin).href;
  } catch { return ''; }
};
// Fictional listing links: shown as the Open on Bayut button, never opened in the film.
const bayutUrl = (id) => `https://www.bayut.com/property/details-film-${id}.html`;
const WATCHED = [
  { locationId: 21733, buildingName: 'Act One', file: 'act-one.jpg' },
  { locationId: 3694, buildingName: 'Burj Khalifa', file: 'burj-khalifa.jpg' },
  { locationId: 383, buildingName: 'Boulevard Point', file: 'boulevard-point.jpg' },
  { locationId: 3654, buildingName: 'Opera Grand', file: 'opera-grand.jpg' },
];
const LISTING_SPECS = [
  // [beds, baths, sqft, price, drop, daysAgo, title]
  [2, 2, 1180, 2950000, 200000, 1, 'High floor | Boulevard view | Vacant'],
  [1, 1, 760, 1750000, 101000, 2, 'Fully furnished | Burj view'],
  [3, 4, 2140, 5400000, 350000, 4, 'Corner unit | Maid’s room'],
  [0, 1, 520, 1120000, 60000, 6, 'Studio | Rented until March'],
  [2, 3, 1320, 3480000, 180000, 9, 'Upgraded | Fountain view'],
];
export const WATCHLISTS = WATCHED.map((building) => ({ user_id: FILM_USER.id, location_id: building.locationId, building_name: building.buildingName, search_name: building.buildingName, full_path: `Dubai > Downtown Dubai > ${building.buildingName}` }));

export const WATCH_BUILDINGS = WATCHED.map((building, b) => {
  // Rotate specs per building so each building's newest drop differs.
  const specs = LISTING_SPECS.map((_, i) => LISTING_SPECS[(i + b) % LISTING_SPECS.length]);
  const listings = specs.map(([beds, baths, areaSqft, price, drop, daysAgo, title], i) => ({
    id: 900000 + b * 100 + i, title, price: price + b * 150000, beds, baths, areaSqft,
    bayutUrl: bayutUrl(900000 + b * 100 + i), coverPhoto: photo(building.file), verifiedAt: iso(daysAgo, 11), cluster: '', community: 'Downtown Dubai',
    _drop: drop, _daysAgo: daysAgo + (i === 0 ? 0 : b),
  }));
  return {
    locationId: building.locationId, key: building.buildingName.toLowerCase().replace(/[^a-z0-9]/g, ''), buildingName: building.buildingName,
    imageUrl: photo(building.file), listingCount: listings.length, lowestPrice: Math.min(...listings.map((l) => l.price)),
    highestPrice: Math.max(...listings.map((l) => l.price)), latestVerifiedAt: iso(0, 9), listings,
  };
});

const history = {};
WATCH_BUILDINGS.forEach((building) => building.listings.forEach((listing) => {
  const previousPrice = listing.price + listing._drop;
  history[`${building.locationId}:${listing.id}`] = {
    id: listing.id, locationId: building.locationId, buildingName: building.buildingName, title: listing.title, bayutUrl: listing.bayutUrl,
    coverPhoto: listing.coverPhoto, beds: listing.beds, baths: listing.baths, areaSqft: listing.areaSqft,
    currentStatus: 'active', currentPrice: listing.price, lastKnownPrice: listing.price, previousPrice, priceDelta: -listing._drop,
    firstSeenAt: iso(60), lastSeenAt: iso(0, 9), lastChangeAt: iso(listing._daysAgo, 11), lastChangeType: 'price_drop', dropsCount: 1, totalChanges: 1, seenCount: 40,
    priceHistory: [
      { type: 'listed', at: iso(60), price: previousPrice + 150000 },
      { type: 'price_drop', at: iso(30), verifiedAt: iso(30), price: previousPrice, previousPrice: previousPrice + 150000, priceDelta: -150000 },
      { type: 'price_drop', at: iso(listing._daysAgo, 11), verifiedAt: iso(listing._daysAgo, 11), price: listing.price, previousPrice, priceDelta: -listing._drop },
    ],
  };
}));
export const LISTING_ALERTS_STATE = [{ user_id: FILM_USER.id, summary: null, snapshot: null, change_items: [], listing_history: history }];

// Deterministic sales per building key; roughly a third of buildings sold today.
export function transactionsFor(buildingKey) {
  let seed = 0;
  for (const ch of String(buildingKey)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const soldToday = seed % 3 === 0;
  return Array.from({ length: 10 }, (_, i) => {
    const beds = 1 + Math.floor(next() * 3);
    const area = 650 + beds * 420 + Math.floor(next() * 300);
    return {
      building_key: buildingKey, amount: Math.round((area * (2300 + next() * 900)) / 1000) * 1000, category: 'Sales',
      date: dateKey(i === 0 && soldToday ? 0 : 1 + i * 3 + Math.floor(next() * 3)), floor: 5 + Math.floor(next() * 50), beds,
      property_type: 'Apartment', builtup_area_sqft: area, location_name: null, full_location: null, latitude: null, longitude: null,
    };
  });
}

// Human-readable names for the building keys the app derives from seller rows.
const NAMES = [...new Set([...LEADS.map((lead) => lead.building), ...WATCHED.map((building) => building.buildingName)])];
const squash = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
export function buildingNameForKey(key) {
  const match = NAMES.filter((name) => squash(key).startsWith(squash(name))).sort((a, b) => b.length - a.length)[0];
  return match || key;
}
