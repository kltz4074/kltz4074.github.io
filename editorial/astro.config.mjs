import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: { inlineStylesheets: 'never' },
  site: 'https://kltz4074.github.io',
  trailingSlash: 'always',
});
