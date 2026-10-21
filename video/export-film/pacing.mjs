// Every picture, caption and click time in the seller export how-to, in film
// seconds. The film (film.jsx) and the mixer (mix.mjs) both read this file.
// Word times come from narration-words.py (launch-film/out/*.words.json).
export const CUT = 'export-film';

// The main take plays in order at its delivered speed, split only inside its
// own pauses. The install pickup goes in after "…under Spreadsheets."
export const VOICE = 'vo-export-take-2.mp3';
export const PICKUP = { file: 'vo-install-take-2.mp3', at: 12.0, end: 12.6 };
export const PARTS = [
  { from: 0, to: 10.75, at: 0.8 },                       // "Here's how…" – "…under Spreadsheets."
  { from: 10.75, to: 22.85, at: 25.4 },                  // "Then, open your seller list…" – "…while it works."
  { from: 22.85, to: 28.36, at: 39.1 },                  // "When it's done…" – "…you don't need."
  { from: 28.36, to: 35.3, at: 45.2 },                   // "Press Download…" – "…you're all set."
];
// Film second when the main take reaches `t`; pickup second → film second.
export const say = (t) => { const part = PARTS.findLast((p) => t >= p.from) || PARTS[0]; return part.at + (t - part.from); };
export const pick = (t) => PICKUP.at + t;

export const T = {
  title: 0,
  // "First, add the Repeat AI extension to Chrome. You'll find it in Repeat AI, under Spreadsheets."
  install: say(4.3), getClick: say(9.9), zipReady: say(10.3),
  // Pickup: "Download it, then unzip the file."
  unzip: pick(0.9), extractMenu: pick(1.75), extracted: pick(2.1),
  // "In Chrome, open the extensions page, turn on Developer mode, click Load unpacked, and choose the folder."
  extPage: pick(3.3), devToggle: pick(5.9), loadUnpacked: pick(7.3), folderPick: pick(7.6), folderChosen: pick(9.0),
  // "Then pin it, so it's always one click away."
  puzzle: pick(9.7), pinned: pick(10.2),
  // "Then, open your seller list in your CRM, like you normally would."
  crm: say(10.95),
  // "Click the Repeat AI icon, and press Find my sellers."
  iconClick: say(16.0), popup: say(16.3), findClick: say(17.75),
  // "It goes through every page for you. Just leave the list open while it works."
  scanStart: say(18.2), scanEnd: say(22.84) + 1.6,
  // "When it's done, you'll see your sellers sorted by building. Untick any building you don't need."
  list: say(22.9), untick: say(27.2),
  // "Press Download, and you get a separate spreadsheet for each building."
  downloadClick: say(29.3), files: say(29.7),
  // "Upload them to Repeat AI, and you're all set."
  upload: say(32.4), end: say(35.0) + 0.6,
};
export const DURATION = T.end + 4.2;

// Short on-screen captions, each with the time it appears.
export const CAPTIONS = [
  [T.install, 'Get the extension from Repeat AI'],
  [T.unzip, 'Unzip it'],
  [T.extPage, 'chrome://extensions → Developer mode → Load unpacked'],
  [T.puzzle, 'Pin it to your toolbar'],
  [T.crm, 'Open your seller list'],
  [T.iconClick, 'Click the Repeat AI icon'],
  [T.scanStart, 'It goes through every page'],
  [T.list, 'Untick what you don’t need'],
  [T.downloadClick, 'One spreadsheet per building'],
  [T.upload, 'Upload them to Repeat AI'],
];
