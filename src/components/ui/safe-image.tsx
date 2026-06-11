import { useState } from "react";
import { resolvePublicAssetUrl } from "@/lib/assets";

const PLACEHOLDER = resolvePublicAssetUrl("assets/project-image-placeholder.svg");

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export function SafeImage({ src, alt, className, loading = "lazy" }: SafeImageProps) {
  const [current, setCurrent] = useState(src);
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="safe-image-wrapper" aria-hidden={!alt || undefined}>
      {!loaded && <span className="safe-image-skeleton" aria-hidden="true" />}
      <img
        src={current}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        style={loaded ? undefined : { opacity: 0, position: "absolute" }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (current !== PLACEHOLDER) {
            setCurrent(PLACEHOLDER);
          }
          setLoaded(true);
        }}
      />
    </span>
  );
}
