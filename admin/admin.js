/**
 * Admin entry point.
 * Security, GitHub access and editor UI are separated under admin/js/.
 */
import { CONFIG } from "./js/config.js";

globalThis.validateUploadSize = (file) => {
  const isVideo =
    file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
  const maxBytes = isVideo
    ? CONFIG.maxVideoUploadBytes
    : CONFIG.maxImageUploadBytes;

  if (file.size <= maxBytes) return;

  const limitMiB = Math.round(maxBytes / (1024 * 1024));
  throw new Error(
    `${file.name} слишком большой. Максимальный размер: ${limitMiB} МБ.`,
  );
};

await import("./analytics.js");
await import("./js/app.js");
