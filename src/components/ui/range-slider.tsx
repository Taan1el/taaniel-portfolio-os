import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name; the control has no visible label of its own. */
  label: string;
  min?: number;
  max?: number;
  step?: number;
  /** Spoken value, e.g. "42%". Defaults to the number. */
  valueText?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * A native range input drawn like the WinUI slider: a thin track filled up to
 * the thumb in the accent colour. Native, so arrow keys, Home/End, touch and
 * screen readers all work without extra code.
 */
export function RangeSlider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  valueText,
  className,
  disabled,
}: RangeSliderProps) {
  const span = max - min;
  const fill = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;

  return (
    <input
      type="range"
      className={cn("w11-slider", className)}
      style={{ "--w11-slider-fill": `${fill}%` } as CSSProperties}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
