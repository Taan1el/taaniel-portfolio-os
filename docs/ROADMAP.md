# What to add next

Everything here has to work on GitHub Pages: no server, no accounts. Size is rough:
S is an evening, M a few days, L a week or more. Icons and names are our own.

## Office

| App | Size | Plan |
| --- | --- | --- |
| Whiteboard | S | Pan and zoom canvas with pen, shapes and sticky notes, saved as a file. Shares tools with Paint. |
| Spreadsheet | M | Grid with our own formula parser (no eval), `.csv` import and export, simple charts. |
| Documents | M | Rich text editor, saved to the virtual disk, exports HTML or PDF through the print dialog. |
| Presentation | M | Slides as data, a thumbnail rail, and a full-screen slideshow. |
| PDF Editor | L | Annotate, fill in and sign with `pdf-lib`, on top of the existing PDF viewer. |

## Collaboration

| App | Size | Plan |
| --- | --- | --- |
| Calendar | S | Month view with local events, joined to the clock flyout. |
| Contacts | S | Address book stored locally, linked to Contact's Compose. |
| Signatures | S | Draw a signature and stamp it onto a PDF, all in the browser. Do after PDF Editor. |
| Email | Done | Contact is now an inbox. Real sending stays in the visitor's own mail app. |
| Team Chat | Skip | Real chat needs a server. A fake one with scripted people would not be honest. |
| Meetings | Skip | Video calls need a signalling server. Revisit if a backend ever exists. |

## Games

| Game | Size | Plan |
| --- | --- | --- |
| Sudoku | S | Generator with a unique solution, three levels, pencil marks. |
| Checkers | S | Rules engine with a small search AI. |
| Solitaire | M | Klondike with drag and drop on the OS pointer controller, undo, and auto-finish. |
| Chess | M | Own rules engine and a small AI. Stockfish in WebAssembly is GPL, so it would need its licence shipped. |
| Backgammon | M | Rules, dice and a basic AI. |
| BlockArena-style shooter | L | Single-player arena with bots in Three.js. Multiplayer needs a server. |

## The OS itself

| Feature | Size | Notes |
| --- | --- | --- |
| Task Manager | M | Real windows and processes, End task, frame rate and JS heap where the browser exposes it. |
| Run dialog | S | `calc`, `cmd`, `notepad` and paths open the matching app. |
| Paint undo and redo | S | Ctrl+Z and Ctrl+Y. |
| Explorer Properties and preview pane | M | Size, type, dates and location, plus a preview beside the list. |
| Explorer tabs | M | The same tab model as Terminal. |
| Quiet notification history | M | A list in the clock flyout, nothing popping up. |
| Clipboard history | S | Remembers what was copied inside the OS. |
| Snipping tool | M | Region capture of the OS by redrawing it to a canvas. Cross-origin content stays blank. |
| Widgets board | M | Weather, a note and now-playing, using free no-key APIs. |
| System sounds | S | Sign-in and error sounds, off by default. |
| Cascade windows and side by side | S | In the taskbar menu. |

Alt+Tab and Windows-key shortcuts are mostly taken by the real OS before a web page
sees them, so these need their own keys, such as the existing Ctrl+Alt ones.

## TV & Radio

- **What's on now.** iptv-org/epg needs a job to build guide data, so a scheduled
  GitHub Action could commit a small JSON file each day. M.
- **More countries.** Add channels only after playing each one over HTTPS from a browser. S each.
- **Recheck the list.** Streams die. A scheduled check could flag channels that stopped playing. S.

## Suggested order

1. Sudoku, Checkers and Solitaire: quick, and they fill the Games app.
2. Task Manager and Run dialog: the most "real OS" for the effort.
3. Whiteboard and Calendar.
4. Spreadsheet and Documents.
5. Chess, then Explorer Properties and tabs.
