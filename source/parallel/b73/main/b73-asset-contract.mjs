/** B73 static source closure contract. No production source execution. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const RUNTIME_ASSETS=Object.freeze([
 'catalog/education.json',
 'catalog/semantic.json',
 'catalog/semantic-overrides.json',
 'catalog/sources/manifest.json',
 'catalog/sources/IntrinsicBlockStatesList.md',
 'catalog/sources/BlockStateAndTraitListings.md',
]);
export const PINNED_5=Object.freeze({
 'engine/src/general-building-planner.js':'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 'engine/src/building-grammar.js':'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a',
 'engine/src/architectural-quality.js':'5cadf22d51867a18fd35f6e9ec2e1318732eca2f2e666d2cfc4b2b32cbede530',
 'modules/architectural-library.js':'19fa126051a687bfb5c5f6bdf199a6d42aa70b475d908dd38a99e9f354532eee',
 'styles/urban_japanese.json':'cefb23009e7a96f8d5900e44242c5fa426646be64c5391048f52e29506f1ceec',
});
export const sha=b=>createHash('sha256').update(b).digest('hex');
function realRegular(root,rel){
 if(!/^[a-z0-9_/.\-]+$/i.test(rel)||rel.startsWith('/')||rel.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('UNSAFE_RELATIVE_PATH');
 const abs=path.resolve(root,rel);if(!abs.startsWith(path.resolve(root)+path.sep))throw Error('PATH_ESCAPE');
 let current=abs;while(current!==path.dirname(current)){
  if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('SYMLINK_REFUSED');current=path.dirname(current);
 }
 if(!fs.existsSync(abs))return null;
 const stat=fs.lstatSync(abs);if(!stat.isFile()||stat.size>2_000_000)throw Error('BAD_FILE_TYPE_SIZE');
 return fs.readFileSync(abs);
}
export function inspectB73Sources(runtime,manifest){
 const expected=new Map([...Object.entries(PINNED_5),...manifest.files.map(x=>[x.path,x.sha256])]);
 if(manifest.schema!=='minecraftaibuilder-b72-additive-source-dependency-v1'||manifest.rootPinsVerified!==5||
 manifest.missing?.length||manifest.files?.length!==25||expected.size!==30)throw Error('BAD_DEPENDENCY_MANIFEST');
 const mismatches=[];
 for(const [p,h] of expected){const b=realRegular(runtime,p);if(!b||sha(b)!==h)mismatches.push(p);}
 const assets=RUNTIME_ASSETS.map(p=>({path:p,available:realRegular(runtime,p)!==null}));
 if(mismatches.length)throw Error('B73_PINNED_SOURCE_MISMATCH '+mismatches.join(','));
 const closureMissing=[];
 for(const [p] of expected){if(!p.endsWith('.js')&&!p.endsWith('.mjs'))continue;
  const txt=realRegular(runtime,p).toString('utf8');
  for(const m of txt.matchAll(/\b(?:import|export)\s+(?:[^\n;]*?\s+from\s*)?["']([^"']+)["']/g)){
   const spec=m[1];if(spec.startsWith('node:')){
    if(!['node:fs','node:fs/promises','node:path','node:url','node:crypto'].includes(spec))closureMissing.push(p+' -> '+spec);continue;
   }
   if(!spec.startsWith('.')){closureMissing.push(p+' -> '+spec);continue;}
   const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(p),spec));
   if(!expected.has(resolved))closureMissing.push(p+' -> '+resolved);
  }
 }
 return {pinnedSourceCount:30,pinnedSourcesMismatch:0,staticESMClosureMissing:closureMissing,
  runtimeAssets:assets,missingRuntimeAssets:assets.filter(x=>!x.available).map(x=>x.path),
  note:'Six catalog files are required for runtime imports; lexical closure alone is insufficient.'};
}
