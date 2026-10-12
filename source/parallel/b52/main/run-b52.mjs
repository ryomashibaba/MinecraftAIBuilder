#!/usr/bin/env node
/** Offline report only. No export unless destination does not exist. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB51FromSource} from '../../b51/main/run-b51.mjs';
import {compileB52,verifyB52} from './compile-b52.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB52FromSource(){
 const {report:b51,b50,b49,b48,b47,b46,b45,structure,main,evidence}=buildB51FromSource();
 const report=compileB52(b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 verifyB52(report,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 return {report,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B52_EXPORT_FLAG_ONLY');
 const {report}=buildB52FromSource();
 if(args.length)fs.writeFileSync(path.join(ROOT,'B52_ARCHITECTURE_PORTFOLIO.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B52_ARCHITECTURE_PORTFOLIO_PASS',JSON.stringify(report.totals));
}
