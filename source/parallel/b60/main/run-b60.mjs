#!/usr/bin/env node
/** Build audited proposal contract from read-only frozen reports; never writes or imports bridge. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB59FromSource} from '../../b59/main/run-b59.mjs';
import {compileB60,verifyB60} from './compile-b60.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
function frozen(name){const p=path.join(root,'reports',name),m=JSON.parse(fs.readFileSync(path.join(root,'B59_FILE_SHA256.json')));
 const digest=m.baselineFiles[`reports/${name}`];const data=fs.readFileSync(p);
 if(!digest||createHash('sha256').update(data).digest('hex')!==digest)throw Error('B60_FROZEN_SOURCE_HASH_'+name);
 return JSON.parse(data.toString('utf8'));
}
export function buildB60FromSource(){
 const {report:b59,b57,b42,b31}=buildB59FromSource();
 const guard=frozen('B43_GUARDED_LAYOUT_ASSEMBLY.json'),vertical=frozen('B43_VERTICAL_CIRCULATION.json');
 const report=compileB60(b59,guard,vertical,b57,b42,b31);verifyB60(report,b59,guard,vertical,b57,b42,b31);
 return {report,b59,guard,vertical,b57,b42,b31};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('B60_NO_WRITE_ARGS');
 console.log('B60_OFFLINE_PASS',JSON.stringify(buildB60FromSource().report.totals));
}
