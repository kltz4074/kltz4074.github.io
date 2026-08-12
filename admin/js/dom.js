/**
 * Cached DOM references and small UI-feedback helpers.
 * No GitHub or content logic belongs in this module.
 */
export const elements = {
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

export function showNotice(message, type = "info", persist = false) {
  window.clearTimeout(noticeTimer);
  const target = elements.adminShell.hidden
    ? elements.lockNotice
    : elements.notice;
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

export function formatError(error) {
  if (error?.status === 401)
    return "GitHub отклонил токен. Проверь его срок действия и подключи доступ заново.";
  if (error?.status === 403)
    return "У токена нет права Contents: Read and write для этого репозитория.";
  if (error?.status === 409)
    return "Файл изменился на GitHub после загрузки админки. Нажми «Обновить данные» и повтори изменение.";
  if (error?.status === 422)
    return "GitHub не принял изменение. Проверь имя файла, данные и права токена.";
  return error?.message || "Неизвестная ошибка";
}

export function setButtonBusy(button, busy, busyText = "СОХРАНЕНИЕ…") {
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
