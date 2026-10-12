#!/usr/bin/env node
/** Deterministic OFFLINE replay; --export creates new files only. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB52FromSource} from '../../b52/main/run-b52.mjs';
import {compileB53,verifyB53} from './compile-b53.mjs';
import {renderB53} from './render-b53.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB53FromSource(){
 const {report:b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence}=buildB52FromSource();
 const report=compileB53(b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 verifyB53(report,b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence);
 return {report,b52,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length===1&&args[0]!=='--export'))throw Error('B53_EXPORT_FLAG_ONLY');
 const {report}=buildB53FromSource();
 if(args.length){
  fs.writeFileSync(path.join(ROOT,'B53_VISUAL_REVIEW.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(ROOT,'B53_VISUAL_REVIEW.html'),renderB53(report),{flag:'wx'});
 }
 console.log('B53_VISUAL_REVIEW_PASS',JSON.stringify(report.totals));
}
