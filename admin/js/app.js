import { elements, formatError, setButtonBusy, showNotice } from "./dom.js";
import { CONFIG } from "./config.js";
import {
  collectExperiments,
  collectFields,
  collectGallery,
  collectSkills,
  configureEditorCallbacks,
  renderAll,
  renderGallery,
  renderLab,
  renderProjectForm,
  renderProjectSelect,
  renderSkills,
} from "./editor.js";
import {
  loadAllContent,
  uploadFile,
  validateToken,
  writeJson,
} from "./github.js";
import { state } from "./state.js";
import {
  clone,
  extensionFromFile,
  mediaTypeFromFile,
  slugify,
} from "./utils.js";
import { decryptToken, encryptToken, getVault, saveVault } from "./vault.js";

/* -------------------------------------------------------------------------- */
/* Lock screen and encrypted local access                                      */
/* -------------------------------------------------------------------------- */

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
  elements.unlockLabel.textContent = hasVault
    ? "РАЗБЛОКИРОВАТЬ"
    : "НАСТРОИТЬ ДОСТУП";
  elements.tokenInput.required = !hasVault;
  elements.phraseConfirmInput.required = !hasVault;
  elements.phraseInput.autocomplete = hasVault
    ? "current-password"
    : "new-password";
}

async function handleSetupSubmit(event) {
  event.preventDefault();
  const phrase = elements.phraseInput.value;
  const vault = getVault();
  setButtonBusy(
    elements.unlockButton,
    true,
    vault ? "РАСШИФРОВКА…" : "ПРОВЕРКА…",
  );
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
        throw new Error(
          "Вставь GitHub token, который начинается с github_pat_.",
        );
      }
      if (phrase.length < 14)
        throw new Error("Секретная фраза должна быть длиннее 14 символов.");
      if (phrase !== confirmation)
        throw new Error("Секретные фразы не совпадают.");
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

/* -------------------------------------------------------------------------- */
/* JSON save actions                                                           */
/* -------------------------------------------------------------------------- */

