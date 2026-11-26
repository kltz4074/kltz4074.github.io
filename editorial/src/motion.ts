import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const preferenceKey = 'kltzqu-reduced-motion';
const motionToggle = document.querySelector<HTMLButtonElement>('.motion-toggle');

let reduceMotion = false;
try {
  reduceMotion = localStorage.getItem(preferenceKey) === 'true';
} catch {
  // The control still works for this visit when storage is unavailable.
}

let motion: gsap.MatchMedia | undefined;
let introPlayed = false;

function updateMotion() {
  const isReduced = systemMotion.matches || reduceMotion;
  document.documentElement.toggleAttribute('data-reduced', isReduced);
  motionToggle?.setAttribute('aria-pressed', String(isReduced));
  if (motionToggle) {
    motionToggle.textContent = systemMotion.matches ? 'Reduced motion (system)' : 'Reduce motion';
    motionToggle.disabled = systemMotion.matches;
    motionToggle.hidden = false;
  }

  motion?.revert();
  motion = undefined;
  if (isReduced) return;

  motion = gsap.matchMedia();
  motion.add('(min-width: 0px)', () => {
    let split: SplitText | undefined;
    const heroName = document.querySelector('.hero-name');
    if (!introPlayed && heroName && window.scrollY < 80 && !location.hash) {
      // Split only the alias. The enclosing h1 supplies one accessible name.
      split = SplitText.create(heroName, { type: 'chars', aria: 'none' });
      const titlePieces = [...split.chars, '.hero-period'];
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
      intro.addLabel('title')
        .from(titlePieces, { yPercent: 120, skewY: 7, duration: 0.94, stagger: .042 }, 'title')
        .from('.hero-art-frame', { scale: 1.08, duration: 1.1, clearProps: 'transform' }, 'title+=.03')
        .from('.hero-art-line', { scaleX: .975, scaleY: .94, opacity: .25, duration: .82 }, 'title+=.12')
        .eventCallback('onComplete', () => split?.revert());
      introPlayed = true;
    }

    const workWords = gsap.utils.toArray<HTMLElement>('.work-word > span');
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.work', start: 'top 95%', end: 'top 43%', scrub: .35 },
    })
      .from(workWords, { yPercent: 105, stagger: .11, duration: .68 }, .18);

    gsap.from('.contact-title-line', {
      yPercent: 105,
      duration: .92,
      ease: 'power4.out',
      clearProps: 'transform',
      scrollTrigger: { trigger: '.contact-title-mask', start: 'clamp(top 91%)', once: true },
    });

    document.querySelectorAll<HTMLElement>('.project-media').forEach((frame) => {
      const reel = frame.querySelector<HTMLElement>('.project-reel');
      if (!reel) return;
      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: frame, start: 'clamp(top 88%)', once: true },
      })
        .from(frame, { clipPath: 'inset(0% 0% 12% 0%)', duration: .78, clearProps: 'clipPath' }, 0)
        .from(reel, { scale: 1.065, duration: .94, clearProps: 'transform' }, 0);
    });

    return () => split?.revert();
  });

  motion.add('(min-width: 701px)', () => {
    const handoff = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 23%', scrub: .45 },
    });
    handoff.addLabel('travel')
      .to('.hero-title', { yPercent: 22, scale: .78 }, 'travel')
      .to('.hero-intro', { y: -36 }, 'travel')
      .to('.hero-art img', { scale: 1.13, yPercent: 4 }, 'travel');
  });

  motion.add('(hover: hover) and (pointer: fine)', () => {
    const cleanups = gsap.utils.toArray<HTMLElement>('.action').map((link) => {
      const arrow = link.querySelector<HTMLElement>('.arrow');
      if (!arrow) return () => {};
      const x = gsap.quickTo(arrow, 'x', { duration: .34, ease: 'power3.out' });
      const y = gsap.quickTo(arrow, 'y', { duration: .34, ease: 'power3.out' });
      let bounds: DOMRect;
      const enter = () => { bounds = link.getBoundingClientRect(); };
      const move = (event: PointerEvent) => {
        if (!bounds) return;
        x(gsap.utils.clamp(-7, 7, (event.clientX - bounds.left - bounds.width / 2) * .09));
        y(gsap.utils.clamp(-5, 5, (event.clientY - bounds.top - bounds.height / 2) * .17));
      };
      const leave = () => { x(0); y(0); };
      link.addEventListener('pointerenter', enter);
      link.addEventListener('pointermove', move);
      link.addEventListener('pointerleave', leave);
      return () => {
        link.removeEventListener('pointerenter', enter);
        link.removeEventListener('pointermove', move);
        link.removeEventListener('pointerleave', leave);
        gsap.set(arrow, { clearProps: 'transform' });
      };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  });
}

motionToggle?.addEventListener('click', () => {
  reduceMotion = !reduceMotion;
  try { localStorage.setItem(preferenceKey, String(reduceMotion)); } catch { /* Optional persistence. */ }
  updateMotion();
});
systemMotion.addEventListener('change', updateMotion);

document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
  const controls = gallery.querySelector<HTMLElement>('.frame-picker');
  const status = gallery.querySelector<HTMLElement>('[data-frame-status]');
  if (!controls || !status) return;
  const buttons = [...controls.querySelectorAll('button')];
  const images = [...gallery.querySelectorAll('img')];
  let active = 0;
  let selection = 0;
  let swap: gsap.core.Tween | undefined;
  controls.hidden = false;

  buttons.forEach((button, index) => {
    button.addEventListener('click', async () => {
      const request = ++selection;
      if (index === active) return;
      const incoming = images[index];
      incoming.loading = 'eager';
      try {
        await incoming.decode();
      } catch {
        if (request === selection) status.textContent = 'The still could not load.';
        return;
      }
      if (request !== selection) return;
      swap?.progress(1);

      const outgoing = images[active];
      outgoing.setAttribute('aria-hidden', 'true');
      incoming.hidden = false;
      buttons[active].setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      active = index;
      status.textContent = `Still ${index + 1} of ${images.length}. ${incoming.alt}.`;

      const finish = () => {
        outgoing.hidden = true;
        outgoing.classList.remove('frame-outgoing');
        outgoing.removeAttribute('aria-hidden');
      };
      if (systemMotion.matches || reduceMotion) {
        finish();
        return;
      }

      outgoing.classList.add('frame-outgoing');
      swap = gsap.to(outgoing, {
        clipPath: 'inset(0% 0% 0% 100%)',
        duration: .58,
        ease: 'power3.inOut',
        clearProps: 'clipPath',
        onComplete: finish,
      });
    });
  });
});

function initialize() {
  try {
    updateMotion();
    ScrollTrigger.refresh();
  } finally {
    document.documentElement.removeAttribute('data-intro-pending');
  }
}

if (document.fonts.check('650 16px "Instrument Sans"')) {
  initialize();
} else {
  Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 400))])
    .then(initialize);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
