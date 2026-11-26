import { markdown } from '../lib/markdown';

export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function button(label: string, action: () => void | Promise<void>) {
  const control = node('button', label);
  control.type = 'button';
  control.addEventListener('click', () => void action());
  return control;
}

export function group(label: string) {
  const fieldset = node('fieldset');
  fieldset.append(node('legend', label));
  return fieldset;
}

export function clearPreview(preview: HTMLElement, source: string) {
  const template = node('template');
  template.innerHTML = markdown(source);
  for (const image of template.content.querySelectorAll('img')) {
    if (!image.getAttribute('src')?.startsWith('/media/')) image.remove();
  }
  for (const anchor of template.content.querySelectorAll('a')) {
    anchor.removeAttribute('href');
  }
  preview.replaceChildren(template.content);
}

type FieldOptions = { multiline?: boolean; type?: string; options?: string[]; rich?: boolean; list?: string };
export function field(label: string, value: string, update: (value: string) => void, config: FieldOptions = {}) {
  const container = node('label');
  container.className = 'field';
  const input = config.options ? node('select') : config.multiline ? node('textarea') : node('input');
  if (input instanceof HTMLInputElement) {
    input.type = config.type ?? 'text';
    if (config.list) input.setAttribute('list', config.list);
  }
  if (input instanceof HTMLSelectElement) {
    for (const option of new Set([value, ...config.options ?? []])) {
      const item = node('option', option || 'None');
      item.value = option;
      input.append(item);
    }
  }
  input.value = value;
  container.append(node('span', label), input);
  input.addEventListener('input', () => update(input.value));
  if (!config.rich || !(input instanceof HTMLTextAreaElement)) return container;

  const section = node('div');
  const actions = node('div');
  actions.className = 'actions';
  for (const [name, prefix, suffix, sample] of [
    ['Heading', '## ', '', 'Heading'], ['Bold', '**', '**', 'text'], ['List', '- ', '', 'item'],
    ['Quote', '> ', '', 'quote'], ['Code', '\n```\n', '\n```\n', 'code'],
    ['Table', '\n', '\n', '| Column | Column |\n| --- | --- |\n| Value | Value |'],
    ['Link', '[', '](https://)', 'label'], ['Image', '![', '](/media/)', 'alt text'],
  ]) {
    actions.append(button(name, () => {
      const selection = input.value.slice(input.selectionStart, input.selectionEnd);
      input.setRangeText(prefix + (selection || sample) + suffix, input.selectionStart, input.selectionEnd, 'end');
      input.dispatchEvent(new Event('input'));
      input.focus();
    }));
  }
  const preview = node('div');
  preview.className = 'preview';
  preview.hidden = true;
  actions.append(button('Preview Markdown', () => {
    preview.hidden = !preview.hidden;
    clearPreview(preview, input.value);
  }));
  input.addEventListener('input', () => { if (!preview.hidden) clearPreview(preview, input.value); });
  section.append(container, actions, preview);
  return section;
}

export function checkbox(label: string, value: boolean, update: (value: boolean) => void) {
  const container = node('label');
  container.className = 'field check';
  const input = node('input');
  input.type = 'checkbox';
  input.checked = value;
  input.addEventListener('change', () => update(input.checked));
  container.append(input, node('span', label));
  return container;
}

export function actions(...controls: HTMLElement[]) {
  const bar = node('div');
  bar.className = 'actions';
  bar.append(...controls);
  return bar;
}
