// v7 cut: desktop-first product film. Brady J take 1 (90.358 s).
// Desktop captures fill the frame; no browser chrome wrapper.
// Cursor appears only at interaction points, then disappears.
export const CUT = 'app-film-v7';
export const TAKES = 'takes-v6'; // reuses the verified v6 captures

export const VOICE = { file: 'vo-brady-v6-take-1.mp3', at: 0.5, duration: 90.357542 };

// Breath splits in genuine paragraph pauses.
export const BREATHS = [
  [3.64,  1.5],  // P1→P2
  [17.68, 1.2],  // P2→P3
  [28.15, 3.0],  // P3→P4 — status creation/assignment demo
  [45.53, 1.0],  // P4→P5
  [55.53, 0.8],  // P5→P6
  [68.54, 1.0],  // P6→P7
  [75.92, 0.5],  // P7→P8
  [84.19, 0.5],  // P8→P9
];
const added = (t) => BREATHS.filter(([s]) => s <= t).reduce((sum, [, e]) => sum + e, 0);
export const say = (t) => +(VOICE.at + t + added(t)).toFixed(3);
export const breath = (split) => {
  const b = BREATHS.find(([s]) => s === split);
  return b ? +(say(split) - b[1]).toFixed(3) : say(split);
};

const voiceEnd = say(89.98);
export const DURATION = Math.ceil(voiceEnd + 3);

// Paragraph anchors
export const P1 = { at: say(0),     end: say(3.3)   };
export const P2 = { at: say(3.98),  end: say(17.34) };
export const P3 = { at: say(18.02), end: say(27.74) };
export const P4 = { at: say(28.56), end: say(45.18) };
export const P5 = { at: say(45.88), end: say(55.22) };
export const P6 = { at: say(55.84), end: say(68.22) };
export const P7 = { at: say(68.86), end: say(75.58) };
export const P8 = { at: say(76.26), end: say(83.82) };
export const P9 = { at: say(84.56), end: say(89.98) };

const demoStart = breath(28.15);

// Hook
export const HOOK = {
  count: say(0) - 0.15,
  sellers: say(0.26),
  question: say(2.08),
  out: breath(3.64) + 0.3,
};

// Verified cursor targets from actions.json
const A = {
  status: { x: 462, y: 112 }, prospect: { x: 525, y: 242 },
  building: { x: 781, y: 112 }, buildingItem: { x: 882, y: 248 },
  savedViews: { x: 133, y: 166 }, scheduled: { x: 222, y: 54 },
  newStatus: { x: 1164, y: 53 }, statusColour: { x: 614, y: 574 },
  createStatus: { x: 836, y: 705 }, editSeller: { x: 1395, y: 26 },
  hotLead: { x: 950, y: 505 }, saveSeller: { x: 1289, y: 860 },
  tplIntro: { x: 240, y: 233 }, tplAppraisal: { x: 240, y: 287 },
  tplForSale: { x: 240, y: 340 }, tplCard: { x: 1141, y: 254 },
};

// Screens: [time, take-name, transition, kind]
export const SCREENS = [
  // P2 workspace
  [say(3.98),  'desktop-sellers',          undefined, 'desktop'],
  [say(9.58),  'desktop-sellers-status',   'fade', 'desktop'],
  [say(11.32), 'desktop-sellers-filtered', 'fade', 'desktop'],
  [say(12.58), 'desktop-sellers-saved',    'fade', 'desktop'],
  [say(15.02), 'desktop-sellers-due',      'fade', 'desktop'],
  [say(16.38), 'desktop-sellers-scheduled','fade', 'desktop'],
  // P3 statuses
  [say(18.02), 'desktop-statuses',          'push', 'desktop'],
  [say(21.68), 'desktop-statuses-builtin',  'fade', 'desktop'],
  [say(23.34), 'desktop-status-dialog',     'fade', 'desktop'],
  [say(26.2),  'desktop-status-created',    'fade', 'desktop'],
  [demoStart + 0.3, 'desktop-status-edit',       'fade', 'desktop'],
  [demoStart + 1.3, 'desktop-status-assignment', 'fade', 'desktop'],
  [demoStart + 2.2, 'desktop-status-assigned',   'fade', 'desktop'],
  // P4 templates
  [say(28.56), 'desktop-templates',     'push', 'desktop'],
  [say(31.42), 'desktop-tpl-intro',     'fade', 'desktop'],
  [say(33.52), 'desktop-tpl-appraisal', 'fade', 'desktop'],
  [say(34.98), 'desktop-tpl-forsale',   'fade', 'desktop'],
  [say(37.42), 'desktop-tpl-fields',    'fade', 'desktop'],
  [say(41.3),  'desktop-tpl-card',      'fade', 'desktop'],
  [say(43.46), 'desktop-tpl-preview',   'fade', 'desktop'],
  // P5 automation
  [say(45.88), 'desktop-automations', 'push', 'desktop'],
  [say(51.28), 'desktop-sending',     'fade', 'desktop'],
  // P6 controls
  [say(55.84), 'desktop-controls-status',  'push', 'desktop'],
  [say(61.16), 'desktop-controls-spacing', 'fade', 'desktop'],
  [say(64.78), 'desktop-controls-window',  'fade', 'desktop'],
  // P7 mobile
  [say(68.86), 'mobile-sellers',       'push', 'mobile'],
  [say(71.4),  'mobile-seller-sheet',  'fade', 'mobile'],
  [say(72.22), 'mobile-sellers-check', 'fade', 'mobile'],
  [say(73.24), 'mobile-activity',      'fade', 'mobile'],
  [say(74.56), 'mobile-send',          'fade', 'mobile'],
  // P8 Ask Repeat
  [say(76.26), 'mobile-ask',        'push', 'mobile'],
  [say(78.1),  'mobile-ask-typed',  'fade', 'mobile'],
  [say(79.76), 'mobile-ask-result', 'fade', 'mobile'],
];

