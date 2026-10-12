/** B55 pinned-source intake, read-only. No imports from user-supplied source, no network or engine calls. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {B13_WINDOWS_PINNED} from '../../../runner/step8b-module-contract-b13.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw new Error('B55_INTAKE_'+code)};
export const PINNED_FILES=Object.freeze({...B13_WINDOWS_PINNED});
export const REQUIRED=Object.freeze(Object.keys(PINNED_FILES));
const isHash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function safeFileUnder(root,relative){
 if(!REQUIRED.includes(relative))fail('INVALID_RELATIVE');
 const parts=[...relative.split('/')];let p=root;
 for(const segment of parts){
  if(!segment||segment==='.'||segment==='..')fail('BAD_SEGMENT');
  p=path.join(p,segment);
  if(!fs.existsSync(p))return {status:'MISSING'};
  const st=fs.lstatSync(p);
  if(st.isSymbolicLink())return {status:'UNSAFE_LINK'};
 }
 const st=fs.lstatSync(p);
 if(!st.isFile())return {status:'UNSAFE_NONFILE'};
 if(st.size>2_000_000)return {status:'OVERSIZE'};
 const before={size:st.size,mtime:st.mtimeMs};
 const actual=sha(fs.readFileSync(p));
 const after=fs.lstatSync(p);
 if(!after.isFile()||after.isSymbolicLink()||before.size!==after.size||before.mtime!==after.mtimeMs)
  return {status:'CHANGED_DURING_READ'};
 return {status:actual===PINNED_FILES[relative]?'PINNED_MATCH':'VERSION_MISMATCH',observedSha256:actual};
}
/** Every required file is checked by pathname and exact bytes. No source content is returned. */
export function inspectEvidenceRoot(evidenceRoot=null){
 if(evidenceRoot!==null&&(typeof evidenceRoot!=='string'||!evidenceRoot.trim()))fail('ROOT_ARGUMENT');
 if(evidenceRoot!==null){
  const resolved=path.resolve(evidenceRoot);
  const parents=[];let c=resolved;
  while(true){parents.push(c);const p=path.dirname(c);if(p===c)break;c=p;}
  for(const p of parents){
   if(!fs.existsSync(p))fail('ROOT_NOT_FOUND');
   const st=fs.lstatSync(p);
   if(st.isSymbolicLink()||!st.isDirectory())fail('ROOT_UNSAFE');
  }
 }
 const files=REQUIRED.map(k=>({key:k,expectedSha256:PINNED_FILES[k],...(evidenceRoot===null?{status:'MISSING'}:safeFileUnder(path.resolve(evidenceRoot),k))}));
 const counts=Object.fromEntries(['MISSING','PINNED_MATCH','VERSION_MISMATCH','UNSAFE_LINK','UNSAFE_NONFILE','OVERSIZE','CHANGED_DURING_READ'].map(k=>[k,files.filter(f=>f.status===k).length]));
 const sourceSetSha256=sha(REQUIRED.map(k=>k+':'+PINNED_FILES[k]).join('\n'));
 return {schema:'minecraftaibuilder-b55-readonly-source-intake-v1',sourceSetSha256,files,counts,
  snapshotStatus:counts.PINNED_MATCH===REQUIRED.length?'PINNED_SNAPSHOT_IDENTICAL':counts.VERSION_MISMATCH?'SOURCE_VERSION_DRIFT':counts.UNSAFE_LINK||counts.UNSAFE_NONFILE||counts.OVERSIZE||counts.CHANGED_DURING_READ?'UNSAFE_SOURCE_EVIDENCE':'INCOMPLETE_SOURCE_EVIDENCE',
  plannerExecuted:false,sourceModulesImported:false,actualFacadeEmitted:false,sourceByteContentsIncluded:false,
  runtimeIdentity:'UNVERIFIED',productionFacadeParity:'UNVERIFIED',constructionApproved:false};
}
export function verifySourceIntake(snapshot){
 if(!snapshot||snapshot.schema!=='minecraftaibuilder-b55-readonly-source-intake-v1'||
  snapshot.files?.length!==REQUIRED.length||!isHash(snapshot.sourceSetSha256)||
  snapshot.plannerExecuted!==false||snapshot.sourceModulesImported!==false||
  snapshot.actualFacadeEmitted!==false||snapshot.sourceByteContentsIncluded!==false||
  snapshot.runtimeIdentity!=='UNVERIFIED'||snapshot.productionFacadeParity!=='UNVERIFIED'||
  snapshot.constructionApproved!==false||
  snapshot.files.some((f,i)=>f.key!==REQUIRED[i]||f.expectedSha256!==PINNED_FILES[REQUIRED[i]]||
   !['MISSING','PINNED_MATCH','VERSION_MISMATCH','UNSAFE_LINK','UNSAFE_NONFILE','OVERSIZE','CHANGED_DURING_READ'].includes(f.status)||
   ((f.status==='PINNED_MATCH'||f.status==='VERSION_MISMATCH')? !isHash(f.observedSha256):f.observedSha256!==undefined)||
   (f.status==='PINNED_MATCH'&&f.observedSha256!==f.expectedSha256)||
   (f.status==='VERSION_MISMATCH'&&f.observedSha256===f.expectedSha256)))fail('UNSAFE_REPORT');
 if(snapshot.sourceSetSha256!==inspectEvidenceRoot().sourceSetSha256)fail('SOURCE_SET_DRIFT');
 const counts=Object.fromEntries(Object.keys(snapshot.counts).map(k=>[k,snapshot.files.filter(f=>f.status===k).length]));
 if(JSON.stringify(counts)!==JSON.stringify(snapshot.counts))fail('COUNT_TAMPER');
 return true;
}
