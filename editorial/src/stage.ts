import {
  BoxGeometry, Color, Group, HemisphereLight, MathUtils, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Scene,
  SRGBColorSpace, Texture, TextureLoader, WebGLRenderer,
} from 'three';

const frameWidth = 6.5;
const frameHeight = 3.68;
const lightTints = [0xe9efb4, 0xffc88a, 0xb7c9e0];

export async function createStage(canvas: HTMLCanvasElement, sources: string[], initial: number) {
  const stage = canvas.parentElement!;
  const context = canvas.getContext('webgl2', { powerPreference: 'low-power', alpha: true, antialias: window.devicePixelRatio < 2 });
  if (!context) return;

  const renderer = new WebGLRenderer({ canvas, context, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, .1, 40);
  const shell = new BoxGeometry(frameWidth, frameHeight, .17);
  const aperture = new PlaneGeometry(frameWidth - .2, frameHeight - .2);
  const loader = new TextureLoader();
  const light = new PointLight(lightTints[0], 31, 13);
  const matte = new Color(0x77735d);
  const shotLights = lightTints.map(tint => new Color(tint));
  light.position.set(-3.2, 3.6, 3.5);
  scene.add(new HemisphereLight(0xf8f1d6, 0x404936, 1.8), light);
  const frames = sources.map(() => {
    const group = new Group();
    const edge = new MeshStandardMaterial({ color: matte, roughness: .65, metalness: .18 });
    const face = new MeshBasicMaterial({ color: 0x272d20 });
    const screen = new Mesh(aperture, face);
    screen.position.z = .091;
    group.add(new Mesh(shell, edge), screen);
    scene.add(group);
    return { group, face, edge };
  });
  let active = initial;
  let progress = 0;
  let horizontal = 0;
  let vertical = 0;
  let targetX = 0;
  let targetY = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lost = false;
  let initialized = false;
  let cutStart = 0;
  let cutDirection = 1;
  let previousTime = 0;
  let mobile = false;
  let quality = 1.35;
  let slowFrames = 0;
  const textures = new Map<number, Promise<Texture>>();

  function texture(index: number) {
    if (!textures.has(index)) {
      textures.set(index, loader.loadAsync(sources[index]).then(map => {
        if (disposed) {
          map.dispose();
          return map;
        }
        map.colorSpace = SRGBColorSpace;
        const ratio = map.image.width / map.image.height / ((frameWidth - .2) / (frameHeight - .2));
        map.repeat.set(Math.min(1, 1 / ratio), Math.min(1, ratio));
        map.offset.set((1 - map.repeat.x) / 2, (1 - map.repeat.y) / 2);
        frames[index].face.map = map;
        frames[index].face.color.setRGB(1.43, 1.43, 1.43);
        frames[index].face.needsUpdate = true;
        requestFrame();
        return map;
      }));
    }
    return textures.get(index)!;
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stage;
    if (width === 0 || height === 0) return;
    mobile = width < 525;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1 : quality, Math.sqrt(1_000_000 / (width * height)));
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    requestFrame();
  }

  function requestFrame() {
    if (!raf && visible && !document.hidden && !disposed && !lost) {
      previousTime = 0;
      raf = requestAnimationFrame(draw);
    }
  }

  function draw(now: number) {
    raf = 0;
    if (!visible || document.hidden || disposed || lost) return;

    const dt = previousTime ? now - previousTime : 16.7;
    previousTime = now;
    const smoothing = 1 - Math.exp(-Math.min(40, dt) / 82);
    horizontal = MathUtils.lerp(horizontal, targetX, smoothing);
    vertical = MathUtils.lerp(vertical, targetY, smoothing);
    const restDistance = Math.max(9.25, 13.25 / camera.aspect);
    const cut = cutStart ? Math.min(1, (now - cutStart) / 520) : 1;
    const swing = Math.sin(cut * Math.PI) * (1 - cut);
    camera.position.set(
      horizontal * .48 - progress * .32 + swing * cutDirection * .88,
      vertical * .34 + progress * .22 + swing * .26,
      restDistance - progress * (mobile ? 1.1 : 2.1) + swing * .42,
    );
    camera.lookAt(.25 - progress * .63, .12 + progress * .2, 0);
    let settling = cut < 1 || Math.abs(horizontal - targetX) > .001 || Math.abs(vertical - targetY) > .001;
    frames.forEach(({ group, face }, index) => {
      const offset = (index - active + frames.length) % frames.length;
      const destination = offset ? 1.08 + offset * .43 : -.25;
      const depth = offset ? -offset * 1.35 : .1;
      const angle = offset ? -.44 : -.29 + progress * .23;
      const factor = initialized ? smoothing : 1;
      group.position.x = MathUtils.lerp(group.position.x, destination, factor);
      group.position.y = MathUtils.lerp(group.position.y, offset ? .45 + offset * .31 : .12, factor);
      group.position.z = MathUtils.lerp(group.position.z, depth, factor);
      group.rotation.y = MathUtils.lerp(group.rotation.y, angle, factor);
      group.rotation.z = MathUtils.lerp(group.rotation.z, offset ? .12 : .072 * (1 - progress), factor);
      group.rotation.x = -.035;
      if (face.map) face.color.setScalar(offset ? .53 : 1.62);
      settling ||= Math.abs(group.position.x - destination) + Math.abs(group.position.z - depth) > .008;
    });
    light.color.lerp(shotLights[active], initialized ? smoothing : 1);
    renderer.render(scene, camera);

    if (dt > 25 && initialized && !mobile) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 16 && quality > 1) {
      quality = 1;
      resize();
    }
    initialized = true;
    if (settling && !raf) raf = requestAnimationFrame(draw);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestFrame();
  });
  const dimensions = new ResizeObserver(resize);
  const visibility = () => { if (!document.hidden) requestFrame(); };
  const loseContext = () => {
    lost = true;
    stage.removeAttribute('data-rendered');
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stage.removeAttribute('data-rendered');
    cancelAnimationFrame(raf);
    observer.disconnect();
    dimensions.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('webglcontextlost', loseContext);
    for (const { face, edge } of frames) {
      face.map?.dispose();
      face.dispose();
      edge.dispose();
    }
    shell.dispose();
    aperture.dispose();
    renderer.dispose();
  };

  try {
    await texture(active);
    resize();
    renderer.compile(scene, camera);
    stage.setAttribute('data-rendered', '');
    observer.observe(stage);
    dimensions.observe(stage);
    canvas.addEventListener('webglcontextlost', loseContext);
    document.addEventListener('visibilitychange', visibility);
    sources.forEach((_, index) => { if (index !== active) void texture(index).catch(() => {}); });
  } catch {
    dispose();
    return;
  }

  return {
    select(index: number) {
      if (active !== index) {
        cutStart = performance.now();
        cutDirection = index > active ? 1 : -1;
        active = index;
      }
      void texture(index).catch(() => stage.removeAttribute('data-rendered'));
      requestFrame();
    },
    pointer(x: number, y: number) {
      targetX = x;
      targetY = y;
      requestFrame();
    },
    scroll(value: number) {
      progress = value;
      requestFrame();
    },
    dispose,
  };
}
