#!/usr/bin/env node
/** B49 offline replay: no Minecraft, file writes only with explicit exclusive --export. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB48FromSource} from '../../b48/main/run-b48.mjs';
import {compileB49,verifyB49} from './compile-b49.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB49FromSource(){
 const {report:b48,b47,b46,b45,structure,main}=buildB48FromSource();
 const report=compileB49(b48,b47,b46,b45,structure,main);
 verifyB49(report,b48,b47,b46,b45,structure,main);
 return {report,b48,b47,b46,b45,structure,main};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B49_EXPORT_FLAG_ONLY');
 const {report}=buildB49FromSource();
 if(args.length)fs.writeFileSync(path.join(ROOT,'B49_ARCHITECTURE_INTERFACE_ATLAS.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B49_ARCHITECTURE_ATLAS_PASS',JSON.stringify({totals:report.totals,
  blockedGates:report.blockers.M4Gates.length,readiness:report.readiness,operations:0}));
}
