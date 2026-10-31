/**
 * ZERO-network, ZERO-model, ZERO-file-write audit of already captured E1
 * two-stage original stage-A responses. Honest SHA provenance and detailed
 * source-window rejection histogram. No auto repair or construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateR190SemanticPlan,layoutR190SemanticPlan,
 R190_LAYOUT_STRATEGIES} from '../source/ai/r190-semantic-massing.mjs';
import {diagnoseR190E1Plan,r190E1WindowSlotCandidates} from './r190-e1-diagnose.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const err=e=>String(e?.message??e).slice(0,350);
export function locateLatestTwoStage(rootFolder=path.join(path.dirname(root),'MinecraftAIBuilder-E1-Outputs')){
 if(!fs.existsSync(rootFolder))throw Error('E1_NO_OUTPUT_ROOT');
 const folders=fs.readdirSync(rootFolder,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&x.name.startsWith('E1-two-stage-'))
  .map(x=>path.join(rootFolder,x.name))
  .filter(x=>fs.existsSync(path.join(x,'E1_TWO_STAGE_REPORT.json')))
  .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 if(!folders.length)throw Error('E1_NO_SAVED_TWO_STAGE_REPORT');
 return folders[0];
}
export function auditR190E1SavedTwoStage(folder,{maxWindowSlots=36}={}){
 if(!Number.isSafeInteger(maxWindowSlots)||maxWindowSlots<1||maxWindowSlots>120)
  throw Error('E1_AUDIT_SLOT_BUDGET');
 const directory=path.resolve(folder);
 const summary=JSON.parse(fs.readFileSync(path.join(directory,'E1_TWO_STAGE_REPORT.json'),'utf8'));
 if(summary.schema!=='r190-e1-two-stage-comparison-v1'||
  !Array.isArray(summary.rows)||summary.rows.length!==3)
  throw Error('E1_AUDIT_REPORT_SCHEMA');
 const rows=[];
 for(const r of summary.rows){
  if(!['modern-home','flower-shop','research-lab'].includes(r.id))
   throw Error('E1_AUDIT_UNKNOWN_USE');
  const originalPath=path.join(directory,r.id,'STAGE_A_ORIGINAL.txt');
  const result={id:r.id,reportedReason:r.reason,originalAvailable:false,
   originalHashMatchesReport:false,modelRequests:0,worldWrites:0,
   inputValidation:'NOT_CHECKED',layoutStrategies:[],windowCatalog:null,issues:[]};
  rows.push(result);
  if(!fs.existsSync(originalPath)){result.reason='ORIGINAL_NOT_PRESENT';continue;}
  const raw=fs.readFileSync(originalPath,'utf8');
  result.originalAvailable=true;
  result.originalHashMatchesReport=sha(raw)===r.stageAOriginalSha256;
  if(!result.originalHashMatchesReport){
   result.reason='ORIGINAL_SHA_MISMATCH_STOP';continue;
  }
  let plan;
  try{plan=JSON.parse(raw);}
  catch(e){result.reason='INVALID_ORIGINAL_JSON';result.parseError=err(e);continue;}
  result.issues=diagnoseR190E1Plan(plan);
  try{validateR190SemanticPlan(plan);result.inputValidation='PASS';}
  catch(e){result.inputValidation='HOLD';result.reason=err(e);continue;}
  for(const strategy of R190_LAYOUT_STRATEGIES){
   try{
    const layout=layoutR190SemanticPlan(plan,{strategy});
    result.layoutStrategies.push({strategy,status:'FEASIBLE',
     bounds:layout.sitePlacement?.occupiedRelativeBounds??null,
     roomCoordinates:layout.spaces.map(s=>({id:s.id,x:s.x,z:s.z,w:s.w,d:s.d}))});
   }catch(e){
    result.layoutStrategies.push({strategy,status:'HOLD',reason:err(e)});
   }
  }
  if(result.layoutStrategies[0]?.status!=='FEASIBLE'){
   result.reason='DEFAULT_LAYOUT_UNAVAILABLE';continue;
  }
  try{
   const catalog=r190E1WindowSlotCandidates(plan,{maxSlots:maxWindowSlots,verifySource:true});
   result.windowCatalog={totalPossibleSlots:catalog.totalPossibleSlots,
    testedRepresentativeSlots:catalog.testedRepresentativeSlots,
    certifiedSlots:catalog.slots.length,
    fullCoverage:catalog.exhaustiveSourceWindowCheck,
    sourceRejectionCounts:catalog.rejectedSourceReasonCounts,
    sourceRejectionExamples:catalog.rejectedSourceExamples,
    limitNote:catalog.limitNote};
   result.reason=catalog.slots.length?'SOURCE_CERTIFIED_SLOTS_FOUND':
    catalog.totalPossibleSlots===0?'NO_GEOMETRIC_CANDIDATES':
    catalog.exhaustiveSourceWindowCheck?'ALL_TESTED_SOURCE_REJECTED':
    'SAMPLED_SOURCE_REJECTED_FULL_SPACE_UNKNOWN';
  }catch(e){result.reason='WINDOW_CATALOG_ERROR';result.detail=err(e);}
 }
 return {schema:'r190-e1-stage-a-offline-audit-v1',folder:directory,
  originalReportStatus:summary.status,originalRealModelRequests:summary.realModelRequests,
  newModelRequests:0,worldWrites:0,worldContacts:0,
  readOnly:true,noRepairs:true,maxWindowSlots,rows};
}
function main(args){
 let dir;
 if(args.length===0||args.length===1&&args[0]==='--latest')
  dir=locateLatestTwoStage();
 else if(args.length===1)dir=path.resolve(args[0]);
 else throw Error('Usage: node scripts/r190-e1-stage-a-audit.mjs [--latest | full-folder-path]');
 const report=auditR190E1SavedTwoStage(dir);
 console.log('E1 stage-A original evidence audit (read only, model calls 0)');
 console.log('Folder: '+dir);
 for(const row of report.rows){
  console.log('\n'+row.id+': '+row.reportedReason+
   '; originalSHA='+String(row.originalHashMatchesReport));
  if(row.issues.length)for(const i of row.issues)
   console.log('  '+i.rule+' '+i.where+' actual='+JSON.stringify(i.actual)+
    ' expected='+JSON.stringify(i.expected));
  for(const lay of row.layoutStrategies)
   console.log('  layout '+lay.strategy+': '+lay.status+
    (lay.reason?' '+lay.reason:''));
  if(row.windowCatalog){
   const c=row.windowCatalog;
   console.log('  window catalog: geometric='+c.totalPossibleSlots+
    ', tested='+c.testedRepresentativeSlots+', certified='+c.certifiedSlots+
    ', exhaustive='+c.fullCoverage);
   console.log('  window rejection reasons: '+JSON.stringify(c.sourceRejectionCounts));
   if(c.sourceRejectionExamples?.length)
    console.log('  first examples: '+JSON.stringify(c.sourceRejectionExamples.slice(0,3)));
  }
  console.log('  audit decision: '+String(row.reason));
 }
 console.log('\nNo model requests, no writes. Existing original HOLD statuses unchanged.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main(process.argv.slice(2));}catch(e){console.error(err(e));process.exitCode=2;}
}
