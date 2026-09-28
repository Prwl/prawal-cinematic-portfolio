import { archiveImage, awardImage } from "../lib/media.js";

/** One real photograph or document, AVIF first. Decorative unless given alt. */
export function Still({ set, name, alt = "", width, height, eager = false, className }) {
  const img = set === "awards" ? awardImage(name) : archiveImage(set, name);
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={img.avif} />
      <img src={img.webp} alt={alt} width={width} height={height} loading={eager ? "eager" : "lazy"} decoding="async" draggable="false" />
    </picture>
  );
}
