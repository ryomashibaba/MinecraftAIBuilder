/** R190-AC zero-model, read-only comparison for AA original and AB candidate.
 * Raw evidence is parsed without repair. Source-space diagnostics are NOT
 * compiled voxels. Never replaces human art review or Minecraft walking.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190ABReply,R190AB_FORMAT} from './r190ab-structured-output-pilot.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const priorDir=path.resolve(here,'../evidence/r190aa/pilot-01');
const defaultAB=path.resolve(here,'../r190ab-local-evidence/contract-01');
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex');
const fail=x=>{throw Error('R190AC_'+x)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const read=(p,limit=150000)=>{
 const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||
  s.size<1||s.size>limit)fail('UNSAFE_OR_OVERSIZED_EVIDENCE');
 return fs.readFileSync(p,'utf8');
};
const folder=p=>{try{let s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const asBox=e=>e&&e.shape==='box'&&
 Array.isArray(e.origin)&&e.origin.length===3&&
 Array.isArray(e.size)&&e.size.length===3&&
 e.origin.concat(e.size).every(Number.isSafeInteger)&&
 e.size.every(x=>x>0)&&e.origin.every(x=>x>=0);
const overlap=(a,b)=>a.origin.reduce((v,x,i)=>
 v*Math.max(0,Math.min(x+a.size[i],b.origin[i]+b.size[i])-
 Math.max(x,b.origin[i])),1);
const boxedPoint=(p,e)=>Array.isArray(p)&&p.length===3&&
 p.every(Number.isSafeInteger)&&asBox(e)&&
 p.every((x,i)=>x>=e.origin[i]&&x<e.origin[i]+e.size[i]);
export function sourceStructureDiagnostics(raw){
 let obj;
 try{obj=JSON.parse(raw)}catch{
  return {jsonValid:false,status:'NO_GEOMETRY_ARITHMETIC_POSSIBLE',
   structuralComplianceCertified:false, sourceCoordinateOnly:true};
 }
 if(!obj||typeof obj!=='object'||Array.isArray(obj))
  return {jsonValid:true,status:'NOT_DESIGN_OBJECT',sourceCoordinateOnly:true};
 const d=obj.design??{},parts=Array.isArray(d.elements)?d.elements:[],
  allowed=['design','explanation','assumptions','spatialPlan'],
  additions=parts.filter(e=>e?.mode==='add'),
  cuts=parts.filter(e=>e?.mode==='cut'),
  issues=[];
 const extras=Object.keys(obj).filter(k=>!allowed.includes(k));
 if(extras.length)issues.push({kind:'EXTRA_TOP_LEVEL_KEYS',keys:extras});
 if(d.schema!=='minecraftaibuilder-b143-building-dsl-v1')
  issues.push({kind:'B143_SCHEMA',value:d.schema??null});
 for(const e of cuts)if(Object.hasOwn(e,'material'))
  issues.push({kind:'CUT_MATERIAL_PRESENT',id:e.id,value:e.material});
 for(const e of parts.filter(x=>x?.shape==='staircase'))
  if(e.mode!=='add'||!['x','z'].includes(e.axis))
   issues.push({kind:'STAIRCASE_AXIS_OR_MODE',id:e.id,axis:e.axis,mode:e.mode});
 const boxCuts=cuts.filter(asBox);
 const noPriorAddBoxOverlap=boxCuts.filter(c=>{
  const before=parts.slice(0,parts.indexOf(c));
  return !before.some(e=>e.mode==='add'&&asBox(e)&&overlap(c,e)>0);
 }).map(e=>e.id);
 const duplicateAddBoxes=[];
 const addBoxes=additions.filter(asBox);
 for(let i=0;i<addBoxes.length;i++)for(let j=i+1;j<addBoxes.length;j++)
  if(addBoxes[i].origin.join(',')===addBoxes[j].origin.join(',')&&
     addBoxes[i].size.join(',')===addBoxes[j].size.join(','))
   duplicateAddBoxes.push([addBoxes[i].id,addBoxes[j].id]);
 const declaredPoints=[{id:'entrance',point:obj.spatialPlan?.entrance},
  ...(Array.isArray(obj.spatialPlan?.destinations)?
   obj.spatialPlan.destinations.map(x=>({id:x.id,point:x.point})):[])];
 const pointInsideAuthoredAddBox=declaredPoints.map(x=>({
  id:x.id,point:x.point??null,
  addBoxesContainingPoint:addBoxes.filter(e=>boxedPoint(x.point,e)).map(e=>e.id),
  finalVoxelCell:'NOT_COMPUTED_FROM_INVALID_SOURCE'
 }));
 return {jsonValid:true,status:'SOURCE_COORDINATES_ONLY',
  topLevelKeys:Object.keys(obj),topLevelExtraKeys:extras,
  elementCount:parts.length,addElements:additions.length,cutElements:cuts.length,
  violations:issues,cutBoxesWithNoPrecedingAddBoxOverlap:noPriorAddBoxOverlap,
  duplicateAddedBoxes:duplicateAddBoxes,
  declaredPointInsideAddBoxes:pointInsideAuthoredAddBox,
  limitations:{sourceCoordinateOnly:true,priorNonBoxShapesNotMeasured:true,
   cutsLaterInSequenceMayChangePointOccupancy:true,
   finalVoxelsNeverAssumedFromTheseArithmeticFindings:true,
   roomContinuityAndTrueRoofNotCertified:true},
  structuralComplianceCertified:false};
}
export function inspectSavedR190AC({abDir=defaultAB,baselineDir=priorDir}={}){
 if(!folder(abDir)||!folder(baselineDir))fail('MISSING_EVIDENCE_DIR');
 const abRaw=read(path.join(abDir,'MODEL_RESPONSE_ORIGINAL.txt')),
  abResult=JSON.parse(read(path.join(abDir,'R190AB_RESULT.json'),100000)),
  abAttempt=JSON.parse(read(path.join(abDir,'R190AB_ATTEMPT.json'),100000));
 const aaRaw=read(path.join(baselineDir,'MODEL_RESPONSE_ORIGINAL.txt')),
  aaAudit=JSON.parse(read(path.join(baselineDir,'AUDIT.json'),60000));
 const sourceHash=sha(abRaw),oldHash=sha(aaRaw);
 if(oldHash!=='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17'||
  aaAudit?.original?.sha256!==oldHash||aaAudit?.original?.bytes!==Buffer.byteLength(aaRaw))
  fail('AA_ORIGINAL_OR_AUDIT_CHANGED');
 if(abResult?.schema!=='minecraftaibuilder-r190ab-result-v1'||
  abResult?.pilot01OriginalSha256!==oldHash||
  abResult?.response?.originalRawSha256!==sourceHash||
  abResult?.response?.bytes!==Buffer.byteLength(abRaw)||
  abResult?.schemaSha256!==sha(JSON.stringify(R190AB_FORMAT))||
  abResult?.schemaSha256!==abAttempt?.schemaSha256||
  abResult?.originalPromptSha256!==abAttempt.promptSha256||
  abResult?.modelClaimed!==abAttempt.modelRequested||
  abResult.providerCallsAttempted!==1||
  abResult.noAutomaticRetry!==true||abResult.noHostGeometryRepair!==true||
  abResult.constructionApproved!==false||abResult.executionAllowed!==false||
  abResult.worldWrites!==0||abResult.worldContacts!==0||
  abResult.gates?.length!==9||abResult.gates.some(g=>g!=='BLOCKED')||
  abResult.BuildPlan?.operations?.length!==0)
  fail('AB_RESULT_PROVENANCE_OR_SAFETY');
 const aa=inspectR190ABReply(aaRaw);
 const ab=inspectR190ABReply(abRaw,abResult.providerDoneReason);
 if(ab.report.status!==abResult.response.status||
  ab.report.strictB143!==abResult.response.strictB143||
  ab.report.declaredPlan!==abResult.response.declaredPlan||
  ab.report.real3D!==abResult.response.real3D&&
   abResult.response.status!=='HOLD_SOURCE_VIEWER_FAILED'||
  ab.report.geometrySha256!==abResult.response.geometrySha256)
  fail('AB_RECOMPUTED_RESULT_MISMATCH');
 const physical=ab.report.physical;
 const entry={
  validSupportedAir:physical?.modelDeclaredEntranceStandable??null,
  horizontalBoundaryAirLinked:physical?.modelDeclaredEntranceHorizontalAirToBoundaryProxy??null,
  reachableStandable:physical?.reachableFromModelDeclaredEntrance??null,
  coveredReachableProxy:physical?.roofCoveredReachableProxy??null,
  declaredZoneSamples:physical?.modelDeclaredZoneSamples??null,
  declaredZoneCrossings:physical?.modelDeclaredZonePairCrossings??null
 };
 return {schema:'minecraftaibuilder-r190ac-saved-source-review-v1',
  status:'OFFLINE_EVIDENCE_VERIFIED_ART_HOLD',modelCalls:0,
  evidence:{oldRawSha256:oldHash,newRawSha256:sourceHash,
   oldByteCount:Buffer.byteLength(aaRaw),newByteCount:Buffer.byteLength(abRaw),
   claimedSameModel:abResult.modelClaimed===aaAudit.selectedModel,
   providerCallCountsDifferOrUnknown:true,modelIdentityCryptographicallyVerified:false},
  format:{oldStatus:aa.report.status,oldError:aa.report.error,
   newStatus:ab.report.status,newError:ab.report.error,
   newStrictB143:ab.report.strictB143},
  sourceArithmetic:{old:sourceStructureDiagnostics(aaRaw),
   next:sourceStructureDiagnostics(abRaw)},
  geometry:{newSourceSha256:physical?.sourceSha256??null,
   newPhysicalVoxelSha256:physical?.finalPhysicalVoxelSha256??null,
   newVoxelCount:physical?.finalVoxelCount??null,
   entry,originalVoxelComparisonPossible:false,
   separateEnclosedRoomsVerified:false,actualRoofVerified:false,
   physicalMinecraftWalking:'NOT_TESTED'},
  improvement:{formatImproved:ab.report.strictB143&&!aa.report.strictB143,
   architecturalImprovement:'NOT_ESTABLISHED',
   aestheticImprovement:'NOT_ESTABLISHED',winner:'NOT_ESTABLISHED',
   sampleSizeNew:1,independentHumanArtReview:'ART_HOLD'},
  noInferenceNoRepair:true,...safe()};
}
export function parseR190ACArgs(args){
 const o={ab:defaultAB};
 if(args.length===1&&args[0]==='--help')return {help:true};
 if(args.length===2&&args[0]==='--ab'&&args[1]&&
  path.isAbsolute(args[1]))return {ab:args[1]};
 if(args.length)fail('ARGS');
 return o;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const o=parseR190ACArgs(process.argv.slice(2));
  console.log(JSON.stringify(o.help?{help:'NO MODEL CALLS: node scripts/r190ac-offline-source-review.mjs [--ab ABSOLUTE_SAVED_R190AB_STUDY_DIR]'}:
   inspectSavedR190AC({abDir:o.ab}),null,2));
 }catch(e){console.error('R190AC_HOLD',String(e?.message??e));process.exitCode=2}
}