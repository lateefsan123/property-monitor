// The v5 statuses cut: v5 (app-pacing.mjs) with five narration pickups spliced into
// take 3 for seller statuses, status templates and sending controls, and Ask Repeat
// cut down to one transaction answer. Picture (app-film-v5s.jsx), sound effects
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
  5: { file: 'vo-v5s-pickup-5-take-1.mp3', length: 3.788 }, // "Ask what sold in a building last month…"
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
  ['pickup', 5], ['gap', 2.4],
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
// [time, take, transition]: 'push' slides in, 'fade' dissolves. 'chat' is drawn.
export const SCREENS = [
  [0, 'home'], // "Repeat AI helps you keep track. Open Home…"
  [say(9.65), 'sheets', 'push'], // "Then bring in your sellers"
  [say(10.6), 'import-options', 'fade'], // "from Google Sheets or Excel."
  [say(12.15), 'import-link', 'fade'],
  [breath(12.9) + 0.3, 'import-done', 'fade'],
  [say(13.05), 'sellers', 'push'], // "Your due list brings today's follow-ups together."
  [pick(1, 0.5), 'sv-scheduled', 'fade'], // "Switch to Scheduled to see who's coming up next,"
  [pick(1, 2.45), 'sv-due', 'fade'],
  [pick(1, 3), 'sv-filters', 'fade'], // "or filter by status"
  [pick(1, 3.6), 'sv-status', 'fade'],
  [pick(1, 4.6), 'sv-appraisal', 'fade'],
  [pick(1, 5.45), 'sv-appraisals', 'fade'], // "to work through just your appraisals."
  [pick(2, 0.05), 'cs-statuses', 'push'], // "Add your own statuses too."
  [pick(2, 1.05), 'cs-new', 'fade'],
  [pick(2, 1.95), 'cs-named', 'fade'], // "Give it a name,"
  [pick(2, 2.85), 'cs-teal', 'fade'], // "a colour"
  [pick(2, 3.4), 'cs-follow', 'fade'], // "and a follow-up schedule,"
  [pick(2, 4), 'cs-week', 'fade'],
  [pick(2, 4.6), 'cs-saved', 'fade'],
  [pick(2, 5.15), 'cs-oliver', 'push'], // "then set it on a seller."
  [pick(2, 5.75), 'cs-chips', 'fade'],
  [pick(2, 6.45), 'cs-set', 'fade'],
  [say(15.95), 'whatsapp', 'push'], // "Link your WhatsApp number."
  [say(17.3), 'automations', 'push'], // "And when something sells in a seller's building…"
  [say(26.3), 'sellers', 'push'], // "When you want to send one yourself,"
  [say(28.2), 'oliver-message', 'fade'], // "open the seller"
  [say(29.35), 'chat', 'push'], // "and tap WhatsApp." / "Make the wording fit the conversation."
  [list, 'templates', 'push'],
  [list + 1.25, 'tpl-appraisal', 'push'],
  [list + 2.15, 'tpl-uses', 'fade'], // "Create templates for appraisals,"
  [say(34.1), 'tpl-uses-on', 'fade'], // "properties for sale, and other seller statuses."
  [say(37.55), 'tpl-intro', 'push'], // "For a new contact, introduce yourself…"
  [say(43.85), 'tpl-followup', 'push'], // "For someone you already know…"
  [pick(3, 0.1), 'fs-template', 'push'], // "And when their property is on the market,"
  [pick(3, 1.5), 'fs-uses', 'fade'],
  [pick(3, 2.9), 'fs-preview', 'fade'], // "send a straight update on the listing."
  [say(48.2), 'tpl-intro', 'push'], // "Add your broker card as an image,"
  [say(50), 'tpl-intro-preview', 'fade'], // "and it goes out with your first message."
  [say(52.2), 'tpl-intro-details', 'fade'], // "Their name, building, and recent sales fill in automatically,"
  [say(55.75), 'tpl-intro-preview', 'fade'], // "and you can preview the message before you save it."
  [pick(4, 0.15), 'sc-auto', 'push'], // "Then decide how it sends."
  [pick(4, 2.15), 'sc-statuses', 'push'], // "Each status sets the days between messages to the same seller."
  [pick(4, 5.6), 'sc-gap10', 'fade'], // "Space automated messages minutes apart,"
  [pick(4, 7.05), 'sc-gap15', 'fade'],
  [pick(4, 8.75), 'sc-window', 'fade'], // "and choose the hours they go out, in Dubai time."
  [pick(4, 11), 'sc-limit', 'fade'], // "The daily limit is a ceiling, not a target."
  [after(4) - 0.25, 'listings', 'push'], // "In Listings, watch the buildings you cover"
  [say(61.55), 'building', 'push'], // "and open any apartment"
  [say(62.45), 'listing', 'push'], // "to see how its asking price has changed."
  [say(64.85), 'schedule', 'push'], // "Then choose the days for each building"
  [say(65.75), 'sched-edit', 'fade'],
  [say(66.55), 'sched-th', 'fade'],
  [say(67.25), 'sched-sa', 'fade'],
  [say(68.25), 'schedule-updated', 'fade'], // "so routine updates fit around your week."
  [say(69.75), 'home', 'push'], // "And there's Ask Repeat, in early access."
  [say(70.9), 'ask-open', 'fade'],
  [pick(5, 0.2), 'voice-listening', 'fade'], // "Ask what sold in a building last month,"
  [pick(5, 0.9), 'voice-asking', 'fade'],
  [pick(5, 2), 'voice-thinking', 'fade'],
  [pick(5, 2.5), 'voice-answer', 'fade'], // "and it pulls up the sales."
  [say(86), 'integrations', 'push'], // "Connect your spreadsheets, email and calendar…"
];

