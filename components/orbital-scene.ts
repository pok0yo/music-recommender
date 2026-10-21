import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createOrbitalScene(host: HTMLElement, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
    camera.position.set(0, .05, 7.9);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    const skyGeometry = new THREE.SphereGeometry(20, 32, 16);
    const skyColors = new Float32Array(skyGeometry.attributes.position.count * 3);
    const skyColor = new THREE.Color();
    for (let i = 0; i < skyGeometry.attributes.position.count; i++) {
      const height = (skyGeometry.attributes.position.getY(i) / 20 + 1) / 2;
      skyColor.setRGB(1.1 - height * .65, 1.25 - height * .55, 1.45 - height * .35).toArray(skyColors, i * 3);
    }
    skyGeometry.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
    room.add(new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide })));
    const skyPanel = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2, 2.7) }));
    skyPanel.position.set(0, 1, 6); skyPanel.lookAt(0, 0, 0); room.add(skyPanel);
    const whitePanel = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4) }));
    whitePanel.position.set(-2, 0, 4.5); whitePanel.lookAt(0, 0, 0); room.add(whitePanel);
    const darkPanel = new THREE.Mesh(new THREE.PlaneGeometry(1, 10), new THREE.MeshBasicMaterial({ color:0x1c3554 }));
    darkPanel.position.set(3, -.5, 4); darkPanel.lookAt(0, 0, 0); room.add(darkPanel);
    const environment = pmrem.fromScene(room, .025);
    const studio = new RoomEnvironment();
    const studioEnvironment = pmrem.fromScene(studio, .025);
    studio.dispose();
    scene.environment = environment.texture;
    room.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); object.material.dispose(); } });
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xd6eaff, 0x3d608a, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9dcaff, 4);
    rim.position.set(4, -1, 3); scene.add(rim);

    const sculpture = new THREE.Group(); scene.add(sculpture);
    sculpture.rotation.set(.12, -.32, .18);
    const disc = new THREE.Group();
    disc.rotation.set(-.12, -.18, .14);
    disc.position.set(-.12, .12, 0); sculpture.add(disc);
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xeaf4ff, metalness: 1, roughness: .055, clearcoat: 1, envMap:studioEnvironment.texture, envMapIntensity: 1.5 });

    // A deterministic thin-film thickness map supplies the disc's diffraction bands.
    const size = 512;
    const pixels = new Uint8Array(size * size * 4);
    const rainbowPixels = new Uint8Array(size * size * 4);
    const spectrum = new THREE.Color();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x / size - .5, dy = y / size - .5;
      const radius = Math.hypot(dx, dy);
      const thickness = .5 + .44 * Math.sin(Math.atan2(dy, dx) * 2) + .025 * Math.sin(radius * 1600);
      const i = (y * size + x) * 4;
      pixels[i] = 255; pixels[i + 1] = Math.round(255 * thickness); pixels[i + 2] = 255; pixels[i + 3] = 255;
      spectrum.setHSL((Math.atan2(dy, dx) / (Math.PI * 2) * 3 + 2) % 1, .58, .62);
      rainbowPixels[i] = Math.round(spectrum.r * 255); rainbowPixels[i + 1] = Math.round(spectrum.g * 255); rainbowPixels[i + 2] = Math.round(spectrum.b * 255); rainbowPixels[i + 3] = 255;
    }
    const film = new THREE.DataTexture(pixels, size, size);
    film.needsUpdate = true;
    const spectrumMap = new THREE.DataTexture(rainbowPixels, size, size);
    spectrumMap.colorSpace = THREE.LinearSRGBColorSpace; spectrumMap.needsUpdate = true;
    const face = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map:spectrumMap, metalness: 1, roughness: .12,
      iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [100, 500], iridescenceThicknessMap: film,
      clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.4, side: THREE.DoubleSide });
    const front = new THREE.Mesh(new THREE.RingGeometry(.235, 1.65, 192), face);
    front.position.z = .035; disc.add(front);
    const back = new THREE.Mesh(new THREE.RingGeometry(.235, 1.65, 192), chrome);
    back.position.z = -.035; back.rotation.y = Math.PI; disc.add(back);
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, .07, 192, 1, true), chrome);
    edge.rotation.x = Math.PI / 2; disc.add(edge);
    const hub = new THREE.Mesh(new THREE.RingGeometry(.235, .49, 96), new THREE.MeshPhysicalMaterial({
      color: 0xd3e7ff, metalness: .6, roughness: .17, transparent: true, opacity: .86, side: THREE.DoubleSide,
    }));
    hub.position.z = .044; disc.add(hub);
    for (const radius of [.235, .45, .49, 1.647]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius, radius > 1 ? .014 : .009, 8, 128), chrome);
      seam.position.z = .046; disc.add(seam);
    }
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.12, .095, 16, 192), chrome);
    orbit.scale.x = 1.13; orbit.rotation.set(1.08, -.12, .23); sculpture.add(orbit);
    const fineOrbit = new THREE.Mesh(new THREE.TorusGeometry(2.28, .023, 10, 192), chrome);
    fineOrbit.rotation.set(1.15, .18, -.19); sculpture.add(fineOrbit);
    const satellite = new THREE.Mesh(new THREE.SphereGeometry(.27, 48, 32), chrome);
    satellite.position.set(2.13, .65, .25); sculpture.add(satellite);

    let enabled = false, visible = true, disposed = false, unavailable = false, frame = 0, previous = 0, elapsed = 0;
    const pointer = new THREE.Vector2();
    function render() { renderer.render(scene, camera); }
    function animate(now: number) {
      const dt = Math.min((now - previous) / 1000, .05); previous = now; elapsed += dt;
      const ease = 1 - Math.exp(-dt * 7);
      sculpture.rotation.x = THREE.MathUtils.lerp(sculpture.rotation.x, .12 - pointer.y * .2, ease);
      sculpture.rotation.y = THREE.MathUtils.lerp(sculpture.rotation.y, -.32 + pointer.x * .28, ease);
      sculpture.position.y = Math.sin(elapsed * .32) * .035;
      disc.rotation.z += dt * .065;
      rim.position.x = 4 + pointer.x * 2;
      rim.position.y = -1 - pointer.y * 2;
      render(); frame = requestAnimationFrame(animate);
    }
    function update() {
      cancelAnimationFrame(frame); frame = 0;
      if (disposed || unavailable) return;
      const running = enabled && visible && !document.hidden;
      host.dataset.renderState = document.hidden ? 'hidden' : !visible ? 'offscreen' : running ? 'running' : 'still';
      if (running) { previous = performance.now(); frame = requestAnimationFrame(animate); }
      else render();
    }
    const resize = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    });
    resize.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    intersection.observe(host);
    document.addEventListener('visibilitychange', update);
    const lost = (event: Event) => { event.preventDefault(); unavailable = true; cancelAnimationFrame(frame); host.dataset.renderState = 'unavailable'; onFailure(); };
    canvas.addEventListener('webglcontextlost', lost);
    render();
    return {
      setMotion(value: boolean) { enabled = value; if (!value) pointer.set(0, 0); update(); },
      setPointer(x: number, y: number) { if (enabled) pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); },
      dispose() {
        disposed = true; cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect();
        document.removeEventListener('visibilitychange', update); canvas.removeEventListener('webglcontextlost', lost);
        const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
        scene.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m); } });
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); film.dispose(); spectrumMap.dispose(); environment.dispose(); studioEnvironment.dispose();
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      },
    };
  } catch (error) {
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); throw error;
  }
}
