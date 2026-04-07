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

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => {
        if (current !== PLACEHOLDER) {
          setCurrent(PLACEHOLDER);
        }
      }}
    />
  );
}
