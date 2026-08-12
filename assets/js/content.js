import { SITE_ROOT } from "./config.js";

/**
 * Load every editable JSON file in parallel, then resolve project files listed
 * in content/projects/index.json. The index controls both order and visibility.
 */
export async function getJSON(path) {
  const response = await fetch(new URL(path, SITE_ROOT), { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

export async function loadContent() {
  const [site, projectIndex, skills, experiments, gallery] = await Promise.all([
    getJSON("content/site.json"),
    getJSON("content/projects/index.json"),
    getJSON("content/skills.json"),
    getJSON("content/experiments.json"),
    getJSON("content/gallery.json"),
  ]);
  const projects = await Promise.all(
    projectIndex.map((slug) => getJSON(`content/projects/${slug}.json`)),
  );
  return { ...site, projects, skills, experiments, gallery };
}
