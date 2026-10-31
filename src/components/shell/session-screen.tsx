import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "@/components/ui/logo-mark";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { profile } from "@/data/portfolio";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { useSessionScreenStore } from "@/stores/session-screen-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

const BOOT_MS = 1600;
const REDUCED_BOOT_MS = 300;
const LANDING_KEY = "portfolio-landing-dismissed";

function prefersReducedMotion() {
  return (
    useSystemSettingsStore.getState().reduceMotion ||
    Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

function BootScreen() {
  const finishBoot = useSessionScreenStore((state) => state.finishBoot);

  useEffect(() => {
    const timer = setTimeout(finishBoot, prefersReducedMotion() ? REDUCED_BOOT_MS : BOOT_MS);
    return () => clearTimeout(timer);
  }, [finishBoot]);

  return (
    <div className="os-boot" role="status" aria-label="Taaniel OS is starting">
      <LogoMark size={72} color="#fff" />
      <div className="os-boot__dots" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((dot) => (
          <span key={dot} style={{ animationDelay: `${dot * 0.12}s` }} />
        ))}
      </div>
    </div>
  );
}

function LockScreen() {
  const signIn = useSessionScreenStore((state) => state.signIn);
  const navigate = useNavigate();
  const now = useMinuteClock();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef);

  const unlock = () => {
    signIn();
    // First visit only: this is what brings up the desktop tips.
    if (readLocalStorage(LANDING_KEY) === null) {
      writeLocalStorage(LANDING_KEY, "1");
      window.dispatchEvent(new CustomEvent("portfolio:landing-dismissed"));
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Tab keeps moving between the two buttons; modifiers alone are not "any key".
      if (["Tab", "Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      // Enter and Space activate the portfolio link when it has focus; anything else still signs in.
      const onPortfolioLink = event.target instanceof Element && event.target.closest(".os-lock__portfolio");
      if (onPortfolioLink && (event.key === "Enter" || event.key === " ")) return;
      event.preventDefault();
      event.stopPropagation();
      unlock();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  });

  return (
    <div
      ref={panelRef}
      className="os-lock"
      role="dialog"
      aria-modal="true"
      aria-label="Lock screen"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest(".os-lock__portfolio")) unlock();
      }}
    >
      <div className="os-lock__clock">
        <time dateTime={now.toISOString()}>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </time>
        <p>{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>
      <div className="os-lock__account">
        <span className="os-lock__avatar">
          <LogoMark size={30} color="#fff" />
        </span>
        <strong>{profile.name}</strong>
        <button type="button" className="os-lock__enter">
          Sign in
        </button>
        <small>Press any key or click anywhere</small>
      </div>
      <button
        type="button"
        className="os-lock__portfolio"
        onClick={() => {
          signIn();
          navigate("/portfolio");
        }}
      >
        View the plain portfolio
      </button>
    </div>
  );
}

export function SessionScreen() {
  const screen = useSessionScreenStore((state) => state.screen);

  return (
    <AnimatePresence>
      {screen === "desktop" ? null : (
        <motion.div
          key={screen}
          className="os-session"
          initial={{ opacity: screen === "boot" ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {screen === "boot" ? <BootScreen /> : <LockScreen />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
