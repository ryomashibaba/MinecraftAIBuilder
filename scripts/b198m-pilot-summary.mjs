/**
 * B198M - summarize a source-only real-local-model pilot for upload.
 * NEVER calls a model, API, or Minecraft. Verifies compiler/source hashes
 * independently and separates fixture transport success from model quality.
 *
 * node scripts/b198m-pilot-summary.mjs --run DIR --out NEW_JSON
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198m-local-pilot-summary-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const halt=why=>{throw Error('B198M_'+why)};
const check=(x,why)=>{if(!x)halt(why)};
const fixture=(s)=>s==='INJECTED_TEST_DOUBLE';
const world=()=>({readiness:'NOT_PREPARED',worldWrites:0,
 worldContacts:0,constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]}});
const SOURCE='B198K_PAIRED_SOURCE_COMPARISON.json';

export function summarizeB198M({runDirectory}={}){
 check(typeof runDirectory==='string'&&runDirectory.length>0,'RUN_DIR_REQUIRED');
 const root=path.resolve(runDirectory);
 const file=path.join(root,SOURCE);
 check(fs.existsSync(file),'B198K_MANIFEST_NOT_FOUND');
 const b=JSON.parse(fs.readFileSync(file,'utf8'));
 check(b.schema==='minecraftaibuilder-b198k-paired-source-study-v1',
  'UNSUPPORTED_BENCHMARK_SCHEMA');
 check(Array.isArray(b.cases)&&b.cases.length===16,
  'INCOMPLETE_FROZEN_CASE_TRACKING');
 check(['EXPLICIT_LOCAL_LOOPBACK','INJECTED_TEST_DOUBLE'].includes(b.providerOrigin),
  'UNSUPPORTED_PROVIDER_ORIGIN');
 check(b.safety?.readiness==='NOT_PREPARED'&&
  b.safety?.worldWrites===0&&b.safety?.worldContacts===0&&
  b.safety?.BuildPlan?.operations?.length===0,'WORLD_SAFETY_NOT_PRESERVED');

 const inspected=[],unverified=[],byArm={direct:0,directed:0};
 let kept=0,failures=0;
 for(const c of b.cases){
  check(/^c(0[1-9]|1[0-2])$|^r0[1-4]$/.test(c.caseId),
   'UNKNOWN_CASE_ID');
  for(const [label,arm] of [['A',c.armA],['B',c.armB]]){
   check(['direct','directed'].includes(arm),'UNKNOWN_ARM');
   const rec=c[label==='A'?'armARecord':'armBRecord'];
   check(rec&&rec.caseId===c.caseId&&rec.arm===arm,'ARM_CASE_MISMATCH');
   const item={caseId:c.caseId,arm,status:rec.status,
    sourceSha256:rec.sourceMetrics?.sourceSha256??null,
    compiledHashVerified:false,occupiedVoxels:null,elementCount:null,
    sourceRiskStatus:rec.generatorReport?.status??rec.status,
    modelResponseIdentityVerified:false,
    semanticQuality:'UNREVIEWED',humanVisualQuality:'UNREVIEWED',
    error:typeof rec.error==='string'?rec.error.slice(0,250):null};
   if(rec.sourceMetrics){
    const original=path.join(root,arm,c.caseId,'source-design.json');
    if(fs.existsSync(original)){
     try{
      const doc=JSON.parse(fs.readFileSync(original,'utf8'));
      const compiled=compileDesign(doc);
      const ok=verifyCompiled(doc,compiled)&&
       rec.sourceMetrics.sourceSha256===compiled.sourceSha256;
      item.compiledHashVerified=ok;
      item.occupiedVoxels=compiled.primitives.length;
      item.elementCount=doc.elements.length;
      if(ok){byArm[arm]++;kept++;}
      else unverified.push({caseId:c.caseId,arm,reason:'SOURCE_HASH_DIFFERENCE'});
     }catch(e){
      unverified.push({caseId:c.caseId,arm,
       reason:'SOURCE_COMPILE_FAILED_'+String(e.message).slice(0,100)});
     }
    }else{
     // B198H direct arm still keeps its original source evidence directory.
     unverified.push({caseId:c.caseId,arm,reason:'SOURCE_JSON_NOT_FOUND'});
    }
   }else if(!['NOT_RUN','NOT_RUN_MISSING_BASE'].includes(rec.status)){
    failures++;
   }
   inspected.push(item);
  }
 }
 const paired=b.cases.filter(c=>inspected.some(x=>x.caseId===c.caseId&&
  x.arm==='direct'&&x.compiledHashVerified)&&
  inspected.some(x=>x.caseId===c.caseId&&x.arm==='directed'&&
  x.compiledHashVerified)).length;
 const status=unverified.length>0?'HOLD_SOURCE_EVIDENCE_INTEGRITY':
  paired===0?'HOLD_NO_COMPARABLE_SOURCE_PAIRS':
  'SOURCE_PILOT_CAPTURED_HUMAN_REVIEW_REQUIRED';
 return {schema:SCHEMA,status,modelIdRequested:b.modelId,
  modelEndpointIdentityIndependentlyVerified:false,
  providerOrigin:b.providerOrigin,
  realProviderClaimAllowed:!fixture(b.providerOrigin)&&
   b.providerOrigin==='EXPLICIT_LOCAL_LOOPBACK',
  realModelArchitectureQualityCertified:false,
  trueLiveModelProtocolIndependentlyAuthenticated:false,
  frozenCaseCount:16,plannedCreationCases:b.counts.selectedCreationTasks,
  plannedRevisionCases:b.counts.selectedRevisionTasks,
  sourceRecords:inspected.length,compiledSourceCounts:byArm,
  independentlyVerifiedPairedSourceCases:paired,
  sourceEvidenceIntegrityHolds:unverified,
  failedAttemptedSourceRecords:failures,
  requestCounts:b.providerRequestCounts,
  budgets:b.budgets,results:inspected,
  originalPairedManifestSha256:sha(fs.readFileSync(file)),
  humanScoredPairCount:0,
  nextAction:paired>0?
   'Review direct/directed source 3D in the local index.html; upload compact evidence ZIP for source and quality analysis.':
   'Check model-server compatibility and source failures before claiming design quality.',
  safety:world()};
}
export function parseB198MArgs(argv){
 if(!Array.isArray(argv)||argv.length!==4||argv[0]!=='--run'||
  argv[2]!=='--out'||!argv[1]||!argv[3])halt('USAGE');
 return {runDirectory:argv[1],output:argv[3]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseB198MArgs(process.argv.slice(2));
  const dest=path.resolve(opts.output);
  check(!fs.existsSync(dest),'OUTPUT_ALREADY_EXISTS');
  const summary=summarizeB198M(opts);
  fs.writeFileSync(dest,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
  console.log('B198M_PILOT_SUMMARY',JSON.stringify({
   status:summary.status,pairedSourceCases:summary.independentlyVerifiedPairedSourceCases,
   realModelQualityCertified:false,worldWrites:0,output:dest}));
 }catch(e){
  console.error('B198M_PILOT_SUMMARY_HOLD',String(e?.message??e));
  process.exitCode=1;
 }
}
