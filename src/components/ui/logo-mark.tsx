interface LogoMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * TV monogram — three pill bars converging on a base line.
 * Defaults to currentColor so it inherits from CSS.
 */
export function LogoMark({ size = 40, color = "currentColor", className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.14)}
      viewBox="0 0 200 228"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <line x1="28"  y1="14" x2="93"  y2="173" stroke={color} strokeWidth="32" strokeLinecap="round"/>
      <line x1="100" y1="14" x2="100" y2="173" stroke={color} strokeWidth="32" strokeLinecap="round"/>
      <line x1="172" y1="14" x2="107" y2="173" stroke={color} strokeWidth="32" strokeLinecap="round"/>
      <line x1="12"  y1="210" x2="188" y2="210" stroke={color} strokeWidth="32" strokeLinecap="round"/>
    </svg>
  );
}
