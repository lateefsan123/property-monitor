// v6 cut: timed to dialogue-natural-v6.txt, Brady J take 1 (90.358 s).
// Word times from out/vo-brady-v6-take-1.words.json; paragraph anchors from
// out/audio-timing-v6.json. Plays once from VOICE.at at delivered speed.
// Splits add room inside genuine paragraph pauses. No stretching.
export const CUT = 'app-film-v6';
export const TAKES = 'takes-v6';

export const VOICE = { file: 'vo-brady-v6-take-1.mp3', at: 0.5, duration: 90.357542 };

// Breath splits: [take-second midpoint, extra seconds].
// P3→P4 enlarged to 3.5 s for status creation/assignment demo.
export const BREATHS = [
  [3.64,  1.5],  // P1→P2: 3.3–3.98
  [17.68, 1.2],  // P2→P3: 17.34–18.02
  [28.15, 3.5],  // P3→P4: 27.74–28.56 — extra room for status demo
  [45.53, 1.0],  // P4→P5: 45.18–45.88
  [55.53, 0.8],  // P5→P6: 55.22–55.84
  [68.54, 1.0],  // P6→P7: 68.22–68.86
  [75.92, 0.5],  // P7→P8: 75.58–76.26
  [84.19, 0.5],  // P8→P9: 83.82–84.56
];
const added = (t) => BREATHS.filter(([s]) => s <= t).reduce((sum, [, e]) => sum + e, 0);
export const say = (t) => +(VOICE.at + t + added(t)).toFixed(3);
export const breath = (split) => {
  const b = BREATHS.find(([s]) => s === split);
  return b ? +(say(split) - b[1]).toFixed(3) : say(split);
};

const voiceEnd = say(89.98);
export const DURATION = Math.ceil(voiceEnd + 3); // ~3 s music tail

// ---- Paragraph anchors ----
export const P1 = { id: 'hook',       at: say(0),     end: say(3.3)   };
export const P2 = { id: 'workspace',  at: say(3.98),  end: say(17.34) };
export const P3 = { id: 'statuses',   at: say(18.02), end: say(27.74) };
export const P4 = { id: 'templates',  at: say(28.56), end: say(45.18) };
export const P5 = { id: 'automation', at: say(45.88), end: say(55.22) };
export const P6 = { id: 'controls',   at: say(55.84), end: say(68.22) };
export const P7 = { id: 'mobile',     at: say(68.86), end: say(75.58) };
export const P8 = { id: 'ask',        at: say(76.26), end: say(83.82) };
export const P9 = { id: 'close',      at: say(84.56), end: say(89.98) };

// Status demo room: the 3.5 s between P3 and P4 for showing
// creation result → edit form → Hot Lead selection → save → assigned
const demoStart = breath(28.15); // film time at end of P3
const demoEnd = say(28.56);      // film time at start of P4

// ---- Hook ----
export const HOOK = {
  count: say(0) - 0.15,
  sellers: say(0.26),
  question: say(2.08),
  out: breath(3.64) + 0.3,
};

// ---- Verified cursor targets from actions.json ----
const A = {
  status:       { x: 462, y: 112 },
  prospect:     { x: 525, y: 242 },
  building:     { x: 781, y: 112 },
  buildingItem: { x: 882, y: 248 },
  savedViews:   { x: 133, y: 166 },
  scheduled:    { x: 222, y: 54 },
  statusesNav:  { x: 332, y: 360 },
  newStatus:    { x: 1164, y: 53 },
  statusColour: { x: 614, y: 574 },
  createStatus: { x: 836, y: 705 },
  gap30:        { x: 1138, y: 675 },
  editSeller:   { x: 1395, y: 26 },
  hotLead:      { x: 950, y: 505 },
  saveSeller:   { x: 1289, y: 860 },
  // template actions
  tplIntro:     { x: 240, y: 233 },
  tplAppraisal: { x: 240, y: 287 },
  tplForSale:   { x: 240, y: 340 },
  tplUseFor:    { x: 680, y: 259 },
  tplCard:      { x: 1141, y: 254 },
};

// ---- Screens ----
const D = (n) => `/video/launch-film/out/desktop/takes-v6/${n}.png`;
const M = (n) => `/video/launch-film/out/app/takes-v6/${n}.png`;

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
  // Status demo in the extended breath (3.5 s extra room)
  [demoStart + 0.3, 'desktop-status-edit',       'fade', 'desktop'],
  [demoStart + 1.3, 'desktop-status-assignment', 'fade', 'desktop'],
  [demoStart + 2.3, 'desktop-status-assigned',   'fade', 'desktop'],

  // P4 templates
  [say(28.56), 'desktop-templates',     'push', 'desktop'],
  [say(31.42), 'desktop-tpl-intro',     'fade', 'desktop'],
  [say(33.52), 'desktop-tpl-appraisal', 'fade', 'desktop'],
  [say(34.98), 'desktop-tpl-forsale',   'fade', 'desktop'],
  [say(37.42), 'desktop-tpl-fields',    'fade', 'desktop'],
  [say(41.3),  'desktop-tpl-card',      'fade', 'desktop'],
  [say(43.46), 'desktop-tpl-preview',   'fade', 'desktop'],

  // P5 automation (no desktop-whatsapp — removed)
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

