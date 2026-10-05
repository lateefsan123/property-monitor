// The v4 cut, timed to the approved Eleven v4 narration (Brady J, take 1). The
// take plays once, unedited, from VOICE.at, so film seconds = take seconds + 0.5.
// Picture (app-film.jsx), sound effects (sound-app.mjs) and the mix (mix-app.mjs)
// all read these times; comments quote the narration each change follows.
// Word times come from narration-words.py (out/vo-brady-v4-take-1.words.json).
export const CUT = 'app-film-v4';
export const TAKES = 'takes-v4';
export const VOICE = { file: 'vo-brady-v4-take-1.mp3', at: 0.5 };
export const DURATION = 72;

// "With two thousand sellers, knowing who to follow up with can be a job in itself."
export const HOOK = { count: 0.3, sellers: 1.4, out: 2.1, due: 2.3, today: 2.75, end: 4.3 };
export const PHONE_IN = 4.75;
export const PHONE_OUT = 65.5;

// [time, take, transition]: 'push' slides in, 'fade' dissolves. 'chat' is drawn.
export const SCREENS = [
  [0, 'home'], // "Repeat AI helps you keep track. Open Home…"
  [9.75, 'sheets', 'push'], // "then bring in your sellers"
  [10.45, 'import-options', 'fade'],
  [11.55, 'import-link', 'fade'], // "from Google Sheets or Excel"
  [12.4, 'import-done', 'fade'],
  [13.15, 'sellers', 'push'], // "Your due list brings today's follow-ups together."
  [15.75, 'whatsapp', 'push'], // "Connect WhatsApp,"
  [16.95, 'automations', 'push'], // "and Repeat can send up to forty updates a day"
  [21.95, 'sellers', 'push'], // "When you want to send one yourself,"
  [23.95, 'oliver-message', 'fade'], // "open the seller"
  [25, 'chat', 'push'], // "and tap WhatsApp." / "Make the wording fit the conversation."
  [27.5, 'templates', 'push'], // "Create templates"
  [29, 'tpl-appraisal', 'push'], // "for appraisals,"
  [29.65, 'tpl-uses', 'fade'],
  [30.3, 'tpl-uses-on', 'fade'], // "properties available for sale, and other seller statuses."
  [33.35, 'tpl-intro', 'push'], // "For a new contact, introduce yourself…"
  [39.95, 'tpl-followup', 'push'], // "For someone you've already spoken to…"
  [44.45, 'tpl-details', 'fade'], // "Their name, building, and recent sales fill into the template,"
  [47.45, 'tpl-followup', 'fade'],
  [47.85, 'tpl-preview', 'fade'], // "and you can preview the message before saving it."
  [50.3, 'listings', 'push'], // "In Listings,"
  [51.35, 'building', 'push'], // "open an apartment"
  [52.3, 'listing', 'push'], // "to see how its asking price has changed."
  [54.35, 'schedule', 'push'], // "Then, choose the days for each building,"
  [55.3, 'sched-edit', 'fade'],
  [55.95, 'sched-th', 'fade'],
  [56.55, 'sched-sa', 'fade'],
  [57.45, 'schedule-updated', 'fade'], // "so routine updates fit around your week."
  [58.75, 'home', 'push'], // "Need a hand?"
  [59.55, 'ask-open', 'fade'], // "Ask Repeat."
  [60.15, 'ask-typed', 'fade'],
  [60.75, 'ask-reply', 'fade'],
  [61.95, 'integrations', 'push'], // "Connect your spreadsheets, email and calendar…"
];

// Taps in app points (393x852), logged by app-takes.mjs.
export const TAPS = [
  [10.3, 349, 103], [11.4, 197, 604], [12.25, 197, 808], // Import, From URL, Continue
  [23.8, 155, 218], [24.85, 210, 812], // Oliver Grant, Send via WhatsApp
  [28.85, 197, 308], [29.5, 197, 702], [30.15, 351, 740], // Appraisal follow-up, Use for, Appraisal
  [44.3, 163, 564], [47.3, 196, 200], [47.7, 349, 564], // Insert details, close sheet, Preview
  [51.2, 186, 153], [52.15, 209, 141], // Act One, High floor
  [55.15, 197, 609], [55.8, 196, 726], [56.4, 300, 726], [57.3, 289, 803], // Edit, Thu, Sat, Done
  [59.4, 298, 807], [60.6, 294, 809], // Ask Repeat, Send
];

// Highlights on the template text the narration describes: [from, to, take, top, bottom] in app points.
// Each fades out before its screen changes.
export const MARKS = [
  [30.75, 31.9, 'tpl-uses-on', 784, 833], // "properties available for sale"
  [31.95, 33.05, 'tpl-uses-on', 587, 701], // "and other seller statuses"
  [34.8, 37.85, 'tpl-intro', 274, 329], // "introduce yourself, explain that you specialise in their building"
  [37.9, 39.6, 'tpl-intro', 349, 428], // "and share the latest transactions"
  [41.9, 44.15, 'tpl-followup', 274, 379], // "write a follow-up that gets straight to the update"
  [44.7, 47.15, 'tpl-details', 653, 697], // "Their name,"
  [45.25, 47.15, 'tpl-details', 719, 767], // "building,"
  [45.95, 47.15, 'tpl-details', 783, 831], // "and recent sales"
];

export const CAPTIONS = [
  [5.4, 9.3, ['Your day,', 'at a glance.']],
  [9.85, 12.8, ['Bring your', 'spreadsheet.']],
  [13.25, 15.4, ['Everyone due today.', 'One list.']],
  [22.2, 24.7, ['Send one', 'yourself.']],
  [25.9, 27.95, ['Words that fit', 'the conversation.']],
  [28.35, 33.05, ['A template', 'for every status.']],
  [33.5, 39.5, ['New contact?', 'Introduce yourself.']],
  [40.1, 44, ['Spoken before?', 'Skip the intro.']],
  [44.5, 47.35, ['Their details,', 'filled in.']],
  [47.8, 50.05, ['Preview it', 'before you save.']],
  [50.5, 54, ['Spot every', 'price change.']],
  [54.5, 58.4, ['Your buildings.', 'Your days.']],
  [58.9, 61.6, ['Need a hand?', 'Ask Repeat.']],
  [62.1, 65.15, ['Works with', 'your tools.']],
];

// "40 automated WhatsApp messages a day": the count lands on "forty".
export const AUTOMATION = { at: 17, count: 17.3, note: 19.55, out: 21.45 };
// Oliver's introduction arrives, is read and gets a reply.
export const CHAT = { at: 25, sent: 25.3, read: 25.85, typing: 25.95, reply: 26.3 };
// "Repeat AI. Stay close to your sellers." The tagline builds word by word.
export const CLOSE = { logo: 66.25, tagline: [67.5, 67.95, 68.35, 68.5, 68.65], url: 69.2 };

export const screenAt = (take) => SCREENS.find(([, name]) => name === take)[0];
