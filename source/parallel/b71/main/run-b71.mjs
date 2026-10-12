#!/usr/bin/env node
/** Runs frozen B70 sources and B68 local ZIP intake; never imports production code. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB70FromSource} from '../../b70/main/run-b70.mjs';
import {buildB68FromSource} from '../../b68/main/run-b68.mjs';
import {compileB71,verifyB71} from './compile-b71.mjs';
export function buildB71FromSource(localEvidenceZip){
 if(typeof localEvidenceZip!=='string'||!localEvidenceZip)throw Error('B71_LOCAL_SOURCE_EVIDENCE_REQUIRED');
 const {report:b70,b65,b66,b69}=buildB70FromSource();
 const {inventory:receipt}=buildB68FromSource(localEvidenceZip);
 const report=compileB71(b65,b66,b69,b70,receipt);
 verifyB71(report,b65,b66,b69,b70,receipt);
 return {report,b65,b66,b69,b70,receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length<2||args[0]!=='--source-zip'||!args[1]||args.slice(2).some(x=>!['--write','--json'].includes(x))||new Set(args.slice(2)).size!==args.slice(2).length)
  throw Error('B71_USAGE: --source-zip LOCAL_ZIP [--write] [--json]');
 const {report}=buildB71FromSource(args[1]);
 if(args.includes('--write'))fs.writeFileSync(new URL('./B71_PINNED_SOURCE_ADAPTER_REPORT.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log('B71_PINNED_STATIC_ADAPTER_PASS',JSON.stringify(report.summary));
 if(args.includes('--json'))console.log(JSON.stringify(report,null,2));
}
