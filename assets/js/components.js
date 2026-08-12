import { escapeHTML, mediaUrl } from "./utils.js";

/** Small HTML fragments shared by several page renderers. */
export function cornerMarks() {
  return `
    <i class="corner tl"></i>
    <i class="corner tr"></i>
    <i class="corner bl"></i>
    <i class="corner br"></i>
  `;
}

export function mediaFrame(item, className, label) {
  const src = mediaUrl(item.imageUrl || item.mediaUrl);
  if (!src) return "";
  if (item.mediaType === "video") {
    return `
      <video
        class="${className}"
        src="${escapeHTML(src)}"
        aria-label="${escapeHTML(label)}"
        autoplay loop muted playsinline preload="metadata"
      ></video>
    `;
  }
  return `
    <img
      class="${className}"
      src="${escapeHTML(src)}"
      alt="${escapeHTML(label)}"
      loading="lazy"
    >
  `;
}
