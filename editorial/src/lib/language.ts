const selector = document.querySelector<HTMLSelectElement>('[data-language]');
const translations = [...document.querySelectorAll('[data-copy]')].map(node => {
  const target = node.querySelector('[data-copy-value]')!;
  const templates = new Map([...node.querySelectorAll('template')].map(template => [template.dataset.lang, template.content]));
  const original = document.createDocumentFragment();
  target.childNodes.forEach(child => original.append(child.cloneNode(true)));
  return { target, templates, original };
});

function displayLanguage(language: string) {
  for (const { target, templates, original } of translations) {
    const translation = templates.get(language);
    target.replaceChildren((translation ?? original).cloneNode(true));
    target.setAttribute('lang', translation ? language : 'en');
  }
}

if (selector) {
  try {
    const language = localStorage.getItem('portfolio-language');
    if ([...selector.options].some(option => option.value === language)) selector.value = language!;
  } catch { /* The selector also works without storage. */ }
  displayLanguage(selector.value);
  selector.addEventListener('change', () => {
    displayLanguage(selector.value);
    try { localStorage.setItem('portfolio-language', selector.value); } catch { /* Optional preference. */ }
  });
}
