#!/usr/bin/env node
/** B46: pure reproducible computation; --export only on an empty output destination. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputsFromSource,buildFromSource} from '../../b44/main/run-b44-main.mjs';
import {compileB45} from '../../b45/main/compile-b45.mjs';
import {compileB46,verifyB46,objForB46} from './compile-b46.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB46FromSource(){
 const i=inputsFromSource(),main=buildFromSource(),b45=compileB45(i.b,main);
 const out=compileB46(b45,i.b,main);verifyB46(out,b45,i.b,main);return {out,b45};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||args.length===1&&args[0]!=='--export')throw Error('B46_ONLY_EXPORT_FLAG');
 const {out,b45}=buildB46FromSource();
 if(args.length){
  const files=[['B46_PLANNER_GEOMETRY_REVIEW.json',JSON.stringify(out,null,2)+'\n'],
   ...b45.buildings.map(b=>['B46_PREVIEW_'+b.id.replaceAll('/','_')+'.obj',objForB46(b,out)])];
  if(files.some(([n])=>fs.existsSync(path.join(DIR,n))))throw Error('B46_EXPORT_REFUSES_OVERWRITE');
  for(const [n,text] of files)fs.writeFileSync(path.join(DIR,n),text,{flag:'wx'});
 }
 console.log('B46_GEOMETRY_REVIEW_PASS',JSON.stringify({totals:out.totals,
  readiness:out.readiness,blocked:out.blockers.M4Gates.length,operations:0,sha:out.reportSha256}));
}