// ---- Phone ----
export const PHONE_IN = say(68.86) - 0.3;
export const PHONE_OUT = say(84.19);

// ---- Cursor ----
export const CURSOR = [
  // P2
  [say(9.3),   A.status.x - 80, A.status.y, 'move'],
  [say(9.58),  A.status.x, A.status.y, 'click'],
  [say(10.5),  A.prospect.x, A.prospect.y, 'move'],
  [say(10.76), A.prospect.x, A.prospect.y, 'click'],
  [say(11.0),  A.building.x, A.building.y, 'move'],
  [say(11.32), A.building.x, A.building.y, 'click'],
  [say(12.3),  A.savedViews.x, A.savedViews.y, 'move'],
  [say(12.58), A.savedViews.x, A.savedViews.y, 'click'],
  [say(14.8),  350, 54, 'move'],
  [say(15.02), 350, 54, 'hover'],
  [say(16.1),  A.scheduled.x, A.scheduled.y, 'move'],
  [say(16.38), A.scheduled.x, A.scheduled.y, 'click'],

  // P3
  [say(17.8),  A.statusesNav.x, A.statusesNav.y, 'move'],
  [say(18.02), A.statusesNav.x, A.statusesNav.y, 'click'],
  [say(21.5),  700, 290, 'move'],
  [say(21.68), 700, 290, 'hover'],
  [say(23.0),  A.newStatus.x, A.newStatus.y, 'move'],
  [say(23.34), A.newStatus.x, A.newStatus.y, 'click'],
  [say(24.8),  A.statusColour.x, A.statusColour.y, 'move'],
  [say(25.04), A.statusColour.x, A.statusColour.y, 'click'],
  [say(26.0),  A.createStatus.x, A.createStatus.y, 'move'],
  [say(26.2),  A.createStatus.x, A.createStatus.y, 'click'],
  // Status demo room: edit seller → select Hot Lead → save
  [demoStart + 0.1, A.editSeller.x, A.editSeller.y, 'move'],
  [demoStart + 0.3, A.editSeller.x, A.editSeller.y, 'click'],
  [demoStart + 1.0, A.hotLead.x, A.hotLead.y, 'move'],
  [demoStart + 1.3, A.hotLead.x, A.hotLead.y, 'click'],
  [demoStart + 2.0, A.saveSeller.x, A.saveSeller.y, 'move'],
  [demoStart + 2.3, A.saveSeller.x, A.saveSeller.y, 'click'],

  // P4
  [say(31.0),  A.tplIntro.x, A.tplIntro.y, 'move'],
  [say(31.42), A.tplIntro.x, A.tplIntro.y, 'click'],
  [say(33.3),  A.tplAppraisal.x, A.tplAppraisal.y, 'move'],
  [say(33.52), A.tplAppraisal.x, A.tplAppraisal.y, 'click'],
  [say(34.7),  A.tplForSale.x, A.tplForSale.y, 'move'],
  [say(34.98), A.tplForSale.x, A.tplForSale.y, 'click'],
  [say(37.2),  500, 740, 'move'],
  [say(37.42), 500, 740, 'hover'],
  [say(41.0),  A.tplCard.x, A.tplCard.y, 'move'],
  [say(41.3),  A.tplCard.x, A.tplCard.y, 'hover'],
  [say(43.2),  1141, 400, 'move'],
  [say(43.46), 1141, 400, 'hover'],

  // P5
  [say(46.0),  1100, 120, 'move'],
  [say(46.28), 1100, 120, 'hover'],
  [say(51.6),  1000, 580, 'move'],
  [say(51.86), 1000, 580, 'hover'],
  [say(52.7),  1050, 675, 'move'],
  [say(52.92), 1050, 675, 'hover'],
  [say(54.3),  1100, 490, 'move'],
  [say(54.64), 1100, 490, 'hover'],

  // P6
  [say(57.7),  700, 290, 'move'],
  [say(58.0),  700, 290, 'hover'],
  [say(61.0),  1050, 675, 'move'],
  [say(61.16), 1050, 675, 'hover'],
  [say(64.5),  1000, 580, 'move'],
  [say(64.78), 1000, 580, 'hover'],
  [say(67.5),  850, 600, 'move'],
  [say(67.7),  850, 600, 'hover'],
];

// Mobile taps
export const TAPS = [
  [say(71.2),  155, 218],   // open seller (from mobile actions)
  [say(73.0),  240, 382],   // message tab
  [say(74.4),  210, 812],
  [say(77.8),  298, 807],   // ask repeat
  [say(79.5),  294, 809],
];

