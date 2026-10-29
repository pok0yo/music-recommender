import type {EnvironmentSettings} from '../lib/environment-controls';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { artists, type Track } from '../lib/contracts';

export type RackState = { tracks: Track[]; index: number; browsing: boolean; operation: number; revealed: boolean; busy: boolean; waterMotion?: boolean; isolated?: boolean; functional?: boolean; seed?: Track|null; environment?: EnvironmentSettings; viewRevision?: number };
export type RackInteraction = Omit<RackState, 'revealed'> & {
  onSelect: (index: number) => void;
  onAction: (action: string) => void;
};

export function createMusicRackScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera,
  featured: THREE.Group, disc: THREE.Group, orbits: THREE.Mesh[], orbitFinish: THREE.MeshPhysicalMaterial, studio: THREE.Texture) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const materials = new Map<THREE.Material, number>(), textures = new Set<THREE.Texture>();
  const blue = new THREE.MeshPhysicalMaterial({ color:0x398ab9, metalness:.55, roughness:.15, clearcoat:1,envMap:studio });
  const chrome = new THREE.MeshPhysicalMaterial({ color:0xdcecff, metalness:1, roughness:.095, clearcoat:1,envMap:studio });
  const lilac = new THREE.MeshPhysicalMaterial({ color:0x9d88d7, metalness:.55, roughness:.16, clearcoat:1,envMap:studio });
  const glass = new THREE.MeshPhysicalMaterial({ color:0xc0eaff, metalness:.15, roughness:.08, transparent:true, opacity:.2, depthWrite:false, side:THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color:0x12335e, metalness:.55, roughness:.24 });
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], parent: THREE.Object3D = root) {
    for (const m of Array.isArray(material) ? material : [material]) {
      if (!materials.has(m)) { materials.set(m, m.opacity); m.transparent = true; }
    }
    const object = new THREE.Mesh(geometry, material); parent.add(object); return object;
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = root) {
    const object = mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.25),material,parent); object.position.set(x,y,z); return object;
  }
  box(6.8,.3,2.8,0,1,0,chrome);
  box(6.45,.075,2.6,0,1.17,0,lilac);
  for (const side of [-1,1]) {
    box(.32,2.85,2.8,side*3.24,-.42,0,chrome);
    box(.055,2.48,2.45,side*3.42,-.42,0,blue);
    box(2.65,.18,2.8,side*1.93,-1.82,0,chrome);
    box(.18,2.65,2.65,side*.53,-.45,0,blue);
    for (const z of [-1,1]) box(.45,.18,.48,side*2.9,-1.99,z, dark);
  }
  box(3.5,.29,3.25,0,1.38,0,blue);
  box(3.22,.055,3,0,1.55,0,chrome);
  const well = mesh(new THREE.CircleGeometry(1.29,96),dark); well.rotation.x=-Math.PI/2; well.position.y=1.585;
  const bezel = mesh(new THREE.TorusGeometry(1.32,.055,12,128),chrome); bezel.rotation.x=-Math.PI/2; bezel.position.y=1.61;
  const spindle = mesh(new THREE.CylinderGeometry(.12,.13,.09,32),chrome); spindle.position.y=1.63;
  const lid = new THREE.Group(); lid.position.set(0,1.68,-1.4); root.add(lid);
  const window = mesh(new THREE.CircleGeometry(1.31,96),glass,lid); window.rotation.x=-Math.PI/2; window.position.z=1.4;
  const windowRim = mesh(new THREE.TorusGeometry(1.32,.038,12,96),chrome,lid); windowRim.rotation.x=-Math.PI/2; windowRim.position.z=1.4;
  box(.32,.06,.12,0,0,2.73,chrome,lid);
  const hinge = mesh(new THREE.CylinderGeometry(.07,.07,1.2,20),chrome); hinge.rotation.z=Math.PI/2; hinge.position.set(0,1.68,-1.4);
  for (const x of [-1.5,1.5]) for (const z of [-1.35,1.35]) {
    const screw = mesh(new THREE.SphereGeometry(.045,12,8),chrome); screw.scale.y=.4; screw.position.set(x,1.6,z);
  }
  const display = document.createElement('canvas'); display.width=512; display.height=100;
  const displayTexture = new THREE.CanvasTexture(display); displayTexture.colorSpace=THREE.SRGBColorSpace; textures.add(displayTexture);
  const screen = mesh(new THREE.PlaneGeometry(1.6,.3),new THREE.MeshBasicMaterial({map:displayTexture})); screen.position.set(0,1.37,1.641);
  for (const [x,action] of [[-1.28,'previous'],[-.9,'next'],[.95,'confirm'],[1.33,'eject']] as const) {
    const button = mesh(new THREE.SphereGeometry(.13,20,12),action==='confirm'?lilac:chrome);
    button.scale.set(1,.55,.8); button.position.set(x,1.62,1.39); button.userData.action=action;
  }
  const sleeveRoot = new THREE.Group(); root.add(sleeveRoot);
  const sleeves: { object: THREE.Group; x: number; index: number; texture: THREE.CanvasTexture; material: THREE.MeshBasicMaterial }[] = [];
  let state: RackState | undefined, key='', hoverIndex=-1, time=0, operation=-1, transferTime=0, selectionTime=2, fade=0;
  const focusPosition=new THREE.Vector3(), cameraPosition=new THREE.Vector3(), lookMatrix=new THREE.Matrix4(), aim=new THREE.Quaternion(), featureRotation=new THREE.Quaternion();
  const featureScale=new THREE.Vector3(.56,.56,.56),lookTarget=new THREE.Vector3(0,.65,0),discCenter=new THREE.Vector3();
  const floatingEuler=new THREE.Euler(), raycaster=new THREE.Raycaster(),identity=new THREE.Quaternion();
  const water = new Reflector(new THREE.CircleGeometry(9,80),{
    textureWidth:512,textureHeight:512,multisample:0,clipBias:.003,
    shader:{
      uniforms:{color:{value:new THREE.Color(.7,.8,1)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uTime:{value:0},uMotion:{value:0}},
      vertexShader:`uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vFloor;
        void main(){vUv=textureMatrix*vec4(position,1.);vFloor=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tDiffuse; uniform float uTime,uMotion; varying vec4 vUv; varying vec2 vFloor;
        void main(){vec4 uv=vUv;float wave=sin(vFloor.y*9.+uTime*.9)+.45*sin(vFloor.x*6.-uTime*.65);
          uv.xy+=vec2(wave*.004,sin(vFloor.y*14.-uTime)*.002)*uv.w*uMotion;
          vec4 reflected=texture2DProj(tDiffuse,uv);float edge=1.-smoothstep(3.4,8.7,length(vFloor));
          vec3 tint=mix(vec3(.57,.75,1.),vec3(.78,.66,.95),.35+.15*sin(vFloor.x*.8));
          gl_FragColor=vec4(mix(tint,reflected.rgb,.88),edge*mix(.10,.82,reflected.a));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }
  });
  water.rotation.x=-Math.PI/2; water.position.y=-2.09; water.visible=false;
  const waterMaterial=water.material as THREE.ShaderMaterial; waterMaterial.transparent=true; waterMaterial.depthWrite=false;
  scene.add(water);
  const reflect=water.onBeforeRender; let reflectedAt=0,reflectionMotion=false;
  water.onBeforeRender=function(...args) {
    const now=performance.now(); if (reflectionMotion && now-reflectedAt<33) return;
    reflectedAt=now; reflect.apply(this,args);
  };
  const contactCanvas=document.createElement('canvas'); contactCanvas.width=contactCanvas.height=128;
  const contact=contactCanvas.getContext('2d')!,gradient=contact.createRadialGradient(64,64,3,64,64,64);
  gradient.addColorStop(0,'#163f6a80'); gradient.addColorStop(1,'#163f6a00'); contact.fillStyle=gradient;contact.fillRect(0,0,128,128);
  const contactMap=new THREE.CanvasTexture(contactCanvas); textures.add(contactMap);
  const shadow=mesh(new THREE.PlaneGeometry(8,5),new THREE.MeshBasicMaterial({map:contactMap,transparent:true,depthWrite:false})); shadow.rotation.x=-Math.PI/2; shadow.position.y=-2.08;

  function cover(track: Track, index: number) {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=512;
    const c=canvas.getContext('2d')!; let hash=0; for(const ch of track.recording_id) hash=(hash*31+ch.charCodeAt(0))>>>0;
    const background=c.createLinearGradient(0,0,512,512); background.addColorStop(0,`hsl(${205+hash%28} 76% 68%)`); background.addColorStop(.52,'#eff9ff');background.addColorStop(1,`hsl(${255+hash%55} 60% 72%)`);
    c.fillStyle=background;c.fillRect(0,0,512,512);
    c.strokeStyle='#17449b45';c.lineWidth=1;for(let i=0;i<12;i++){c.beginPath();c.ellipse(260,240,50+i*20,120+i*9,-.7,0,Math.PI*2);c.stroke();}
    const orb=c.createRadialGradient(205,155,12,255,240,155);orb.addColorStop(0,'#fff');orb.addColorStop(.35,'#c0eaff');orb.addColorStop(.65,'#839cd4');orb.addColorStop(.8,'#f5dcff');orb.addColorStop(1,'#365993');c.fillStyle=orb;c.beginPath();c.arc(255,240,130,0,Math.PI*2);c.fill();
    c.strokeStyle='#f9fdff';c.lineWidth=12;c.beginPath();c.ellipse(255,240,190,52,-.45,0,Math.PI*2);c.stroke();
    c.fillStyle='#0c3275';c.font='18px Manrope,sans-serif';c.fillText(`SONG / ${String(index+1).padStart(2,'0')}`,26,35);
    c.fillStyle='#eff8ffee';c.fillRect(0,360,512,152);c.fillStyle='#103b83';c.font='600 34px Manrope,sans-serif';
    const words=track.title.split(' ');let line='',y=406;
    for(const word of words){if(c.measureText(line+word).width>455&&line){c.fillText(line.trim(),26,y);line='';y+=38;if(y>446)break;}line+=word+' ';}
    if(y<=446)c.fillText(line.trim(),26,y);
    c.font='21px Manrope,sans-serif';c.fillText(artists(track),26,487,458);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
  }
  function clearSleeves() {
    for(const sleeve of sleeves){sleeve.object.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});sleeve.texture.dispose();sleeve.material.dispose();materials.delete(sleeve.material);}
    sleeves.length=0;sleeveRoot.clear();
  }
  function refresh(value: RackState) {
    const start=Math.floor(value.index/8)*8;
    const next=value.tracks.slice(start,start+8).map(t=>t.recording_id+t.title+artists(t)).join('|');
    if(key!==`${start}:${next}`){
      key=`${start}:${next}`;clearSleeves();
      const visible=value.tracks.slice(start,start+8), left=Math.ceil(visible.length/2);
      visible.forEach((track,i)=>{
        const side=i<left?-1:1,slot=i<left?i:i-left,count=side<0?left:visible.length-left;
        const x=side*1.95+(slot-(count-1)/2)*.55;
        const group=new THREE.Group();group.position.set(x,-.5,0);group.rotation.y=1.3;sleeveRoot.add(group);
        const texture=cover(track,start+i),material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
        const paper=mesh(new THREE.BoxGeometry(1.8,2.25,.055),[blue,blue,blue,blue,material,material],group);paper.userData.index=start+i;
        sleeves.push({object:group,x,index:start+i,texture,material});
      });
    }
    const c=display.getContext('2d')!;c.fillStyle='#10385e';c.fillRect(0,0,512,100);c.fillStyle='#b6eaff';c.font='24px monospace';c.fillText(`${value.browsing?'BROWSE':'SEED'}  ${value.tracks.length?value.index+1:0} / ${value.tracks.length}`,18,34);c.font='22px Manrope,sans-serif';c.fillText(value.tracks[value.index]?.title||'No candidates',18,78,476);displayTexture.needsUpdate=true;
    if(operation!==value.operation){operation=value.operation;transferTime=0;}
    if(state && value.browsing && (state.index!==value.index || !state.browsing))selectionTime=0;
    state=value;root.visible=true;water.visible=value.revealed;
  }
  return {
    setState(value: RackState | undefined) { if(value)refresh(value);else{state=undefined;fade=0;root.visible=false;water.visible=false;} },
    pose(dt: number, moving: boolean, pointer: THREE.Vector2) {
      if(!state)return;
      reflectionMotion=moving;
      const ease=moving?1-Math.exp(-dt*12):1; if(moving){time+=dt;transferTime+=dt;selectionTime+=dt;}else {transferTime=2;selectionTime=2;}
      fade=THREE.MathUtils.lerp(fade,state.revealed?1:0,ease);for(const [material,opacity] of materials)material.opacity=opacity*fade;
      const loading=!state.browsing&&transferTime<1.2;
      const descend=state.browsing?0:THREE.MathUtils.smoothstep(transferTime,.22,.96);
      const open=state.browsing?.22:transferTime<.95?THREE.MathUtils.smoothstep(transferTime,0,.22):1-THREE.MathUtils.smoothstep(transferTime,.95,1.2);
      lid.rotation.x=THREE.MathUtils.lerp(lid.rotation.x,-open*1.15,ease);
      focusPosition.set(0,THREE.MathUtils.lerp(3.4+Math.sin(time*.9)*.055,1.64,descend),.12+Math.sin(descend*Math.PI)*.65);
      const selectedSleeve=sleeves.find(s=>s.index===state!.index);
      const reveal=state.browsing&&selectedSleeve?1-THREE.MathUtils.smoothstep(selectionTime,.28,1.15):0;
      if(selectedSleeve){focusPosition.x=Math.sign(selectedSleeve.x)*1.3*reveal;focusPosition.y=THREE.MathUtils.lerp(focusPosition.y,1.35,reveal);focusPosition.z=THREE.MathUtils.lerp(focusPosition.z,2.12,reveal);}
      featured.position.lerp(focusPosition,ease);featured.scale.lerp(featureScale,ease);
      floatingEuler.set(THREE.MathUtils.lerp(-.3,-Math.PI/2,descend),(.38+Math.sin(time*.25)*.09)*(1-descend),Math.sin(time*.28)*.06*(1-descend));
      featureRotation.setFromEuler(floatingEuler);featured.quaternion.slerp(featureRotation,ease);
      disc.parent!.quaternion.slerp(identity,ease);
      disc.rotation.x=THREE.MathUtils.lerp(disc.rotation.x,0,ease);disc.rotation.y=THREE.MathUtils.lerp(disc.rotation.y,0,ease);
      disc.position.lerp(discCenter,ease);
      if(moving)disc.rotation.z+=dt*(state.browsing?.12:.65);
      orbitFinish.opacity=THREE.MathUtils.lerp(orbitFinish.opacity,1-descend,ease);orbits.forEach(o=>{o.visible=orbitFinish.opacity>.005;});
      for(const sleeve of sleeves){
        const selected=sleeve.index===state.index,hover=sleeve.index===hoverIndex;
        const clearance=selectedSleeve&&Math.sign(sleeve.x)===Math.sign(selectedSleeve.x)?Math.sign(sleeve.x-selectedSleeve.x)*.09:0;
        sleeve.object.position.x=THREE.MathUtils.lerp(sleeve.object.position.x,selected?Math.sign(sleeve.x)*1.3:sleeve.x+clearance,ease);
        sleeve.object.position.y=THREE.MathUtils.lerp(sleeve.object.position.y,selected?-.28:-.5,ease);
        sleeve.object.position.z=THREE.MathUtils.lerp(sleeve.object.position.z,selected?2.05:hover?.48:0,ease);
        sleeve.object.rotation.y=THREE.MathUtils.lerp(sleeve.object.rotation.y,selected?.25:1.3,ease);
      }
      const distance=14.4/Math.min(1,camera.aspect/1.18);
      cameraPosition.set(.46,.36,.82).normalize().multiplyScalar(distance);cameraPosition.y+=.4;
      cameraPosition.x+=pointer.x*.12;cameraPosition.y-=pointer.y*.07;
      camera.position.lerp(cameraPosition,ease);lookMatrix.lookAt(camera.position,lookTarget,camera.up);aim.setFromRotationMatrix(lookMatrix);camera.quaternion.slerp(aim,ease);
      waterMaterial.uniforms.uTime.value=time;waterMaterial.uniforms.uMotion.value=moving&&state.waterMotion!==false?1:0;
      return loading?'inserting':state.browsing?'browsing':'loaded';
    },
    pick(x: number,y: number) {
      raycaster.setFromCamera(new THREE.Vector2(x,y),camera);const hit=raycaster.intersectObjects(root.children,true)[0]?.object;
      return hit?.userData as {index?:number;action?:string} | undefined;
    },
    hover(index: number) { hoverIndex=index; },
    dispose() { clearSleeves();water.dispose();water.geometry.dispose();scene.remove(water);textures.forEach(t=>t.dispose());root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach((_,m)=>m.dispose());scene.remove(root); }
  };
}
