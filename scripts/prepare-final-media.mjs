// Safe derivatives only: originals remain untouched, no enlargement.
import sharp from 'sharp';
import {readdir} from 'node:fs/promises';
for(const set of (process.argv.includes('--portrait-only') ? [] : ['awards','events'])) for(const file of await readdir(`assets-src/${set}`)) {
 if(file.startsWith('.'))continue;
 const name=file.replace(/\.(png|jpe?g)$/i,'');
 for(const width of [640,1200]) {
  const base=sharp(`assets-src/${set}/${file}`).rotate().resize({width,withoutEnlargement:true});
  await base.clone().webp({quality:84,effort:5}).toFile(`src/assets/media/${set}/${name}-${width}.webp`);
  await base.clone().avif({quality:58,effort:5}).toFile(`src/assets/media/${set}/${name}-${width}.avif`);
 }
}
// Contract the alpha only, preserving straight-alpha RGBA throughout.
for(const width of [640,1100]) {
 const img=sharp(`src/assets/media/prawal-close-${width}.webp`);
 const alpha=await img.clone().extractChannel('alpha').erode(1).raw().toBuffer();
 const {data,info}=await img.ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<alpha.length;i++)data[i*4+3]=alpha[i];
 const rgba=sharp(data,{raw:{width:info.width,height:info.height,channels:4}});
 await rgba.clone().webp({quality:86,alphaQuality:100,effort:5}).toFile(`src/assets/media/prawal-close-finish-${width}.webp`);
 await rgba.clone().avif({quality:62,effort:5}).toFile(`src/assets/media/prawal-close-finish-${width}.avif`);
}
