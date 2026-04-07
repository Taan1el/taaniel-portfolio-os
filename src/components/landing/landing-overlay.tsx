import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getResumeDownloadUrls, landingCopy, profile } from "@/data/portfolio";
import styles from "@/components/landing/landing-overlay.module.css";

const STORAGE_KEY = "portfolio-landing-dismissed";

export function LandingOverlay() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => typeof localStorage !== "undefined" && !localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("portfolio:open-landing", handler);
    return () => window.removeEventListener("portfolio:open-landing", handler);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    window.dispatchEvent(new CustomEvent("portfolio:landing-dismissed"));
  }, []);

  const enterOs = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const quickPortfolio = useCallback(() => {
    dismiss();
    navigate("/simple");
  }, [dismiss, navigate]);

  if (!open) {
    return null;
  }

  const cvUrl = getResumeDownloadUrls()[0];

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="landing-name">
      <div className={styles.panel}>
        <h1 id="landing-name" className={styles.name}>
          {profile.name}
        </h1>
        <p className={styles.role}>{profile.role}</p>
        <p className={styles.blurb}>{profile.headline}</p>
        <p className={styles.blurb}>{landingCopy.valueStatement}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={enterOs}>
            Enter portfolio
          </button>
          <button type="button" className={styles.secondary} onClick={quickPortfolio}>
            View quick portfolio (no OS)
          </button>
        </div>
        <div className={styles.cvRow}>
          <a className={styles.cvLink} href={cvUrl} download>
            Download CV
          </a>
        </div>
      </div>
    </div>
  );
}
