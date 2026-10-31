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

// ------------------------------------------------------------------ examples

/** [what to type, what it does] */
export type HelpExample = [code: string, remarks: string];

/** Get-Help -Examples, keyed by the command's own name. Every example is something this shell runs. */
export const HELP_EXAMPLES: Record<string, HelpExample[]> = {
  "Get-ChildItem": [
    ["Get-ChildItem", "Lists the files and folders in the current folder."],
    ["ls -Recurse *.md", "Lists every Markdown file in this folder and the folders below it."],
    ["ls -Depth 1 -Directory", "Lists the folders in this folder and in the folders just below it."],
  ],
  "Set-Location": [
    ["Set-Location Documents", "Moves into the Documents folder."],
    ["cd -", "Goes back to the folder you were in before."],
  ],
  "Get-Location": [["Get-Location", "Shows the current folder as a path."]],
  "Get-Content": [
    ["Get-Content Welcome.md", "Prints a text file."],
    ["Get-Content notes.txt -Tail 5", "Prints the last five lines of a file."],
  ],
  "New-Item": [
    ["New-Item todo.txt -ItemType File", "Creates an empty file."],
    ["ni Notes -ItemType Directory", "Creates a folder."],
  ],
  mkdir: [["mkdir Projects\\Demo", "Creates the folder, and Projects if it is missing."]],
  touch: [["touch notes.txt", "Creates an empty file, or updates the time of an existing one."]],
  "Remove-Item": [
    ["Remove-Item old.txt", "Moves a file to the Recycle Bin."],
    ["rm Drafts -Recurse", "Moves a folder and everything in it to the Recycle Bin."],
  ],
  "Move-Item": [
    ["Move-Item notes.txt Documents", "Moves a file into the Documents folder."],
    ["mv a.txt b.txt", "Renames a file."],
  ],
  "Copy-Item": [["Copy-Item notes.txt Documents", "Copies a file into the Documents folder."]],
  "Rename-Item": [["Rename-Item draft.txt final.txt", "Gives a file a new name."]],
  "Set-Content": [["Set-Content hello.txt 'Hello'", "Replaces what is in a file with the text."]],
  "Add-Content": [["Add-Content hello.txt 'one more line'", "Adds a line to the end of a file."]],
  "Out-File": [["ls | Out-File listing.txt", "Writes the output of a command into a file."]],
  "Write-Output": [
    ["Write-Output 'Hello'", "Prints the text."],
    ["echo hello > hello.txt", "Writes the text into a file."],
  ],
  "Clear-Host": [["Clear-Host", "Clears the screen."]],
  "Get-History": [["Get-History", "Lists the commands entered in this session."]],
  "Start-Process": [
    ["Start-Process .", "Opens the current folder in File Explorer."],
    ["start https://github.com/Taan1el", "Opens a web address in the browser."],
    ["start ms-settings:display", "Opens a page of Settings."],
  ],
  tree: [["tree /F", "Draws the folder tree with the files in it."]],
  "Select-String": [
    ["Select-String todo *.md", "Finds the lines that mention todo in the Markdown files."],
    ["ls | sls Case", "Keeps the lines of the listing that mention Case."],
  ],
  "Sort-Object": [
    ["ls | Sort-Object Length -Descending", "Lists the biggest files first."],
    ["Get-Content names.txt | sort -Unique", "Sorts the lines of a file and drops the repeats."],
  ],
  "Select-Object": [
    ["ls | Select-Object Name, Length", "Keeps just the Name and Length of each item."],
    ["ls | select -First 3", "Keeps the first three items."],
    ["ls | select -ExpandProperty Name", "Gives the names themselves instead of objects."],
  ],
  "Measure-Object": [
    ["ls | Measure-Object", "Counts the items."],
    ["ls | measure Length -Sum -Average", "Adds up and averages the sizes of the files."],
  ],
  "Where-Object": [
    ["ls | Where-Object Length -gt 1kb", "Keeps the files bigger than one kilobyte."],
    ["ls | where { $_.Name -like '*.md' -and $_.Length -gt 0 }", "Keeps the non-empty Markdown files."],
  ],
  "ForEach-Object": [
    ["ls | ForEach-Object { $_.Name }", "Gives the name of each item."],
    ["ls | % { $_.Length * 2 }", "Doubles the size of each file."],
  ],
  "Format-Table": [["ps | Format-Table ProcessName, Status", "Shows the running apps as a table of two columns."]],
  "Format-List": [["Get-Item Welcome.md | Format-List *", "Shows every property of a file, one per line."]],
  "Get-Date": [["Get-Date", "Shows the date and time."]],
  whoami: [["whoami", "Shows the signed-in user."]],
  hostname: [["hostname", "Shows the computer name."]],
  exit: [["exit", "Closes this shell (a nested one returns to the shell it was started from)."]],
  about: [["about", "Opens the About app."]],
  projects: [
    ["projects", "Lists the projects."],
    ["projects slow-pour", "Opens one project by its id."],
  ],
  contact: [["contact", "Shows how to get in touch."]],
  resume: [["resume", "Opens the CV."]],
  "Get-Command": [
    ["Get-Command", "Lists every command and app."],
    ["Get-Command Get-*", "Lists the commands whose names start with Get-."],
    ["gcm notepad", "Shows what notepad is and where it lives."],
  ],
  "Get-Alias": [["Get-Alias", "Lists the short names for commands."]],
  "Get-Help": [
    ["Get-Help ls -Examples", "Shows examples of using ls."],
    ["Get-Help about_Pipelines", "Reads a help topic about a feature of the shell."],
    ["Get-Help Get-*", "Lists the commands whose names start with Get-."],
  ],
  "Write-Host": [["Write-Host 'Done' -ForegroundColor Green", "Prints the text in green."]],
  "Get-Process": [
    ["Get-Process", "Lists the apps that are running."],
    ["ps | where Status -eq Minimized", "Lists the apps that are minimized."],
  ],
  "Stop-Process": [["Stop-Process -Name notes", "Closes the Notes app."]],
  "Get-ComputerInfo": [["Get-ComputerInfo", "Shows details about this device and browser."]],
  "Invoke-WebRequest": [["Invoke-WebRequest https://example.com", "Fetches a page and shows its status and start."]],
  "Invoke-RestMethod": [["Invoke-RestMethod api.github.com/users/Taan1el", "Fetches JSON and shows its fields."]],
  "Test-Connection": [["Test-Connection github.com -Count 2", "Checks twice that a host answers."]],
  ping: [["ping github.com -n 2", "Pings a host twice."]],
  "Get-FileHash": [["Get-FileHash Welcome.md", "Shows the SHA-256 hash of a file."]],
  "Get-Clipboard": [["Get-Clipboard", "Prints what is on the clipboard."]],
  "Set-Clipboard": [["ls | Set-Clipboard", "Copies the listing to the clipboard."]],
  "Get-Random": [
    ["Get-Random -Minimum 1 -Maximum 7", "Rolls a die."],
    ["ls | Get-Random", "Picks one item of the listing."],
  ],
  "Start-Sleep": [["Start-Sleep -Seconds 2", "Waits two seconds. Ctrl+C ends the wait."]],
  "Test-Path": [["Test-Path Documents", "Says whether the folder exists: True or False."]],
  "Get-Item": [["Get-Item Welcome.md", "Shows the details of one file."]],
  "Push-Location": [["Push-Location Documents", "Moves into Documents and remembers the folder you left."]],
  "Pop-Location": [["Pop-Location", "Returns to the folder Push-Location saved."]],
  "Clear-History": [["Clear-History", "Forgets the commands of this session."]],
  "Get-Variable": [["Get-Variable", "Lists the variables you have set."]],
  "Invoke-Expression": [
    ["Invoke-Expression 'Get-Date'", "Runs the text as a command."],
    ["iex '1 + 1'", "Works out 1 + 1."],
  ],
  "Join-Path": [
    ["Join-Path $HOME Documents", "Gives C:\\Users\\Taaniel\\Documents."],
    ["Join-Path Projects Demo notes.txt", "Joins three parts: Projects\\Demo\\notes.txt."],
  ],
  "Split-Path": [
    ["Split-Path C:\\Users\\Taaniel\\Documents\\CV.pdf -Leaf", "Gives the file name: CV.pdf."],
    ["Split-Path $PWD", "Gives the folder above the current one."],
  ],
  "Resolve-Path": [
    ["Resolve-Path ..", "Gives the full path of the folder above."],
    ["Resolve-Path Doc* -Relative", "Lists the matches with paths that start at this folder."],
  ],
  "New-Guid": [["New-Guid", "Makes a new random GUID."]],
  "Get-Uptime": [
    ["Get-Uptime", "Shows how long this desktop session has been running."],
    ["Get-Uptime -Since", "Shows when it started."],
  ],
  "Get-Host": [["Get-Host", "Shows the name and version of the shell host."]],
  "Get-PSReadLineKeyHandler": [
    ["Get-PSReadLineKeyHandler", "Lists every key the line editor knows."],
    ["Get-PSReadLineKeyHandler | sls History", "Lists the keys that deal with history."],
  ],
  "ConvertTo-Json": [
    ["ls | select Name, Length | ConvertTo-Json", "Writes the name and size of each item as JSON."],
    ["Get-Item Welcome.md | ConvertTo-Json -Compress", "Writes one file's properties on a single line."],
  ],
  "ConvertFrom-Json": [
    ["'{\"name\": \"Taaniel\"}' | ConvertFrom-Json", "Turns JSON text into an object with a name."],
    ["Get-Content data.json | ConvertFrom-Json | select -First 1", "Reads a JSON file and keeps the first entry."],
  ],
};