// ---- Captions ----
export const CAPTIONS = [
  [say(3.98),  say(8.5),  ['Your sellers.', 'One workspace.']],
  [say(9.58),  say(14.0), ['Import, filter,', 'save your view.']],
  [say(15.02), say(17.2), ['Due today.', 'Scheduled.']],
  [say(18.02), say(22.3), ['Built-in statuses.', 'Or your own.']],
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

export const AUTOMATION_COUNTER = {
  at: say(51.28), count: say(51.28), out: say(55.0), value: 40,
};

export const CLOSE = {
  logo: say(84.56),
  tagline: [say(86.02), say(86.1), say(86.48), say(86.76), say(86.86)],
  url: say(87.74),
};

export const MARKS = [
  [say(9.58),  say(11.0), 'desktop-sellers-status'],
  [say(12.58), say(14.0), 'desktop-sellers-saved'],
  [say(25.68), say(27.5), 'desktop-status-dialog'],
  [say(33.52), say(34.5), 'desktop-tpl-appraisal'],
  [say(41.3),  say(43.0), 'desktop-tpl-card'],
  [say(51.86), say(52.9), 'desktop-sending'],
  [say(52.92), say(53.7), 'desktop-sending'],
  [say(54.64), say(55.1), 'desktop-sending'],
  [say(67.7),  say(68.1), 'desktop-controls-window'],
];

// ---- Portrait camera ----
// {x,y,w,h} in 1440×900 desktop coords. Transition duration defaults to 0.4 s.
// Designed so no cursor target falls outside the crop.
export const CAMERA = [
  // P2: filter bar + top rows
  [say(3.98),  { x: 0, y: 0, w: 1440, h: 500 }],
  [say(9.58),  { x: 280, y: 50, w: 880, h: 500 }],   // status dropdown visible at y112..260
  [say(11.32), { x: 0, y: 0, w: 1440, h: 500 }],      // filtered result
  [say(12.58), { x: 0, y: 60, w: 700, h: 400 }],       // saved views at y166
  [say(15.02), { x: 0, y: 0, w: 1440, h: 500 }],
  [say(16.38), { x: 0, y: 0, w: 1440, h: 500 }],

  // P3: statuses
  [say(18.02), { x: 430, y: 40, w: 780, h: 490 }],
  [say(21.68), { x: 430, y: 60, w: 780, h: 490 }],
  [say(23.34), { x: 500, y: 130, w: 440, h: 640 }],    // dialog: actual box ~520..920,130..740
  [say(26.2),  { x: 430, y: 40, w: 780, h: 490 }],     // created result
  [demoStart + 0.3, { x: 600, y: 0, w: 840, h: 530 }], // edit form
  [demoStart + 1.3, { x: 600, y: 250, w: 840, h: 530 }], // Hot Lead selection ~y505
  [demoStart + 2.3, { x: 0, y: 0, w: 1440, h: 500 }],   // assigned result

  // P4: templates — tight library+editor, then tight preview crops
  [say(28.56), { x: 120, y: 130, w: 900, h: 620 }],    // library + editor
  [say(31.42), { x: 120, y: 130, w: 900, h: 620 }],
  [say(33.52), { x: 120, y: 130, w: 900, h: 620 }],
  [say(34.98), { x: 120, y: 130, w: 900, h: 620 }],
  [say(37.42), { x: 300, y: 600, w: 600, h: 250 }],    // merge fields at ~y740
  [say(41.3),  { x: 920, y: 150, w: 400, h: 500 }],    // broker card preview
  [say(43.46), { x: 920, y: 250, w: 400, h: 500 }],    // composed message

  // P5: automations — establishing then tight sending
  [say(45.88), { x: 430, y: 40, w: 780, h: 490 }],     // full automations
  [say(51.28), { x: 890, y: 440, w: 350, h: 300 }],     // tight sending: hours y569, gap y675, limit y490

  // P6: controls — tight per explanation
  [say(55.84), { x: 430, y: 40, w: 780, h: 490 }],     // status freq in statuses page
  [say(61.16), { x: 880, y: 600, w: 380, h: 200 }],     // gap buttons at y675
  [say(64.78), { x: 880, y: 500, w: 380, h: 250 }],     // send between at y569 + Dubai time
];

// ---- Cutdowns ----
export const CUTDOWNS = [
  {
    id: 'statuses',
    title: 'Your statuses, your rhythm',
    segments: [
      { vStart: 0, vEnd: 3.3 },
      { vStart: 10.76, vEnd: 14.26 },
      { vStart: 18.02, vEnd: 27.74 },
      // include the extended demo room
      { vStart: 27.74, vEnd: 28.56 },
      { vStart: 84.56, vEnd: 89.98 },
    ],
  },
  {
    id: 'pacing',
    title: 'Messages on your schedule',
    segments: [
      { vStart: 0, vEnd: 3.3 },
      { vStart: 45.88, vEnd: 55.22 },
      { vStart: 55.84, vEnd: 68.22 },
      { vStart: 84.56, vEnd: 89.98 },
    ],
  },
  {
    id: 'templates',
    title: 'The right message for every seller',
    segments: [
      { vStart: 0, vEnd: 3.3 },
      { vStart: 28.56, vEnd: 45.18 },
      { vStart: 84.56, vEnd: 89.98 },
    ],
  },
];

export const screenAt = (take) => {
  const e = SCREENS.find(([, n]) => n === take);
  return e ? e[0] : null;
};
