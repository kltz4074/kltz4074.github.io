import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { createStage } from './stage';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const hero = document.querySelector<HTMLElement>('[data-hero]');
const canvas = hero?.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
const still = hero?.querySelector<HTMLImageElement>('[data-stage-still]');
const reelLink = hero?.querySelector<HTMLAnchorElement>('[data-reel-link]');
const reelTitle = hero?.querySelector<HTMLElement>('[data-reel-title]');
const shots = [...document.querySelectorAll<HTMLElement>('[data-shot]')];
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = window.matchMedia('(pointer: coarse)');
type Stage = Awaited<ReturnType<typeof createStage>>;
let stage: Stage;
let view: gsap.Context | undefined;
let epoch = 0;
let progress = 0;
let active = 0;
let introPlayed = false;
let pageActive = true;
let lenis: Lenis | undefined;
let canvasUsed = false;
let stageObserver: IntersectionObserver | undefined;

const tick = (time: number) => lenis?.raf(time * 1000);
const reduced = () => root.hasAttribute('data-reduced') || preference.matches;
const russian = () => root.lang === 'ru';

if (shots.length > 1) {
  shots[0].parentElement!.hidden = false;
  shots.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (active === index || !still || !reelLink || !reelTitle) return;
      shots[active].setAttribute('aria-pressed', 'false');
      active = index;
      hero?.setAttribute("data-active", String(index));
      still.src = button.dataset.shot!;
      reelLink.href = button.dataset.url!;
      reelTitle.textContent = button.dataset.title!;
      button.setAttribute('aria-pressed', 'true');
      stage?.select(index);
      if (!reduced()) gsap.fromTo(reelTitle, { y: 7, opacity: .55 }, { y: 0, opacity: 1, duration: .26, overwrite: true, clearProps: 'transform,opacity' });
    });
  });
}

hero?.addEventListener('pointermove', event => {
  if (!stage || event.pointerType === 'touch') return;
  const box = hero.getBoundingClientRect();
  stage.pointer((event.clientX - box.left) / box.width * 2 - 1, 1 - (event.clientY - box.top) / box.height * 2);
}, { passive: true });
hero?.addEventListener('pointerleave', () => stage?.pointer(0, 0));

function tearDown() {
  epoch += 1;
  stageObserver?.disconnect();
  view?.revert();
  view = undefined;
  gsap.ticker.remove(tick);
  lenis?.destroy();
  lenis = undefined;
  stage?.dispose();
  stage = undefined;
}

