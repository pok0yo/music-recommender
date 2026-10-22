import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

const directory='public/artwork/disc-tray/accents';
const modules={
  '/three.js':'node_modules/three/build/three.module.js',
  '/three.core.js':'node_modules/three/build/three.core.js',
  '/room.js':'node_modules/three/examples/jsm/environments/RoomEnvironment.js',
  '/geometry-utils.js':'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',
};
const server=createServer(async(req,res)=>{
  try {
    if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<script type="importmap">{"imports":{"three":"/three.js"}}</script>');return;}
    const file=modules[req.url];if(!file){res.writeHead(404).end();return;}
    res.setHeader('Content-Type','text/javascript');res.end(await readFile(file));
  }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({channel:process.env.CI?undefined:'chrome'});
  await mkdir(directory,{recursive:true});
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const assets=[];
  for(const name of ['chrome-orbit','liquid-comma','aero-spine']){
    const data=await page.evaluate(async(name)=>{
      const THREE=await import('three');
      const {RoomEnvironment}=await import('/room.js');
      const {mergeVertices}=await import('/geometry-utils.js');
      const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
      renderer.setSize(2048,2048);renderer.setClearColor(0,0);
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
      const scene=new THREE.Scene();
      const camera=new THREE.OrthographicCamera(-2.8,2.8,2.8,-2.8,.1,30);camera.position.set(0,0,9);
      const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
      const environment=pmrem.fromScene(room,.025);room.dispose();pmrem.dispose();scene.environment=environment.texture;
      const key=new THREE.DirectionalLight(0xc6e3ff,5);key.position.set(-3,4,6);scene.add(key);
      const rim=new THREE.DirectionalLight(0xffffff,3);rim.position.set(4,-2,3);scene.add(rim);
      const chrome=new THREE.MeshPhysicalMaterial({color:0xb5c9e0,metalness:1,roughness:.07,clearcoat:1,envMapIntensity:1.2});
      const sculpture=new THREE.Group();scene.add(sculpture);
      function bead(x,y,z,r){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,48,32),chrome);mesh.position.set(x,y,z);sculpture.add(mesh);return mesh;}
      function ribbon(points,radius){
        const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),steps=120,sides=24;
        const frames=curve.computeFrenetFrames(steps,false),vertices=[],indices=[];
        for(let i=0;i<=steps;i++){
          const t=i/steps,p=curve.getPointAt(t),r=.003+radius*Math.pow(Math.sin(Math.PI*t),.75);
          for(let j=0;j<=sides;j++){
            const angle=j/sides*Math.PI*2;
            const point=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r).addScaledVector(frames.binormals[i],Math.sin(angle)*r*.64);
            vertices.push(point.x,point.y,point.z);
            if(i<steps&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
          }
        }
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
        sculpture.add(new THREE.Mesh(geometry,chrome));
      }
      if(name==='chrome-orbit'){
        const shape=new THREE.Shape();shape.moveTo(0,1.85);
        shape.bezierCurveTo(.09,.3,.27,.12,1.5,0);shape.bezierCurveTo(.3,-.11,.09,-.3,0,-1.85);
        shape.bezierCurveTo(-.09,-.3,-.27,-.12,-1.5,0);shape.bezierCurveTo(-.3,.11,-.09,.3,0,1.85);
        const outline=shape.getPoints(48).slice(0,-1),rings=32,count=outline.length,vertices=[],indices=[];
        for(const side of [1,-1])for(let i=0;i<=rings;i++)for(const p of outline){
          const r=i/rings;vertices.push(p.x*r,p.y*r,side*(.025+.34*Math.pow(1-r*r,.7)));
        }
        const offset=(rings+1)*count;
        for(let side=0;side<2;side++)for(let i=0;i<rings;i++)for(let j=0;j<count;j++){
          const a=side*offset+i*count+j,c=side*offset+i*count+(j+1)%count,b=a+count,d=c+count;
          indices.push(...(side?[a,b,c,b,d,c]:[a,c,b,b,c,d]));
        }
        for(let j=0;j<count;j++){const a=rings*count+j,c=rings*count+(j+1)%count;indices.push(a,a+offset,c,c,a+offset,c+offset);}
        const sourceGeometry=new THREE.BufferGeometry();sourceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));sourceGeometry.setIndex(indices);
        const starGeometry=mergeVertices(sourceGeometry);sourceGeometry.dispose();starGeometry.computeVertexNormals();
        const star=new THREE.Mesh(starGeometry,chrome);
        star.rotation.set(.16,-.32,-.3);sculpture.add(star);
        const orbit=new THREE.Mesh(new THREE.TorusGeometry(1.8,.045,20,192),chrome);orbit.scale.x=1.23;orbit.rotation.set(1.05,.18,-.4);sculpture.add(orbit);
        bead(1.82,.35,.25,.14);
      }else if(name==='liquid-comma'){
        ribbon([[-1.9,-.8,0],[-1.1,.7,.2],[.35,1.2,0],[1.25,.25,.1],[.5,-.55,.2],[-.15,-.1,.3]],.27);
        ribbon([[-1.7,-1.1,.15],[-.7,-1.5,.15],[.7,-1.25,0],[1.45,-.5,.1]],.13);
        bead(-1.5,.85,.05,.17).scale.set(.8,1.5,1);bead(1.4,1.2,0,.11);bead(.35,-1.8,.1,.13);
        sculpture.rotation.set(.15,-.25,-.24);
      }else{
        ribbon([[-1.1,-2.3,0],[-.65,-1.1,.1],[.55,-.3,.2],[.7,.8,0],[1.2,2.35,0]],.21);
        ribbon([[-1.4,.9,.05],[-.5,.65,.1],[.1,.05,.2],[1.4,-.4,0]],.19);
        ribbon([[-.95,-.9,0],[-1.2,-.05,.05],[-.6,.45,.1],[.35,.2,.2]],.12);
        sculpture.rotation.set(-.12,.25,-.3);
      }
      renderer.render(scene,camera);const output=renderer.domElement.toDataURL('image/png');
      scene.traverse(object=>{if(object.isMesh)object.geometry.dispose();});chrome.dispose();environment.dispose();renderer.dispose();renderer.forceContextLoss();
      return output;
    },name);
    const original=Buffer.from(data.split(',')[1],'base64');
    const {data:pixels,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let visible=0,clear=0;
    for(let i=3;i<pixels.length;i+=info.channels){if(pixels[i]>20)visible++;if(pixels[i]===0)clear++;}
    assert(visible>info.width*info.height*.015&&clear>info.width*info.height*.55,'Export must contain a free-standing transparent sculpture.');
    await writeFile(`${directory}/${name}.png`,original);
    const bytes=await sharp(original).resize(960,960).webp({quality:90,alphaQuality:100}).toBuffer();
    assert(bytes.length<180_000,'Decorative asset exceeds its runtime byte budget.');
    await writeFile(`${directory}/${name}.webp`,bytes);
    const sha256=buffer=>createHash('sha256').update(buffer).digest('hex');
    assets.push({name,master:{path:`${directory}/${name}.png`,width:2048,height:2048,bytes:original.length,sha256:sha256(original)},runtime:{path:`${directory}/${name}.webp`,width:960,height:960,bytes:bytes.length,sha256:sha256(bytes)},visible_fraction:visible/(info.width*info.height)});
    console.log(name+': '+bytes.length+' runtime bytes');
  }
  await writeFile('docs/art-direction/chrome-accents.json',JSON.stringify({observed_at:new Date().toISOString(),origin:'Original locally authored Three.js geometry and physical chrome materials, exported once to transparent PNG and WebP. Reference mood only; no reference pixels. Not AI-generated; no Higgsfield generation submitted. Balance checked:0 image credits.',renderer:'Three.js / Chrome '+browser.version(),license:'Original project geometry; Three.js MIT notice retained in public/third-party/three/LICENSE.',source:'scripts/render-chrome-accents.mjs',source_sha256:createHash('sha256').update(await readFile('scripts/render-chrome-accents.mjs')).digest('hex'),assets},null,2)+'\n');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
