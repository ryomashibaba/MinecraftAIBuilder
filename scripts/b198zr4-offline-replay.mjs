/**
 * B198Z-R4: inspect one SAVED original 4-key model proposal offline.
 * No Qwen requests, automatic retries, server, account connection, world I/O.
 * Does not repair original bytes; all provenance is kept separate.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
const fail=s=>{throw Error('B198ZR4_REPLAY_'+s)};
const read=(f,max)=>{
 const stat=fs.statSync(f);if(!stat.isFile()||stat.size<=0||stat.size>max)
  fail('INPUT_SIZE_OR_FILE');
 return fs.readFileSync(f,'utf8');
};
export function parseArgs(argv=[]){
 const vals={},legal=new Set(['--original','--out','--reviewer']);
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[++i];
  if(!legal.has(k)||Object.hasOwn(vals,k)||typeof v!=='string'||
   v.length===0||v.startsWith('--'))fail('INVALID_ARGUMENT');
  vals[k]=v;
 }
 if(!vals['--original']||!vals['--out'])fail('ORIGINAL_AND_OUTPUT_REQUIRED');
 return {originalPath:path.resolve(vals['--original']),
  outDir:path.resolve(vals['--out']),
  reviewerPath:vals['--reviewer']?path.resolve(vals['--reviewer']):null};
}
export function runR4OfflineReplay({originalPath,outDir,reviewerPath=null}={}){
 if(typeof originalPath!=='string'||typeof outDir!=='string')
  fail('PATHS_REQUIRED');
 if(fs.existsSync(outDir)||!fs.existsSync(path.dirname(outDir)))
  fail('REFUSE_OVERWRITE');
 const original=read(originalPath,60000);
 const rawSha256=createHash('sha256').update(original).digest('hex');
 let reviewer=null;
 if(reviewerPath){
  const r=read(reviewerPath,60000);
  reviewer=JSON.parse(r);
 }
 // Review before any files are created. A failed replay never implies PASS.
 const result=reviewR4PlannedProposal(original,{
  independentContract:reviewer,caseId:'offline-model-declared-r4'});
 const summary={
  schema:'minecraftaibuilder-b198zr4-offline-replay-v1',
  status:result.status,originalModelTextSha256:rawSha256,
  originalUnmodified:true,
  reconstructedSourceSha256:result.compiled.sourceSha256,
  sourceGeometrySha256:result.compiled.geometrySha256,
  sourceElements:result.design.elements.length,
  conceptualVoxels:result.compiled.primitives.length,
  modelAuthoredSpatialIntentUnverified:true,
  declaredReview:result.declaredPlanReview,
  independentReview:result.independentReview,
  independentContractWasSupplied:reviewer!==null,
  sourceProvenance:'CAPTURED_OUTPUT_IDENTITY_UNVERIFIED',
  modelCalls:0,modelNotReinvoked:true,actualWorldWalkingNotTested:true,
  architectureHumanApproved:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  safety:result.safety
 };
 fs.mkdirSync(outDir);
 fs.writeFileSync(path.join(outDir,'R4_UNMODIFIED_ORIGINAL.txt'),original,{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'R4_SOURCE_DESIGN.json'),
  JSON.stringify(result.design,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'R4_MODEL_SPATIAL_PLAN_UNVERIFIED.json'),
  JSON.stringify(result.plan,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(outDir,'R4_AUDIT_SUMMARY.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=runR4OfflineReplay(parseArgs(process.argv.slice(2)));
  console.log('B198ZR4_OFFLINE_REPLAY',JSON.stringify({
   status:report.status,originalSha256:report.originalModelTextSha256,
   independentReview:report.independentContractWasSupplied,
   actualModelCalls:0,worldWrites:0,
   qualityCertified:false}));
  if(report.status!=='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS')
   process.exitCode=2;
 }catch(e){
  console.error('B198ZR4_REPLAY_HOLD',String(e?.message??e).slice(0,250));
  process.exitCode=1;
 }
}
