const CONFIG = Object.freeze({
  owner: "kltz4074",
  repo: "kltz4074.github.io",
  branch: "main",
  apiRoot: "https://api.github.com",
  vaultKey: "kltzqu-admin-v1",
  iterations: 600000,
  maxImageUploadBytes: 25 * 1024 * 1024,
  maxVideoUploadBytes: 100 * 1024 * 1024,
});

const state = {
  token: "",
  fileShas: new Map(),
  site: null,
  projectIndex: [],
  projects: [],
  selectedProject: "",
  skills: [],
  experiments: [],
  gallery: [],
};

const elements = {
  lockScreen: document.querySelector("#lock-screen"),
  adminShell: document.querySelector("#admin-shell"),
  setupForm: document.querySelector("#setup-form"),
  setupFields: document.querySelector("#setup-fields"),
  confirmField: document.querySelector("#confirm-field"),
  tokenInput: document.querySelector("#token-input"),
  phraseInput: document.querySelector("#phrase-input"),
  phraseConfirmInput: document.querySelector("#phrase-confirm-input"),
  unlockButton: document.querySelector("#unlock-button"),
  unlockLabel: document.querySelector("#unlock-label"),
  resetVaultButton: document.querySelector("#reset-vault-button"),
  connectionState: document.querySelector("#connection-state"),
  lockNotice: document.querySelector("#lock-notice"),
  notice: document.querySelector("#notice"),
  homeForm: document.querySelector("#home-form"),
  projectSelect: document.querySelector("#project-select"),
  projectForm: document.querySelector("#project-form"),
  skillsEditor: document.querySelector("#skills-editor"),
  labEditor: document.querySelector("#lab-editor"),
  galleryEditor: document.querySelector("#gallery-editor"),
};

let noticeTimer = 0;

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;
}

function mediaTypeFromFile(file) {
  return file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name)
    ? "video"
    : "image";
}

