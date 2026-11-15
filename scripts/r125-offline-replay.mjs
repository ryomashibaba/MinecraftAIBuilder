/**
 * Offline strict replay of a saved original model response.
 *
 * This is a source DIAGNOSTIC, never a grammar relaxer or silent redesign.
 * It never calls a model, modifies the source, or contacts Minecraft.
 * node scripts/r125-offline-replay.mjs --raw MODEL_RESPONSE_ORIGINAL.txt --out NEW_DIAGNOSIS.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readModelProposal} from '../source/ai/b198-natural-language-design.mjs';
import {validateDesign,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry} from '../source/ai/r125-architecture-plan.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const digest=x=>createHash('sha256').update(x).digest('hex');
const fail=reason=>{throw Error('R125_REPLAY_'+reason);};
const record=(all,severity,code,elementId=null)=>all.push({severity,code,...(
 elementId===null?{}:{elementId})});
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const isTriple=x=>Array.isArray(x)&&x.length===3&&x.every(Number.isSafeInteger);
const rId=/^[a-z][a-z0-9-]{2,47}$/;
const badAssumptions=x=>!Array.isArray(x)||x.length>12||
 x.some(s=>typeof s!=='string'||s.length>250||/[\u0000-\u0008\u000b-\u001f]/.test(s));

export function diagnoseR125Original(raw){
 if(typeof raw!=='string'||raw.length===0||raw.length>60000)
  fail('RAW_INPUT_SIZE');
 const findings=[];
 let candidate;
 try{candidate=JSON.parse(raw);}
 catch{
  record(findings,'ERROR','ORIGINAL_NOT_JSON');
  return {schema:'r125-original-offline-diagnostic-v1',
   originalSha256:digest(raw),status:'HOLD_INVALID_ORIGINAL',
   findings,sourceValidation:'NOT_ATTEMPTED',originalEdited:false,
   inferredCorrectedDesign:false,modelCalls:0,worldWrites:0,
   worldGates:Array(9).fill('BLOCKED')};
 }
 if(!isObj(candidate)){
  record(findings,'ERROR','OUTER_NOT_OBJECT');
 }else{
  if(!['design','explanation','assumptions'].every(k=>Object.hasOwn(candidate,k))||
   Object.keys(candidate).length!==3)
   record(findings,'ERROR','MODEL_FIELDS_NOT_EXACT');
  if(badAssumptions(candidate.assumptions))
   record(findings,'ERROR','ASSUMPTIONS_NOT_BOUNDED_STRING_ARRAY');
  if(typeof candidate.explanation!=='string')
   record(findings,'ERROR','EXPLANATION_NOT_STRING');
  const d=candidate.design;
  if(!isObj(d))record(findings,'ERROR','DESIGN_NOT_OBJECT');
  else{
   if(typeof d.id!=='string'||!rId.test(d.id))
    record(findings,'ERROR','DESIGN_ID_INVALID');
   if(!Array.isArray(d.elements))
    record(findings,'ERROR','ELEMENTS_NOT_ARRAY');
   else{
    // A diagnostic is allowed to inspect element type; never auto-convert
    // type -> mode, never auto-expand bounds, and never fill in missing blocks.
    for(const [i,e] of d.elements.entries()){
     if(!isObj(e)){
      record(findings,'ERROR','ELEMENT_NOT_OBJECT','#'+i);continue;
     }
     const id=typeof e.id==='string'?e.id:'#'+i;
     if(e.type!==undefined)
      record(findings,'ERROR','UNKNOWN_TYPE_FIELD_USE_MODE',id);
     if(!['add','cut'].includes(e.mode))
      record(findings,'ERROR','MISSING_OR_INVALID_MODE',id);
     if(e.mode!=='cut'&&!['stone','concrete','metal','glass','wood','glow','accent'].includes(e.material))
      record(findings,'ERROR','MISSING_OR_INVALID_ADD_MATERIAL',id);
     if(e.shape==='staircase'&&isTriple(e.origin)&&
      isObj(d.bounds)&&
      ['x','z'].includes(e.axis)&&[1,-1].includes(e.direction)&&
      Number.isSafeInteger(e.steps)&&Number.isSafeInteger(e.treadDepth)){
      const axis=e.axis==='x'?0:2;
      const edge=e.origin[axis]+e.direction*(e.steps*e.treadDepth-1);
      const limit=e.axis==='x'?d.bounds.width:d.bounds.depth;
      if(Number.isSafeInteger(limit)&&
       (edge<0||edge>=limit||e.origin[axis]<0||e.origin[axis]>=limit))
       record(findings,'ERROR','STAIRCASE_EXCEEDS_DESIGN_BOUNDS',id);
     }
     if(/(?:door|entrance|window)/i.test(id)&&e.type==='add'||
      /(?:door|entrance|window)/i.test(id)&&e.mode==='add')
      record(findings,'REVIEW','DOOR_OR_WINDOW_MAY_NOT_CUT_WALL_OPENING',id);
     if(/(?:room|interior)/i.test(id)&&e.shape==='box'&&
      isTriple(e.size)&&e.size[1]>=3&&
      (e.type==='add'||e.mode==='add')&&!e.shell)
      record(findings,'REVIEW','ROOM_VOLUME_FILLED_NOT_EMPTY',id);
    }
    const floors=d.elements.filter(e=>isObj(e)&&
     /(?:floor|deck)/i.test(e.id)&&e.shape==='box'&&isTriple(e.origin));
    if(floors.length>=2){
     const heights=[...new Set(floors.map(e=>e.origin[1]))].sort((a,b)=>a-b);
     if(heights.length>=2&&heights[1]-heights[0]<3)
      record(findings,'REVIEW','FLOOR_SEPARATION_UNUSABLE');
    }
   }
  }
 }
 let sourceValidation='HOLD';
 let compilerReason=null,sourceSha256=null,geometrySha256=null,occupiedVoxels=null;
 try{
  const checked=readModelProposal(candidate);
  validateDesign(checked.design);
  const compiled=compileDesign(checked.design);
  sourceValidation='B143_COMPILED_VERIFIED';
  sourceSha256=compiled.sourceSha256;
  geometrySha256=compiled.geometrySha256;
  occupiedVoxels=compiled.primitives.length;
 }catch(e){compilerReason=String(e?.message??e).slice(0,360);}
 return {
  schema:'r125-original-offline-diagnostic-v1',
  originalSha256:digest(raw),
  status:sourceValidation==='B143_COMPILED_VERIFIED'?
   'SOURCE_CANDIDATE_REVIEW_REQUIRED':'HOLD_ORIGINAL_SOURCE',
  compilerReason,
  findings,sourceValidation,sourceSha256,geometrySha256,occupiedVoxels,
  architecturalAdequacy:'NOT_CERTIFIED_BY_STATIC_CHECKS',
  originalEdited:false,inferredCorrectedDesign:false,
  modelCalls:0,worldWrites:0,worldGates:Array(9).fill('BLOCKED')
 };
}


/**
 * Opt-in offline replay for a SHORT, MODEL-AUTHORED ArchitecturePlan.
 * The model owns the original semantic design; the trusted generic HOST owns
 * geometry. No V6 placement patch, retry, model I/O or Minecraft contact.
 * A SOURCE candidate is never an ART pass or world-construction approval.
 */
