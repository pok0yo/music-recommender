import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory='public/artwork/disc-tray/environment/';
const icy=process.argv.includes('--icy-water');
const original=icy?'icy-water-original.png':'refracted-horizon.png';
const source=await readFile(directory+original);
const metadata=await sharp(source).metadata();
assert(metadata.width>=(icy?1600:2048) && metadata.height>=(icy?900:1000), 'Retain the completed original at native resolution.');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[{path:directory+original,width:metadata.width,height:metadata.height,bytes:source.length,sha256:sha256(source),role:`Unmodified ${icy?'built-in image_gen':'Higgsfield'} original; not loaded by the interface.`}];
for(const [name,width,height,position,role] of icy?[
  ['icy-water-wide',1672,941,'centre','Left-weighted page environment'],
  ['icy-water-mobile',528,940,'west','Narrow crop retains the left metal and water'],
  ['icy-water-detail',640,640,'west','About introduction detail'],
]:[
  ['environment-wide',1920,1080,'centre','Page and hero environment'],
  ['environment-mobile',720,1280,'east','Narrow page background'],
  ['chrome-detail',640,640,'east','About introduction detail'],
]) {
  const bytes=await sharp(source).resize(width,height,{fit:'cover',position,withoutEnlargement:true}).webp({quality:84}).toBuffer();
  const size=await sharp(bytes).metadata();
  assert(bytes.length<(icy?400_000:150_000), 'Keep decorative derivatives small.');
  assert(size.width===width && size.height===height);
  const path=directory+name+'.webp'; await writeFile(path,bytes);
  assets.push({path,width,height,bytes:bytes.length,sha256:sha256(bytes),role,crop:position});
}
await writeFile('docs/art-direction/'+(icy?'icy-water-assets.json':'disc-tray-environment-assets.json'),JSON.stringify({
  observed_at:new Date().toISOString(),...(icy?{tool:'built-in image_gen',native_resolution:'1672x941; not upscaled to claim 2K'}:{job_id:'1f71568c-fa71-414d-9401-dbee5900ce09',model:'nano_banana_2_1'}),
  request:icy?'icy-water-request.json':'disc-tray-environment-request.json',origin:`One completed user-authorized ${icy?'built-in image_gen':'Higgsfield'} generation. Three resized/cropped WebP derivatives share that source; no reference pixels or additional generated originals.`,
  assets,
},null,2)+'\n');
console.log(JSON.stringify(assets.map(({path,bytes,width,height})=>({path,bytes,width,height})),null,2));
