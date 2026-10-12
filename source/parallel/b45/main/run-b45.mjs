#!/usr/bin/env node
/** B45 deterministic offline compiler; optional output is exclusive-create into own folder. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inputsFromSource,buildFromSource} from '../../b44/main/run-b44-main.mjs';
import {compileB45,verifyB45,objForBuilding} from './compile-b45.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB45FromSource(){
 const i=inputsFromSource(),main=buildFromSource();const report=compileB45(i.b,main);
 verifyB45(report,i.b,main);return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length&&! (args.length===1&&args[0]==='--export'))throw Error('B45_ONLY_EXPORT_FLAG');
 const report=buildB45FromSource();
 if(args.length){
  const files=[['B45_DESIGN_COMPILATION.json',JSON.stringify(report,null,2)+'\n'],
   ...report.buildings.map(b=>['B45_PREVIEW_'+b.id.replaceAll('/','_')+'.obj',objForBuilding(b)])];
  if(files.some(([n])=>fs.existsSync(path.join(DIR,n))))throw Error('B45_OUTPUT_EXISTS');
  for(const [n,data] of files)fs.writeFileSync(path.join(DIR,n),data,{flag:'wx'});
 }
 console.log('B45_DESIGN_COMPILER_PASS',JSON.stringify({totals:report.totals,
  blocked:report.blockers.M4Gates.length,operations:report.buildOperations,sha:report.reportSha256}));
}
