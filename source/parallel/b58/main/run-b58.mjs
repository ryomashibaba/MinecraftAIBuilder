#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB57FromSource} from '../../b57/main/run-b57.mjs';
import {compileB58,verifyB58} from './compile-b58.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
export function buildB58FromSource(){
 const {report:b57}=buildB57FromSource();
 const b42=JSON.parse(fs.readFileSync(path.resolve(DIR,'../../../reports/B42_MACRO_STAIR_MODULE.json'),'utf8'));
 const report=compileB58(b57,b42);verifyB58(report,b57,b42);
 return {report,b57,b42};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length>1||(args.length&&args[0]!=='--export'))throw Error('B58_USAGE');
 const {report}=buildB58FromSource();
 if(args.length)fs.writeFileSync(path.join(DIR,'B58_VERTICAL_CORE_REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log('B58_VERTICAL_CORE_PASS',JSON.stringify(report.totals));
}
