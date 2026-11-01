# What to add next

Everything here has to work on GitHub Pages: no server, no accounts. Size is rough:
S is an evening, M a few days, L a week or more. Icons and names are our own.

## Office

| App | Size | Plan |
| --- | --- | --- |
| Whiteboard | Done | Pan and zoom with pen, shapes and sticky notes, saved as a `.board` file. |
| Spreadsheet | Done | 28 functions on our own parser with no eval. Opens and saves `.csv`. Charts are still to come. |
| Documents | Done | Rich text with a strict allowlist, saved to the virtual disk, prints to PDF. |
| Presentation | M | Slides as data, a thumbnail rail, and a full-screen slideshow. |
| PDF Editor | L | Annotate, fill in and sign with `pdf-lib`, on top of the existing PDF viewer. |

## Collaboration

| App | Size | Plan |
| --- | --- | --- |
| Calendar | Done | Month view with local events, joined to the clock flyout. |
| Contacts | S | Address book stored locally, linked to Contact's Compose. |
| Signatures | S | Draw a signature and stamp it onto a PDF, all in the browser. Do after PDF Editor. |
| Email | Done | Contact is now an inbox. Real sending stays in the visitor's own mail app. |
| Team Chat | Skip | Real chat needs a server. A fake one with scripted people would not be honest. |
| Meetings | Skip | Video calls need a signalling server. Revisit if a backend ever exists. |

## Games

| Game | Size | Plan |
| --- | --- | --- |
| Sudoku | Done | Generator with a unique solution, three levels, pencil marks. |
| Checkers | Done | Rules engine with a small search AI. |
| Solitaire | Done | Klondike with drag and drop, undo, and auto-finish. |
| Chess | Done | Own rules engine, checked with perft, and a small AI in a worker. |
| Backgammon | M | Rules, dice and a basic AI. |
| BlockArena-style shooter | L | Single-player arena with bots in Three.js. Multiplayer needs a server. |

## The OS itself

| Feature | Size | Notes |
| --- | --- | --- |
| Task Manager | Done | Real windows, End task, frame rate and JS heap where the browser exposes it. |
| Run dialog | Done | `calc`, `cmd`, `notepad` and paths open the matching app. |
| Paint undo and redo | Done | Ctrl+Z and Ctrl+Y. |
| Explorer Properties and preview pane | Done | Size, type, dates and location, plus a preview beside the list. |
| Explorer tabs | Done | Alt+T, Alt+W and Alt+1 to 9, because the browser keeps Ctrl+T and Ctrl+W. |
| Quiet notification history | M | A list in the clock flyout, nothing popping up. |
| Clipboard history | S | Remembers what was copied inside the OS. |
| Snipping tool | M | Region capture of the OS by redrawing it to a canvas. Cross-origin content stays blank. |
| Widgets board | M | Weather, a note and now-playing, using free no-key APIs. |
| System sounds | S | Sign-in and error sounds, off by default. |
| Cascade windows and side by side | S | In the taskbar menu. |

Alt+Tab and Windows-key shortcuts are mostly taken by the real OS before a web page
sees them, so these need their own keys, such as the existing Ctrl+Alt ones.

## TV & Radio

- **What's on now.** Done. The deploy job builds `tv-guide.json` from public listings.
- **Recheck the list.** Done. A daily job opens or updates one issue when a channel stops playing.
- **More listings.** 29 of the 88 channels have no match yet, so they show no programme. S each.
- **More countries.** Add channels only after playing each one over HTTPS from a browser. S each.

## Suggested order

1. Contacts and Clipboard history: small, and they join up what is already there.
2. Presentation, which completes the office apps.
3. Quiet notification history and the Widgets board.
4. PDF Editor, then Signatures.
