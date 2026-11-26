import type { APIRoute } from 'astro';
import { site, devlog, english, sectionEnabled } from '../lib/portfolio';
import { xml } from '../lib/xml';
export const GET: APIRoute = ({ site: origin }) => {
  const url = new URL('/devlog/', origin).href;
  const items = (sectionEnabled('devlog') ? devlog : []).map(post => {
    const link = new URL(post.slug + '/', url).href;
    return `<item><title>${xml(post.title)}</title><link>${xml(link)}</link><guid>${xml(link)}</guid><description>${xml(english(post.body))}</description><pubDate>${new Date(post.date).toUTCString()}</pubDate></item>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${xml(site.name)} Devlog</title><link>${xml(url)}</link><description>${xml(site.seo.description ?? '')}</description>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
