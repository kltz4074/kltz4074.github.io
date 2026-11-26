const formats: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', avif: 'image/avif',
  gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', svg: 'image/svg+xml',
};
export const mimeFor = (path: string) => formats[path.split('.').pop()?.toLowerCase() ?? ''];
const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));

export function matchesFormat(bytes: Uint8Array, mime: string) {
  if (mime === 'image/png') return bytes.slice(0, 8).join() === '137,80,78,71,13,10,26,10';
  if (mime === 'image/jpeg') return bytes.slice(0, 3).join() === '255,216,255';
  if (mime === 'image/gif') return /^GIF8[79]a$/.test(ascii(bytes, 0, 6));
  if (mime === 'image/webp') return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP';
  if (mime === 'image/avif') return ascii(bytes, 4, 8) === 'ftyp' && /avif|avis/.test(ascii(bytes, 8, 32));
  if (mime === 'video/mp4') return ascii(bytes, 4, 8) === 'ftyp' && !/avif|avis/.test(ascii(bytes, 8, 32));
  if (mime === 'video/webm') return bytes.slice(0, 4).join() === '26,69,223,163';
  return false;
}

export async function prepareMedia(file: File, convert: boolean) {
  const mime = mimeFor(file.name);
  if (!mime || !file.size) throw new Error('Unsupported or empty media file.');
  if (file.size > 100 * 1024 * 1024) throw new Error('GitHub repositories block regular Git files larger than 100 MiB.');
  if (mime !== 'image/svg+xml' && !matchesFormat(new Uint8Array(await file.slice(0, 32).arrayBuffer()), mime)) {
    throw new Error('The file header does not match its extension.');
  }
  const blob = file.slice(0, file.size, mime);
  const rasterize = mime === 'image/svg+xml' || (convert && /^image\/(png|jpeg|avif)$/.test(mime));
  if (!rasterize) return { file: blob, name: file.name };
  const url = URL.createObjectURL(blob);
  try {
    // Decode SVG only as an image. The repository receives raster pixels.
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not convert the image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .88));
    if (!result || result.type !== 'image/webp') throw new Error('This browser could not encode WebP.');
    return { file: result, name: file.name.replace(/\.[^.]+$/, '.webp') };
  } finally {
    URL.revokeObjectURL(url);
  }
}
