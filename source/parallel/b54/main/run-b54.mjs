#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB53FromSource} from '../../b53/main/run-b53.mjs';
import {compileB54,verifyB54} from './compile-b54.mjs';
import {renderB54} from './render-b54.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
export function buildB54FromSource(){
 const {report:b53,b52}=buildB53FromSource();
 const report=compileB54(b53,b52);
 verifyB54(report,b53,b52);
 return {report,b53,b52};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>1||(args.length&&args[0]!=='--export'))throw Error('B54_EXPORT_ONLY');
 const {report}=buildB54FromSource();
 if(args.length){
  const js=path.join(ROOT,'B54_DECISION_DOSSIER.json'),html=path.join(ROOT,'B54_DECISION_DOSSIER.html');
  if(fs.existsSync(js)||fs.existsSync(html))throw Error('B54_EXPORT_NO_OVERWRITE');
  fs.writeFileSync(js,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(html,renderB54(report),{flag:'wx'});
 }
 console.log('B54_DECISION_DOSSIER_PASS',JSON.stringify(report.totals));
}
