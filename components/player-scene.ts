import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createPlayerScene(host: HTMLElement, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' });
  let environment: THREE.WebGLRenderTarget | undefined;
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  let frame = 0, disposed = false, unavailable = false;
  const dispose = () => {
    disposed = true; cancelAnimationFrame(frame);
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    environment?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };
  try {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(1, 1, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0, 0); host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 30);
    camera.position.set(0, .15, 10); camera.lookAt(0, .15, 0);
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .04); scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xe7f7ff, 0x426bb1, 3));
    const key = new THREE.DirectionalLight(0xffffff, 4); key.position.set(-3, 5, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb99dff, 3); rim.position.set(4, -2, 4); scene.add(rim);
    const casing = new THREE.MeshPhysicalMaterial({ color:0x2593cf, metalness:.45, roughness:.16, clearcoat:1, clearcoatRoughness:.06 });
    const chrome = new THREE.MeshPhysicalMaterial({ color:0xe3f4ff, metalness:1, roughness:.09, clearcoat:1 });
    const glass = new THREE.MeshPhysicalMaterial({ color:0x9fdfff, metalness:.25, roughness:.07, clearcoat:1, transparent:true, opacity:.18, depthWrite:false, side:THREE.DoubleSide, iridescence:.35 });
    const dark = new THREE.MeshStandardMaterial({ color:0x11365b, metalness:.65, roughness:.25 });
    const model = new THREE.Group(); scene.add(model);
    model.rotation.set(-.05, -.07, .015);
    function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = model) {
      geometries.add(geometry); materials.add(material);
      const object = new THREE.Mesh(geometry, material); parent.add(object); return object;
    }
    function rounded(width: number, height: number, radius: number) {
      const x = -width / 2, y = -height / 2, shape = new THREE.Shape();
      shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y);
      shape.quadraticCurveTo(x + width, y, x + width, y + radius); shape.lineTo(x + width, y + height - radius);
      shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); shape.lineTo(x + radius, y + height);
      shape.quadraticCurveTo(x, y + height, x, y + height - radius); shape.lineTo(x, y + radius);
      shape.quadraticCurveTo(x, y, x + radius, y); return shape;
    }
    const outline = rounded(5.5, 5.6, 1.15), aperture = new THREE.Path();
    aperture.absarc(0, .35, 2.05, 0, Math.PI * 2, true); outline.holes.push(aperture);
    mesh(new THREE.ExtrudeGeometry(outline, { depth:.32, bevelEnabled:true, bevelSegments:3, steps:1, bevelSize:.13, bevelThickness:.12, curveSegments:32 }), casing);
    const trim = mesh(new THREE.TorusGeometry(2.12, .085, 12, 128), chrome); trim.position.set(0, .35, .43);
    const seam = mesh(new THREE.TorusGeometry(2.22, .028, 8, 128), dark); seam.position.set(0, .35, .35);
    for (const x of [-2.35, 2.35]) for (const y of [-1.8, 1.8]) {
      const screw = mesh(new THREE.SphereGeometry(.07, 12, 8), chrome); screw.scale.z = .35; screw.position.set(x, y, .48);
    }
    const hinge = mesh(new THREE.CylinderGeometry(.12, .12, 2.1, 24), chrome); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 2.53, .45);
    const lid = new THREE.Group(); lid.position.set(0, 2.53, .5); model.add(lid);
    const lidWindow = mesh(new THREE.CircleGeometry(2.04, 128), glass, lid); lidWindow.position.y = .35 - 2.53;
    const lidRim = mesh(new THREE.TorusGeometry(2.04, .055, 12, 128), chrome, lid); lidRim.position.set(0, .35 - 2.53, .025);
    const catchMesh = mesh(new THREE.BoxGeometry(.45, .11, .15), chrome, lid); catchMesh.position.set(0, .35 - 2.53 - 2.05, .05);
    const badge = mesh(new THREE.ExtrudeGeometry(rounded(2.3, .25, .1), { depth:.02, bevelEnabled:false }), dark); badge.position.set(0, -2.25, .47);
    const led = mesh(new THREE.SphereGeometry(.045, 12, 8), new THREE.MeshBasicMaterial({ color:0x83eaff })); led.position.set(1.6, -2.23, .5);

    let active = false, visible = true, motion = true, target = 0, angle = 0, previous = 0;
    function render() { lid.rotation.x = -angle * 1.18; renderer.render(scene, camera); }
    function resize() {
      if (!active || unavailable || disposed || !host.clientWidth || !host.clientHeight) return;
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.position.z = 3.35 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
      camera.updateProjectionMatrix(); render();
    }
    function animate(now: number) {
      const dt = Math.min((now - previous) / 1000, .05); previous = now;
      angle = THREE.MathUtils.lerp(angle, target, 1 - Math.exp(-dt * 24));
      if (Math.abs(angle - target) < .002) angle = target;
      render();
      if (angle !== target) frame = requestAnimationFrame(animate);
      else { frame = 0; host.dataset.renderState = 'still'; }
    }
    function update() {
      cancelAnimationFrame(frame); frame = 0;
      if (disposed || unavailable) return;
      if (!active || !visible || document.hidden) { host.dataset.renderState = 'hidden'; return; }
      if (!motion) angle = target;
      if (angle === target) { render(); host.dataset.renderState = 'still'; }
      else { previous = performance.now(); host.dataset.renderState = 'moving'; frame = requestAnimationFrame(animate); }
    }
    // Warm the small decorative scene before a song confirmation needs its shaders.
    renderer.compile(scene, camera); render();
    const observer = new ResizeObserver(resize); observer.observe(host);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }); intersection.observe(host);
    document.addEventListener('visibilitychange', update);
    const lost = (event: Event) => { event.preventDefault(); unavailable = true; cancelAnimationFrame(frame); host.dataset.renderState = 'unavailable'; onFailure(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return {
      setState(show: boolean, open: boolean, allowed: boolean) {
        const appearing = !active && show;
        active = show; target = open ? 1 : 0; motion = allowed;
        if (appearing) resize(); update();
      },
      dispose() {
        observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', update);
        renderer.domElement.removeEventListener('webglcontextlost', lost); dispose();
      },
    };
  } catch (error) { dispose(); throw error; }
}