export function diagnoseR125ArchitecturePlanOriginal(raw){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000)
  fail('PLAN_RAW_INPUT_SIZE');
 const base={
  schema:'r125-original-architecture-plan-diagnostic-v1',
  originalSha256:digest(raw),originalEdited:false,
  modelCalls:0,modelAuthorshipVerified:false,
  worldContacts:0,worldWrites:0,worldGates:Array(9).fill('BLOCKED'),
  constructionApproved:false,executionAllowed:false,
  artStatus:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'
 };
 let original;
 try{original=JSON.parse(raw);}
 catch{return {...base,status:'HOLD_INVALID_ORIGINAL_JSON',
  compilerReason:'ORIGINAL_NOT_JSON',sourceVerified:false};}
 if(!isObj(original))
  return {...base,status:'HOLD_INVALID_ORIGINAL_PLAN',
   compilerReason:'ORIGINAL_NOT_PLAN_OBJECT',sourceVerified:false};
 try{
  // This is an explicitly chosen GENERIC HOST policy, not a change to the
  // author-provided JSON. It is never selected as a retry after failure.
  const hostPolicy={entrancePlacement:'source-accessible',
   upperDoorPlacement:Object.hasOwn(original,'expression')?'stair-clear':'legacy'};
  const built=compileArchitecturePlan(original,hostPolicy);
  if(built.worldContacts!==0||built.worldWrites!==0||
     built.constructionApproved!==false||
     built.gates?.length!==9||built.gates.some(x=>x!=='BLOCKED')||
     built.compiled?.readiness!=='NOT_PREPARED'||
     built.compiled?.worldContacts!==0||
     built.compiled?.BuildPlan?.operations?.length!==0)
    fail('PLAN_WORLD_SAFETY_DRIFT');
  const routes=auditR125SourceRoutes(built);
  const circulation=auditArchitecturePlanCirculation(built);
  const critique=critiqueArchitecture({design:built.design,compiled:built.compiled});
  const floors=assessR125ProgramGeometry(built,critique);
  const functionalClear=routes.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   circulation.status==='SOURCE_CLEARANCE_PROBES_PASS'&&
   floors.programFloorIssues.length===0;
  return {...base,
   status:functionalClear?'B143_SOURCE_CANDIDATE_ART_HOLD':'HOLD_FUNCTIONAL_SOURCE',
   sourceVerified:functionalClear,compilerReason:null,
   hostPolicy,planSha256:built.planSha256,
   sourceSha256:built.sourceSha256,geometrySha256:built.geometrySha256,
   occupiedVoxels:built.compiled.primitives.length,
   sourceRoutes:routes.status,sourceRouteIssues:routes.issues??[],
   circulation:circulation.status,circulationFailures:circulation.failures??[],
   programFloors:floors.status,programFloorIssues:floors.programFloorIssues,
   visualHighRiskCount:critique.highRiskCount,
   // Only a trusted B143 source candidate, NOT an executable BuildPlan.
   sourceDesign:built.design};
 }catch(error){
  return {...base,status:'HOLD_PLAN_COMPILER_OR_QA',
   sourceVerified:false,compilerReason:String(error?.message??error).slice(0,360)};
 }
}

