import { TERMINAL_SHORTCUTS } from "@/lib/terminal-keys";

/*
 * Reference text for the PowerShell tab: what Get-PSReadLineKeyHandler lists, and
 * (further down) what Get-Help knows beyond a command's synopsis. Plain data,
 * kept apart from the interpreter so it is easy to read and to check.
 */

export interface KeyHandler {
  key: string;
  function: string;
  description: string;
}

export interface KeyHandlerGroup {
  title: string;
  handlers: KeyHandler[];
}

/**
 * The keys the terminal's own line editor answers to, grouped the way
 * PSReadLine groups its functions. Only keys that really do something here
 * are listed; terminal-line.ts and terminal-session.ts handle them.
 */
export const READLINE_KEY_HANDLERS: KeyHandlerGroup[] = [
  {
    title: "Basic editing functions",
    handlers: [
      { key: "Enter", function: "AcceptLine", description: "Run the line" },
      { key: "Backspace", function: "BackwardDeleteChar", description: "Delete the character before the cursor" },
      { key: "Delete", function: "DeleteChar", description: "Delete the character under the cursor" },
      { key: "Ctrl+Backspace", function: "BackwardKillWord", description: "Delete the word before the cursor" },
      { key: "Ctrl+w", function: "BackwardKillWord", description: "Delete the word before the cursor" },
      { key: "Ctrl+Delete", function: "KillWord", description: "Delete the word after the cursor" },
      { key: "Ctrl+Home", function: "BackwardDeleteLine", description: "Delete from the start of the line to the cursor" },
      { key: "Ctrl+End", function: "ForwardDeleteLine", description: "Delete from the cursor to the end of the line" },
      { key: "Escape", function: "RevertLine", description: "Throw away what is typed on the line" },
      { key: "Ctrl+c", function: "CancelLine", description: "Cancel the line, or stop the command that is running" },
      { key: "Ctrl+l", function: "ClearScreen", description: "Clear the screen and keep the line" },
    ],
  },
  {
    title: "Cursor movement functions",
    handlers: [
      { key: "LeftArrow", function: "BackwardChar", description: "Move the cursor one character left" },
      { key: "RightArrow", function: "ForwardChar", description: "Move one character right; at the end of the line, take the grey suggestion" },
      { key: "Ctrl+LeftArrow", function: "BackwardWord", description: "Move the cursor to the start of the previous word" },
      { key: "Ctrl+RightArrow", function: "NextWord", description: "Move the cursor to the start of the next word" },
      { key: "Home", function: "BeginningOfLine", description: "Move the cursor to the start of the line" },
      { key: "Ctrl+a", function: "BeginningOfLine", description: "Move the cursor to the start of the line" },
      { key: "End", function: "EndOfLine", description: "Move to the end of the line; there, take the grey suggestion" },
      { key: "Ctrl+e", function: "EndOfLine", description: "Move the cursor to the end of the line" },
    ],
  },
  {
    title: "History functions",
    handlers: [
      { key: "UpArrow", function: "PreviousHistory", description: "Bring back the previous command" },
      { key: "DownArrow", function: "NextHistory", description: "Bring back the next command" },
      { key: "F8", function: "HistorySearchBackward", description: "Previous command that starts with what is typed" },
      { key: "Shift+F8", function: "HistorySearchForward", description: "Next command that starts with what is typed" },
    ],
  },
  {
    title: "Completion functions",
    handlers: [{ key: "Tab", function: "Complete", description: "Complete the command, parameter or path; list the choices when several fit" }],
  },
  {
    title: "Miscellaneous functions",
    handlers: [
      { key: "PageUp", function: "ScrollDisplayUp", description: "Scroll the screen up one page" },
      { key: "PageDown", function: "ScrollDisplayDown", description: "Scroll the screen down one page" },
      { key: "Ctrl+v", function: "Paste", description: "Paste from the clipboard (long or multi-line text asks first)" },
    ],
  },
  {
    title: "Terminal functions",
    handlers: TERMINAL_SHORTCUTS.map((shortcut) => ({
      key: shortcut.keys.join("+"),
      function: "Terminal",
      description: shortcut.label,
    })),
  },
];