// Taps in app points (393x852), logged by app-takes.mjs and app-takes-v5s.mjs.
export const TAPS = [
  [say(10.45), 349, 103], [say(12), 197, 604], [breath(12.9) + 0.15, 197, 808], // Import, From URL, Continue
  [pick(1, 0.35), 259, 89], [pick(1, 2.3), 135, 89], [pick(1, 2.85), 354, 156], // Scheduled, Due today, Filters
  [pick(1, 3.45), 197, 390], [pick(1, 4.45), 63, 383], [pick(1, 5.3), 197, 814], // Status, Appraisal, Show sellers
  [pick(2, 0.9), 222, 144], [pick(2, 1.75), 197, 214], [pick(2, 2.7), 246, 607], // Add status, Name, teal
  [pick(2, 3.85), 59, 547], [pick(2, 4.45), 196, 810], // Every week, Save
  [pick(2, 5.6), 197, 650], [pick(2, 6.3), 82, 737], // Change seller status, Viewing booked
  [say(28.05), 155, 218], [say(29.15), 210, 812], // Oliver Grant, Send via WhatsApp
  [list + 1.1, 197, 308], [list + 2, 197, 702], [say(33.95), 351, 740], // Appraisal follow-up, Use for, Appraisal
  [pick(3, 1.35), 197, 602], // Use for
  [pick(4, 6.9), 197, 717], [pick(4, 8.6), 147, 531], // 15m, Send between
  [say(61.4), 186, 153], [say(62.3), 209, 141], // Act One, High floor
  [say(65.6), 197, 609], [say(66.4), 196, 726], [say(67.1), 300, 726], [say(68.1), 289, 803], // Edit, Thu, Sat, Done
  [say(70.75), 298, 807], [pick(5, 0.05), 353, 810], // Ask Repeat, voice
];

// Highlights on what the narration describes: [from, to, take, top, bottom, left, right] in app
// points (left and right default to the screen's 12-381). Each fades out before its screen changes.
export const MARKS = [
  [pick(1, 5.75), after(1) - 0.3, 'sv-appraisals', 333, 356, 12, 112], // "just your appraisals"
  [pick(2, 4.85), pick(2, 5.05), 'cs-saved', 172, 228], // the new status
  [pick(2, 6.75), after(2) - 0.3, 'cs-set', 636, 668, 240, 360], // "set it on a seller"
  [say(34.75), say(35.8), 'tpl-uses-on', 784, 833], // "properties for sale"
  [say(35.85), say(37.05), 'tpl-uses-on', 587, 701], // "and other seller statuses"
  [say(38.92), say(41.85), 'tpl-intro', 274, 329], // "introduce yourself, mention that you specialise in their building"
  [say(42), say(43.3), 'tpl-intro', 349, 428], // "and share the latest sales"
  [say(45.69), say(47.6), 'tpl-followup', 274, 379], // "write a follow-up that gets straight to the update"
  [pick(3, 1.75), pick(3, 2.65), 'fs-uses', 785, 830], // "on the market"
  [pick(3, 3.2), after(3) - 0.3, 'fs-preview', 548, 832], // "a straight update on the listing"
  [say(48.6), say(49.6), 'tpl-intro', 580, 650], // "Add your broker card as an image,"
  [say(50.35), say(51.85), 'tpl-intro-preview', 292, 438], // "and it goes out with your first message."
  [say(52.6), say(55.35), 'tpl-intro-details', 653, 697], // "Their name,"
  [say(53.15), say(55.35), 'tpl-intro-details', 719, 767], // "building,"
  [say(53.85), say(55.35), 'tpl-intro-details', 783, 831], // "and recent sales"
  [say(56.4), say(58.3), 'tpl-intro-preview', 503, 760], // "preview the message"
  [pick(4, 2.6), pick(4, 5.25), 'sc-statuses', 240, 392], // "the days between messages"
  [pick(4, 7.3), pick(4, 8.4), 'sc-gap15', 640, 750], // "minutes apart"
  [pick(4, 11.5), after(4) - 0.6, 'sc-limit', 392, 470], // "The daily limit is a ceiling"
  [say(60), say(61.2), 'listings', 161, 594, 286, 376], // "watch the buildings you cover"
  [pick(5, 2.9), after(5) - 0.3, 'voice-answer', 384, 452], // "it pulls up the sales"
  [pick(5, 3.8), after(5) - 0.3, 'voice-answer', 486, 556],
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
  [say(70.2), pick(5, -0.1), ['Ask Repeat.', 'In early access.']],
  [pick(5, 0.75), after(5) - 0.3, ['“What sold in', 'Forte 2 last month?”']],
  [say(86.3), say(91.4), ['Works with', 'your tools.']],
];

// Oliver's introduction arrives with the broker card, is read and gets a reply.
const chat = say(29.35);
export const CHAT = { at: chat, sent: chat + 0.45, read: chat + 1.15, typing: chat + 1.3, reply: chat + 2 };
// "Repeat AI. Stay close to your sellers." The tagline builds word by word.
export const CLOSE = { logo: say(92.04), tagline: [say(93.43), say(93.66), say(94.08), say(94.3), say(94.44)], url: say(94.8) + 0.5 };

export const screenAt = (take) => SCREENS.find(([, name]) => name === take)[0];
