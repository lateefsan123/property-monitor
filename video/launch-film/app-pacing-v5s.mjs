// The v5 statuses cut: v5 (app-pacing.mjs) with five narration pickups spliced into
// take 3 for seller statuses, status templates and sending controls, and Ask Repeat
// cut down to one answer: ranking an area's buildings by sales. Picture (app-film-v5s.jsx), sound effects
// (sound-app-v5s.mjs) and the mix (mix-app-v5s.mjs) all read these times.
// say(t) is the film second when take 3 reaches t; pick(n, t) is the film second
// when pickup n reaches t (word times in out/vo-v5s-pickup-<n>-take-1.words.json).
export const CUT = 'app-film-v5-statuses';
export const TAKES = 'takes-v5s';
export const VOICE = { file: 'vo-brady-v5-take-3.mp3', at: 0.5, end: 94.8, fade: 0.2 };
export const PICKUPS = {
  1: { file: 'vo-v5s-pickup-1-take-1.mp3', length: 6.034 }, // "Switch to Scheduled… just your appraisals."
  2: { file: 'vo-v5s-pickup-2-take-1.mp3', length: 6.426 }, // "Add your own statuses too… set it on a seller."
  3: { file: 'vo-v5s-pickup-3-take-1.mp3', length: 4.049 }, // "And when their property is on the market…"
  4: { file: 'vo-v5s-pickup-4-take-1.mp3', length: 14.367 }, // "Then decide how it sends… not a target."
  6: { file: 'vo-v5s-pickup-6-take-3.mp3', length: 3.971 }, // "Ask which buildings sold the most last month, and it ranks them for you."
};
// The voice in film order. Take pieces are split inside the take's own pauses;
// 21.37-25.97 ("Up to forty messages a day…") and 72.70-85.60 (the old Ask Repeat
// tour and voice demo) are left out.
export const SEQUENCE = [
  ['take', 0, 12.9], ['gap', 0.8], // after "…Google Sheets or Excel.": the import finishes
  ['take', 12.9, 15.7], ['gap', 0.5], // "Your due list brings today's follow-ups together."
  ['pickup', 1], ['gap', 1.4],
  ['pickup', 2], ['gap', 2],
  ['take', 15.7, 21.37], // "Link your WhatsApp number… sends them the update."
  ['take', 25.97, 32.58], ['gap', 1.6], // "When you want to send one yourself…"
  ['take', 32.58, 47.94], ['gap', 0.3], // "…write a follow-up that gets straight to the update."
  ['pickup', 3], ['gap', 1.2],
  ['take', 47.94, 58.65], ['gap', 0.5], // "Add your broker card… before you save it."
  ['pickup', 4], ['gap', 1],
  ['take', 58.65, 72.7], ['gap', 0.3], // "In Listings… And there's Ask Repeat, in early access."
  ['pickup', 6], ['gap', 2.8],
  ['take', 85.6, 91.78], ['gap', 0.4], // "Connect your spreadsheets…"
  ['take', 91.78, VOICE.end + VOICE.fade], // "Repeat AI. Stay close to your sellers."
];
// Each voice part with its film second.
export const PARTS = [];
{
  let at = VOICE.at;
  for (const [kind, a, b] of SEQUENCE) {
    if (kind === 'gap') { at += a; continue; }
    const length = kind === 'take' ? b - a : PICKUPS[a].length;
    PARTS.push(kind === 'take' ? { kind, from: a, to: b, at: +at.toFixed(3) } : { kind, n: a, at: +at.toFixed(3) });
    at += length;
  }
}
export const say = (t) => {
  const part = PARTS.find(({ kind, from, to }) => kind === 'take' && t >= from && t < to);
  if (!part) throw new Error(`Take second ${t} is not in the cut`);
  return +(part.at + t - part.from).toFixed(3);
};
export const pick = (n, t) => +(PARTS.find((part) => part.n === n).at + t).toFixed(3);
// Film second where the take piece ending at a split stops (the room after it begins).
export const breath = (split) => {
  const part = PARTS.find(({ kind, to }) => kind === 'take' && Math.abs(to - split) < 1e-6);
  return +(part.at + part.to - part.from).toFixed(3);
};
// Film second where the room after pickup n ends.
const after = (n) => {
  const i = PARTS.findIndex((part) => part.n === n);
  return PARTS[i + 1].at;
};
export const DURATION = +(say(VOICE.end) + 2.5).toFixed(2);