async function handleSaveHome() {
  const button = document.querySelector("#save-home");
  setButtonBusy(button, true);
  try {
    state.site = collectFields(elements.homeForm, clone(state.site));
    await writeJson(
      "content/site.json",
      state.site,
      "Update portfolio home content",
    );
    showNotice(
      "Главная сохранена. GitHub Pages обновится автоматически.",
      "success",
    );
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

async function handleSaveProject() {
  const button = document.querySelector("#save-project");
  const currentIndex = state.projects.findIndex(
    (project) => project.slug === state.selectedProject,
  );
  if (currentIndex < 0) return;
  setButtonBusy(button, true);
  try {
    const project = collectFields(
      elements.projectForm,
      clone(state.projects[currentIndex]),
    );
    if (!project.title.trim())
      throw new Error("У проекта должно быть название.");
    state.projects[currentIndex] = project;
    if (!state.projectIndex.includes(project.slug))
      state.projectIndex.push(project.slug);
    await writeJson(
      `content/projects/${project.slug}.json`,
      project,
      `Update ${project.title}`,
    );
    await writeJson(
      "content/projects/index.json",
      state.projectIndex,
      "Update portfolio project index",
    );
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
  showNotice(
    "Новый проект создан локально. Заполни поля и нажми «Сохранить проект».",
  );
}

async function handleArchiveProject() {
  const project = state.projects.find(
    (item) => item.slug === state.selectedProject,
  );
  if (!project) return;
  if (
    !window.confirm(
      `Убрать ${project.title} с сайта? JSON-файл останется в репозитории.`,
    )
  )
    return;
  const button = document.querySelector("#archive-project-button");
  setButtonBusy(button, true, "ОБНОВЛЕНИЕ…");
  try {
    state.projectIndex = state.projectIndex.filter(
      (slug) => slug !== project.slug,
    );
    state.projects = state.projects.filter(
      (item) => item.slug !== project.slug,
    );
    state.selectedProject = state.projects[0]?.slug || "";
    await writeJson(
      "content/projects/index.json",
      state.projectIndex,
      `Archive ${project.title} from portfolio`,
    );
    renderProjectForm();
    renderGallery();
    showNotice(
      `${project.title} убран с сайта. Его JSON-файл сохранён.`,
      "success",
    );
  } catch (error) {
    showNotice(formatError(error), "error", true);
  } finally {
    setButtonBusy(button, false);
  }
}

/* -------------------------------------------------------------------------- */
/* Media uploads                                                               */
/* -------------------------------------------------------------------------- */

async function handleProjectCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const project = state.projects.find(
    (item) => item.slug === state.selectedProject,
  );
  if (!project) return;
  const extension = extensionFromFile(file);
  const path = `media/projects/${project.slug}/cover.${extension}`;
  showNotice(`Загружаю ${file.name}…`, "info", true);
  try {
    await uploadFile(path, file, `Upload cover for ${project.title}`);
    project.coverUrl = path;
    project.mediaType = mediaTypeFromFile(file);
    renderProjectForm();
    showNotice(
      "Обложка загружена. Нажми «Сохранить проект», чтобы привязать её.",
      "success",
    );
  } catch (error) {
    showNotice(formatError(error), "error", true);
  }
}

async function handleSaveSkills() {
  const button = document.querySelector("#save-skills");
  setButtonBusy(button, true);
  try {
    collectSkills();
    await writeJson(
      "content/skills.json",
      state.skills,
      "Update portfolio skills",
    );
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
    await writeJson(
      "content/experiments.json",
      state.experiments,
      "Update portfolio experiments",
    );
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
    await writeJson(
      "content/experiments.json",
      state.experiments,
      `Attach media to ${experiment.title}`,
    );
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
    await writeJson(
      "content/gallery.json",
      state.gallery,
      "Update portfolio gallery",
    );
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
    await writeJson(
      "content/gallery.json",
      state.gallery,
      "Add portfolio gallery media",
    );
    renderGallery();
    event.target.value = "";
    showNotice(
      "Медиа загружено и добавлено в галерею. Подписи можно изменить ниже.",
      "success",
    );
  } catch (error) {
    showNotice(formatError(error), "error", true);
  }
}

/* -------------------------------------------------------------------------- */
/* Refresh and security actions                                                */
/* -------------------------------------------------------------------------- */

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
  showNotice(
    "Локальный доступ удалён. Токен можно отдельно отозвать в настройках GitHub.",
    "success",
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* One-time event wiring and application start                                 */
/* -------------------------------------------------------------------------- */

function bindStaticEvents() {
  elements.setupForm.addEventListener("submit", handleSetupSubmit);
  elements.resetVaultButton.addEventListener("click", forgetAccess);
  document
    .querySelector("#forget-access-button")
    .addEventListener("click", forgetAccess);
  document.querySelector("#lock-button").addEventListener("click", showLock);
  document
    .querySelector("#reload-button")
    .addEventListener("click", reloadContent);
  document
    .querySelector("#save-home")
    .addEventListener("click", handleSaveHome);
  document
    .querySelector("#save-project")
    .addEventListener("click", handleSaveProject);
  document
    .querySelector("#new-project-button")
    .addEventListener("click", handleNewProject);
  document
    .querySelector("#archive-project-button")
    .addEventListener("click", handleArchiveProject);
  document
    .querySelector("#save-skills")
    .addEventListener("click", handleSaveSkills);
  document.querySelector("#save-lab").addEventListener("click", handleSaveLab);
  document
    .querySelector("#save-gallery")
    .addEventListener("click", handleSaveGallery);
  document
    .querySelector("#change-phrase-button")
    .addEventListener("click", changePhrase);
  document
    .querySelector("#gallery-upload")
    .addEventListener("change", handleGalleryUpload);
  document.querySelector("#add-skill").addEventListener("click", () => {
    collectSkills();
    state.skills.push({
      id: `skill-${Date.now()}`,
      name: "New skill",
      level: 3,
      note: { en: "", ru: "" },
    });
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
    const current = state.projects.find(
      (project) => project.slug === state.selectedProject,
    );
    if (current) collectFields(elements.projectForm, current);
    state.selectedProject = elements.projectSelect.value;
    renderProjectForm();
  });
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-section]")
        .forEach((item) => item.classList.toggle("is-active", item === button));
      document
        .querySelectorAll("[data-panel]")
        .forEach((panel) =>
          panel.classList.toggle(
            "is-active",
            panel.dataset.panel === button.dataset.section,
          ),
        );
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

configureEditorCallbacks({
  handleLabUpload,
  handleProjectCoverUpload,
});

bindStaticEvents();
configureLockScreen();