// -------------------------------------------------------------------- topics

export interface AboutTopic {
  /** The topic's name: about_Pipelines. */
  name: string;
  synopsis: string;
  /** The long description, one entry per line. */
  body: string[];
}

export const ABOUT_TOPICS: AboutTopic[] = [
  {
    name: "about_Pipelines",
    synopsis: "Describes how commands pass their output to each other with |.",
    body: [
      "A pipeline is a series of commands joined by the pipe character (|). Each",
      "command works on what the one before it printed.",
      "",
      "    ls | where Length -gt 1kb | sort Length -Descending | select Name, Length",
      "",
      "Commands such as Get-ChildItem and Get-Process pass real objects, so you can",
      "ask for a property by name: Name, Length, Id. Where-Object, ForEach-Object,",
      "Select-Object, Sort-Object, Measure-Object and the Format- commands all read",
      "those objects. Commands that print plain text pass lines of text instead,",
      "and Select-String and Set-Clipboard work on those.",
      "",
      "Use { $_ } in a script block for the item being worked on:",
      "",
      "    ls | ForEach-Object { $_.Name }",
      "",
      "A script block holds one expression. It is worked out by this shell's own",
      "evaluator, so it can compare, add and join values, but it cannot run",
      "several commands or call JavaScript.",
      "",
      "Redirect the last output into a file with > (replace) or >> (append).",
      "Separate commands with ; and chain them with && (only after success) and",
      "|| (only after failure). See about_Chain_Operators.",
    ],
  },
  {
    name: "about_Comparison_Operators",
    synopsis: "Describes the operators that compare values.",
    body: [
      "Comparison operators compare two values and give True or False. Text is",
      "compared without regard to case.",
      "",
      "    -eq  -ne            equal, not equal",
      "    -gt  -ge  -lt  -le  greater, greater or equal, less, less or equal",
      "    -like  -notlike     wildcard match: 'notes.txt' -like '*.txt'",
      "    -match  -notmatch   regular expression match",
      "    -contains  -notcontains  a list holds a value:   1,2,3 -contains 2",
      "    -in  -notin         a value is in a list:        2 -in 1,2,3",
      "",
      "Combine tests with -and, -or and -not:",
      "",
      "    5 -gt 3 -and 2 -lt 4",
      "",
      "Numbers may carry the suffixes kb, mb, gb and tb: 1kb is 1024.",
      "",
      "-replace, -split and -join change text rather than compare it:",
      "",
      "    'a-b-c' -split '-'      gives a, b, c",
      "    'a','b' -join '+'       gives a+b",
      "    'hello' -replace 'l','L'  gives heLLo",
    ],
  },
  {
    name: "about_Variables",
    synopsis: "Describes variables you set in the shell and those it provides.",
    body: [
      "A variable starts with $ and keeps a value for the rest of the session:",
      "",
      "    $name = 'Taaniel'",
      "    $count = 5",
      "    $count += 1",
      "    \"Hello $name\"",
      "",
      "Output of a command can be kept too: $files = ls -Name",
      "",
      "Automatic variables the shell keeps for you:",
      "",
      "    $?              True when the last command worked",
      "    $LASTEXITCODE   0 after a command that worked, 1 after one that failed",
      "    $PWD            the current folder (see $PWD.Path)",
      "    $HOME           your home folder",
      "    $true $false $null",
      "    $PSVersionTable the shell's version table (see $PSVersionTable.PSVersion)",
      "    $Host           the shell host (see $Host.Name and $Host.Version)",
      "",
      "Environment variables are read with $env:NAME, for example $env:USERNAME.",
    ],
  },
  {
    name: "about_Chain_Operators",
    synopsis: "Describes the && and || operators that run a command after another.",
    body: [
      "&& runs the command after it only when the one before it worked.",
      "|| runs the command after it only when the one before it failed.",
      "",
      "    mkdir Demo && cd Demo",
      "    Get-Content notes.txt || echo 'no notes yet'",
      "",
      "Chains are read from left to right, and a chain counts as having worked",
      "when the last command that ran in it worked. $? and $LASTEXITCODE tell",
      "how the last command ended. Use ; to run commands one after another no",
      "matter what happened.",
    ],
  },
  {
    name: "about_Terminal_Shortcuts",
    synopsis: "Lists the keys of the terminal window and its line editor.",
    body: [
      "The line editor works like PSReadLine: arrow keys, Home and End, Ctrl+Left",
      "and Ctrl+Right to move by word, Up and Down for history, F8 to search the",
      "history for what is typed, Tab to complete, Esc to throw the line away.",
      "Get-PSReadLineKeyHandler lists every key.",
      "",
      "The terminal window has tabs: Ctrl+Shift+Space opens the new tab menu,",
      "Ctrl+Shift+D duplicates the tab, Ctrl+Alt+1 to 9 switches tabs, Ctrl+Shift+F",
      "finds text and Ctrl+, opens the settings.",
      "",
      "The terminal keeps Tab and Escape for itself, so they cannot move focus out",
      "of it. Press F6 to move focus to the tab strip and the rest of the window,",
      "and Shift+F6 to come back. The Terminal settings have a Screen reader mode.",
    ],
  },
];

