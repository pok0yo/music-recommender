import * as THREE from 'three';

// shortcut: refract existing water; use a geometric surface if reflections must follow scene objects.
const fragmentShader = `
uniform sampler2D uImage;
uniform vec4 uRect;
uniform float uTime;
uniform float uWaterline;
varying vec2 vUv;
void main() {
  vec2 uv = vec2(uRect.z + vUv.x * uRect.x, 1.0 - uRect.w - (1.0 - vUv.y) * uRect.y);
  float depth = clamp((1.0 - uv.y - uWaterline) / (1.0 - uWaterline), 0.0, 1.0);
  float shore = smoothstep(0.0, 0.12, depth);
  float gain = smoothstep(0.0, 1.2, uTime);
  float a = uv.x * 24.0 + depth * 31.0 - uTime * 0.85 + sin(uv.x * 13.0 + uTime * 0.22) * 0.8;
  float b = uv.x * 47.0 - depth * 24.0 + uTime * 0.61 + sin(depth * 12.0 - uTime * 0.3) * 0.65;
  vec2 flow = vec2(sin(b) * 0.0025, sin(a) * 0.0036 + sin(b + a * 0.4) * 0.0012);
  vec2 refracted = uv + flow * (0.3 + depth * 0.7) * shore * gain;
  refracted.y = min(refracted.y, 1.0 - uWaterline);
  vec3 base = texture2D(uImage, uv).rgb;
  vec3 water = texture2D(uImage, clamp(refracted, 0.001, 0.999)).rgb;
  water *= 1.0 + cos(a) * 0.025 * shore;
  gl_FragColor = vec4(mix(base, water, shore * gain), 1.0);
  #include <colorspace_fragment>
}`;

export function createWaterScene(host: HTMLDivElement, root: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'water-canvas'; canvas.style.display = 'none'; host.append(canvas);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms: { uImage: { value: null }, uRect: { value: new THREE.Vector4() }, uTime: { value: 0 }, uWaterline: { value: .66 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader,
  });
  scene.add(new THREE.Mesh(geometry, material));
  let disposed = false, failed = false, visible = false, loaded = false, frame = 0, layoutFrame = 0, imageGeneration = 0, last = 0, elapsed = 0, source = '', texture: THREE.Texture | undefined;
  const state = (value: string) => { if (host.dataset.waterState !== value) host.dataset.waterState = value; };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const fail = () => { failed = true; stop(); canvas.style.display = 'none'; state('fallback'); };
  renderer.debug.onShaderError = fail;
  const draw = (now: number) => {
    frame = 0;
    if (disposed || failed || !visible || !loaded || document.hidden) return;
    const delta = now - last;
    if (!last || delta >= 1000 / 30) {
      elapsed += last ? Math.min(delta / 1000, 0.1) : 0;
      last = now; material.uniforms.uTime.value = elapsed;
      try { renderer.render(scene, camera); } catch { fail(); return; }
    }
    frame = requestAnimationFrame(draw);
  };
  const update = () => {
    layoutFrame = 0;
    if (disposed || failed) return;
    const style = getComputedStyle(root), current = style.backgroundImage.match(/url\(["']?(.+?)["']?\)/)?.[1];
    if (!current) { fail(); return; }
    if (current !== source) {
      const generation = ++imageGeneration;
      source = current; loaded = false; stop(); canvas.style.display = 'none'; texture?.dispose(); state('loading');
      texture = new THREE.TextureLoader().load(current, next => {
        if (disposed || generation !== imageGeneration) { next.dispose(); return; }
        next.colorSpace = THREE.SRGBColorSpace; next.minFilter = THREE.LinearFilter; next.generateMipmaps = false;
        material.uniforms.uImage.value = next; loaded = true; scheduleLayout();
      }, undefined, () => { if (!disposed && generation === imageGeneration) fail(); });
    }
    if (!loaded) return;
    const rect = host.getBoundingClientRect(), page = root.getBoundingClientRect();
    const image = texture!.image as HTMLImageElement;
    const fit = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const imageWidth = image.naturalWidth * fit, imageHeight = image.naturalHeight * fit;
    const imageLeft = (rect.width - imageWidth) / 2, imageTop = (rect.height - imageHeight) / 2;
    const left = Math.max(imageLeft, -rect.left), right = Math.min(imageLeft + imageWidth, innerWidth - rect.left);
    const waterline = Number(style.getPropertyValue('--waterline'));
    const top = Math.max(imageTop + imageHeight * waterline, -rect.top), bottom = Math.min(imageTop + imageHeight, innerHeight - rect.top);
    visible = bottom > top && right > left && page.bottom > 0 && page.top < innerHeight;
    if (!visible || document.hidden) { stop(); canvas.style.display = 'none'; state(document.hidden ? 'hidden' : 'offscreen'); return; }
    const width = right - left, height = bottom - top, scale = Math.min(1, 1440 / width, Math.sqrt(650000 / (width * height)));
    const widthPixels = Math.max(1, Math.floor(width * scale)), heightPixels = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== widthPixels || canvas.height !== heightPixels) renderer.setSize(widthPixels, heightPixels, false);
    canvas.style.left = left + 'px'; canvas.style.top = top + 'px'; canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; canvas.style.display = 'block';
    material.uniforms.uRect.value.set(width / imageWidth, height / imageHeight, (left - imageLeft) / imageWidth, (top - imageTop) / imageHeight);
    material.uniforms.uWaterline.value = waterline;
    state('running'); if (!frame) frame = requestAnimationFrame(draw);
  };
  const scheduleLayout = () => { if (!disposed && !layoutFrame) layoutFrame = requestAnimationFrame(update); };
  const lost = (event: Event) => { event.preventDefault(); fail(); };
  const resize = new ResizeObserver(scheduleLayout); resize.observe(host);
  window.addEventListener('scroll', scheduleLayout, { passive: true }); window.addEventListener('resize', scheduleLayout);
  document.addEventListener('visibilitychange', scheduleLayout); canvas.addEventListener('webglcontextlost', lost);
  scheduleLayout();
  return { dispose() {
    disposed = true; stop(); cancelAnimationFrame(layoutFrame); resize.disconnect();
    window.removeEventListener('scroll', scheduleLayout); window.removeEventListener('resize', scheduleLayout);
    document.removeEventListener('visibilitychange', scheduleLayout); canvas.removeEventListener('webglcontextlost', lost);
    geometry.dispose(); material.dispose(); texture?.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
}
