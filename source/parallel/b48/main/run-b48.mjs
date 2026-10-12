#!/usr/bin/env node
/** Offline-only replay of B48, no game / bridge / network imports. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertReferencePins,buildB47FromSource} from '../../b47/main/run-b47.mjs';
import {compileB48,verifyB48} from './compile-b48.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB48FromSource(){
 assertReferencePins();
 const {report:b47,b46,b45,structure,main}=buildB47FromSource();
 const report=compileB48(b47,b46,b45,structure,main);
 verifyB48(report,b47,b46,b45,structure,main);
 return {report,b47,b46,b45,structure,main};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B48_EXPORT_FLAG_ONLY');
 const {report}=buildB48FromSource();
 if(args.length)fs.writeFileSync(path.join(ROOT,'B48_CANONICAL_GEOMETRY_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B48_HERMETIC_GEOMETRY_PASS',JSON.stringify({totals:report.totals,
  gateStatuses:report.blockers.M4Gates.map(x=>x.status),readiness:report.readiness,operations:0}));
}
