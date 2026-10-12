/** Assess a future sanitized B26 Windows JSON. Never contacts Windows/world/Bridge. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {assessB26WindowsEvidence} from '../runner/step8b-m4-windows-assessment-b26.mjs';
import {validateB26M4} from '../runner/step8b-m4-static-gate-b26.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2],output=process.argv[3];
const fail=code=>{throw Error('B26_AUDIT_'+code)};
if(!input||!output||!path.isAbsolute(input)||!path.isAbsolute(output)||!output.endsWith('.json'))fail('ABSOLUTE_FILES');
if(!fs.existsSync(input)||fs.existsSync(output))fail('MISSING_INPUT_OR_OUTPUT_EXISTS');
const r=fs.realpathSync(input),realRoot=fs.realpathSync(root);
const p=path.resolve(output),parent=fs.realpathSync(path.dirname(p));
if(!fs.lstatSync(r).isFile()||fs.lstatSync(r).isSymbolicLink()||
 p===realRoot||p.startsWith(realRoot+path.sep)||parent===realRoot||parent.startsWith(realRoot+path.sep)||
 parent!==path.dirname(p))fail('UNSAFE_PATH');
const st=fs.statSync(r);if(st.size>128*1024)fail('INPUT_TOO_LARGE');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json'),'utf8'));
if(!validateB26M4(baseline,root))fail('BASELINE');
const result=assessB26WindowsEvidence(JSON.parse(fs.readFileSync(r,'utf8')),baseline);
fs.writeFileSync(p,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('B26_WINDOWS_EVIDENCE_ASSESSED_READONLY',JSON.stringify({sources:result.sourceMatchCount+'/'+result.sourceCount,profile:result.historicalProfileComparison,gate:result.deploymentGate}));
