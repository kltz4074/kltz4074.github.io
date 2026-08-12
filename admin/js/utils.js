/**
 * Pure helpers shared by editor rendering, uploads and encryption.
 */
export function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `item-${Date.now()}`
  );
}

export function mediaTypeFromFile(file) {
  return file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name)
    ? "video"
    : "image";
}

export function extensionFromFile(file) {
  const match = file.name.match(/\.([a-z0-9]+)$/i);
  if (match) return match[1].toLowerCase();
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };
  return byType[file.type] || "bin";
}

export function mediaHref(path) {
  if (!path) return "";
  if (/^https?:/i.test(path)) return path;
  return `/${String(path).replace(/^\/+/, "")}`;
}

export function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
}

export function base64ToBytes(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function textToBase64(value) {
  return bytesToBase64(new TextEncoder().encode(value));
}

export function base64ToText(value) {
  return new TextDecoder().decode(base64ToBytes(value));
}

/** Assign a value to a dotted object path such as "description.ru". */
export function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;

  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else cursor = cursor[part] ||= {};
  });
}
