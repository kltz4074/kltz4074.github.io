const root = document.documentElement;
const system = matchMedia('(prefers-reduced-motion: reduce)');
const motion = document.querySelector<HTMLButtonElement>('[data-motion]');
let personal = false;
try { personal = localStorage.getItem('kltzqu-reduced-motion') === 'true'; } catch { /* Optional preference. */ }

function updateMotion() {
  root.toggleAttribute('data-reduced', system.matches || personal);
  if (motion) {
    motion.setAttribute('aria-pressed', String(system.matches || personal));
    motion.disabled = system.matches;
    motion.hidden = false;
  }
  document.dispatchEvent(new Event('portfolio:motion'));
}

motion?.addEventListener('click', () => {
  personal = !personal;
  try { localStorage.setItem('kltzqu-reduced-motion', String(personal)); } catch { /* Optional preference. */ }
  updateMotion();
});
system.addEventListener('change', updateMotion);
updateMotion();

const header = document.querySelector<HTMLElement>('[data-menu-header]');
const trigger = header?.querySelector<HTMLButtonElement>('[data-menu-button]');
const menu = header?.querySelector('nav');
if (header && trigger && menu) {
  let open = false;
  let entrance: Animation | undefined;
  header.setAttribute('data-menu-ready', '');

  function show(value: boolean) {
    open = value;
    header!.toggleAttribute('data-menu-open', value);
    trigger!.setAttribute('aria-expanded', String(value));
    entrance?.cancel();
    if (value && !root.hasAttribute('data-reduced')) {
      entrance = menu!.animate([{ opacity: .45, transform: 'translateY(-7px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 210, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  }

  trigger.addEventListener('click', () => show(!open));
  menu.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('a') && open) show(false);
  });
  header.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !open) return;
    show(false);
    trigger.focus();
  });
  document.addEventListener('pointerdown', event => {
    if (open && !header.contains(event.target as Node)) show(false);
  });
}

export {};
