/** The characters Windows doesn't allow in a file or folder name. */
export const INVALID_NAME_CHARACTERS = '\\ / : * ? " < > |';

const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/;
const RESERVED_NAMES = new Set(["con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "lpt1", "lpt2", "lpt3"]);

/**
 * Check a typed name the way Windows does when you rename. Returns the message
 * to show, or null when the name is fine. Names are trimmed by the caller.
 */
export function validateFileName(name: string): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return "You must type a file name.";
  }

  if (INVALID_NAME_PATTERN.test(trimmed)) {
    return `A file name can't contain any of the following characters: ${INVALID_NAME_CHARACTERS}`;
  }

  if (trimmed === "." || trimmed === ".." || trimmed.endsWith(".")) {
    return "The file name isn't valid. Names can't end with a period.";
  }

  if (RESERVED_NAMES.has(trimmed.split(".")[0].toLowerCase())) {
    return "The specified file name is reserved by the system. Try a different name.";
  }

  return null;
}
