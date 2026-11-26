import { Color, MathUtils, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2, WebGLRenderer, type Texture } from 'three';

type Shot = Texture<HTMLImageElement>;

const vertexShader = `
  varying vec2 frameUv;

  void main() {
    frameUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D previousShot;
  uniform sampler2D nextShot;
  uniform vec2 previousCrop;
  uniform vec2 nextCrop;
  uniform vec3 spill;
  uniform float progress;
  uniform float direction;
  varying vec2 frameUv;

  vec3 sampleShot(sampler2D shot, vec2 uv, vec2 crop) {
    return texture2D(shot, (uv - 0.5) * crop + 0.5).rgb;
  }

  void main() {
    vec2 uv = frameUv;
    float axis = direction > 0.0 ? uv.x : 1.0 - uv.x;
    float edge = mix(-0.25, 1.25, progress) - axis + (uv.y - 0.5) * 0.16;
    float reveal = smoothstep(-0.1, 0.1, edge);
    float sweep = exp(-abs(edge) * 20.0) * sin(progress * 3.14159);
    vec2 bend = vec2(sweep * 0.035 * direction, sweep * (uv.y - 0.5) * 0.03);
    vec3 previous = sampleShot(previousShot, uv + bend, previousCrop);
    vec3 next = sampleShot(nextShot, uv - bend, nextCrop);
    float vignette = 1.13 - 0.31 * dot(uv - 0.5, uv - 0.5);
    gl_FragColor = vec4(mix(previous, next, reveal) * vignette + spill * sweep * 0.09, 1.0);
    #include <colorspace_fragment>
  }
`;

export async function createStage(canvas: HTMLCanvasElement, sources: string[], initial: number) {
  const stage = canvas.parentElement!;
  const context = canvas.getContext('webgl2', { powerPreference: 'low-power', alpha: false, antialias: false });
  if (!context) return;

  const renderer = new WebGLRenderer({ canvas, context, alpha: false });
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, .1, 30);
  const geometry = new PlaneGeometry();
  const loader = new TextureLoader();
  const uniforms = {
    previousShot: { value: null as Shot | null },
    nextShot: { value: null as Shot | null },
    previousCrop: { value: new Vector2(1, 1) },
    nextCrop: { value: new Vector2(1, 1) },
    spill: { value: new Color('#cfb8ff') },
    progress: { value: 1 },
    direction: { value: 1 },
  };
  const material = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, toneMapped: false });
  const screen = new Mesh(geometry, material);
  scene.add(screen);

  const textures = new Map<number, Promise<Shot>>();
  const loaded = new Set<Shot>();
  const cursor = new Vector2();
  const target = new Vector2();
  const distance = 5.6;
  let selected = initial;
  let revision = 0;
  let start = 0;
  let travel = 0;
  let destination = 0;
  let previousTime = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lost = false;

  function texture(index: number) {
    if (!textures.has(index)) {
      textures.set(index, loader.loadAsync(sources[index]).then(map => {
        if (disposed) {
          map.dispose();
        } else {
          map.colorSpace = SRGBColorSpace;
          loaded.add(map);
        }
        return map;
      }).catch(error => {
        textures.delete(index);
        throw error;
      }));
    }
    return textures.get(index)!;
  }

  function updateCrop(map: Shot | null, crop: Vector2) {
    if (!map) return;
    const ratio = map.image.width / map.image.height / camera.aspect;
    crop.set(Math.min(1, 1 / ratio), Math.min(1, ratio));
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = stage;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const fieldHeight = 2 * distance * Math.tan(MathUtils.degToRad(camera.fov / 2));
    screen.scale.set(fieldHeight * camera.aspect * 1.09, fieldHeight * 1.09, 1);
    updateCrop(uniforms.previousShot.value, uniforms.previousCrop.value);
    updateCrop(uniforms.nextShot.value, uniforms.nextCrop.value);
    const ratio = Math.min(devicePixelRatio || 1, width < 525 ? 1.2 : 1.45, Math.sqrt(950_000 / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    requestFrame();
  }

  function requestFrame() {
    if (raf || !visible || document.hidden || disposed || lost) return;
    previousTime = 0;
    raf = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    raf = 0;
    if (!visible || document.hidden || disposed || lost) return;

    const dt = previousTime ? Math.min(now - previousTime, 40) : 16.7;
    previousTime = now;
    const damping = 1 - Math.exp(-dt / 88);
    cursor.lerp(target, damping);
    travel = MathUtils.lerp(travel, destination, damping);
    const cut = start ? MathUtils.clamp((now - start) / 690, 0, 1) : 1;
    const ease = MathUtils.smootherstep(cut, 0, 1);
    const swing = Math.sin(cut * Math.PI);
    uniforms.progress.value = ease;

    camera.position.set(
      cursor.x * .175 + swing * uniforms.direction.value * .23 + travel * .14,
      cursor.y * .12 - travel * .13,
      distance - travel * .92 - swing * .19,
    );
    camera.lookAt(cursor.x * .045, 0, 0);
    renderer.render(scene, camera);
    if (cut < 1 || cursor.distanceToSquared(target) > .000003 || Math.abs(travel - destination) > .002) {
      raf = requestAnimationFrame(draw);
    }
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
  function dispose() {
    if (disposed) return;
    disposed = true;
    stage.removeAttribute('data-rendered');
    cancelAnimationFrame(raf);
    observer.disconnect();
    dimensions.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('webglcontextlost', loseContext);
    for (const map of loaded) map.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  }

  try {
    const photo = await texture(initial);
    uniforms.previousShot.value = photo;
    uniforms.nextShot.value = photo;
    resize();
    renderer.compile(scene, camera);
    observer.observe(stage);
    dimensions.observe(stage);
    canvas.addEventListener('webglcontextlost', loseContext);
    document.addEventListener('visibilitychange', visibility);
    // Let the still image remain visible until the first composited shot is ready.
    cancelAnimationFrame(raf);
    draw(performance.now());
    stage.setAttribute('data-rendered', '');
    sources.forEach((_, index) => { if (index !== initial) void texture(index).catch(() => {}); });
  } catch {
    dispose();
    return;
  }

  return {
    async select(index: number) {
      const currentRequest = ++revision;
      if (index === selected) return;
      try {
        const photo = await texture(index);
        if (disposed || lost || currentRequest !== revision) return;
        const current = uniforms.progress.value >= .5 ? uniforms.nextShot.value : uniforms.previousShot.value;
        uniforms.previousShot.value = current;
        uniforms.nextShot.value = photo;
        uniforms.direction.value = index > selected ? 1 : -1;
        uniforms.spill.value.set(getComputedStyle(stage).getPropertyValue('--scene-accent').trim());
        updateCrop(current, uniforms.previousCrop.value);
        updateCrop(photo, uniforms.nextCrop.value);
        selected = index;
        start = performance.now();
        stage.setAttribute('data-rendered', '');
        requestFrame();
      } catch {
        if (!disposed && currentRequest === revision) stage.removeAttribute('data-rendered');
      }
    },
    pointer(x: number, y: number) {
      target.set(x, y);
      requestFrame();
    },
    scroll(value: number) {
      destination = value;
      requestFrame();
    },
    dispose,
  };
}
