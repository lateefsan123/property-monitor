# Next cut: fuller explanation and visible navigation

Status: script and navigation plan prepared; ElevenLabs voice selection is pending from the user. No new voice has been generated and the previous finished video is unchanged. Final durations will follow the selected narration, with space for navigation and reading.

`voiceover-draft.txt` contains narration only, ready to paste into ElevenLabs. Delivery: conversational, engaged and unhurried, with natural pauses at paragraph breaks. Avoid a flat tutorial cadence or an exaggerated advert voice. Final voice choice belongs to the user.

## Navigation to show

| Section | Visible route and interaction | What the explanation adds |
| --- | --- | --- |
| Import | Home → top-left menu → Spreadsheets → Add spreadsheet → URL to spreadsheet → enter URL → select buildings → add | Both supported import methods, one demonstrated; one resulting entry per building |
| Sellers | Finish on imported entries → open menu → Sellers → filter statuses → click Alex Morgan → Market data → Message | What the columns/statuses mean, why transaction information is useful, and how it feeds WhatsApp follow-ups |
| Templates | Close seller detail → open menu → Message template → New template → type and insert variables → preview → save | The default is optional; variables personalise the message and the preview confirms the result |
| Schedule | Close template editor → open menu → Schedule → enable weekly schedule → fill Monday–Thursday → Save | Days control building follow-ups; empty days remain off while enabled |
| Listings | Finish on saved schedule → open menu → Listings → Burj Khalifa → apartment → Activity | Asking-price history, dated changes and the distinction from the seller transaction history |
| Integrations | Brief editorial cut to the existing vendor icons | Keep this short; no Settings walkthrough |
| Ask Repeat | Return to the last product view → show bottom-right Ask Repeat launcher → click → type request → show prepared change → review buttons | Where the assistant lives, typed/voice input, lookups, summaries and prepared actions |
| Platforms | Existing web/native mobile composition | Availability without another slogan |

The menu must open over the outgoing page before the destination appears. Keep the pointer visible through the click, show the actual destination label, then let the menu close as the app does. Start the close-up demonstration only after arrival. For dialogs, show their close button before navigating away. Use brief navigation beats, not extra explanatory title cards.

## Verified source references

- `shared/navigation.js`: exact labels are **Spreadsheets**, **Sellers**, **Message template** (singular), and **Listings**.
- `AppSidebar.jsx`: **Schedule** is an additional main-menu item.
- `AppShell.jsx`: the menu starts collapsed, the top-left toggle opens it, and selecting a page collapses it. Message template opens a dialog instead of changing the page route.
- `VoicePanel.jsx`: **Ask Repeat** is a bottom-right launcher; it is not a main-menu page.
- `NewSpreadsheetModal.jsx`: URL import includes scanning and selecting buildings; each building becomes a source entry.

Keep the Remotion typing, actual component styles, source-consistent demo contacts, full weekly plan and the recorded building-price walkthrough from the current cut. Final audio, subtitles and scene timings will be rebuilt after the ElevenLabs voice is chosen. The spoken script is a draft, not an already generated recording.
