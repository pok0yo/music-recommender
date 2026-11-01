import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {artists,type Track} from '../lib/contracts';
import type {RackState} from './music-rack-scene';
import {rackTransfer,sampleTransfer,floatRotation,seatedRotation,type TransferFrame} from './rack-transfer';
import {defaultEnvironment,type EnvironmentSettings} from '../lib/environment-controls';
import {createWaterGeometry,waterVertex,waterFragment} from './stylized-water';

// A scene study shares the existing CD and renderer; the website view keeps its own composition.
export function createRackStudyScene(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,
  featured:THREE.Group,disc:THREE.Group,orbits:THREE.Mesh[],orbitFinish:THREE.MeshPhysicalMaterial,studio:THREE.Texture,onViewChange:(angle:number)=>void,software=false) {
  const root=new THREE.Group();scene.add(root);
  const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const chrome=new THREE.MeshPhysicalMaterial({color:0xa6cefa,metalness:1,roughness:.11,envMap:studio,envMapIntensity:1.6,clearcoat:1});
  const brushed=new THREE.MeshPhysicalMaterial({color:0x8ca6d8,metalness:1,roughness:.23,envMap:studio,envMapIntensity:1.35});
  const cobalt=new THREE.MeshPhysicalMaterial({color:0x133b6c,metalness:.65,roughness:.19,clearcoat:1,envMap:studio});
  const lilac=new THREE.MeshPhysicalMaterial({color:0xb393d4,metalness:.8,roughness:.13,clearcoat:1,envMap:studio});
  const rubber=new THREE.MeshStandardMaterial({color:0x13283d,roughness:.7});
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=root){materials.add(m);const o=new THREE.Mesh(g,m);parent.add(o);return o;}
  function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=root){const o=mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(w,h,d)*.24),m,parent);o.position.set(x,y,z);return o;}
  function cylinder(r:number,h:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=root){const o=mesh(new THREE.CylinderGeometry(r,r,h,64),m,parent);o.position.set(x,y,z);return o;}
  function ring(r:number,t:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=root){const o=mesh(new THREE.TorusGeometry(r,t,10,128),m,parent);o.rotation.x=-Math.PI/2;o.position.set(x,y,z);return o;}

  // One bent sheet, open through the back, with a break between the two lower shelves.
  const sheet=new THREE.Shape();sheet.moveTo(-.45,-1.8);sheet.lineTo(-2.98,-1.8);sheet.quadraticCurveTo(-3.4,-1.8,-3.4,-1.38);
  sheet.lineTo(-3.4,.83);sheet.quadraticCurveTo(-3.4,1.25,-2.98,1.25);sheet.lineTo(2.98,1.25);sheet.quadraticCurveTo(3.4,1.25,3.4,.83);
  sheet.lineTo(3.4,-1.38);sheet.quadraticCurveTo(3.4,-1.8,2.98,-1.8);sheet.lineTo(.45,-1.8);sheet.lineTo(.45,-1.65);sheet.lineTo(2.98,-1.65);
  sheet.quadraticCurveTo(3.25,-1.65,3.25,-1.38);sheet.lineTo(3.25,.83);sheet.quadraticCurveTo(3.25,1.1,2.98,1.1);sheet.lineTo(-2.98,1.1);
  sheet.quadraticCurveTo(-3.25,1.1,-3.25,.83);sheet.lineTo(-3.25,-1.38);sheet.quadraticCurveTo(-3.25,-1.65,-2.98,-1.65);sheet.lineTo(-.45,-1.65);sheet.closePath();
  const shell=new THREE.ExtrudeGeometry(sheet,{depth:2.8,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:3,steps:1,curveSegments:20});shell.translate(0,0,-1.4);mesh(shell,chrome);
  for(const side of [-1,1]){box(.14,.22,2.8,side*.48,-1.61,0,chrome);box(.018,1.85,2.3,side*3.406,-.25,0,brushed);}

  for(const x of [-2.36,2.36])for(const z of [-1.12,1.12]){cylinder(.24,.13,x,1.32,z,rubber);ring(.23,.022,x,1.37,z,chrome);}
  box(5.7,.3,3.25,0,1.54,0,cobalt);box(5.61,.035,3.16,0,1.707,0,brushed);
  box(5.35,.025,.035,0,1.52,1.638,lilac);
  cylinder(1.4,.09,-.68,1.77,0,chrome);cylinder(1.32,.035,-.68,1.83,0,rubber);ring(1.37,.022,-.68,1.815,0,chrome);
  cylinder(.085,.1,-.68,1.87,0,chrome).userData.action='seed';
  const platterMarks=new THREE.InstancedMesh(new THREE.BoxGeometry(.023,.025,.055),chrome,112);materials.add(chrome);root.add(platterMarks);
  const instance=new THREE.Object3D();for(let i=0;i<112;i++){const a=i/112*Math.PI*2;instance.position.set(-.68+Math.cos(a)*1.395,1.77,Math.sin(a)*1.395);instance.rotation.y=-a;instance.updateMatrix();platterMarks.setMatrixAt(i,instance.matrix);}
  const arm=new THREE.Group();arm.position.set(1.95,1.78,-1.02);root.add(arm);
  cylinder(.24,.13,0,0,0,cobalt,arm);cylinder(.13,.22,0,.13,0,chrome,arm);ring(.18,.026,0,.18,0,lilac,arm);
  const armPath=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.23,0),new THREE.Vector3(-.06,.23,.45),new THREE.Vector3(-.12,.2,1.2),new THREE.Vector3(-.45,.16,1.68)]);
  mesh(new THREE.TubeGeometry(armPath,40,.034,10,false),chrome,arm);box(.22,.08,.34,-.46,.13,1.72,cobalt,arm);box(.06,.08,.06,-.46,.055,1.76,lilac,arm);
  const weight=cylinder(.14,.27,0,.24,-.24,chrome,arm);weight.rotation.x=Math.PI/2;
  box(.4,.015,.085,2.37,1.74,.65,chrome);box(.03,.065,.1,2.37,1.76,.65,lilac);

  const display=document.createElement('canvas');display.width=1024;display.height=128;
  const displayMap=new THREE.CanvasTexture(display);displayMap.colorSpace=THREE.SRGBColorSpace;textures.add(displayMap);
  const lcd=mesh(new THREE.PlaneGeometry(2.3,.25),new THREE.MeshBasicMaterial({map:displayMap,toneMapped:false}));lcd.position.set(.12,1.54,1.697);
  for(const [x,action] of [[-2.45,'previous'],[-1.97,'next'],[1.97,'confirm'],[2.45,'eject']] as const){
    const button=cylinder(.14,.045,x,1.75,1.27,action==='confirm'?lilac:chrome);button.userData.action=action;
    const stamp=document.createElement('canvas');stamp.width=stamp.height=64;const c=stamp.getContext('2d')!;c.fillStyle='#17345c';c.font='28px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(action==='confirm'?'▶':action==='eject'?'↑':action==='previous'?'‹':'›',32,32);
    const map=new THREE.CanvasTexture(stamp);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);const label=mesh(new THREE.PlaneGeometry(.19,.19),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));label.rotation.x=-Math.PI/2;label.position.set(x,1.775,1.27);label.userData.action=action;
  }

  const sleeves: {group:THREE.Group;x:number;index:number;texture:THREE.CanvasTexture;print:THREE.MeshPhysicalMaterial}[]=[];
  const sleeveRoot=new THREE.Group();root.add(sleeveRoot);
  function cover(track:Track,index:number){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d')!;
    const palettes=[['#c9f3ff','#173d82','#a8abf2'],['#142f70','#a9dfff','#e9b8e8'],['#e2d4f5','#255f8e','#f1faff'],['#9fdadf','#192c65','#d3b9fa']];
    const [a,b,d]=palettes[index%palettes.length];const g=c.createLinearGradient(0,0,512,512);g.addColorStop(0,a);g.addColorStop(.55,b);g.addColorStop(1,d);c.fillStyle=g;c.fillRect(0,0,512,512);
    c.strokeStyle='#d9f6ff88';c.lineWidth=1;for(let i=0;i<16;i++){c.beginPath();c.moveTo(0,i*36);c.bezierCurveTo(150,i*25,340,510-i*25,512,i*36);c.stroke();}
    c.save();c.translate(256,230);c.rotate((index%5)*.34-.4);
    for(let i=0;i<5;i++){const metal=c.createLinearGradient(-170,-140,150,160);metal.addColorStop(0,'#112856');metal.addColorStop(.28,'#99d7fa');metal.addColorStop(.47,'#fff');metal.addColorStop(.53,'#6475a2');metal.addColorStop(.8,'#e7bbef');metal.addColorStop(1,'#effcff');c.strokeStyle=metal;c.lineWidth=12-i*1.7;c.beginPath();c.ellipse(0,0,180-i*20,75+i*13,i*.3,0,Math.PI*2);c.stroke();}c.restore();
    c.fillStyle='#edf6ff';c.font='15px monospace';c.fillText(`OPTICAL / ${String(index+1).padStart(2,'0')}`,24,32);
    c.fillStyle='#0a2446e8';c.fillRect(0,370,512,142);c.fillStyle='#e9faff';c.font='600 32px Manrope,sans-serif';
    const words=track.title.split(' ');let line='',y=412;for(const word of words){if(c.measureText(line+word).width>460&&line){c.fillText(line.trim(),24,y);line='';y+=35;if(y>447)break;}line+=word+' ';}if(y<=447)c.fillText(line.trim(),24,y,460);
    c.font='20px Manrope,sans-serif';c.fillStyle='#b9d7ff';c.fillText(artists(track),24,487,460);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return map;
  }
  function clearSleeves(){for(const s of sleeves){s.group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});s.print.dispose();s.texture.dispose();materials.delete(s.print);}sleeves.length=0;sleeveRoot.clear();}

  const sunDirection=new THREE.Vector3(-.66,.065,-.75).normalize();
  const tuning=Object.fromEntries(Object.entries(defaultEnvironment).map(([key,value])=>[key,{value}]));
  const tuningShader=`uniform float saturation,brightness,accents,haze,sun,elevation,reflection,ripples,speed;
    vec3 grade(vec3 color){return max(vec3(0.),mix(vec3(dot(color,vec3(.2126,.7152,.0722))),color,saturation))*brightness;}`;
  const sky=mesh(new THREE.SphereGeometry(950,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{...tuning,uSun:{value:sunDirection}},
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`${tuningShader} uniform vec3 uSun;varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float height=max(d.y,0.);float alignment=max(dot(d,uSun),0.);
      vec3 color=mix(vec3(.12,.32,.65),vec3(.025,.16,.55),smoothstep(0.,.45,height));
      color=mix(color,vec3(.48,.08,.42),pow(alignment,10.)*.65*accents);
      color+=sun*(vec3(.32,.065,.23)*pow(alignment,35.)*accents+vec3(.4,.21,.26)*pow(alignment,450.));
      color=mix(color,vec3(.65,.72,.83),haze*exp(-height*8.));
      color+=sun*vec3(1.8,1.55,1.4)*smoothstep(.9995,.99985,alignment);
      gl_FragColor=vec4(grade(color),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}));
  const reflectionSize=software?256:innerWidth<600?512:1024;
  // shortcut: planar reflections approximate these small swells; steep waves would need a different reflector.
  const water=new Reflector(createWaterGeometry(software,innerWidth<600),{textureWidth:reflectionSize,textureHeight:reflectionSize,multisample:0,clipBias:.002,
    shader:{uniforms:{...tuning,color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uTime:{value:0},uSun:{value:sunDirection}},
      vertexShader:waterVertex,fragmentShader:waterFragment(tuningShader,software)}});
  water.rotation.x=-Math.PI/2;water.position.y=-1.86;scene.add(water);
  const waterMaterial=water.material as THREE.ShaderMaterial;
  const skyMaterial=sky.material as THREE.ShaderMaterial;

  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.15,0);controls.enablePan=false;controls.rotateSpeed=.65;controls.zoomSpeed=.65;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=10;controls.maxDistance=30;controls.enableDamping=true;controls.dampingFactor=.09;
  controls.addEventListener('change',()=>onViewChange(controls.getAzimuthalAngle()));
  let state:RackState|undefined,queued:RackState|undefined,signature='',hoverIndex=-1,operation=-1,time=0,waterTime=0,flightTime=0,initialized=false,aspect=0,inFlight=false;
  let frames:TransferFrame[]=[],framing=1,viewRevision=0,functional=false;
  const sample:TransferFrame={seconds:0,position:new THREE.Vector3(),rotation:new THREE.Quaternion(),sleeveZ:0,sleeveYaw:Math.PI/2,rings:1,phase:'browsing'};
  const identity=new THREE.Quaternion(),targetRotation=new THREE.Quaternion();
  const position=new THREE.Vector3(),scale=new THREE.Vector3(.62,.62,.62),center=new THREE.Vector3(),cameraOffset=new THREE.Vector3(),spherical=new THREE.Spherical(),ray=new THREE.Raycaster(),screenPoint=new THREE.Vector2();
  function frameCamera(){const distance=19.5/Math.min(1,camera.aspect/.95);camera.position.set(.53,.2,.79).normalize().multiplyScalar(distance).add(controls.target);framing=1;controls.minDistance=distance*.6;controls.maxDistance=distance*1.65;camera.far=2000;
    if(functional){const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight;camera.setViewOffset(width,height,width>900?210:0,width>900?0:height*.2,width,height);}else camera.clearViewOffset();
    camera.updateProjectionMatrix();controls.update();aspect=camera.aspect;}
  function begin(eject:boolean){
    const s=sleeves.find(item=>item.index===state?.index),x=s?.x??-1.5;
    frames=rackTransfer(featured.position,featured.quaternion,x,eject);frames[0].rings=orbitFinish.opacity;
    frames[0].sleeveZ=s?.group.position.z??0;frames[0].sleeveYaw=s?.group.rotation.y??Math.PI/2;
    flightTime=0;inFlight=true;
  }
  function setState(value:RackState|undefined){
      const settings=value?.environment??defaultEnvironment;
      for(const key of Object.keys(defaultEnvironment) as (keyof EnvironmentSettings)[]){skyMaterial.uniforms[key].value=settings[key];waterMaterial.uniforms[key].value=settings[key];}
      sunDirection.set(-.66,settings.elevation,-.75).normalize();waterMaterial.uniforms.uSun.value.copy(sunDirection);
      functional=!!value?.functional;
      if(value&&value.viewRevision!==undefined&&value.viewRevision!==viewRevision){viewRevision=value.viewRevision;frameCamera();}
      if(value&&inFlight){queued=value;return;}
      root.visible=water.visible=!!value;controls.enabled=!!value;if(!value){state=undefined;return;}
      if(!initialized){featured.position.set(-.68,3.6,0);featured.scale.copy(scale);featured.quaternion.copy(floatRotation);disc.parent!.quaternion.identity();disc.position.set(0,0,0);disc.rotation.x=disc.rotation.y=0;frameCamera();initialized=true;}
      const start=Math.floor(value.index/8)*8,next=value.tracks.slice(start,start+8).map(t=>t.recording_id+t.title+artists(t)).join('|');
      if(signature!==`${start}:${next}`){signature=`${start}:${next}`;clearSleeves();const visible=value.tracks.slice(start,start+8),left=Math.ceil(visible.length/2);
        visible.forEach((track,i)=>{const side=i<left?-1:1,slot=i<left?i:i-left,count=side<0?left:visible.length-left,x=side*1.9+(slot-(count-1)/2)*.49;
          const group=new THREE.Group();group.position.set(x,-.25,0);group.rotation.y=Math.PI/2;const texture=cover(track,start+i),print=new THREE.MeshPhysicalMaterial({map:texture,roughness:.36,metalness:.06,clearcoat:.35,envMap:studio});
          for(const z of [-.045,.045]){const face=box(2.65,2.65,.018,0,0,z,print,group);face.userData.index=start+i;face.userData.action=`preview:${track.recording_id}`;}
          // The local left edge is the record opening; the other three edges are sealed.
          const sideEdge=box(.025,2.65,.09,1.325,0,0,cobalt,group);sideEdge.userData.index=start+i;sideEdge.userData.action=`preview:${track.recording_id}`;
          for(const y of [-1.325,1.325])box(2.65,.025,.09,0,y,0,cobalt,group);
          sleeveRoot.add(group);sleeves.push({group,x,index:start+i,texture,print});});}
      const changed=operation!==value.operation,wasBrowsing=state?.browsing??true;state=value;
      if(!value.browsing&&(changed||wasBrowsing))begin(false);else if(value.browsing&&!wasBrowsing)begin(true);operation=value.operation;
      const c=display.getContext('2d')!;c.fillStyle='#0b2746';c.fillRect(0,0,1024,128);c.fillStyle='#bce7ff';c.font='23px monospace';c.fillText(value.functional?(value.seed?'STARTING SONG / SHARED LISTENING':'CHOOSE A SONG / DISCOVER'):`OPTICAL STUDY / ${value.index+1}:${value.tracks.length}`,24,38);c.font='29px Manrope,sans-serif';c.fillText((value.functional?value.seed?.title:undefined)??value.tracks[value.index]?.title??'Choose a song',24,91,976);displayMap.needsUpdate=true;
  }
  return {
    setState,
    pose(dt:number,moving:boolean,pointer:THREE.Vector2):string|undefined{
      if(!state)return;controls.enableDamping=moving;
      if(Math.abs(aspect-camera.aspect)>.025)frameCamera();controls.update();
      const ease=moving?1-Math.exp(-dt*13):1;if(moving){time+=dt;flightTime+=dt;}
      const transferring=inFlight;
      // Reserve room for the extracted disc without changing the user's orbit angle or zoom choice.
      const nextFraming=THREE.MathUtils.lerp(framing,moving&&inFlight?1.3:1,moving?1-Math.exp(-dt*5):1);
      camera.position.sub(controls.target).multiplyScalar(nextFraming/framing).add(controls.target);framing=nextFraming;controls.update();
      if(transferring){inFlight=!sampleTransfer(frames,moving?flightTime:Infinity,sample);
        featured.position.copy(sample.position);featured.quaternion.copy(sample.rotation);
      }else if(state.browsing){position.set(-.68,3.6+Math.sin(time*.8)*.045,0);featured.position.lerp(position,ease);targetRotation.setFromEuler(new THREE.Euler(.12+Math.sin(time*.3)*.035,.42+time*.04+pointer.x*.06,.12+(1-Math.cos(time*.04))*Math.PI/2));}
      else{position.set(-.68,1.865,0);featured.position.lerp(position,ease);targetRotation.copy(seatedRotation);}
      if(!transferring)featured.quaternion.slerp(targetRotation,ease);featured.scale.copy(scale);disc.parent!.quaternion.copy(identity);disc.position.copy(center);disc.rotation.x=disc.rotation.y=0;
      if(moving)disc.rotation.z+=dt*(inFlight?.16:state.browsing?.1:1.2);
      orbitFinish.opacity=transferring?sample.rings:state.browsing?1:0;orbits.forEach(o=>{o.visible=orbitFinish.opacity>.003;});
      arm.rotation.y=THREE.MathUtils.lerp(arm.rotation.y,!state.browsing&&!inFlight?.22:0,ease);
      for(const s of sleeves){const selected=s.index===state.index;
        s.group.position.x=s.x;
        if(selected&&transferring){s.group.position.z=sample.sleeveZ;s.group.rotation.y=sample.sleeveYaw;}
        else{s.group.position.z=THREE.MathUtils.lerp(s.group.position.z,!inFlight&&state.functional&&selected?.55:!inFlight&&s.index===hoverIndex?.28:0,ease);s.group.rotation.y=THREE.MathUtils.lerp(s.group.rotation.y,Math.PI/2,ease);}}
      if(moving&&state.waterMotion!==false)waterTime+=dt*(state.environment??defaultEnvironment).speed;
      waterMaterial.uniforms.uTime.value=waterTime;
      const phase=inFlight?sample.phase:state.browsing?'browsing':'loaded';
      if(!inFlight&&queued){const next=queued;queued=undefined;setState(next);if(!moving&&inFlight)return this.pose(0,false,pointer);}
      return phase;
    },
    pick(x:number,y:number){screenPoint.set(x,y);ray.setFromCamera(screenPoint,camera);const hit=ray.intersectObjects(state?.functional?[root,featured]:root.children,true)[0];if(state?.functional&&hit){let item:THREE.Object3D|null=hit.object;while(item){if(item===featured)return {action:'seed'};item=item.parent;}}return hit?.object.userData as {index?:number;action?:string}|undefined;},
    hover(index:number){hoverIndex=index;},
    orbit(dx:number,dy:number){cameraOffset.copy(camera.position).sub(controls.target);spherical.setFromVector3(cameraOffset);spherical.theta+=dx;spherical.phi=THREE.MathUtils.clamp(spherical.phi+dy,controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(cameraOffset.setFromSpherical(spherical)).add(controls.target);controls.update();},
    dispose(){controls.dispose();clearSleeves();water.dispose();water.geometry.dispose();scene.remove(water);root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.remove(root);}
  };
}
