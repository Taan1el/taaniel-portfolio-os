/*
 * Terminal profiles, after Windows Terminal's: each new tab runs one of them.
 * PowerShell and Command Prompt are interpreters in this repo; "Linux" hands
 * off to the Virtual x86 app the way the WSL profile hands off to a distro.
 */

export type ShellProfileId = "pwsh" | "cmd";
export type TerminalProfileId = ShellProfileId | "linux";

export interface TerminalProfile {
  id: TerminalProfileId;
  name: string;
  /** Shell profiles open a tab; the others launch an app instead. */
  kind: "shell" | "app";
}

export const terminalProfiles: TerminalProfile[] = [
  { id: "pwsh", name: "PowerShell", kind: "shell" },
  { id: "cmd", name: "Command Prompt", kind: "shell" },
  { id: "linux", name: "Linux (Virtual x86)", kind: "app" },
];

export const DEFAULT_PROFILE_ID: ShellProfileId = "pwsh";

export function isShellProfileId(value: unknown): value is ShellProfileId {
  return value === "pwsh" || value === "cmd";
}

export function isTerminalProfileId(value: unknown): value is TerminalProfileId {
  return isShellProfileId(value) || value === "linux";
}

export function getTerminalProfile(id: unknown): TerminalProfile {
  return terminalProfiles.find((profile) => profile.id === id) ?? terminalProfiles[0];
}

/** Profile aliases accepted on a launch payload: the executable names people type. */
const PROFILE_ALIASES: Record<string, TerminalProfileId> = {
  pwsh: "pwsh",
  powershell: "pwsh",
  cmd: "cmd",
  "command-prompt": "cmd",
  linux: "linux",
  wsl: "linux",
};

/** Read a launch payload's profile field. Anything unrecognised means "the default profile". */
export function resolveLaunchProfile(value: unknown): TerminalProfileId | null {
  if (typeof value !== "string") return null;
  const alias = value.trim().toLowerCase();
  // Own keys only: "constructor" is not a profile.
  return Object.hasOwn(PROFILE_ALIASES, alias) ? PROFILE_ALIASES[alias] : null;
}

/** A unique value for WindowPayload.launchNonce, so repeating the same launch still opens a new tab. */
export function createLaunchNonce() {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `launch-${random}`;
}
