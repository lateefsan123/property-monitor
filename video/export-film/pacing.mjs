// Every picture, caption and click time in the seller export how-to, in film
// seconds. The film and the mixer both read this file, so retiming happens here.
// Times follow the narration take's word times (narration-words.py).
export const CUT = 'export-film';
export const VOICE = { file: 'vo-export-take-1.mp3', at: 0.6 };

// Film second when the narration reaches `t` seconds into the take.
export const say = (t) => VOICE.at + t;

export const T = {
  title: 0,                // "Here's how to get your sellers out of your CRM…"
  install: say(4.2),       // "First, add the Repeat AI extension to Chrome."
  installClick: say(6.6),
  pinned: say(7.3),
  crm: say(11.6),          // "Then open your seller list in your CRM…"
  iconClick: say(15.4),    // "Click the Repeat AI icon…"
  popup: say(15.7),
  findClick: say(17.4),    // "…and press Find my sellers."
  scanStart: say(17.8),    // "It goes through every page for you…"
  scanEnd: say(24.6),
  list: say(24.9),         // "When it's done, you'll see your sellers sorted by building."
  untick: say(29.6),       // "Untick any building you don't need."
  downloadClick: say(33.2),// "Press Download…"
  files: say(33.7),        // "…a separate spreadsheet for each building."
  upload: say(38.6),       // "Upload them to Repeat AI, and you're all set."
  end: say(42.6),
};
export const DURATION = say(46);

// Short on-screen captions, each with the time it appears.
export const CAPTIONS = [
  [T.install, 'Add the Repeat AI extension'],
  [T.crm, 'Open your seller list'],
  [T.iconClick, 'Click the Repeat AI icon'],
  [T.scanStart, 'It goes through every page'],
  [T.list, 'Untick what you don’t need'],
  [T.downloadClick, 'One spreadsheet per building'],
  [T.upload, 'Upload them to Repeat AI'],
];
