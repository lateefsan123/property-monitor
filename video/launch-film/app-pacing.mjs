// The v5 cut: picture, captions, highlights and sound-effect cues timed to the v5
// narration (Codex, Eleven v4, Brady J, take 3) and the Ask Repeat voice demo.
// Picture (app-film.jsx), sound effects (sound-app.mjs) and the mix (mix-app.mjs)
// all read these times. Cues are written as say(t): the film second when the
// narration reaches t seconds of the take (word times from narration-words.py,
// out/vo-brady-v5-take-3.words.json). Comments quote the narration they follow.
export const CUT = 'app-film-v5';
export const TAKES = 'takes-v5';
// The take plays in order from 0.5 s, unedited, until the end of "sellers." (94.8 s);
// a 0.2 s fade then removes a breath the recogniser heard as words.
export const VOICE = { file: 'vo-brady-v5-take-3.mp3', at: 0.5, end: 94.8 };
// Ask Repeat by voice, between "Talk to it, or type." and "Ask what similar…":
// the broker's question (Brady J) and Repeat's answer (ElevenLabs voice "Clarice").
export const DEMO = {
  split: 74.86, lead: 0.3, think: 0.85, tail: 0.5,
  question: { file: 'vo-brady-v5-demo-question-take-1.mp3', length: 2.351 },
  answer: { file: 'vo-repeat-v5-answer-clarice-take-1.mp3', length: 9.404 },
};
const demoLength = DEMO.lead + DEMO.question.length + DEMO.think + DEMO.answer.length + DEMO.tail;
// Room added inside the take's own pauses: [take second where it splits (mid-silence), seconds added].
export const BREATHS = [
  [12.9, 0.8], // after "…from Google Sheets or Excel.": the import finishes
  [32.58, 1.6], // after "Make the wording fit the conversation.": a template opens
  [58.65, 0.5], // after "…preview the message before you save it."
  [DEMO.split, demoLength], // the voice demo
  [91.78, 0.4], // after "…keep your seller workspace in one place."
];
const added = (t) => BREATHS.filter(([split]) => split <= t).reduce((sum, [, extra]) => sum + extra, 0);
export const say = (t) => +(VOICE.at + t + added(t)).toFixed(3);
// Film second at which the room added at a split begins.
export const breath = (split) => +(say(split) - BREATHS.find(([at]) => at === split)[1]).toFixed(3);
export const QUESTION_AT = +(breath(DEMO.split) + DEMO.lead).toFixed(3);
export const ANSWER_AT = +(QUESTION_AT + DEMO.question.length + DEMO.think).toFixed(3);
export const DURATION = 114.5;

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
  [say(48.2), 'tpl-intro', 'push'], // "Add your broker card as an image,"
  [say(50), 'tpl-intro-preview', 'fade'], // "and it goes out with your first message."
  [say(52.2), 'tpl-intro-details', 'fade'], // "Their name, building, and recent sales fill in automatically,"
  [say(55.75), 'tpl-intro-preview', 'fade'], // "and you can preview the message before you save it."
  [breath(58.65) + 0.25, 'listings', 'push'], // "In Listings, watch the buildings you cover"
  [say(61.55), 'building', 'push'], // "and open any apartment"
  [say(62.45), 'listing', 'push'], // "to see how its asking price has changed."
  [say(64.85), 'schedule', 'push'], // "Then choose the days for each building"
  [say(65.75), 'sched-edit', 'fade'],
  [say(66.55), 'sched-th', 'fade'],
  [say(67.25), 'sched-sa', 'fade'],
  [say(68.25), 'schedule-updated', 'fade'], // "so routine updates fit around your week."
  [say(69.75), 'home', 'push'], // "And there's Ask Repeat, in early access."
  [say(70.9), 'ask-open', 'fade'],
  [say(73.45), 'voice-listening', 'fade'], // "Talk to it, or type."
  [QUESTION_AT + 0.7, 'voice-asking', 'fade'], // "What sold in Forte 2 last month?"
  [QUESTION_AT + 2.45, 'voice-thinking', 'fade'],
  [ANSWER_AT - 0.1, 'voice-answer', 'fade'], // "Forte 2 had five recorded sales in August…"
  [say(75.05), 'ask-typed', 'fade'], // "Ask what similar apartments are asking,"
  [say(77.35), 'ask-reply', 'fade'], // "or which listings just dropped their price."
  [say(79.75), 'voice-confirm', 'fade'], // "It can draft notes, templates and emails too. And nothing changes until you confirm."
  [say(86), 'integrations', 'push'], // "Connect your spreadsheets, email and calendar…"
];

