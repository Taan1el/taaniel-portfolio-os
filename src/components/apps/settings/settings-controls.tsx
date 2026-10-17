import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { RangeSlider } from "@/components/ui/range-slider";
import { cn } from "@/lib/utils";

/** A titled stack of rows, drawn as one rounded card the way Windows 11 Settings groups its options. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="w11-settings__section">
      {title ? <h2 className="w11-settings__group-title">{title}</h2> : null}
      <div className="w11-settings__group">{children}</div>
    </section>
  );
}

interface SettingsRowProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** The control on the right: a switch, a slider, a button. */
  children?: ReactNode;
  className?: string;
}

export function SettingsRow({ icon, title, description, children, className }: SettingsRowProps) {
  return (
    <div className={cn("w11-settings__row", className)}>
      {icon ? (
        <span className="w11-settings__row-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="w11-settings__row-text">
        <span className="w11-settings__row-title">{title}</span>
        {description ? <span className="w11-settings__row-description">{description}</span> : null}
      </span>
      {children ? <span className="w11-settings__row-control">{children}</span> : null}
    </div>
  );
}

/** A row that opens another page, with a chevron. */
export function SettingsLinkRow({
  icon,
  title,
  description,
  onOpen,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="w11-settings__row w11-settings__row--link" onClick={onOpen}>
      {icon ? (
        <span className="w11-settings__row-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="w11-settings__row-text">
        <span className="w11-settings__row-title">{title}</span>
        {description ? <span className="w11-settings__row-description">{description}</span> : null}
      </span>
      <ChevronRight className="w11-settings__row-chevron" size={16} aria-hidden="true" />
    </button>
  );
}

/** The WinUI on/off switch. A real button with role="switch", so keyboards and screen readers get it for free. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="w11-switch-wrap">
      <span className="w11-switch__state" aria-hidden="true">
        {checked ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        className="w11-switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="w11-switch__thumb" aria-hidden="true" />
      </button>
    </span>
  );
}

/** A slider with its value beside it, for the right of a row. */
export function SliderControl({
  label,
  value,
  onChange,
  valueText,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  valueText?: string;
  disabled?: boolean;
}) {
  return (
    <span className="w11-settings__slider">
      <RangeSlider label={label} value={value} valueText={valueText} onChange={onChange} disabled={disabled} />
      <output className="w11-settings__slider-value" aria-hidden="true">
        {value}
      </output>
    </span>
  );
}
