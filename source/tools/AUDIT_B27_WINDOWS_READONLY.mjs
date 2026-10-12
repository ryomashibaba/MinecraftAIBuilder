/** B27 evidence assessor CLI: input JSON -> new output file (wx). No game API. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {validateB26M4} from '../runner/step8b-m4-static-gate-b26.mjs';
import {assessB27Evidence} from '../runner/step8b-m4-evidence-gate-b27.mjs';
const fail=k=>{throw Error('B27_AUDIT_'+k)};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [input,output]=process.argv.slice(2);
if(!input||!output||!path.isAbsolute(input)||!path.isAbsolute(output)||path.extname(output)!=='.json')fail('ARGS');
const source=fs.realpathSync(input),out=path.resolve(output),outDir=fs.realpathSync(path.dirname(out));
if(!fs.lstatSync(source).isFile()||fs.lstatSync(source).isSymbolicLink()||fs.existsSync(out)||
   out===source||out===root||out.startsWith(root+path.sep)||
   outDir!==path.dirname(out)||outDir===root||outDir.startsWith(root+path.sep))fail('PATH');
if(fs.statSync(source).size>128*1024)fail('INPUT_SIZE');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json'),'utf8'));
if(!validateB26M4(baseline,root))fail('FROZEN_BASELINE');
const raw=fs.readFileSync(source,'utf8').replace(/^\ufeff/,'');
const report=assessB27Evidence(JSON.parse(raw),baseline,{now:new Date().toISOString()});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B27_READONLY_AUDIT_COMPLETE',JSON.stringify({sources:report.sourceMatches+'/9',material:report.materialFinding,blockers:9,gate:'BLOCKED'}));
