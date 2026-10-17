/*
 * Lets non-React code (shortcut launching, drag and drop) change the page
 * route - for example the Portfolio shortcut opening /portfolio. The desktop
 * shell registers react-router's navigate on mount.
 */

type ShellNavigator = (route: string) => void;

let currentNavigator: ShellNavigator | null = null;

export function registerShellNavigator(navigator: ShellNavigator) {
  currentNavigator = navigator;

  return () => {
    if (currentNavigator === navigator) {
      currentNavigator = null;
    }
  };
}

/** Returns false when no shell is mounted to handle the route. */
export function navigateShell(route: string) {
  if (!currentNavigator) {
    return false;
  }

  currentNavigator(route);
  return true;
}
