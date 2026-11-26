import { z } from 'zod';

export const contentPath = 'editorial/content/portfolio.json';
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const mediaPattern = /^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|avif|gif|mp4|webm)$/i;

export function safeLink(value: string) {
  if (/^\/(?!\/)[\w/-]*$/.test(value) || /^#[\w-]+$/.test(value) || /^mailto:[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) return true;
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password && !/[\s\\]/.test(value);
  } catch {
    return false;
  }
}

const localized = z.record(z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/), z.string());
const linkUrl = z.string().refine(safeLink, 'Enter an HTTPS, mailto or site URL.');
export const assetUrl = z.string().refine(value => value.startsWith('/media/') && mediaPattern.test(value.slice(7)), 'Choose a file from /media/.');
const slug = z.string().regex(slugPattern).max(80);
const seo = z.object({ title: z.string().optional(), description: z.string().optional(), image: assetUrl.optional() });
const link = z.object({ label: z.string().min(1), url: linkUrl, value: z.string().optional() });
const contact = link.extend({ url: linkUrl.optional() })
  .refine(value => !!(value.url || value.value?.trim()), 'Enter a URL or a contact value.');
const frame = z.object({ src: assetUrl, alt: z.string() });
const base = z.object({
  slug, title: z.string().optional(), body: localized.optional(), cover: assetUrl.or(z.literal('')).optional(),
  media: z.array(frame).optional(), tags: z.array(z.string()).optional(),
  hidden: z.boolean().optional(), seo: seo.optional(),
});
const project = base.extend({
  title: z.string().trim().min(1), summary: localized, role: z.string().optional(), category: z.string(),
  status: z.string(), links: z.array(link).optional(), tech: z.array(z.string()).optional(),
  featured: z.boolean().optional(), archived: z.boolean().optional(), created: z.string().optional(),
  updated: z.iso.date().or(z.literal('')).optional(), updates: localized.optional(),
});
const entry = base.extend({ project: slug.or(z.literal('')).optional() });

export const portfolioSchema = z.object({
  site: z.object({
    name: z.string().min(1).max(16), intro: localized, about: localized, avatar: assetUrl,
    hero: assetUrl, heroMobile: assetUrl.optional(), alive: z.boolean(), footer: z.string(),
    categories: z.array(z.string().min(1)), statuses: z.array(z.string().min(1)),
    contacts: z.array(contact), collaboration: localized.optional(), navigation: z.array(link), seo,
    pageSeo: z.record(z.string(), seo).optional(), languages: z.array(z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)),
    aboutMedia: z.array(frame).optional(), sectionVisibility: z.record(z.string(), z.boolean()).optional(),
  }),
  projects: z.array(project),
  lab: z.array(entry),
  devlog: z.array(entry.extend({ title: z.string().trim().min(1), date: z.iso.date() })),
  now: z.object({ body: localized.optional(), updated: z.iso.date().or(z.literal('')).optional() }),
}).superRefine((data, context) => {
  function report(path: (string | number)[], message: string) {
    context.addIssue({ code: 'custom', path, message });
  }
  if (data.site.languages[0] !== 'en' || new Set(data.site.languages).size !== data.site.languages.length) {
    report(['site', 'languages'], 'Start with en and list each language once.');
  }
  for (const collection of ['projects', 'lab', 'devlog'] as const) {
    const slugs = new Set();
    data[collection].forEach((item, index) => {
      if (slugs.has(item.slug)) report([collection, index, 'slug'], 'This slug already exists.');
      slugs.add(item.slug);
    });
  }
  const projectSlugs = new Set(data.projects.map(item => item.slug));
  data.projects.forEach((item, index) => {
    if (!data.site.categories.includes(item.category)) report(['projects', index, 'category'], 'Choose an existing category.');
    if (!data.site.statuses.includes(item.status)) report(['projects', index, 'status'], 'Choose an existing status.');
  });
  for (const collection of ['lab', 'devlog'] as const) {
    data[collection].forEach((item, index) => {
      if (item.project && !projectSlugs.has(item.project)) report([collection, index, 'project'], 'Choose an existing project.');
    });
  }
});

export type Portfolio = z.infer<typeof portfolioSchema>;
export type Project = Portfolio['projects'][number];
export type Frame = z.infer<typeof frame>;
export type Seo = z.infer<typeof seo>;

export function mediaReferences(data: unknown): Set<string> {
  const references = new Set<string>();
  function visit(value: unknown) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\/media\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|avif|gif|mp4|webm)\b/gi)) {
        references.add(match[0]);
      }
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  }
  visit(data);
  return references;
}
