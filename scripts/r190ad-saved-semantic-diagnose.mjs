/**
 * Read-only offline diagnosis of a SAVED R190-AD original.
 * No model/provider/world IO. Does not write back into the study.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR190ADRaw} from '../source/ai/r190ad-semantic-diagnostics.mjs';
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=c=>{throw Error('R190AD_DIAGNOSE_'+c)};
export function parseR190ADDiagnoseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const o={};
 if(argv.length!==4)fail('ARGS');
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!['--study','--expected-sha'].includes(k)||!v||Object.hasOwn(o,k))fail('ARGS');
  o[k]=v;
 }
 if(!path.isAbsolute(o['--study']??'')||!/^[a-f0-9]{64}$/.test(o['--expected-sha']??''))
  fail('ARGS');
 return {studyDir:o['--study'],expectedSha256:o['--expected-sha']};
}
function readEvidenceFile(dir,name,maxBytes){
 const file=path.join(dir,name),st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>maxBytes)
  fail('UNSAFE_EVIDENCE_'+name);
 return fs.readFileSync(file,'utf8');
}
export function diagnoseSavedR190AD({studyDir,expectedSha256}){
 if(!path.isAbsolute(studyDir)||!/^[a-f0-9]{64}$/.test(expectedSha256??''))
  fail('ARGS');
 const dir=path.resolve(studyDir),st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink())fail('UNSAFE_STUDY_DIR');
 const original=readEvidenceFile(dir,'MODEL_RESPONSE_ORIGINAL.txt',120000),
  resultText=readEvidenceFile(dir,'R190AB_RESULT.json',120000),
  attemptText=readEvidenceFile(dir,'R190AB_ATTEMPT.json',120000);
 const rawHash=sha(original),resultHash=sha(resultText),attemptHash=sha(attemptText);
 let result,attempt;
 try{result=JSON.parse(resultText);attempt=JSON.parse(attemptText)}
 catch{fail('INVALID_RECEIPT_JSON')}
 if(rawHash!==expectedSha256||result.response?.originalRawSha256!==rawHash||
    result.response?.bytes!==Buffer.byteLength(original,'utf8')||
    result.schema!=='minecraftaibuilder-r190ad-expressive-study-v1'||
    result.contract!=='semantic-space-expressive'||
    attempt.contract!=='semantic-space-expressive'||
    attempt.schemaSha256!==result.schemaSha256||
    result.response?.formatSchemaSha256!==result.schemaSha256||
    result.originalPromptSha256!==attempt.promptSha256||
    result.modelClaimed!==attempt.modelRequested||
    result.providerDoneReason!=='stop'||result.providerCallsAttempted!==1||
    attempt.providerCallsAttempted!==1||
    result.response?.status!=='HOLD_INVALID_EXPRESSIVE_PROGRAM'||
    result.response.real3D!==false||
    result.noAutomaticRetry!==true||result.noHostGeometryRepair!==true||
    result.constructionApproved!==false||result.executionAllowed!==false||
    result.worldContacts!==0||result.worldWrites!==0||
    result.BuildPlan?.operations?.length!==0||
    !Array.isArray(result.gates)||result.gates.length!==9||
    result.gates.some(x=>x!=='BLOCKED'))
  fail('PROVENANCE_OR_SAFETY');
 const diagnosis=diagnoseR190ADRaw(original);
 if(sha(readEvidenceFile(dir,'MODEL_RESPONSE_ORIGINAL.txt',120000))!==rawHash||
    sha(readEvidenceFile(dir,'R190AB_RESULT.json',120000))!==resultHash||
    sha(readEvidenceFile(dir,'R190AB_ATTEMPT.json',120000))!==attemptHash)
  fail('CHANGED_DURING_DIAGNOSIS');
 return {...diagnosis,study:result.study,
  preservedOriginalResult:{status:result.response.status,error:result.response.error},
  provenance:{responseSha256:rawHash,resultSha256:resultHash,
   attemptSha256:attemptHash,providerDoneReason:result.providerDoneReason,
   modelClaimed:result.modelClaimed,modelCallsByDiagnosis:0},
  staticValidationScope:'Independent issues are listed; not a full solver proof',
  sourceEvidenceWritten:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR190ADDiagnoseArgs(process.argv.slice(2));
  console.log(JSON.stringify(opts.help?{help:
   'NO MODEL CALLS: --study ABSOLUTE_DIR --expected-sha PINNED_ORIGINAL_SHA256'}:
   diagnoseSavedR190AD(opts),null,2));
 }catch(e){console.error('R190AD_DIAGNOSE_HOLD',String(e?.message??e));process.exitCode=2;}
}