// Taps in app points (393x852), logged by app-takes.mjs.
export const TAPS = [
  [say(10.45), 349, 103], [say(12), 197, 604], [breath(12.9) + 0.15, 197, 808], // Import, From URL, Continue
  [say(28.05), 155, 218], [say(29.15), 210, 812], // Oliver Grant, Send via WhatsApp
  [list + 1.1, 197, 308], [list + 2, 197, 702], [say(33.95), 351, 740], // Appraisal follow-up, Use for, Appraisal
  [say(61.4), 186, 153], [say(62.3), 209, 141], // Act One, High floor
  [say(65.6), 197, 609], [say(66.4), 196, 726], [say(67.1), 300, 726], [say(68.1), 289, 803], // Edit, Thu, Sat, Done
  [say(70.75), 298, 807], [say(73.3), 353, 810], [say(77.2), 294, 809], // Ask Repeat, voice, Send
];

// Highlights on what the narration describes: [from, to, take, top, bottom, left, right] in app
// points (left and right default to the screen's 12-381). Each fades out before its screen changes.
export const MARKS = [
  [say(34.75), say(35.8), 'tpl-uses-on', 784, 833], // "properties for sale"
  [say(35.85), say(37.05), 'tpl-uses-on', 587, 701], // "and other seller statuses"
  [say(38.92), say(41.85), 'tpl-intro', 274, 329], // "introduce yourself, mention that you specialise in their building"
  [say(42), say(43.3), 'tpl-intro', 349, 428], // "and share the latest sales"
  [say(45.69), say(47.6), 'tpl-followup', 274, 379], // "write a follow-up that gets straight to the update"
  [say(48.6), say(49.6), 'tpl-intro', 580, 650], // "Add your broker card as an image,"
  [say(50.35), say(51.85), 'tpl-intro-preview', 292, 438], // "and it goes out with your first message."
  [say(52.6), say(55.35), 'tpl-intro-details', 653, 697], // "Their name,"
  [say(53.15), say(55.35), 'tpl-intro-details', 719, 767], // "building,"
  [say(53.85), say(55.35), 'tpl-intro-details', 783, 831], // "and recent sales"
  [say(56.4), say(58.3), 'tpl-intro-preview', 503, 760], // "preview the message"
  [say(60), say(61.2), 'listings', 161, 594, 286, 376], // "watch the buildings you cover"
  [ANSWER_AT + 1, ANSWER_AT + 3.5, 'voice-answer', 381, 411], // "had five recorded sales in August"
  [ANSWER_AT + 3.8, ANSWER_AT + 6.45, 'voice-answer', 406, 434], // "The median was 2.9 million dirhams"
  [ANSWER_AT + 6.75, ANSWER_AT + 9.2, 'voice-answer', 431, 457], // "about 3,000 per square foot"
  [say(83.6), say(85.6), 'voice-confirm', 497, 547, 22, 371], // "nothing changes until you confirm"
];

export const CAPTIONS = [
  [5.8, say(9.45), ['Your day,', 'at a glance.']],
  [say(9.95), breath(12.9) + 0.6, ['Bring your', 'spreadsheet.']],
  [say(13.3), say(15.6), ['Everyone due today.', 'One list.']],
  [say(17.6), say(20.8), ['New sale in', 'their building?']],
  [say(26.6), say(29.05), ['Send one', 'yourself.']],
  [say(30.5), say(32.3), ['Words that fit', 'the conversation.']],
  [breath(32.58) + 0.4, say(37.1), ['A template', 'for every status.']],
  [say(37.8), say(43.4), ['New contact?', 'Introduce yourself.']],
  [say(44.2), say(47.8), ['Spoken before?', 'Skip the intro.']],
  [say(48.5), say(51.9), ['Add your', 'broker card.']],
  [say(52.4), say(55.55), ['Their details,', 'filled in.']],
  [say(55.9), breath(58.65) + 0.2, ['Preview it', 'before you save.']],
  [say(59.1), say(64.6), ['Spot every', 'price change.']],
  [say(65.1), say(69.3), ['Your buildings.', 'Your days.']],
  [say(70.2), say(72.9), ['Ask Repeat.', 'In early access.']],
  [say(73.25), QUESTION_AT - 0.15, ['Talk to it,', 'or type.']],
  [QUESTION_AT + 0.35, ANSWER_AT + 9.3, ['“What sold in', 'Forte 2 last month?”']],
  [say(75.2), say(79.4), ['Asking prices.', 'Price drops.']],
  [say(80), say(82.9), ['Notes, templates,', 'emails.']],
  [say(83.2), say(85.7), ['Nothing changes', 'until you confirm.']],
  [say(86.3), say(91.4), ['Works with', 'your tools.']],
];

// "Up to forty messages a day, spaced out": the count lands on "forty".
export const AUTOMATION = { at: say(21.45), count: say(21.45), note: say(23.5), out: say(25.6) };
// Oliver's introduction arrives with the broker card, is read and gets a reply.
const chat = say(29.35);
export const CHAT = { at: chat, sent: chat + 0.45, read: chat + 1.15, typing: chat + 1.3, reply: chat + 2 };
// "Repeat AI. Stay close to your sellers." The tagline builds word by word.
export const CLOSE = { logo: say(92.04), tagline: [say(93.43), say(93.66), say(94.08), say(94.3), say(94.44)], url: say(94.8) + 0.5 };

export const screenAt = (take) => SCREENS.find(([, name]) => name === take)[0];
