import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { createStage } from './stage';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const hero = document.querySelector<HTMLElement>('[data-hero]');
const canvas = hero?.querySelector<HTMLCanvasElement>('[data-stage-canvas]');
let still = hero?.querySelector<HTMLImageElement>('[data-stage-still]');
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

if (shots.length > 1) {
  shots[0].parentElement!.hidden = false;
  shots.forEach((button, index) => {
    button.addEventListener('click', () => {
      if (active === index || !still || !reelLink || !reelTitle) return;
      shots[active].setAttribute('aria-pressed', 'false');
      active = index;
      hero?.setAttribute('data-light', button.dataset.light!);
      const image = still.cloneNode() as HTMLImageElement;
      image.src = button.dataset.shot!;
      void image.decode().then(() => {
        if (active !== index || !still) return;
        still.replaceWith(image);
        still = image;
      }).catch(() => {});
      reelLink.href = button.dataset.url!;
      reelTitle.textContent = button.dataset.title!;
      button.setAttribute('aria-pressed', 'true');
      void stage?.select(index);
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
    const title = hero?.querySelector('.hero-title > span');
    if (title && !introPlayed && !location.hash && window.scrollY < 70) {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(title, { y: 15, duration: .55, clearProps: 'transform' }, 0)
        .from('.hero-stage', { y: 18, duration: .68, clearProps: 'transform' }, .04)
        .from('.hero-intro, .hero-scroll, .hero-reel', { y: 10, duration: .5, stagger: .048, clearProps: 'transform' }, .1);
      introPlayed = true;
    }

    if (hero) {
      const cameraTravel = { value: 0 };
      gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 22%', scrub: .28 },
        defaults: { ease: 'none' },
      })
        .to('.hero-type', { y: -32 }, 0)
        .to('.hero-visual', { y: 36, scale: .974 }, 0)
        .to(cameraTravel, {
          value: 1,
          onUpdate: () => {
            progress = cameraTravel.value;
            stage?.scroll(progress);
          },
        }, 0);
    }

    if (document.querySelector('.work-word > span')) {
      gsap.from('.work-word > span', {
        y: 15, ease: 'none',
        scrollTrigger: { trigger: '.work', start: 'top 88%', end: 'top 62%', scrub: true },
      });
    }
    document.querySelectorAll<HTMLElement>('.work .project-media').forEach(media => {
      const windowElement = media.parentElement!;
      const reel = media.querySelector('.project-reel');
      if (!reel) return;
      const article = media.closest('.project')!;
      const side = article.classList.contains('project--reverse') ? -1 : 1;
      gsap.timeline({
        scrollTrigger: { trigger: media, start: 'top 98%', end: 'top 48%', scrub: .24 },
        defaults: { ease: 'none' },
      }).from(reel, { scale: 1.095, xPercent: side * 1.8, yPercent: 1.5 }, 0)
        .from(windowElement, { y: 22 }, 0);
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
          void stage?.select(active);
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
