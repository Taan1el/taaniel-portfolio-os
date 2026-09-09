import { useState } from "react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export function SafeImage(props: SafeImageProps) {
  return <ImageState key={props.src} {...props} />;
}

function ImageState({ src, alt, className, loading = "lazy" }: SafeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="safe-image-wrapper" role={alt ? "img" : undefined} aria-label={alt || undefined}>Image unavailable</span>;
  }

  return (
    <span className="safe-image-wrapper" aria-hidden={!alt || undefined}>
      {!loaded && <span className="safe-image-skeleton" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        style={loaded ? undefined : { opacity: 0, position: "absolute" }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
        }}
      />
    </span>
  );
}
