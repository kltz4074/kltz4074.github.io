const root = document.documentElement;
const selector = document.querySelector<HTMLSelectElement>('[data-language]');
const translations = [...document.querySelectorAll('[data-copy]')].map(node => {
  const target = node.querySelector('[data-copy-value]')!;
  const templates = new Map([...node.querySelectorAll('template')].map(template => [template.dataset.lang, template.content]));
  const original = document.createDocumentFragment();
  target.childNodes.forEach(child => original.append(child.cloneNode(true)));
  return { target, templates, original };
});
const attributes = [...document.querySelectorAll<HTMLElement>('[data-label-ru], [data-placeholder-ru]')].map(node => ({
  node,
  label: node.getAttribute('aria-label'),
  placeholder: node.getAttribute('placeholder'),
}));

const options = [...document.querySelectorAll<HTMLOptionElement>('option[data-option-ru]')].map(option => ({
  option,
  english: option.textContent,
}));

function displayLanguage(language: string) {
  root.lang = language;
  for (const { target, templates, original } of translations) {
    const translation = templates.get(language);
    target.replaceChildren((translation ?? original).cloneNode(true));
    if (translation || language === 'en') target.removeAttribute('lang');
    else target.setAttribute('lang', 'en');
  }
  for (const { node, label, placeholder } of attributes) {
    if (label) node.setAttribute('aria-label', (language === 'ru' ? node.dataset.labelRu : label) || label);
    if (placeholder) node.setAttribute('placeholder', (language === 'ru' ? node.dataset.placeholderRu : placeholder) || placeholder);
  }
  for (const { option, english } of options) {
    option.textContent = language === 'ru' ? option.dataset.optionRu! : english;
  }
  document.dispatchEvent(new Event('portfolio:language'));
}

if (selector) {
  let transition: Animation | undefined;
  try {
    const language = localStorage.getItem('portfolio-language');
    if (language && [...selector.options].some(option => option.value === language)) selector.value = language;
  } catch { /* The selector also works without storage. */ }
  displayLanguage(selector.value);
  selector.addEventListener('change', () => {
    displayLanguage(selector.value);
    try { localStorage.setItem('portfolio-language', selector.value); } catch { /* Optional preference. */ }
    transition?.cancel();
    if (!root.hasAttribute('data-reduced')) {
      transition = document.querySelector('main')?.animate([{ opacity: .72 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
  });
}

export {};