export const PHONE_IN = say(68.86) - 0.3;
export const PHONE_OUT = say(84.19);

// Cursor: appears briefly at each action point, then disappears.
// [time, x, y, 'click'] — all verified from actions.json.
// No 'move' or 'hover' entries — cursor is invisible between clicks.
export const CLICKS = [
  [say(9.58),  A.status.x, A.status.y],       // open status dropdown
  [say(10.76), A.prospect.x, A.prospect.y],    // select prospect
  [say(11.32), A.building.x, A.building.y],    // open building filter
  [say(12.58), A.savedViews.x, A.savedViews.y],// save view
  [say(16.38), A.scheduled.x, A.scheduled.y],  // scheduled tab
  [say(23.34), A.newStatus.x, A.newStatus.y],  // + New status
  [say(25.04), A.statusColour.x, A.statusColour.y], // pick colour
  [say(26.2),  A.createStatus.x, A.createStatus.y],  // Create
  [demoStart + 0.3, A.editSeller.x, A.editSeller.y], // edit seller
  [demoStart + 1.3, A.hotLead.x, A.hotLead.y],        // select Hot Lead
  [demoStart + 2.2, A.saveSeller.x, A.saveSeller.y],  // save
  [say(31.42), A.tplIntro.x, A.tplIntro.y],    // Introduction
  [say(33.52), A.tplAppraisal.x, A.tplAppraisal.y],
  [say(34.98), A.tplForSale.x, A.tplForSale.y],
];

// Mobile taps
export const TAPS = [
  [say(71.2),  155, 218],
  [say(73.0),  240, 382],
  [say(74.4),  210, 812],
  [say(77.8),  298, 807],
  [say(79.5),  294, 809],
];

// Captions: v5 style — two-line overlays, positioned above the content
export const CAPTIONS = [
  [say(3.98),  say(8.5),  ['Your sellers.', 'One workspace.']],
  [say(9.58),  say(14.0), ['Filter by building,', 'status, bedrooms.']],
  [say(15.02), say(17.2), ['Due today.', 'Scheduled.']],
  [say(18.02), say(22.3), ['Built-in statuses.', 'Or create your own.']],
  [say(23.34), say(27.5), ['Name, colour,', 'follow-up frequency.']],
  [say(28.56), say(30.8), ['A template', 'for every status.']],
  [say(37.42), say(40.5), ['Names and sales', 'fill in automatically.']],
  [say(41.3),  say(45.0), ['Broker card.', 'Preview before you save.']],
  [say(45.88), say(50.5), ['Connected WhatsApp.', 'Automated updates.']],
  [say(51.28), say(55.0), ['Your hours.', 'Your gap. Your limit.']],
  [say(55.84), say(60.6), ['Status: how often', 'a seller is due.']],
  [say(61.16), say(64.0), ['Spacing: minutes', 'between sends.']],
  [say(64.78), say(68.0), ['Sending window.', 'Dubai time.']],
  [say(68.86), say(71.6), ['Same workspace.', 'On your phone.']],
  [say(76.26), say(78.6), ['Ask Repeat.', 'Early access.']],
];

// Highlights (teal marks on desktop) — like v5 but in desktop coords
export const MARKS = [
  // Status filter active indicator
  [say(9.58), say(11.0), 'desktop-sellers-status', 380, 90, 560, 134],
  // Saved views
  [say(12.58), say(14.0), 'desktop-sellers-saved', 60, 144, 210, 188],
  // Status dialog frequency selector
  [say(25.68), say(27.5), 'desktop-status-dialog', 530, 590, 860, 640],
  // Template "Use for" pills
  [say(33.52), say(34.5), 'desktop-tpl-appraisal', 410, 290, 580, 320],
  // Broker card
  [say(41.3), say(43.0), 'desktop-tpl-card', 950, 200, 1290, 400],
  // Sending group
  [say(51.86), say(54.5), 'desktop-sending', 910, 470, 1190, 700],
];

export const CLOSE = {
  logo: say(84.56),
  tagline: [say(86.02), say(86.1), say(86.48), say(86.76), say(86.86)],
  url: say(87.74),
};

export const CUTDOWNS = [
  {
    id: 'statuses', title: 'Your statuses, your rhythm',
    segments: [
      { vStart: 0, vEnd: 3.3 }, { vStart: 10.76, vEnd: 14.26 },
      { vStart: 18.02, vEnd: 27.74 }, { vStart: 27.74, vEnd: 28.56 },
      { vStart: 84.56, vEnd: 89.98 },
    ],
  },
  {
    id: 'pacing', title: 'Messages on your schedule',
    segments: [
      { vStart: 0, vEnd: 3.3 }, { vStart: 45.88, vEnd: 55.22 },
      { vStart: 55.84, vEnd: 68.22 }, { vStart: 84.56, vEnd: 89.98 },
    ],
  },
  {
    id: 'templates', title: 'The right message for every seller',
    segments: [
      { vStart: 0, vEnd: 3.3 }, { vStart: 28.56, vEnd: 45.18 },
      { vStart: 84.56, vEnd: 89.98 },
    ],
  },
];

export const screenAt = (take) => {
  const e = SCREENS.find(([, n]) => n === take);
  return e ? e[0] : null;
};
