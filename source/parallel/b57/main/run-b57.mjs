#!/usr/bin/env node
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildB53FromSource} from '../../b53/main/run-b53.mjs';
import {buildB56FromSource} from '../../b56/main/run-b56.mjs';
import {compileB57,verifyB57} from './compile-b57.mjs';
import {renderB57} from './render-b57.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB57FromSource(){
 const {report:b53}=buildB53FromSource();
 const {report:b56}=buildB56FromSource();
 const report=compileB57(b53,b56);verifyB57(report,b53,b56);
 return {report,b53,b56};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B57_USAGE');
 const {report}=buildB57FromSource();
 if(args.length){fs.writeFileSync(path.join(DIR,'B57_ENVELOPE_TOPOLOGY.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(DIR,'B57_OFFLINE_3D_REVIEW.html'),renderB57(report),{flag:'wx'});}
 console.log('B57_TOPOLOGY_PASS',JSON.stringify(report.totals));
}