export function writeArchitecturePlanReplay(args){
 const dest=args['--out'],parent=path.dirname(dest);
 const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(fs.existsSync(dest)||!fs.existsSync(parent)||!fs.statSync(parent).isDirectory())
  fail('PLAN_OUTPUT_MUST_BE_NEW_DIRECTORY');
 const resolvedParent=fs.realpathSync(parent);
 if(resolvedParent===repoRoot||resolvedParent.startsWith(repoRoot+path.sep))
  fail('PLAN_PRIVATE_OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
 const raw=fs.readFileSync(args['--raw'],'utf8');
 const report=diagnoseR125ArchitecturePlanOriginal(raw);
 const {sourceDesign,...diagnosis}=report;
 fs.mkdirSync(dest);
 // Store exact private author bytes before any parsing or B143 review.
 fs.writeFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),raw,{flag:'wx'});
 fs.writeFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),
  JSON.stringify(diagnosis,null,2)+'\n',{flag:'wx'});
 if(sourceDesign){
  fs.writeFileSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json'),
   JSON.stringify(sourceDesign,null,2)+'\n',{flag:'wx'});
  // Review the actual B143 voxels from the archived model author, not a
  // fabricated proxy shape or a host-redesigned replacement.
  const template=fs.readFileSync(
   path.join(repoRoot,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(compileB143Gallery([sourceDesign]),template);
  fs.writeFileSync(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),
   html,{flag:'wx'});
 }
 return {status:report.status,originalSha256:report.originalSha256,
  sourceSha256:report.sourceSha256??null,
  modelCalls:0,worldWrites:0,humanArt:'NOT_REVIEWED'};
}

export function parseR125ReplayArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==4)fail('REQUIRE_RAW_AND_OUT');
 const opts={};
 for(let i=0;i<4;i+=2){
  if(!['--raw','--out'].includes(argv[i])||Object.hasOwn(opts,argv[i])||
   !argv[i+1]||argv[i+1].startsWith('--'))fail('INVALID_ARGUMENT');
  opts[argv[i]]=path.resolve(argv[i+1]);
 }
 if(!opts['--raw']||!opts['--out']||opts['--raw']===opts['--out'])
  fail('INPUT_OUTPUT_CONFLICT');
 return opts;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const planMode=process.argv[2]==='--architecture-plan';
  const args=parseR125ReplayArgs(process.argv.slice(planMode?3:2));
  if(args.help)console.log('B143: --raw ORIGINAL.txt --out NEW_DIAGNOSIS.json | ArchitecturePlan: --architecture-plan --raw ORIGINAL.txt --out NEW_PRIVATE_DIRECTORY (NO MODEL / NO WORLD)');
  else if(planMode){
   const result=writeArchitecturePlanReplay(args);
   console.log('R125_ARCHITECTURE_PLAN_SOURCE_ONLY',JSON.stringify(result));
   if(result.status!=='B143_SOURCE_CANDIDATE_ART_HOLD')process.exitCode=2;
  }else{
   if(fs.existsSync(args['--out']))fail('OUTPUT_ALREADY_EXISTS');
   const raw=fs.readFileSync(args['--raw'],'utf8');
   const report=diagnoseR125Original(raw);
   fs.writeFileSync(args['--out'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
   console.log(JSON.stringify({status:report.status,
    compilerReason:report.compilerReason,findings:report.findings.length,
    modelCalls:0,worldWrites:0}));
  }
 }catch(e){console.error('R125_REPLAY_HOLD',String(e?.message??e));process.exitCode=2;}
}
