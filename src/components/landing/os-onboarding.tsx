import { useEffect, useState } from "react";
import styles from "@/components/landing/os-onboarding.module.css";

const ONBOARDING_KEY = "portfolio-onboarding-seen";

export function OsOnboarding() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setVisible(true);
      }
    };

    window.addEventListener("portfolio:landing-dismissed", show);

    if (localStorage.getItem("portfolio-landing-dismissed") && !localStorage.getItem(ONBOARDING_KEY)) {
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

  if (!visible) {
    return null;
  }

  return (
    <div className={styles.bar} role="status">
      <p>
        <strong>Tip:</strong> Click a desktop icon to open it. Drag to rearrange. Use{" "}
        <kbd>Alt</kbd> + <kbd>[</kbd> / <kbd>]</kbd> to cycle windows.
      </p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => {
          localStorage.setItem(ONBOARDING_KEY, "1");
          setVisible(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