/** Case-insensitive lookup of one topic. */
export function findAboutTopic(name: string): AboutTopic | undefined {
  const wanted = name.toLowerCase();
  return ABOUT_TOPICS.find((topic) => topic.name.toLowerCase() === wanted);
}

// ------------------------------------------------------------------ parameters

export interface SyntaxParameter {
  name: string;
  /** The type or value set shown after the name ("<string[]>", "File|Directory"); null for a switch. */
  type: string | null;
}

/**
 * The parameters a command's syntax line shows: "-Path <string>" and "[-Recurse]".
 * Used for the PARAMETERS section of Get-Help and for completing a parameter name.
 */
export function syntaxParameters(syntax: string): SyntaxParameter[] {
  const found: SyntaxParameter[] = [];
  const pattern = /-([A-Za-z][A-Za-z0-9]*)\]?(?:\s+(<[^>]+>|[A-Za-z]+(?:\|[A-Za-z]+)+))?/g;
  for (const match of syntax.matchAll(pattern)) {
    // "-gt" inside prose and a pipeline's own "|" are not parameters: a parameter follows [ or a space.
    const before = match.index > 0 ? syntax[match.index - 1] : " ";
    if (before !== "[" && before !== " " && before !== "|") continue;
    if (!found.some((entry) => entry.name.toLowerCase() === match[1].toLowerCase())) found.push({ name: match[1], type: match[2] ?? null });
  }
  return found;
}