function configureMotion() {
  tearDown();
  if (reduced() || !pageActive) return;
  if (!coarsePointer.matches) {
    lenis = new Lenis({ lerp: .115, anchors: { offset: -15 }, stopInertiaOnNavigate: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
  }

  view = gsap.context(() => {
    if (hero && !introPlayed && !location.hash && window.scrollY < 70) {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from('.hero-title > span', { y: 30, duration: .82, clearProps: 'transform' })
        .from('.hero-intro, .hero-scroll', { y: 13, opacity: .4, duration: .63, stagger: .05, clearProps: 'transform,opacity' }, .11);
      introPlayed = true;
    }

    if (hero) {
      gsap.timeline({ scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom 22%', scrub: .28,
        onUpdate: self => { progress = self.progress; stage?.scroll(progress); },
      }, defaults: { ease: 'none' } })
        .to('.hero-type', { y: -34, opacity: .48 }, 0)
        .to('.hero-visual', { y: 39 }, 0);
    }

    if (document.querySelector('.work-word > span')) {
      gsap.from('.work-word > span', {
        y: 19, opacity: .74, ease: 'none',
        scrollTrigger: { trigger: '.work', start: 'top 88%', end: 'top 62%', scrub: true },
      });
    }
    document.querySelectorAll<HTMLElement>('.project-media').forEach(media => {
      const reel = media.querySelector('.project-reel');
      if (!reel) return;
      gsap.timeline({
        scrollTrigger: { trigger: media, start: 'top 97%', end: 'top 46%', scrub: .2 },
        defaults: { ease: 'none' },
      }).from(media, { clipPath: 'inset(0% 0% 13% 0%)' }, 0)
        .from(reel, { scale: 1.12, yPercent: 2 }, 0);
    });
    if (document.querySelector('.contact-title-line')) {
      gsap.from('.contact-title-line', {
        yPercent: 78, duration: .7, ease: 'expo.out', clearProps: 'transform',
        scrollTrigger: { trigger: '.contact-title-mask', start: 'clamp(top 95%)', once: true },
      });
    }

    const unregister: Array<() => void> = [];
    if (!coarsePointer.matches) {
      for (const arrow of document.querySelectorAll<HTMLElement>('.action .arrow')) {
        const link = arrow.parentElement!;
        const x = gsap.quickTo(arrow, 'x', { duration: .25 });
        const y = gsap.quickTo(arrow, 'y', { duration: .25 });
        const move = (event: PointerEvent) => {
          const box = link.getBoundingClientRect();
          x(gsap.utils.clamp(-6, 6, (event.clientX - box.left - box.width / 2) * .08));
          y(gsap.utils.clamp(-4, 4, (event.clientY - box.top - box.height / 2) * .2));
        };
        const leave = () => { x(0); y(0); };
        link.addEventListener('pointermove', move);
        link.addEventListener('pointerleave', leave);
        unregister.push(() => {
          link.removeEventListener('pointermove', move);
          link.removeEventListener('pointerleave', leave);
        });
      }
    }
    return () => unregister.forEach(cleanup => cleanup());
  });

  if (canvas && shots.length && !canvasUsed) {
    const request = epoch;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || request !== epoch) return;
      observer.disconnect();
      window.requestIdleCallback?.(loadStage, { timeout: 480 }) ?? window.setTimeout(loadStage, 90);
    });
    const loadStage = async () => {
      if (request !== epoch || canvasUsed) return;
      canvasUsed = true;
      try {
        const { createStage } = await import('./stage');
        if (request !== epoch) return;
        const rendered = await createStage(canvas, shots.map(shot => shot.dataset.shot!), active);
        if (request === epoch) {
          stage = rendered;
          stage?.select(active);
          stage?.scroll(progress);
        } else {
          rendered?.dispose();
        }
      } catch { /* The still-image preview also supports browsing projects. */ }
      finally {
        canvasUsed = false;
        if (request !== epoch && !reduced() && pageActive) configureMotion();
      }
    };
    if (hero) observer.observe(hero);
    stageObserver?.disconnect();
    stageObserver = observer;
  }
  ScrollTrigger.refresh();
}

for (const gallery of document.querySelectorAll<HTMLElement>('[data-gallery]')) {
  const controls = gallery.querySelector<HTMLElement>('.frame-picker');
  const live = gallery.querySelector<HTMLElement>('[data-frame-status]');
  if (!controls || !live) continue;
  const buttons = [...controls.querySelectorAll('button')];
  const images = [...gallery.querySelectorAll('img')];
  let current = 0;
  let revision = 0;
  let swap: gsap.core.Tween | undefined;
  controls.hidden = false;

  buttons.forEach((button, index) => button.addEventListener('click', async () => {
    const request = ++revision;
    if (index === current) return;
    const incoming = images[index];
    incoming.loading = 'eager';
    try {
      await incoming.decode();
    } catch {
      if (request === revision) live.textContent = russian() ? 'Кадр не загрузился.' : 'The image could not load.';
      return;
    }
    if (request !== revision) return;
    swap?.progress(1);

    const outgoing = images[current];
    const finish = () => {
      outgoing.hidden = true;
      outgoing.classList.remove('frame-outgoing');
      outgoing.removeAttribute('aria-hidden');
    };
    buttons[current].setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    outgoing.setAttribute('aria-hidden', 'true');
    incoming.hidden = false;
    current = index;
    live.textContent = russian() ? `Кадр ${index + 1} из ${images.length}.` : `Image ${index + 1} of ${images.length}. ${incoming.alt}.`;
    if (reduced()) {
      finish();
    } else {
      outgoing.classList.add('frame-outgoing');
      swap = gsap.to(outgoing, { clipPath: 'inset(0 0 0 100%)', duration: .44, ease: 'power3.inOut', clearProps: 'clipPath', onComplete: finish });
    }
  }));
}

document.addEventListener('portfolio:motion', configureMotion);
document.addEventListener('portfolio:language', () => ScrollTrigger.refresh());
coarsePointer.addEventListener('change', configureMotion);
window.addEventListener('pagehide', () => {
  pageActive = false;
  tearDown();
});
window.addEventListener('pageshow', event => {
  pageActive = true;
  if (event.persisted) configureMotion();
});
configureMotion();
document.fonts.ready.then(() => ScrollTrigger.refresh());
