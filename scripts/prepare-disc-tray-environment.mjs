import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory='public/artwork/disc-tray/environment/';
if(process.argv.includes('--iridescent')) {
  const assets=[];
  const record=async(path,bytes,role,extra={})=>{
    const {width,height}=await sharp(bytes).metadata();
    await writeFile(path,bytes);
    assets.push({path,width,height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),role,...extra});
  };
  for(const finish of ['hazy','crisp']) {
    const prefix=directory+`iridescent-${finish}`;
    const source=await readFile(prefix+'-original.png');
    const size=await sharp(source).metadata();
    assert(size.width>=1672 && size.height>=941,'Use native originals without enlarging the web derivatives.');
    await record(prefix+'-original.png',source,'Unmodified built-in image_gen edit; not loaded by the interface.',{finish});
    for(const [name,width,height,position] of [['wide',1672,941,'centre'],['mobile',528,940,'west'],['detail',640,640,'west']]) {
      const bytes=await sharp(source).resize(width,height,{fit:'cover',position,withoutEnlargement:true}).webp({quality:90}).toBuffer();
      const dimensions=await sharp(bytes).metadata();
      assert(dimensions.width===width && dimensions.height===height && bytes.length<600_000);
      await record(prefix+`-${name}.webp`,bytes,'Optimized website derivative',{finish,crop:position});
    }
    const export8k=await sharp(source).resize(7680,4320,{fit:'cover',position:'centre',kernel:'lanczos3'}).jpeg({quality:96,chromaSubsampling:'4:4:4'}).toBuffer();
    const exportSize=await sharp(export8k).metadata();
    assert(exportSize.width===7680 && exportSize.height===4320 && export8k.length<30_000_000);
    await record(prefix+'-8k-resampled.jpg',export8k,'8K resampled export; not native8K detail and never loaded by page CSS.',{finish,resampled:true,native_width:size.width,native_height:size.height});
  }
  await writeFile('docs/art-direction/iridescent-background-assets.json',JSON.stringify({observed_at:new Date().toISOString(),tool:'built-in image_gen',request:'iridescent-background-request.json',origin:'Two generated edits: hazy accents from icy-water original; crisp edit from hazy original. 8K JPEGs are Lanczos-resampled exports, not native8K generations.',assets},null,2)+'\n');
  console.log(JSON.stringify(assets.map(({path,width,height,bytes})=>({path,width,height,bytes})),null,2));
  process.exit(0);
}
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
