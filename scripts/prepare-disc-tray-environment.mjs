import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory='public/artwork/disc-tray/environment/';
const source=await readFile(directory+'refracted-horizon.png');
const metadata=await sharp(source).metadata();
assert(metadata.width>=2048 && metadata.height>=1000, 'Retain the completed high-resolution original.');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[{path:directory+'refracted-horizon.png',width:metadata.width,height:metadata.height,bytes:source.length,sha256:sha256(source),role:'Unmodified Higgsfield original; not loaded by the interface.'}];
for(const [name,width,height,position,role] of [
  ['environment-wide',1920,1080,'centre','Page and hero environment'],
  ['environment-mobile',720,1280,'east','Narrow page background'],
  ['chrome-detail',640,640,'east','About introduction detail'],
]) {
  const bytes=await sharp(source).resize(width,height,{fit:'cover',position,withoutEnlargement:true}).webp({quality:84}).toBuffer();
  const size=await sharp(bytes).metadata();
  assert(bytes.length<150_000, 'Keep decorative derivatives small.');
  assert(size.width===width && size.height===height);
  const path=directory+name+'.webp'; await writeFile(path,bytes);
  assets.push({path,width,height,bytes:bytes.length,sha256:sha256(bytes),role,crop:position});
}
await writeFile('docs/art-direction/disc-tray-environment-assets.json',JSON.stringify({
  observed_at:new Date().toISOString(),job_id:'1f71568c-fa71-414d-9401-dbee5900ce09',model:'nano_banana_2_1',
  request:'disc-tray-environment-request.json',origin:'One completed user-authorized Higgsfield generation. Three resized/cropped WebP derivatives share that source; no reference pixels or additional generated originals.',
  assets,
},null,2)+'\n');
console.log(JSON.stringify(assets.map(({path,bytes,width,height})=>({path,bytes,width,height})),null,2));