function extensionFromFile(file) {
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

function mediaHref(path) {
  if (!path) return "";
  if (/^https?:/i.test(path)) return path;
  return `/${String(path).replace(/^\/+/, "")}`;
}

function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function textToBase64(value) {
  return bytesToBase64(new TextEncoder().encode(value));
}

function base64ToText(value) {
  return new TextDecoder().decode(base64ToBytes(value));
}

function showNotice(message, type = "info", persist = false) {
  window.clearTimeout(noticeTimer);
  const target = elements.adminShell.hidden ? elements.lockNotice : elements.notice;
  [elements.lockNotice, elements.notice].forEach((notice) => {
    if (notice !== target) notice.hidden = true;
  });
  target.hidden = false;
  target.className = `notice${target === elements.lockNotice ? " lock-notice" : ""}${type === "error" ? " is-error" : type === "success" ? " is-success" : ""}`;
  target.textContent = message;
  if (!persist) {
    noticeTimer = window.setTimeout(() => {
      target.hidden = true;
    }, 6500);
  }
}

function formatError(error) {
  if (error?.status === 401) return "GitHub отклонил токен. Проверь его срок действия и подключи доступ заново.";
  if (error?.status === 403) return "У токена нет права Contents: Read and write для этого репозитория.";
  if (error?.status === 409) return "Файл изменился на GitHub после загрузки админки. Нажми «Обновить данные» и повтори изменение.";
  if (error?.status === 422) return "GitHub не принял изменение. Проверь имя файла, данные и права токена.";
  return error?.message || "Неизвестная ошибка";
}

function setButtonBusy(button, busy, busyText = "СОХРАНЕНИЕ…") {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function deriveVaultKey(phrase, salt, usages, iterations = CONFIG.iterations) {
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(phrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

async function encryptToken(token, phrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(phrase, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );
  return {
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: CONFIG.iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptToken(vault, phrase) {
  if (
    !vault ||
    vault.version !== 1 ||
    !Number.isSafeInteger(vault.iterations) ||
    vault.iterations < 100000 ||
    vault.iterations > 2000000
  ) {
    throw new Error("Формат локального хранилища не поддерживается.");
  }
  const salt = base64ToBytes(vault.salt);
  const iv = base64ToBytes(vault.iv);
  const key = await deriveVaultKey(phrase, salt, ["decrypt"], vault.iterations);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBytes(vault.ciphertext),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Неверная секретная фраза.");
  }
}

function getVault() {
  try {
    const value = localStorage.getItem(CONFIG.vaultKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveVault(vault) {
  localStorage.setItem(CONFIG.vaultKey, JSON.stringify(vault));
}

class GitHubError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.data = data;
  }
}

async function githubRequest(path, options = {}) {
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
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new GitHubError(data?.message || `GitHub API: ${response.status}`, response.status, data);
  }
  return data;
}

function contentApiPath(path) {
  return `/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

async function readJson(path) {
  const data = await githubRequest(`${contentApiPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`);
  state.fileShas.set(path, data.sha);
  return JSON.parse(base64ToText(data.content));
}

async function getFileSha(path) {
  if (state.fileShas.has(path)) return state.fileShas.get(path);
  try {
    const data = await githubRequest(`${contentApiPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`);
    state.fileShas.set(path, data.sha);
    return data.sha;
  } catch (error) {
    if (error.status === 404) return "";
    throw error;
  }
}

async function writeContent(path, base64Content, message) {
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

async function writeJson(path, value, message) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  return writeContent(path, textToBase64(json), message);
}

function validateUploadSize(file) {
  const isVideo = mediaTypeFromFile(file) === "video";
  const limit = isVideo ? CONFIG.maxVideoUploadBytes : CONFIG.maxImageUploadBytes;
  if (file.size > limit) {
    const label = isVideo ? "100 МБ" : "25 МБ";
    throw new Error(`Файл ${file.name} больше ${label}.`);
  }
}

async function uploadFile(path, file, message) {
  validateUploadSize(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return writeContent(path, bytesToBase64(bytes), message);
}

async function validateToken(token) {
  const previous = state.token;
  state.token = token;
  try {
    await githubRequest(`${contentApiPath("content/site.json")}?ref=${encodeURIComponent(CONFIG.branch)}`);
  } finally {
    state.token = previous;
  }
}

async function loadAllContent() {
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
  state.selectedProject = projects.some((project) => project.slug === state.selectedProject)
    ? state.selectedProject
    : projects[0]?.slug || "";
  state.skills = skills;
  state.experiments = experiments;
  state.gallery = gallery;
}

function localizedFields(prefix, label, value, multiline = true) {
  const tag = multiline ? "textarea" : "input";
  const input = (language) =>
    tag === "textarea"
      ? `<textarea data-field="${prefix}.${language}">${escapeHTML(value?.[language] || "")}</textarea>`
      : `<input data-field="${prefix}.${language}" value="${escapeHTML(value?.[language] || "")}">`;
  return `
    <div class="editor-group is-wide">
      <div class="editor-group-title"><span>${escapeHTML(label)}</span><span>RU / EN</span></div>
      <label class="field"><span>English</span>${input("en")}</label>
      <label class="field"><span>Русский</span>${input("ru")}</label>
    </div>
  `;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) cursor[part] = value;
    else cursor = cursor[part] ||= {};
  });
}

function collectFields(container, target) {
  container.querySelectorAll("[data-field]").forEach((input) => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    setPath(target, input.dataset.field, value);
  });
  return target;
}

function renderHome() {
  const site = state.site;
  elements.homeForm.innerHTML = `
    ${localizedFields("hero.title", "Главный заголовок", site.hero.title)}
    ${localizedFields("hero.subtitle", "Подзаголовок", site.hero.subtitle)}
    ${localizedFields("hero.eyebrow", "Строка над заголовком", site.hero.eyebrow, false)}
    ${localizedFields("hero.current", "Currently building", site.hero.current, false)}
    <div class="editor-group is-wide">
      <div class="editor-group-title"><span>Статистика и ссылки</span><span>PUBLIC</span></div>
      <label class="field"><span>Скачивания</span><input data-field="downloads" value="${escapeHTML(site.downloads || "")}"></label>
      <label class="field"><span>GitHub URL</span><input data-field="links.github" type="url" value="${escapeHTML(site.links?.github || "")}"></label>
      <label class="field full-field"><span>itch.io URL</span><input data-field="links.itch" type="url" value="${escapeHTML(site.links?.itch || "")}"></label>
    </div>
  `;
}

function renderProjectSelect() {
  elements.projectSelect.innerHTML = state.projects
    .map(
      (project) =>
        `<option value="${escapeHTML(project.slug)}"${project.slug === state.selectedProject ? " selected" : ""}>${escapeHTML(project.title)} · ${escapeHTML(project.status)}</option>`,
    )
    .join("");
}

function projectMediaPreview(project) {
  if (!project.coverUrl) return `<div class="media-preview"><span>NO COVER MEDIA</span></div>`;
  const src = escapeHTML(mediaHref(project.coverUrl));
  const video = /\.(mp4|webm)(?:$|[?#])/i.test(project.coverUrl);
  return `<div class="media-preview">${video ? `<video src="${src}" muted loop autoplay playsinline></video>` : `<img src="${src}" alt="">`}</div>`;
}

function renderProjectForm() {
  renderProjectSelect();
  const project = state.projects.find((item) => item.slug === state.selectedProject);
  if (!project) {
    elements.projectForm.innerHTML = `<div class="media-preview"><span>PROJECT ARCHIVE IS EMPTY</span></div>`;
    return;
  }
  const statuses = ["Released", "In development", "Prototype", "Paused"];
  elements.projectForm.innerHTML = `
    <div class="editor-group is-wide">
      <div class="editor-group-title"><span>Основное</span><span>${escapeHTML(project.slug)}</span></div>
      <label class="field"><span>Название</span><input data-field="title" value="${escapeHTML(project.title)}"></label>
      <label class="field"><span>Slug</span><input data-field="slug" value="${escapeHTML(project.slug)}" readonly></label>
      <label class="field"><span>Статус</span><select data-field="status">${statuses.map((status) => `<option${status === project.status ? " selected" : ""}>${status}</option>`).join("")}</select></label>
      <label class="field"><span>Год</span><input data-field="year" value="${escapeHTML(project.year)}"></label>
      <label class="field"><span>Дата</span><input data-field="date" value="${escapeHTML(project.date)}"></label>
      <label class="field"><span>Роль</span><input data-field="role" value="${escapeHTML(project.role)}"></label>
      <label class="field"><span>Команда</span><input data-field="team" value="${escapeHTML(project.team)}"></label>
      <label class="field"><span>Движок</span><input data-field="engine" value="${escapeHTML(project.engine)}"></label>
      <label class="field"><span>Stack</span><input data-field="stack" value="${escapeHTML(project.stack)}"></label>
      <label class="field"><span>Релиз / скачивания</span><input data-field="downloads" value="${escapeHTML(project.downloads)}"></label>
      <label class="checkbox-field"><input data-field="featured" type="checkbox"${project.featured ? " checked" : ""}><span>Показывать на главной</span></label>
    </div>
    ${localizedFields("description", "Короткое описание", project.description)}
    ${localizedFields("longDescription", "Полное описание", project.longDescription)}
    ${localizedFields("challenge", "Сложность разработки", project.challenge)}
    ${localizedFields("learnings", "Что я изучил", project.learnings)}
    <div class="editor-group is-wide">
      <div class="editor-group-title"><span>Ссылки</span><span>OPTIONAL</span></div>
      <label class="field"><span>Project URL</span><input data-field="projectUrl" type="url" value="${escapeHTML(project.projectUrl)}"></label>
      <label class="field"><span>GitHub URL</span><input data-field="githubUrl" type="url" value="${escapeHTML(project.githubUrl)}"></label>
    </div>
    <div class="editor-group is-wide">
      <div class="editor-group-title"><span>Обложка</span><span>IMAGE / GIF / VIDEO</span></div>
      ${projectMediaPreview(project)}
      <div>
        <label class="field"><span>Путь</span><input data-field="coverUrl" value="${escapeHTML(project.coverUrl)}" placeholder="media/projects/${escapeHTML(project.slug)}/cover.webp"></label>
        <label class="upload-button" style="margin-top:14px">ЗАГРУЗИТЬ ОБЛОЖКУ<input id="project-cover-upload" type="file" accept="image/*,.gif,video/mp4,video/webm"></label>
      </div>
    </div>
  `;
  document.querySelector("#project-cover-upload")?.addEventListener("change", handleProjectCoverUpload);
}

function renderSkills() {
  elements.skillsEditor.innerHTML = state.skills
    .map(
      (skill, index) => `
        <article class="stack-card" data-skill-index="${index}">
          <span class="stack-index">/${String(index + 1).padStart(2, "0")}</span>
          <div class="stack-fields">
            <label class="field"><span>Название</span><input data-key="name" value="${escapeHTML(skill.name)}"></label>
            <label class="field"><span>Уровень 1–5</span><input data-key="level" type="number" min="1" max="5" value="${Number(skill.level) || 1}"></label>
            <label class="field"><span>English note</span><textarea data-key="note.en">${escapeHTML(skill.note?.en || "")}</textarea></label>
            <label class="field"><span>Описание</span><textarea data-key="note.ru">${escapeHTML(skill.note?.ru || "")}</textarea></label>
            <div class="stack-actions"><button class="secondary-button danger-button remove-card" data-remove-skill="${index}" type="button">УБРАТЬ</button></div>
          </div>
        </article>
      `,
    )
    .join("");
  elements.skillsEditor.querySelectorAll("[data-remove-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      collectSkills();
      state.skills.splice(Number(button.dataset.removeSkill), 1);
      renderSkills();
    });
  });
}

function renderLab() {
  elements.labEditor.innerHTML = state.experiments
    .map((experiment, index) => {
      const src = mediaHref(experiment.mediaUrl);
      const preview = src
        ? experiment.mediaType === "video"
          ? `<video src="${escapeHTML(src)}" muted loop autoplay playsinline></video>`
          : `<img src="${escapeHTML(src)}" alt="">`
        : `<span>NO MEDIA</span>`;
      return `
        <article class="stack-card" data-experiment-index="${index}">
          <span class="stack-index">/${String(index + 1).padStart(2, "0")}</span>
          <div class="stack-fields">
            <label class="field"><span>Название</span><input data-key="title" value="${escapeHTML(experiment.title)}"></label>
            <label class="field"><span>ID</span><input data-key="id" value="${escapeHTML(experiment.id)}" readonly></label>
            <label class="field"><span>Категория</span><input data-key="category" value="${escapeHTML(experiment.category)}"></label>
            <label class="field"><span>Год</span><input data-key="year" value="${escapeHTML(experiment.year)}"></label>
            <label class="field full-field"><span>Stack</span><input data-key="stack" value="${escapeHTML(experiment.stack)}"></label>
            <label class="field"><span>English description</span><textarea data-key="description.en">${escapeHTML(experiment.description?.en || "")}</textarea></label>
            <label class="field"><span>Описание</span><textarea data-key="description.ru">${escapeHTML(experiment.description?.ru || "")}</textarea></label>
            <label class="field"><span>Project URL</span><input data-key="projectUrl" type="url" value="${escapeHTML(experiment.projectUrl)}"></label>
            <label class="field"><span>Media path</span><input data-key="mediaUrl" value="${escapeHTML(experiment.mediaUrl)}"></label>
            <div class="media-preview">${preview}</div>
            <div class="stack-actions">
              <label class="upload-button">ЗАГРУЗИТЬ МЕДИА<input data-lab-upload="${index}" type="file" accept="image/*,.gif,video/mp4,video/webm"></label>
              <button class="secondary-button danger-button remove-card" data-remove-experiment="${index}" type="button">УБРАТЬ</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
  elements.labEditor.querySelectorAll("[data-remove-experiment]").forEach((button) => {
    button.addEventListener("click", () => {
      collectExperiments();
      state.experiments.splice(Number(button.dataset.removeExperiment), 1);
      renderLab();
    });
  });
  elements.labEditor.querySelectorAll("[data-lab-upload]").forEach((input) => {
    input.addEventListener("change", handleLabUpload);
  });
}

function renderGallery() {
  elements.galleryEditor.innerHTML = state.gallery
    .map((item, index) => {
      const src = mediaHref(item.imageUrl);
      const preview = src
        ? item.mediaType === "video"
          ? `<video src="${escapeHTML(src)}" muted loop autoplay playsinline></video>`
          : `<img src="${escapeHTML(src)}" alt="">`
        : `<span>NO MEDIA</span>`;
      const projectOptions = [`<option value=""${item.projectSlug ? "" : " selected"}>Без проекта</option>`]
        .concat(
          state.projects.map(
            (project) =>
              `<option value="${escapeHTML(project.slug)}"${project.slug === item.projectSlug ? " selected" : ""}>${escapeHTML(project.title)}</option>`,
          ),
        )
        .join("");
      return `
        <article class="stack-card" data-gallery-index="${index}">
          <span class="stack-index">/${String(index + 1).padStart(2, "0")}</span>
          <div class="stack-fields">
            <label class="field"><span>Title EN</span><input data-key="title.en" value="${escapeHTML(item.title?.en || "")}"></label>
            <label class="field"><span>Название RU</span><input data-key="title.ru" value="${escapeHTML(item.title?.ru || "")}"></label>
            <label class="field"><span>Caption EN</span><textarea data-key="caption.en">${escapeHTML(item.caption?.en || "")}</textarea></label>
            <label class="field"><span>Подпись RU</span><textarea data-key="caption.ru">${escapeHTML(item.caption?.ru || "")}</textarea></label>
            <label class="field"><span>Проект</span><select data-key="projectSlug">${projectOptions}</select></label>
            <label class="field"><span>Тип</span><select data-key="mediaType"><option value="image"${item.mediaType === "image" ? " selected" : ""}>image</option><option value="video"${item.mediaType === "video" ? " selected" : ""}>video</option></select></label>
            <label class="field full-field"><span>Media path</span><input data-key="imageUrl" value="${escapeHTML(item.imageUrl)}"></label>
            <div class="media-preview">${preview}</div>
            <div class="stack-actions"><button class="secondary-button danger-button remove-card" data-remove-gallery="${index}" type="button">УБРАТЬ ИЗ ГАЛЕРЕИ</button></div>
          </div>
        </article>
      `;
    })
    .join("");
  elements.galleryEditor.querySelectorAll("[data-remove-gallery]").forEach((button) => {
    button.addEventListener("click", () => {
      collectGallery();
      state.gallery.splice(Number(button.dataset.removeGallery), 1);
      renderGallery();
    });
  });
}

function collectSkills() {
  state.skills = [...elements.skillsEditor.querySelectorAll("[data-skill-index]")].map((card, index) => {
    const value = clone(state.skills[index] || {});
    card.querySelectorAll("[data-key]").forEach((input) => {
      const path = input.dataset.key;
      const parsed = path === "level" ? Math.max(1, Math.min(5, Number(input.value) || 1)) : input.value;
      setPath(value, path, parsed);
    });
    value.id = value.id || slugify(value.name);
    return value;
  });
}

function collectExperiments() {
  state.experiments = [...elements.labEditor.querySelectorAll("[data-experiment-index]")].map((card, index) => {
    const value = clone(state.experiments[index] || {});
    card.querySelectorAll("[data-key]").forEach((input) => setPath(value, input.dataset.key, input.value));
    value.id = value.id || slugify(value.title);
    value.mediaType = /\.(mp4|webm)(?:$|[?#])/i.test(value.mediaUrl) ? "video" : value.mediaType || "image";
    return value;
  });
}

function collectGallery() {
  state.gallery = [...elements.galleryEditor.querySelectorAll("[data-gallery-index]")].map((card, index) => {
    const value = clone(state.gallery[index] || {});
    card.querySelectorAll("[data-key]").forEach((input) => setPath(value, input.dataset.key, input.value));
    value.id = value.id || `gallery-${Date.now()}-${index}`;
    return value;
  });
}

function renderAll() {
  renderHome();
  renderProjectForm();
  renderSkills();
  renderLab();
  renderGallery();
}

function showAdmin() {
  elements.lockScreen.hidden = true;
  elements.adminShell.hidden = false;
  elements.connectionState.textContent = "CONNECTED";
  elements.connectionState.classList.add("is-online");
  renderAll();
}

function showLock() {
  state.token = "";
  elements.adminShell.hidden = true;
  elements.lockScreen.hidden = false;
  elements.connectionState.textContent = "LOCKED";
  elements.connectionState.classList.remove("is-online");
  elements.phraseInput.value = "";
  configureLockScreen();
}

function configureLockScreen() {
  const hasVault = Boolean(getVault());
  elements.setupFields.hidden = hasVault;
  elements.confirmField.hidden = hasVault;
  elements.resetVaultButton.hidden = !hasVault;
  elements.unlockLabel.textContent = hasVault ? "РАЗБЛОКИРОВАТЬ" : "НАСТРОИТЬ ДОСТУП";
  elements.tokenInput.required = !hasVault;
  elements.phraseConfirmInput.required = !hasVault;
  elements.phraseInput.autocomplete = hasVault ? "current-password" : "new-password";
}

async function handleSetupSubmit(event) {
  event.preventDefault();
  const phrase = elements.phraseInput.value;
  const vault = getVault();
  setButtonBusy(elements.unlockButton, true, vault ? "РАСШИФРОВКА…" : "ПРОВЕРКА…");
  try {
    if (vault) {
      const token = await decryptToken(vault, phrase);
      await validateToken(token);
      state.token = token;
      if (vault.iterations !== CONFIG.iterations) {
        saveVault(await encryptToken(token, phrase));
      }
    } else {
      const token = elements.tokenInput.value.trim();
      const confirmation = elements.phraseConfirmInput.value;
      if (!token.startsWith("github_pat_")) {
        throw new Error("Вставь GitHub token, который начинается с github_pat_.");
      }
      if (phrase.length < 14) throw new Error("Секретная фраза должна быть длиннее 14 символов.");
      if (phrase !== confirmation) throw new Error("Секретные фразы не совпадают.");
      await validateToken(token);
      saveVault(await encryptToken(token, phrase));
      state.token = token;
      elements.tokenInput.value = "";
      elements.phraseConfirmInput.value = "";
    }
    await loadAllContent();
    elements.phraseInput.value = "";
    showAdmin();
    showNotice("Данные загружены напрямую из main. Админка готова.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(elements.unlockButton, false);
  }
}

async function handleSaveHome() {
  const button = document.querySelector("#save-home");
  setButtonBusy(button, true);
  try {
    state.site = collectFields(elements.homeForm, clone(state.site));
    await writeJson("content/site.json", state.site, "Update portfolio home content");
    showNotice("Главная сохранена. GitHub Pages обновится автоматически.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleSaveProject() {
  const button = document.querySelector("#save-project");
  const currentIndex = state.projects.findIndex((project) => project.slug === state.selectedProject);
  if (currentIndex < 0) return;
  setButtonBusy(button, true);
  try {
    const project = collectFields(elements.projectForm, clone(state.projects[currentIndex]));
    if (!project.title.trim()) throw new Error("У проекта должно быть название.");
    state.projects[currentIndex] = project;
    if (!state.projectIndex.includes(project.slug)) state.projectIndex.push(project.slug);
    await writeJson(`content/projects/${project.slug}.json`, project, `Update ${project.title}`);
    await writeJson("content/projects/index.json", state.projectIndex, "Update portfolio project index");
    renderProjectSelect();
    showNotice(`Проект ${project.title} сохранён.`, "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

function handleNewProject() {
  const title = window.prompt("Название нового проекта:");
  if (!title?.trim()) return;
  const slug = slugify(title);
  if (state.projects.some((project) => project.slug === slug)) {
    showNotice("Проект с таким slug уже существует.", "error");
    return;
  }
  const project = {
    id: slug,
    slug,
    title: title.trim(),
    status: "In development",
    year: String(new Date().getFullYear()),
    date: String(new Date().getFullYear()),
    role: "Solo developer",
    team: "Solo development",
    engine: "Unity",
    stack: "Unity / C#",
    downloads: "—",
    description: { en: "", ru: "" },
    longDescription: { en: "", ru: "" },
    challenge: { en: "", ru: "" },
    learnings: { en: "", ru: "" },
    githubUrl: "",
    projectUrl: "",
    coverUrl: "",
    featured: false,
  };
  state.projects.push(project);
  state.projectIndex.push(slug);
  state.selectedProject = slug;
  renderProjectForm();
  showNotice("Новый проект создан локально. Заполни поля и нажми «Сохранить проект».");
}

async function handleArchiveProject() {
  const project = state.projects.find((item) => item.slug === state.selectedProject);
  if (!project) return;
  if (!window.confirm(`Убрать ${project.title} с сайта? JSON-файл останется в репозитории.`)) return;
  const button = document.querySelector("#archive-project-button");
  setButtonBusy(button, true, "ОБНОВЛЕНИЕ…");
  try {
    state.projectIndex = state.projectIndex.filter((slug) => slug !== project.slug);
    state.projects = state.projects.filter((item) => item.slug !== project.slug);
    state.selectedProject = state.projects[0]?.slug || "";
    await writeJson("content/projects/index.json", state.projectIndex, `Archive ${project.title} from portfolio`);
    renderProjectForm();
    renderGallery();
    showNotice(`${project.title} убран с сайта. Его JSON-файл сохранён.`, "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleProjectCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const project = state.projects.find((item) => item.slug === state.selectedProject);
  if (!project) return;
  const extension = extensionFromFile(file);
  const path = `media/projects/${project.slug}/cover.${extension}`;
  showNotice(`Загружаю ${file.name}…`, "info", true);
  try {
    await uploadFile(path, file, `Upload cover for ${project.title}`);
    project.coverUrl = path;
    project.mediaType = mediaTypeFromFile(file);
    renderProjectForm();
    showNotice("Обложка загружена. Нажми «Сохранить проект», чтобы привязать её.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  }
}

async function handleSaveSkills() {
  const button = document.querySelector("#save-skills");
  setButtonBusy(button, true);
  try {
    collectSkills();
    await writeJson("content/skills.json", state.skills, "Update portfolio skills");
    renderSkills();
    showNotice("Навыки сохранены.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleSaveLab() {
  const button = document.querySelector("#save-lab");
  setButtonBusy(button, true);
  try {
    collectExperiments();
    await writeJson("content/experiments.json", state.experiments, "Update portfolio experiments");
    renderLab();
    showNotice("LAB сохранён.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleLabUpload(event) {
  const file = event.target.files?.[0];
  const index = Number(event.target.dataset.labUpload);
  if (!file || !state.experiments[index]) return;
  collectExperiments();
  const experiment = state.experiments[index];
  const path = `media/experiments/${experiment.id}.${extensionFromFile(file)}`;
  showNotice(`Загружаю ${file.name}…`, "info", true);
  try {
    await uploadFile(path, file, `Upload media for ${experiment.title}`);
    experiment.mediaUrl = path;
    experiment.mediaType = mediaTypeFromFile(file);
    await writeJson("content/experiments.json", state.experiments, `Attach media to ${experiment.title}`);
    renderLab();
    showNotice("Медиа загружено и привязано к эксперименту.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  }
}

async function handleSaveGallery() {
  const button = document.querySelector("#save-gallery");
  setButtonBusy(button, true);
  try {
    collectGallery();
    await writeJson("content/gallery.json", state.gallery, "Update portfolio gallery");
    renderGallery();
    showNotice("Галерея сохранена.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleGalleryUpload(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  collectGallery();
  showNotice(`Загружаю файлов: ${files.length}…`, "info", true);
  try {
    for (const [index, file] of files.entries()) {
      validateUploadSize(file);
      const base = slugify(file.name.replace(/\.[^.]+$/, ""));
      const path = `media/gallery/${Date.now()}-${index}-${base}.${extensionFromFile(file)}`;
      await uploadFile(path, file, `Upload gallery media ${file.name}`);
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      state.gallery.push({
        id: `gallery-${Date.now()}-${index}`,
        title: { en: title, ru: title },
        caption: { en: "", ru: "" },
        imageUrl: path,
        mediaType: mediaTypeFromFile(file),
        projectSlug: "",
      });
    }
    await writeJson("content/gallery.json", state.gallery, "Add portfolio gallery media");
    renderGallery();
    event.target.value = "";
    showNotice("Медиа загружено и добавлено в галерею. Подписи можно изменить ниже.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  }
}

async function reloadContent() {
  const button = document.querySelector("#reload-button");
  setButtonBusy(button, true, "ЗАГРУЗКА…");
  try {
    await loadAllContent();
    renderAll();
    showNotice("Загружена последняя версия данных из main.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function changePhrase() {
  const phrase = document.querySelector("#new-phrase").value;
  const confirmation = document.querySelector("#new-phrase-confirm").value;
  const button = document.querySelector("#change-phrase-button");
  if (phrase.length < 14) {
    showNotice("Новая фраза должна быть длиннее 14 символов.", "error");
    return;
  }
  if (phrase !== confirmation) {
    showNotice("Новые секретные фразы не совпадают.", "error");
    return;
  }
  setButtonBusy(button, true, "ШИФРОВАНИЕ…");
  try {
    saveVault(await encryptToken(state.token, phrase));
    document.querySelector("#new-phrase").value = "";
    document.querySelector("#new-phrase-confirm").value = "";
    showNotice("Секретная фраза изменена.", "success");
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

function forgetAccess() {
  if (!window.confirm("Удалить зашифрованный токен из этого браузера?")) return;
  localStorage.removeItem(CONFIG.vaultKey);
  showLock();
  showNotice("Локальный доступ удалён. Токен можно отдельно отозвать в настройках GitHub.", "success", true);
}

function bindStaticEvents() {
  elements.setupForm.addEventListener("submit", handleSetupSubmit);
  elements.resetVaultButton.addEventListener("click", forgetAccess);
  document.querySelector("#forget-access-button").addEventListener("click", forgetAccess);
  document.querySelector("#lock-button").addEventListener("click", showLock);
  document.querySelector("#reload-button").addEventListener("click", reloadContent);
  document.querySelector("#save-home").addEventListener("click", handleSaveHome);
  document.querySelector("#save-project").addEventListener("click", handleSaveProject);
  document.querySelector("#new-project-button").addEventListener("click", handleNewProject);
  document.querySelector("#archive-project-button").addEventListener("click", handleArchiveProject);
  document.querySelector("#save-skills").addEventListener("click", handleSaveSkills);
  document.querySelector("#save-lab").addEventListener("click", handleSaveLab);
  document.querySelector("#save-gallery").addEventListener("click", handleSaveGallery);
  document.querySelector("#change-phrase-button").addEventListener("click", changePhrase);
  document.querySelector("#gallery-upload").addEventListener("change", handleGalleryUpload);
  document.querySelector("#add-skill").addEventListener("click", () => {
    collectSkills();
    state.skills.push({ id: `skill-${Date.now()}`, name: "New skill", level: 3, note: { en: "", ru: "" } });
    renderSkills();
  });
  document.querySelector("#add-experiment").addEventListener("click", () => {
    collectExperiments();
    state.experiments.push({
      id: `experiment-${Date.now()}`,
      title: "New experiment",
      year: String(new Date().getFullYear()),
      category: "Prototype",
      stack: "Unity / C#",
      description: { en: "", ru: "" },
      mediaUrl: "",
      mediaType: "image",
      projectUrl: "",
    });
    renderLab();
  });
  document.querySelector("#add-gallery-item").addEventListener("click", () => {
    collectGallery();
    state.gallery.push({
      id: `gallery-${Date.now()}`,
      title: { en: "New gallery item", ru: "Новый кадр" },
      caption: { en: "", ru: "" },
      imageUrl: "",
      mediaType: "image",
      projectSlug: "",
    });
    renderGallery();
  });
  elements.projectSelect.addEventListener("change", () => {
    const current = state.projects.find((project) => project.slug === state.selectedProject);
    if (current) collectFields(elements.projectForm, current);
    state.selectedProject = elements.projectSelect.value;
    renderProjectForm();
  });
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-section]").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === button.dataset.section));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

bindStaticEvents();
configureLockScreen();
