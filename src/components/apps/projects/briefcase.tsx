import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import "@/styles/briefcase.css";

export interface BriefcasePocket {
  id: string;
  label: string;
  detail: string;
  image?: string;
  imageAlt?: string;
}

const OPEN_DELAY_MS = 450;

/** The Projects window: a case that unlatches and opens onto one pocket per project. */
export function Briefcase({
  pockets,
  startOpen,
  onOpenPocket,
}: {
  pockets: BriefcasePocket[];
  startOpen: boolean;
  onOpenPocket: (id: string) => void;
}) {
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const prefersStill = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const [open, setOpen] = useState(startOpen || reduceMotion || prefersStill);

  useEffect(() => {
    if (open) return undefined;
    const timer = globalThis.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => globalThis.clearTimeout(timer);
  }, [open]);

  return (
    <div className={cn("briefcase", open && "is-open")}>
      <div className="briefcase__handle" aria-hidden="true" />
      <div className="briefcase__case">
        <div className="briefcase__interior">
          <span className="briefcase__wall briefcase__wall--top" aria-hidden="true" />
          <span className="briefcase__wall briefcase__wall--left" aria-hidden="true" />
          <span className="briefcase__wall briefcase__wall--right" aria-hidden="true" />
          <span className="briefcase__wall briefcase__wall--bottom" aria-hidden="true" />

          <div className="briefcase__pockets">
            {pockets.map((pocket) => (
              <button key={pocket.id} type="button" className="briefcase__pocket" onClick={() => onOpenPocket(pocket.id)}>
                <span className="briefcase__sheet">
                  {pocket.image ? (
                    <SafeImage src={pocket.image} alt={pocket.imageAlt ?? ""} />
                  ) : (
                    <span className="briefcase__sheet-blank" aria-hidden="true">
                      <Wrench size={36} />
                    </span>
                  )}
                </span>
                <span className="briefcase__flap">
                  <strong>{pocket.label}</strong>
                  <small>{pocket.detail}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="briefcase__lid" aria-label="Open the briefcase" onClick={() => setOpen(true)}>
          <span className="briefcase__latch briefcase__latch--left" aria-hidden="true" />
          <span className="briefcase__latch briefcase__latch--right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
