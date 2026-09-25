import { portraits } from "../lib/media.js";

/** The real photograph of Prawal, cut out and graded for the stage. */
export function Portrait({ variant = "stage", sizes, className, priority = false, alt }) {
  const p = portraits[variant];
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={p.avif} sizes={sizes} />
      <source type="image/webp" srcSet={p.webp} sizes={sizes} />
      <img
        src={p.fallback}
        width={p.width}
        height={p.height}
        alt={alt}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable="false"
      />
    </picture>
  );
}
