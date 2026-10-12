#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB58FromSource} from '../../b58/main/run-b58.mjs';
import {compileB59,verifyB59} from './compile-b59.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
export function buildB59FromSource(){
 const {report:b58,b57,b42}=buildB58FromSource();
 const b31=JSON.parse(fs.readFileSync(path.resolve(dir,'../../../reports/B31_FLOOR_DOOR_OVERLAY.json'),'utf8'));
 const report=compileB59(b58,b57,b42,b31);verifyB59(report,b58,b57,b42,b31);
 return {report,b58,b57,b42,b31};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B59_NO_WRITE_ARGUMENTS');
 console.log('B59_OFFLINE_PASS',JSON.stringify(buildB59FromSource().report.totals));
}
