import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const dist = resolve('dist');
const errors = [];
for (const file of await readdir(dist, { recursive: true })) {
  if (!file.endsWith('.html')) continue;
  const html = await readFile(resolve(dist, file), 'utf8');
  for (const [, url] of html.matchAll(/\b(?:href|src|srcset)="(\/(?!\/)[^"?#\s]*)(?:[^"]*)"/g)) {
    const target = resolve(dist, '.' + url, ...(url.endsWith('/') ? ['index.html'] : []));
    if (!target.startsWith(dist + sep) || !(await stat(target).catch(() => undefined))?.isFile()) {
      errors.push(`${file} references a missing file: ${url}`);
    }
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('Built HTML references resolve.');
