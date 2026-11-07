/** Read-only AE saved-evidence audit. No provider imports, calls or writes. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR190AERaw} from '../source/ai/r190ad-semantic-diagnostics.mjs';
import {R190AE_FORMAT_SHA256} from '../source/ai/r190ae-flexible-semantic-contract.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=c=>{throw Error('R190AE_DIAGNOSE_'+c)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safe=x=>object(x)&&x.readiness==='NOT_PREPARED'&&
 x.constructionApproved===false&&x.executionAllowed===false&&
 x.worldContacts===0&&x.worldWrites===0&&
 Array.isArray(x.gates)&&x.gates.length===9&&x.gates.every(g=>g==='BLOCKED')&&
 Array.isArray(x.BuildPlan?.operations)&&x.BuildPlan.operations.length===0;
export function parseR190AEDiagnoseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const o={};
 if(argv.length!==4)fail('ARGS');
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!['--study','--expected-sha'].includes(k)||!v||Object.hasOwn(o,k))fail('ARGS');
  o[k]=v;
 }
 if(!path.isAbsolute(o['--study']??'')||!/^[a-f0-9]{64}$/.test(o['--expected-sha']??''))fail('ARGS');
 return {studyDir:o['--study'],expectedSha256:o['--expected-sha']};
}
function read(dir,name){
 const file=path.join(dir,name),st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>120000)fail('UNSAFE_EVIDENCE');
 const bytes=fs.readFileSync(file);
 // Hash the actual bytes and reject invalid UTF-8 rather than replacing it.
 try{new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{fail('INVALID_UTF8')}
 return bytes;
}
export function diagnoseSavedR190AE({studyDir,expectedSha256}){
 if(!path.isAbsolute(studyDir)||!/^[a-f0-9]{64}$/.test(expectedSha256??''))fail('ARGS');
 const dir=path.resolve(studyDir),st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink())fail('UNSAFE_STUDY_DIR');
 const names=['MODEL_RESPONSE_ORIGINAL.txt','R190AB_ATTEMPT.json','R190AB_RESULT.json'];
 const bytes=names.map(n=>read(dir,n)),hashes=bytes.map(H);
 const raw=bytes[0].toString('utf8');
 let a,r;
 try{a=JSON.parse(bytes[1].toString('utf8'));r=JSON.parse(bytes[2].toString('utf8'))}
 catch{fail('INVALID_RECEIPT_JSON')}
 const p=r?.response;
 if(!object(a)||!object(r)||!object(p)||
    hashes[0]!==expectedSha256||p.originalRawSha256!==hashes[0]||p.bytes!==bytes[0].length||
    a.schema!=='minecraftaibuilder-r190ab-attempt-v1'||
    r.schema!=='minecraftaibuilder-r190ae-flexible-study-v1'||
    p.schema!=='minecraftaibuilder-r190ae-flexible-result-v1'||
    [a,r,p].some(x=>x.contract!=='semantic-space-flexible')||
    [a.schemaSha256,r.schemaSha256,p.formatSchemaSha256].some(x=>x!==R190AE_FORMAT_SHA256)||
    !/^[a-f0-9]{64}$/.test(a.promptSha256??'')||
    r.originalPromptSha256!==a.promptSha256||
    !/^[a-f0-9]{64}$/.test(a.requestSha256??'')||
    typeof a.modelRequested!=='string'||!a.modelRequested||r.modelClaimed!==a.modelRequested||
    typeof a.sourceTask!=='string'||!a.sourceTask||r.sourceTask!==a.sourceTask||
    r.b143Authorship!=='HOST_DERIVED_FROM_MODEL_SEMANTIC_IR'||
    r.providerDoneReason!=='stop'||r.providerError!==null||
    r.providerCallsAttempted!==1||a.providerCallsAttempted!==1||
    p.status!=='HOLD_INVALID_FLEXIBLE_PROGRAM'||typeof p.error!=='string'||
    p.real3D!==false||p.hostSourceDerived!==false||p.semanticPlanValid!==false||
    p.exactModelRawUnmodified!==true||p.modelAuthoredB143!==false||
    p.hostDeterminesExactVoxels!==true||p.sourceRouteAudit!==null||p.featureAudit!==null||
    r.noAutomaticRetry!==true||r.noHostGeometryRepair!==true||
    r.humanArtReview!=='ART_HOLD'||r.independentArtApproval!==false||
    p.aestheticMerit!=='ART_HOLD'||p.minecraftWalking!=='NOT_TESTED'||
    ![a,r,p].every(safe))fail('PROVENANCE_OR_SAFETY');
 const report=diagnoseR190AERaw(raw);
 if(names.some((n,i)=>H(read(dir,n))!==hashes[i]))fail('CHANGED_DURING_DIAGNOSIS');
 return {...report,study:r.study,contract:r.contract,
  preservedOriginalResult:{status:p.status,error:p.error},
  provenance:{responseSha256:hashes[0],attemptSha256:hashes[1],resultSha256:hashes[2],
   schemaSha256:r.schemaSha256,promptSha256:a.promptSha256,
   requestSha256Claimed:a.requestSha256,requestBodyAvailable:false,
   modelClaimed:r.modelClaimed,modelIdentityIndependentlyVerified:false,
   providerConsumptionIndependentlyVerified:false,modelCallsByDiagnosis:0,
   unsignedReceipts:true},
  staticValidationScope:'Advisory constraints only; not exhaustive geometry or brief coverage',
  sourceEvidenceWritten:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR190AEDiagnoseArgs(process.argv.slice(2));
  console.log(JSON.stringify(opts.help?{help:
   'NO MODEL CALLS: --study ABSOLUTE_DIR --expected-sha PINNED_ORIGINAL_SHA256'}:
   diagnoseSavedR190AE(opts),null,2));
 }catch(e){console.error('R190AE_DIAGNOSE_HOLD',String(e?.message??e));process.exitCode=2;}
}
