import { useEffect, useState } from "react";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { useShellStore } from "@/stores/shell-store";
import styles from "@/components/landing/os-onboarding.module.css";

const ONBOARDING_KEY = "portfolio-onboarding-seen";

export function OsOnboarding() {
  const [visible, setVisible] = useState(false);
  // The tip is about the desktop, so it steps aside while a window is in use.
  const windowActive = useShellStore((state) => Boolean(state.focusedWindowId));

  useEffect(() => {
    const show = () => {
      if (readLocalStorage(ONBOARDING_KEY) === null) {
        setVisible(true);
      }
    };

    window.addEventListener("portfolio:landing-dismissed", show);

    if (readLocalStorage("portfolio-landing-dismissed") !== null && readLocalStorage(ONBOARDING_KEY) === null) {
      setVisible(true);
    }

    return () => window.removeEventListener("portfolio:landing-dismissed", show);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.classList.add("os-onboarding-visible");
      return () => document.body.classList.remove("os-onboarding-visible");
    }
    document.body.classList.remove("os-onboarding-visible");
    return undefined;
  }, [visible]);

  if (!visible || windowActive) {
    return null;
  }

  return (
    <div className={styles.bar} role="status">
      <p>
        <strong>Tip:</strong> Double-click a desktop icon to open it (tap on a touch screen). Drag icons to rearrange, or
        into a File Explorer window. Use{" "}
        <kbd>Alt</kbd> + <kbd>[</kbd> / <kbd>]</kbd> to cycle windows.
        <span>
          {" "}
          Your session persists; use <strong>Start, Power, Reset this PC</strong> to clear it.
        </span>
      </p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => {
          writeLocalStorage(ONBOARDING_KEY, "1");
          setVisible(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
