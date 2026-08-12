import { elements } from "./dom.js";
import { state } from "./state.js";
import { clone, escapeHTML, mediaHref, setPath, slugify } from "./utils.js";

/**
 * Dynamic form renderers and value collectors.
 *
 * Renderers only know how to draw/read forms. Upload actions are injected from
 * app.js to keep this module independent from GitHub and security code.
 */
const callbacks = {
  handleProjectCoverUpload: () => {},
  handleLabUpload: () => {},
};

export function configureEditorCallbacks(nextCallbacks) {
  Object.assign(callbacks, nextCallbacks);
}

/* Reusable translated field pair (English and Russian). */
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

export function collectFields(container, target) {
  container.querySelectorAll("[data-field]").forEach((input) => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    setPath(target, input.dataset.field, value);
  });
  return target;
}

export function renderHome() {
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

export function renderProjectSelect() {
  elements.projectSelect.innerHTML = state.projects
    .map(
      (project) =>
        `<option value="${escapeHTML(project.slug)}"${project.slug === state.selectedProject ? " selected" : ""}>${escapeHTML(project.title)} · ${escapeHTML(project.status)}</option>`,
    )
    .join("");
}

function projectMediaPreview(project) {
  if (!project.coverUrl)
    return `<div class="media-preview"><span>NO COVER MEDIA</span></div>`;
  const src = escapeHTML(mediaHref(project.coverUrl));
  const video = /\.(mp4|webm)(?:$|[?#])/i.test(project.coverUrl);
  return `<div class="media-preview">${video ? `<video src="${src}" muted loop autoplay playsinline></video>` : `<img src="${src}" alt="">`}</div>`;
}

export function renderProjectForm() {
  renderProjectSelect();
  const project = state.projects.find(
    (item) => item.slug === state.selectedProject,
  );
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
  document
    .querySelector("#project-cover-upload")
    ?.addEventListener("change", callbacks.handleProjectCoverUpload);
}

/* Repeatable list editors: skills, LAB and gallery. */
export function renderSkills() {
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
  elements.skillsEditor
    .querySelectorAll("[data-remove-skill]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        collectSkills();
        state.skills.splice(Number(button.dataset.removeSkill), 1);
        renderSkills();
      });
    });
}

export function renderLab() {
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
  elements.labEditor
    .querySelectorAll("[data-remove-experiment]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        collectExperiments();
        state.experiments.splice(Number(button.dataset.removeExperiment), 1);
        renderLab();
      });
    });
  elements.labEditor.querySelectorAll("[data-lab-upload]").forEach((input) => {
    input.addEventListener("change", callbacks.handleLabUpload);
  });
}

export function renderGallery() {
  elements.galleryEditor.innerHTML = state.gallery
    .map((item, index) => {
      const src = mediaHref(item.imageUrl);
      const preview = src
        ? item.mediaType === "video"
          ? `<video src="${escapeHTML(src)}" muted loop autoplay playsinline></video>`
          : `<img src="${escapeHTML(src)}" alt="">`
        : `<span>NO MEDIA</span>`;
      const projectOptions = [
        `<option value=""${item.projectSlug ? "" : " selected"}>Без проекта</option>`,
      ]
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
  elements.galleryEditor
    .querySelectorAll("[data-remove-gallery]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        collectGallery();
        state.gallery.splice(Number(button.dataset.removeGallery), 1);
        renderGallery();
      });
    });
}

/* Copy the current form values back to state before saving. */
export function collectSkills() {
  state.skills = [
    ...elements.skillsEditor.querySelectorAll("[data-skill-index]"),
  ].map((card, index) => {
    const value = clone(state.skills[index] || {});
    card.querySelectorAll("[data-key]").forEach((input) => {
      const path = input.dataset.key;
      const parsed =
        path === "level"
          ? Math.max(1, Math.min(5, Number(input.value) || 1))
          : input.value;
      setPath(value, path, parsed);
    });
    value.id = value.id || slugify(value.name);
    return value;
  });
}

export function collectExperiments() {
  state.experiments = [
    ...elements.labEditor.querySelectorAll("[data-experiment-index]"),
  ].map((card, index) => {
    const value = clone(state.experiments[index] || {});
    card
      .querySelectorAll("[data-key]")
      .forEach((input) => setPath(value, input.dataset.key, input.value));
    value.id = value.id || slugify(value.title);
    value.mediaType = /\.(mp4|webm)(?:$|[?#])/i.test(value.mediaUrl)
      ? "video"
      : value.mediaType || "image";
    return value;
  });
}

export function collectGallery() {
  state.gallery = [
    ...elements.galleryEditor.querySelectorAll("[data-gallery-index]"),
  ].map((card, index) => {
    const value = clone(state.gallery[index] || {});
    card
      .querySelectorAll("[data-key]")
      .forEach((input) => setPath(value, input.dataset.key, input.value));
    value.id = value.id || `gallery-${Date.now()}-${index}`;
    return value;
  });
}

export function renderAll() {
  renderHome();
  renderProjectForm();
  renderSkills();
  renderLab();
  renderGallery();
}