// "With two thousand sellers, knowing who to follow up with can be a job in itself."
export const HOOK = { count: 0.3, sellers: 1.3, out: 2.1, due: 2.25, today: 2.7, end: 4.75 };
export const PHONE_IN = 5.3;
export const PHONE_OUT = say(91.45);

const list = breath(32.58) + 0.15; // the templates list opens in the room after "conversation."
// [time, take, transition]: every change is a short dissolve. Each feature holds on
// one or two screens and highlights what the narration names, rather than tapping
// through every step.
export const SCREENS = [
  [0, 'home'], // "Repeat AI helps you keep track. Open Home…"
  [say(9.65), 'sheets', 'fade'], // "Then bring in your sellers from Google Sheets or Excel."
  [say(12.15), 'import-link', 'fade'],
  [breath(12.9) + 0.3, 'import-done', 'fade'],
  [say(13.05), 'sellers', 'fade'], // "Your due list brings today's follow-ups together."
  [pick(1, 0.5), 'sv-scheduled', 'fade'], // "Switch to Scheduled to see who's coming up next,"
  [pick(1, 3), 'sv-appraisal', 'fade'], // "or filter by status"
  [pick(1, 5.2), 'sv-appraisals', 'fade'], // "to work through just your appraisals."
  [pick(2, 0.1), 'cs-teal', 'fade'], // "Add your own statuses too. Give it a name, a colour"
  [pick(2, 3.55), 'cs-week', 'fade'], // "and a follow-up schedule,"
  [pick(2, 5.05), 'cs-set', 'fade'], // "then set it on a seller."
  [say(15.95), 'whatsapp', 'fade'], // "Link your WhatsApp number."
  [say(17.3), 'automations', 'fade'], // "And when something sells in a seller's building…"
  [say(26.3), 'sellers', 'fade'], // "When you want to send one yourself,"
  [say(28.2), 'oliver-message', 'fade'], // "open the seller"
  [say(29.35), 'chat', 'fade'], // "and tap WhatsApp." / "Make the wording fit the conversation."
  [list, 'templates', 'fade'],
  [list + 1.4, 'tpl-uses-on', 'fade'], // "Create templates for appraisals, properties for sale, and other seller statuses."
  [say(37.55), 'tpl-intro', 'fade'], // "For a new contact, introduce yourself…"
  [say(43.85), 'tpl-followup', 'fade'], // "For someone you already know…"
  [pick(3, 0.1), 'fs-uses', 'fade'], // "And when their property is on the market,"
  [pick(3, 2.6), 'fs-preview', 'fade'], // "send a straight update on the listing."
  [say(48.2), 'tpl-intro-preview', 'fade'], // "Add your broker card as an image, and it goes out with your first message."
  [say(52.2), 'tpl-intro-details', 'fade'], // "Their name, building, and recent sales fill in automatically,"
  [say(55.75), 'tpl-intro-preview', 'fade'], // "and you can preview the message before you save it."
  [pick(4, 0.15), 'sc-statuses', 'fade'], // "Then decide how it sends. Each status sets the days between messages…"
  [pick(4, 5.6), 'sc-limit', 'fade'], // "Space automated messages minutes apart… Dubai time. The daily limit…"
  [after(4) - 0.25, 'listings', 'fade'], // "In Listings, watch the buildings you cover"
  [say(62.45), 'listing', 'fade'], // "and open any apartment to see how its asking price has changed."
  [say(64.85), 'sched-edit', 'fade'], // "Then choose the days for each building"
  [say(66.55), 'sched-th', 'fade'],
  [say(67.25), 'sched-sa', 'fade'],
  [say(68.25), 'schedule-updated', 'fade'], // "so routine updates fit around your week."
  [say(69.75), 'ask-open', 'fade'], // "And there's Ask Repeat, in early access."
  [pick(6, 0.15), 'rank-asking', 'fade'], // "Ask which buildings sold the most last month,"
  [pick(6, 2.3), 'rank-thinking', 'fade'],
  [pick(6, 2.75), 'rank-answer', 'fade'], // "and it ranks them for you."
  [say(86), 'integrations', 'fade'], // "Connect your spreadsheets, email and calendar…"
];

