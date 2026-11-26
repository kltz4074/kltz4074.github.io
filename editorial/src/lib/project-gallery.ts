import gsap from 'gsap';

const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const reduced = () => systemMotion.matches || document.documentElement.hasAttribute('data-reduced');

for (const windowElement of document.querySelectorAll<HTMLElement>('[data-tilt]')) {
  const media = windowElement.querySelector<HTMLElement>('.project-media')!;
  const rotateX = gsap.quickTo(media, 'rotationX', { duration: .48, ease: 'power3.out' });
  const rotateY = gsap.quickTo(media, 'rotationY', { duration: .48, ease: 'power3.out' });
  const settle = () => {
    rotateX(0);
    rotateY(0);
  };

  windowElement.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !mouse.matches || reduced()) return;
    const area = windowElement.getBoundingClientRect();
    const x = gsap.utils.clamp(-1, 1, (event.clientX - area.left) * 2 / area.width - 1);
    const y = gsap.utils.clamp(-1, 1, (event.clientY - area.top) * 2 / area.height - 1);
    rotateX(-y * 6);
    rotateY(x * 8);
  }, { passive: true });
  windowElement.addEventListener('pointerleave', settle);
  windowElement.addEventListener('pointercancel', settle);
  document.addEventListener('portfolio:motion', () => {
    if (!reduced()) return;
    rotateX.tween.pause();
    rotateY.tween.pause();
    gsap.set(media, { rotationX: 0, rotationY: 0 });
  });
}

for (const gallery of document.querySelectorAll<HTMLElement>('[data-gallery]')) {
  const controls = gallery.querySelector<HTMLElement>('.frame-picker');
  const live = gallery.querySelector<HTMLElement>('[data-frame-status]');
  const link = gallery.querySelector<HTMLAnchorElement>('.project-media')!;
  if (!controls || !live) continue;
  const buttons = [...controls.querySelectorAll('button')];
  const frames = [...gallery.querySelectorAll<HTMLElement>('.project-frame')];
  let current = 0;
  let revision = 0;
  let swap: gsap.core.Timeline | undefined;
  controls.hidden = false;

  async function select(index: number) {
    const request = ++revision;
    if (index === current) return;
    const incoming = frames[index];
    const image = incoming.querySelector('img')!;
    image.loading = 'eager';
    try {
      await image.decode();
    } catch {
      if (request === revision) live!.textContent = document.documentElement.lang === 'ru' ? 'Кадр не загрузился.' : 'The image could not load.';
      return;
    }
    if (swap) await swap;
    if (request !== revision) return;

    const outgoing = frames[current];
    const forward = index > current;
    buttons[current].setAttribute('aria-pressed', 'false');
    buttons[index].setAttribute('aria-pressed', 'true');
    outgoing.setAttribute('aria-hidden', 'true');
    incoming.hidden = false;
    current = index;
    const ru = document.documentElement.lang === 'ru';
    const description = ru ? `Кадр ${index + 1} из ${frames.length}` : `Image ${index + 1} of ${frames.length}: ${image.alt}`;
    live!.textContent = description;
    if (link.hasAttribute('data-lightbox')) {
      link.href = image.currentSrc || image.src;
      link.setAttribute('aria-label', description);
    }

    function finish() {
      outgoing.hidden = true;
      outgoing.removeAttribute('aria-hidden');
      incoming.classList.remove('frame-incoming');
      swap = undefined;
    }

    if (reduced()) {
      finish();
      return;
    }

    // Keep a complete frame beneath the incoming mask for the entire transition.
    incoming.classList.add('frame-incoming');
    const mask = forward ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
    swap = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finish })
      .fromTo(incoming, { clipPath: mask }, { clipPath: 'inset(0 0 0 0)', duration: .51, clearProps: 'clipPath' }, 0)
      .fromTo(image, { scale: 1.088, xPercent: forward ? 3 : -3 }, { scale: 1, xPercent: 0, duration: .57, clearProps: 'transform' }, 0);
  }

  buttons.forEach((button, index) => button.addEventListener('click', () => void select(index)));
  controls.addEventListener('keydown', event => {
    const focused = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (focused < 0 || !direction) return;
    event.preventDefault();
    const index = (focused + direction + buttons.length) % buttons.length;
    buttons[index].focus();
    void select(index);
  });
  document.addEventListener('portfolio:motion', () => {
    if (reduced()) swap?.progress(1);
  });
}
