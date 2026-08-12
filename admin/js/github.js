import { CONFIG } from "./config.js";
import { state } from "./state.js";
import {
  base64ToText,
  bytesToBase64,
  mediaTypeFromFile,
  textToBase64,
} from "./utils.js";

/**
 * The only module that talks to api.github.com.
 * Content writes create normal commits directly on CONFIG.branch.
 */
class GitHubError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.data = data;
  }
}

export async function githubRequest(path, options = {}) {
  if (!state.token) throw new Error("Админка заблокирована.");
  const response = await fetch(`${CONFIG.apiRoot}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${state.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new GitHubError(
      data?.message || `GitHub API: ${response.status}`,
      response.status,
      data,
    );
  }
  return data;
}

export function contentApiPath(path) {
  return `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export async function readJson(path) {
  const data = await githubRequest(
    `${contentApiPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`,
  );
  state.fileShas.set(path, data.sha);
  return JSON.parse(base64ToText(data.content));
}

export async function getFileSha(path) {
  if (state.fileShas.has(path)) return state.fileShas.get(path);
  try {
    const data = await githubRequest(
      `${contentApiPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`,
    );
    state.fileShas.set(path, data.sha);
    return data.sha;
  } catch (error) {
    if (error.status === 404) return "";
    throw error;
  }
}

export async function writeContent(path, base64Content, message) {
  const sha = await getFileSha(path);
  const body = {
    message,
    content: base64Content,
    branch: CONFIG.branch,
  };
  if (sha) body.sha = sha;
  const result = await githubRequest(contentApiPath(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  state.fileShas.set(path, result.content.sha);
  return result;
}

export async function writeJson(path, value, message) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  return writeContent(path, textToBase64(json), message);
}

export function validateUploadSize(file) {
  const isVideo = mediaTypeFromFile(file) === "video";
  const limit = isVideo
    ? CONFIG.maxVideoUploadBytes
    : CONFIG.maxImageUploadBytes;
  if (file.size > limit) {
    const label = isVideo ? "100 МБ" : "25 МБ";
    throw new Error(`Файл ${file.name} больше ${label}.`);
  }
}

export async function uploadFile(path, file, message) {
  validateUploadSize(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return writeContent(path, bytesToBase64(bytes), message);
}

export async function validateToken(token) {
  const previous = state.token;
  state.token = token;
  try {
    await githubRequest(
      `${contentApiPath("content/site.json")}?ref=${encodeURIComponent(CONFIG.branch)}`,
    );
  } finally {
    state.token = previous;
  }
}

export async function loadAllContent() {
  state.fileShas.clear();
  const [site, projectIndex, skills, experiments, gallery] = await Promise.all([
    readJson("content/site.json"),
    readJson("content/projects/index.json"),
    readJson("content/skills.json"),
    readJson("content/experiments.json"),
    readJson("content/gallery.json"),
  ]);
  const projects = await Promise.all(
    projectIndex.map((slug) => readJson(`content/projects/${slug}.json`)),
  );
  state.site = site;
  state.projectIndex = projectIndex;
  state.projects = projects;
  state.selectedProject = projects.some(
    (project) => project.slug === state.selectedProject,
  )
    ? state.selectedProject
    : projects[0]?.slug || "";
  state.skills = skills;
  state.experiments = experiments;
  state.gallery = gallery;
}