// Taps in app points (393x852), logged by app-takes.mjs and app-takes-v5s.mjs; only
// taps whose result is the next screen.
export const TAPS = [
  [say(12), 349, 103], [breath(12.9) + 0.15, 197, 808], // Import, Continue
  [pick(1, 0.35), 259, 89], [pick(1, 2.85), 354, 156], [pick(1, 5.05), 197, 814], // Scheduled, Filters, Show sellers
  [pick(2, 3.4), 59, 547], // Every week
  [say(28.05), 155, 218], [say(29.15), 210, 812], // Oliver Grant, Send via WhatsApp
  [say(62.3), 186, 153], // Act One
  [say(64.7), 197, 609], [say(66.4), 196, 726], [say(67.1), 300, 726], [say(68.1), 289, 803], // Edit, Thu, Sat, Done
  [pick(6, 0), 353, 810], // voice
];

// Highlights on what the narration describes: [from, to, take, top, bottom, left, right] in app
// points (left and right default to the screen's 12-381). Each fades out before its screen changes.
export const MARKS = [
  [pick(1, 1), pick(1, 2.7), 'sv-scheduled', 170, 305], // "who's coming up next"
  [pick(1, 3.5), pick(1, 4.9), 'sv-appraisal', 364, 404, 16, 110], // "filter by status"
  [pick(1, 5.6), after(1) - 0.3, 'sv-appraisals', 333, 356, 12, 112], // "just your appraisals"
  [pick(2, 1.75), pick(2, 2.65), 'cs-teal', 196, 234], // "Give it a name,"
  [pick(2, 2.75), pick(2, 3.3), 'cs-teal', 588, 628], // "a colour"
  [pick(2, 3.85), pick(2, 4.85), 'cs-week', 534, 562], // "and a follow-up schedule"
  [pick(2, 5.45), after(2) - 0.3, 'cs-set', 636, 668, 240, 360], // "set it on a seller"
  [say(34.75), say(35.8), 'tpl-uses-on', 784, 833], // "properties for sale"
  [say(35.85), say(37.05), 'tpl-uses-on', 587, 701], // "and other seller statuses"
  [say(38.92), say(41.85), 'tpl-intro', 274, 329], // "introduce yourself, mention that you specialise in their building"
  [say(42), say(43.3), 'tpl-intro', 349, 428], // "and share the latest sales"
  [say(45.69), say(47.6), 'tpl-followup', 274, 379], // "write a follow-up that gets straight to the update"
  [pick(3, 1.1), pick(3, 2.3), 'fs-uses', 785, 830], // "on the market"
  [pick(3, 3), after(3) - 0.3, 'fs-preview', 548, 832], // "a straight update on the listing"
  [say(48.6), say(51.85), 'tpl-intro-preview', 292, 438], // "Add your broker card as an image, and it goes out with your first message."
  [say(52.6), say(55.35), 'tpl-intro-details', 653, 697], // "Their name,"
  [say(53.15), say(55.35), 'tpl-intro-details', 719, 767], // "building,"
  [say(53.85), say(55.35), 'tpl-intro-details', 783, 831], // "and recent sales"
  [say(56.4), say(58.3), 'tpl-intro-preview', 503, 760], // "preview the message"
  [pick(4, 2.6), pick(4, 5.25), 'sc-statuses', 240, 392], // "the days between messages"
  [pick(4, 6.2), pick(4, 8.3), 'sc-limit', 640, 748], // "minutes apart"
  [pick(4, 8.6), pick(4, 10.8), 'sc-limit', 520, 592], // "the hours they go out, in Dubai time"
  [pick(4, 11.5), after(4) - 0.6, 'sc-limit', 386, 472], // "The daily limit is a ceiling"
  [say(60), say(61.2), 'listings', 161, 594, 286, 376], // "watch the buildings you cover"
  [pick(6, 3.05), after(6) - 0.3, 'rank-answer', 484, 554], // "ranks them for you": 1. Burj Vista 1
  [pick(6, 3.45), after(6) - 0.3, 'rank-answer', 586, 656], // 2. Act One
  [pick(6, 3.85), after(6) - 0.3, 'rank-answer', 688, 736], // 3. Boulevard Point
];

