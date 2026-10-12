#!/usr/bin/env node
/** Offline B51 deterministic readonly report replay. --export works only if file absent. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB50FromSource} from '../../b50/main/run-b50.mjs';
import {compileB51,verifyB51} from './compile-b51.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB51FromSource(){
 const {report:b50,b49,b48,b47,b46,b45,structure,main,evidence}=buildB50FromSource();
 const report=compileB51(b50,b49,b48,b47,b46,b45,structure,main,evidence);
 verifyB51(report,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 return {report,b50,b49,b48,b47,b46,b45,structure,main,evidence};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B51_EXPORT_FLAG_ONLY');
 const {report}=buildB51FromSource();
 if(args.length)fs.writeFileSync(path.join(ROOT,'B51_ARCHITECTURE_CONTRACT_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B51_ARCHITECTURE_CONTRACT_PASS',JSON.stringify(report.totals));
}
