import source from '../../content/portfolio.json';
import { portfolioSchema, type Project } from './schema';

export const portfolio = portfolioSchema.parse(source);
export const { site } = portfolio;
export const projects = portfolio.projects.filter(item => !item.hidden);
export const lab = portfolio.lab.filter(item => !item.hidden);
export const devlog = portfolio.devlog.filter(item => !item.hidden).sort((a, b) => b.date.localeCompare(a.date));
export const isVideo = (path: string) => /\.(mp4|webm)$/i.test(path);
export const sectionEnabled = (section: string) => site.sectionVisibility?.[section] !== false;
export const showNow = sectionEnabled('now') && !!Object.values(portfolio.now.body ?? {}).some(text => text.trim());

export const navigation = site.navigation.filter(({ url }) => {
  if (url === '/now/') return showNow;
  if (url === '/devlog/') return sectionEnabled('devlog') && devlog.length > 0;
  if (url === '/lab/') return sectionEnabled('lab') && lab.length > 0;
  return sectionEnabled(url.slice(1, -1));
});

export function english(copy?: Record<string, string>) {
  return copy?.en ?? '';
}


export function gamePage(project: Project) {
  return project.category === 'Games'
    ? project.links?.find(({ url }) => /^https:\/\/[a-z0-9-]+\.itch\.io\/[^/?#]+/i.test(url))
    : undefined;
}

export function projectHref(project: Project) {
  return gamePage(project)?.url ?? `/projects/${project.slug}/`;
}
