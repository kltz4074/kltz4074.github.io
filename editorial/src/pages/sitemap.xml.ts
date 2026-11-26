import type { APIRoute } from 'astro';
import { projects, lab, devlog, sectionEnabled, showNow } from '../lib/portfolio';
import { xml } from '../lib/xml';
export const GET: APIRoute = ({ site }) => {
  const paths = ['/'];
  if (sectionEnabled('projects')) paths.push('/projects/', ...projects.map(project => '/projects/' + project.slug + '/'));
  if (sectionEnabled('about')) paths.push('/about/');
  if (sectionEnabled('contact')) paths.push('/contact/');
  if (sectionEnabled('lab') && lab.length) paths.push('/lab/');
  if (showNow) paths.push('/now/');
  if (sectionEnabled('devlog') && devlog.length) paths.push('/devlog/', ...devlog.map(post => '/devlog/' + post.slug + '/'));
  return new Response(`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${xml(new URL(path, site).href)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
};
