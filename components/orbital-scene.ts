import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMusicRackScene, type RackState } from './music-rack-scene';
import { createRackStudyScene } from './rack-study-scene';

export function createOrbitalScene(host: HTMLElement, onFailure: () => void, onDial: (angle: number) => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  try {
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const software = /swiftshader|llvmpipe|softpipe|software/i.test(String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)));
    // CPU-rendered WebGL needs smaller buffers to keep native controls responsive.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, software ? .75 : 1.5));
    renderer.transmissionResolutionScale = software ? .5 : 1;
    host.dataset.renderQuality = software ? 'software' : 'full';
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
    const environment = pmrem.fromScene(room, .025, .1, 100, {size:software ? 64 : 256});
    const studio = new RoomEnvironment();
    const studioEnvironment = pmrem.fromScene(studio, .025, .1, 100, {size:software ? 64 : 256});
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
    const turntable = new THREE.Group(); sculpture.add(turntable);
    const disc = new THREE.Group();
    disc.scale.setScalar(1.25);
    disc.rotation.set(-.12, -.18, .14);
    disc.position.set(-.12, .12, 0); turntable.add(disc);
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
    const depth = 3.3 * (1.2 / 120);
    const surface = new THREE.Group();
    surface.position.z = depth / 2; disc.add(surface);
    surface.add(new THREE.Mesh(new THREE.RingGeometry(.235, 1.65, 192), face));
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, depth, 192, 1, true), chrome);
    edge.rotation.x = Math.PI / 2; disc.add(edge);
    const hub = new THREE.Mesh(new THREE.RingGeometry(.235, .49, 96), new THREE.MeshPhysicalMaterial({
      color: 0xd3e7ff, metalness: .6, roughness: .17, transparent: true, opacity: .86, side: THREE.DoubleSide,
    }));
    hub.position.z = .0003; surface.add(hub);
    for (const radius of [.235, .45, .49, 1.647]) {
      const tube = radius > 1 ? .003 : .002;
      const seam = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 128), chrome);
      seam.position.z = -tube; surface.add(seam);
    }
    const back = surface.clone();
    back.position.z = -depth / 2; back.rotation.y = Math.PI; disc.add(back);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.12 * 1.12, .095, 16, 192), chrome);
    orbit.scale.x = 1.13; orbit.rotation.set(1.08, -.12, .23); turntable.add(orbit);
    const fineOrbit = new THREE.Mesh(new THREE.TorusGeometry(2.28 * 1.12, .023, 10, 192), chrome);
    fineOrbit.rotation.set(1.15, .18, -.19); turntable.add(fineOrbit);
    const satellite = new THREE.Mesh(new THREE.SphereGeometry(.27, 48, 32), chrome);
    satellite.position.set(2.13, .65, .25).multiplyScalar(1.12); turntable.add(satellite);

    sculpture.updateWorldMatrix(true, true);
    let radius = 0;
    sculpture.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.computeBoundingSphere();
      const bound = object.geometry.boundingSphere!.clone().applyMatrix4(object.matrixWorld);
      radius = Math.max(radius, bound.center.length() + bound.radius);
    });
    radius += .11; // Reserve the existing bob and camera's vertical offset throughout a full turn.
    const baseDistance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));

    let enabled = false, visible = true, disposed = false, unavailable = false, frame = 0, previous = 0, elapsed = 0;
    let pickerYaw = 0;
    let loaded = false, discSpin = 0;
    let picking = false, focus = 0, dial = 0, dialTarget = 0, dialVelocity = 0, idleDistance = baseDistance, pickerDistance = baseDistance;
    const orbitFinish = chrome.clone(); orbitFinish.transparent = true;
    orbit.material = fineOrbit.material = satellite.material = orbitFinish;
    const pointer = new THREE.Vector2();
    let rack: ReturnType<typeof createMusicRackScene> | ReturnType<typeof createRackStudyScene> | undefined, rackState: RackState | undefined;
    function render() { renderer.render(scene, camera); }
    function pose(dt: number, elapsedDt = dt) {
      if (rackState && rack) { key.intensity=1.5;rim.intensity=2;rim.position.set(4+pointer.x*2,-1-pointer.y*2,3);renderer.toneMappingExposure=1.05;const phase=rack.pose(elapsedDt,enabled,pointer)||'browsing';if(host.dataset.rackPhase!==phase)host.dataset.rackPhase=phase;return; }
      key.intensity=3;rim.intensity=4;renderer.toneMappingExposure=1.25;
      sculpture.scale.setScalar(1); sculpture.position.x=sculpture.position.z=0;
      camera.position.x=0; camera.position.y=.05; camera.quaternion.identity();
      const ease = dt ? 1 - Math.exp(-elapsedDt * 7) : enabled ? 0 : 1;
      focus = enabled ? THREE.MathUtils.lerp(focus, picking ? 1 : 0, 1 - Math.exp(-elapsedDt * 18)) : picking ? 1 : 0;
      if (!enabled) { dial = dialTarget; dialVelocity = 0; }
      else {
        dialVelocity += (dialTarget - dial) * 100 * dt;
        dialVelocity *= Math.exp(-10 * dt); dial += dialVelocity * dt;
      }
      sculpture.rotation.x = THREE.MathUtils.lerp(sculpture.rotation.x, .12 * (1 - focus) - pointer.y * (.2 - focus * .165), ease);
      sculpture.rotation.y = THREE.MathUtils.lerp(sculpture.rotation.y, -.32 * (1 - focus) + pointer.x * (.28 - focus * .23), ease);
      sculpture.position.y = Math.sin(elapsed * .95) * .06 * (1 - focus);
      const yaw = THREE.MathUtils.euclideanModulo(elapsed * .04 + Math.PI, Math.PI * 2) - Math.PI;
      turntable.rotation.y = THREE.MathUtils.lerp(yaw, pickerYaw, focus);
      turntable.rotation.z = (1 - Math.cos(elapsed * .04)) * Math.PI / 2 * (1 - focus);
      disc.rotation.x = -.12 * (1 - focus); disc.rotation.y = -.18 * (1 - focus);
      const idle = .14 + elapsed * .065;
      const direction = Math.cos(pickerYaw) < 0 ? 1 : -1;
      const difference = THREE.MathUtils.euclideanModulo(direction * dial - idle + Math.PI, Math.PI * 2) - Math.PI;
      if (!picking && focus < .001) discSpin = 0;
      disc.rotation.z = idle + difference * focus + direction * discSpin * focus;
      disc.position.set(-.12 * (1 - focus), .12 * (1 - focus), 0);
      orbitFinish.opacity = 1 - focus;
      orbit.visible = fineOrbit.visible = satellite.visible = focus < .995;
      camera.position.z = THREE.MathUtils.lerp(idleDistance, pickerDistance, focus);
      rim.position.x = 4 + pointer.x * 2; rim.position.y = -1 - pointer.y * 2;
      onDial(dial);
    }
    function animate(now: number) {
      // Elapsed phases use visible wall time; only the numerical dial spring needs a bounded step.
      const elapsedDt = Math.max(0, (now - previous) / 1000), dt = Math.min(elapsedDt, .05); previous = now;
      if (!picking) elapsed += elapsedDt;
      if (loaded) discSpin += elapsedDt * .65;
      pose(dt, elapsedDt); render(); frame = requestAnimationFrame(animate);
    }
    function update() {
      cancelAnimationFrame(frame); frame = 0;
      if (disposed || unavailable) return;
      const running = enabled && visible && !document.hidden;
      host.dataset.renderState = document.hidden ? 'hidden' : !visible ? 'offscreen' : running ? 'running' : 'still';
      if (running) { previous = performance.now(); frame = requestAnimationFrame(animate); }
      else { pose(0); render(); }
    }
    let resizeTimer = 0, sized = false;
    function resizeBuffer() {
      if (disposed || unavailable) return;
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false); sized = true;
      if (!frame) render();
    }
    const resize = new ResizeObserver(() => {
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      const available = Math.min(width, height, host.parentElement!.parentElement!.clientHeight);
      const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * available / height);
      idleDistance = radius / Math.sin(halfAngle);
      pickerDistance = (1.65 * 1.25 + .11) / Math.sin(halfAngle);
      host.parentElement!.style.setProperty('--orbital-framing', String(baseDistance / idleDistance * height / Math.min(height, width / 1.25)));
      // Reallocating the drawing buffer every expansion frame stalls the GPU.
      window.clearTimeout(resizeTimer);
      if (!sized || !enabled) resizeBuffer();
      else resizeTimer = window.setTimeout(resizeBuffer, 160);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      if (!frame) { pose(0); render(); }
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
      setLoaded(value: boolean) { loaded = value; },
      setRack(value: RackState | undefined) {
        rackState=value;
        if(value && !rack) rack=value.isolated
          ?createRackStudyScene(renderer,scene,camera,sculpture,disc,[orbit,fineOrbit,satellite],orbitFinish,studioEnvironment.texture,angle=>{host.dataset.orbitAngle=angle.toFixed(3);if(!frame)render();},software)
          :createMusicRackScene(renderer,scene,camera,sculpture,disc,[orbit,fineOrbit,satellite],orbitFinish,studioEnvironment.texture,software);
        rack?.setState(value);host.dataset.rack=value?'true':'false';if(!value)delete host.dataset.rackPhase;update();
        host.dataset.rackSelection=value?.tracks[value.index]?.recording_id||'';
        host.dataset.rackCount=String(value?Math.min(8,value.tracks.length-Math.floor(value.index/8)*8):0);
      },
      pickRack(x: number,y: number) { return rackState?rack?.pick(x,y):undefined; },
      hoverRack(index: number) { rack?.hover(index); },
      orbitRack(x:number,y:number) { if(rack && 'orbit' in rack)rack.orbit(x,y); },
      setPicker(value: boolean) {
        if (picking === value) return;
        if (value) {
          disc.updateWorldMatrix(true, false);
          const normal = new THREE.Vector3(0, 0, 1).transformDirection(disc.matrixWorld);
          // Keep the visible face forward, including when reopening mid-transition.
          pickerYaw = normal.z < 0 ? (turntable.rotation.y < 0 ? -Math.PI : Math.PI) : 0;
        }
        picking = value; pointer.set(0, 0); host.dataset.view = value ? 'picker' : 'hero'; update();
      },
      setDial(value: number, direct = false) {
        dialTarget = value; if (direct) { dial = value; dialVelocity = 0; }
        if (!enabled) { pose(0); render(); }
      },
      setPointer(x: number, y: number) { if (enabled) pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); },
      dispose() {
        disposed = true; cancelAnimationFrame(frame); window.clearTimeout(resizeTimer); resize.disconnect(); intersection.disconnect();
        host.parentElement!.style.removeProperty('--orbital-framing');
        document.removeEventListener('visibilitychange', update); canvas.removeEventListener('webglcontextlost', lost);
        rack?.dispose();
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