export const CAPTIONS = [
  [5.8, say(9.45), ['Your day,', 'at a glance.']],
  [say(9.95), breath(12.9) + 0.6, ['Bring your', 'spreadsheet.']],
  [say(13.3), pick(1, 0), ['Everyone due today.', 'One list.']],
  [pick(1, 0.85), pick(1, 2.4), ['Due today.', 'Scheduled.']],
  [pick(1, 3.25), after(1) - 0.2, ['Filter by', 'status.']],
  [pick(2, 0.2), pick(2, 1.55), ['Your own', 'statuses.']],
  [pick(2, 2.05), pick(2, 4.6), ['Name, colour,', 'follow-up.']],
  [pick(2, 5.4), after(2) - 0.3, ['Set it on', 'a seller.']],
  [say(17.6), say(20.8), ['New sale in', 'their building?']],
  [say(26.6), say(29.05), ['Send one', 'yourself.']],
  [say(30.5), say(32.3), ['Words that fit', 'the conversation.']],
  [breath(32.58) + 0.4, say(37.1), ['A template', 'for every status.']],
  [say(37.8), say(43.4), ['New contact?', 'Introduce yourself.']],
  [say(44.2), pick(3, 0), ['Spoken before?', 'Skip the intro.']],
  [pick(3, 0.85), after(3) - 0.3, ['On the market?', 'Send an update.']],
  [say(48.5), say(51.9), ['Add your', 'broker card.']],
  [say(52.4), say(55.55), ['Their details,', 'filled in.']],
  [say(55.9), breath(58.65) - 0.2, ['Preview it', 'before you save.']],
  [pick(4, 0.6), pick(4, 1.9), ['Decide how', 'it sends.']],
  [pick(4, 2.6), pick(4, 5.3), ['Days between', 'messages.']],
  [pick(4, 6.15), pick(4, 8.1), ['Minutes', 'between sends.']],
  [pick(4, 8.95), pick(4, 10.75), ['Sending hours,', 'Dubai time.']],
  [pick(4, 11.6), after(4) - 0.4, ['A ceiling,', 'not a target.']],
  [say(59.1), say(64.6), ['Spot every', 'price change.']],
  [say(65.1), say(69.3), ['Your buildings.', 'Your days.']],
  [say(70.2), pick(6, -0.1), ['Ask Repeat.', 'In early access.']],
  [pick(6, 0.6), after(6) - 0.3, ['Which buildings', 'sold the most?']],
  [say(86.3), say(91.4), ['Works with', 'your tools.']],
];

// Oliver's introduction arrives with the broker card, is read and gets a reply.
const chat = say(29.35);
export const CHAT = { at: chat, sent: chat + 0.45, read: chat + 1.15, typing: chat + 1.3, reply: chat + 2 };
// "Repeat AI. Stay close to your sellers." The tagline builds word by word.
export const CLOSE = { logo: say(92.04), tagline: [say(93.43), say(93.66), say(94.08), say(94.3), say(94.44)], url: say(94.8) + 0.5 };

export const screenAt = (take) => SCREENS.find(([, name]) => name === take)[0];
