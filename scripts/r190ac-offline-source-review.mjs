/** R190-AC zero-model, read-only comparison for AA original and AB candidate.
 * Raw evidence is parsed without repair. Source-space diagnostics are NOT
 * compiled voxels. Never replaces human art review or Minecraft walking.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190ABReply,R190AB_FORMAT} from './r190ab-structured-output-pilot.mjs';
import {inspectR190ABSemanticReply,R190AB_SEMANTIC_FORMAT_SHA256}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
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
/** Model-authored IR is NOT model-authored voxels. Independently rebuild all
 * B143 source artifacts from the IMMUTABLE model plan, read-only.
 * This cannot compare the workshop to the old 2-level library as same task.
 */
function inspectSavedSemanticStudy({abDir,raw,result,attempt,oldRaw,oldAudit}){
 const rawHash=sha(raw),oldHash=sha(oldRaw),
  r=result?.response;
 if(result.schema!=='minecraftaibuilder-r190ab-semantic-study-v1'||
  result.contract!=='semantic-space'||attempt.contract!=='semantic-space'||
  result.sourceTask!=='tidal-workshop'||attempt.sourceTask!==result.sourceTask||
  result.pilot01OriginalSha256!==oldHash||
  result.schemaSha256!==R190AB_SEMANTIC_FORMAT_SHA256||
  attempt.schemaSha256!==result.schemaSha256||
  r?.formatSchemaSha256!==result.schemaSha256||
  r.originalRawSha256!==rawHash||
  r.bytes!==Buffer.byteLength(raw,'utf8')||
  result.originalPromptSha256!==attempt.promptSha256||
  result.modelClaimed!==attempt.modelRequested||
  result.providerCallsAttempted!==1||attempt.providerCallsAttempted!==1||
  result.noAutomaticRetry!==true||result.noHostGeometryRepair!==true||
  result.b143Authorship!=='HOST_DERIVED_FROM_MODEL_SEMANTIC_IR'||
  r.modelAuthoredB143!==false||r.hostDeterminesExactVoxels!==true||
  result.constructionApproved!==false||result.executionAllowed!==false||
  result.worldContacts!==0||result.worldWrites!==0||
  r.worldContacts!==0||r.worldWrites!==0||
  result.gates?.length!==9||result.gates.some(x=>x!=='BLOCKED')||
  result.BuildPlan?.operations?.length!==0)
  fail('SEMANTIC_PROVENANCE_OR_SAFETY');
 const actual=inspectR190ABSemanticReply(raw,result.providerDoneReason);
 const parsed=actual.report;
 const viewerFailed=r.status==='HOLD_SOURCE_VIEWER_FAILED'&&
  parsed.real3D===true&&r.real3D===false;
 if((!viewerFailed&&r.status!==parsed.status)||
  r.hostSourceDerived!==parsed.hostSourceDerived||
  r.semanticPlanValid!==parsed.semanticPlanValid||
  (!viewerFailed&&r.real3D!==parsed.real3D)||
  r.planSha256!==parsed.planSha256||
  r.hostDerivedSourceSha256!==parsed.hostDerivedSourceSha256||
  r.hostDerivedGeometrySha256!==parsed.hostDerivedGeometrySha256||
  r.hostDerivedVoxelCount!==parsed.hostDerivedVoxelCount||
  JSON.stringify(r.sourceRouteAudit??null)!==
   JSON.stringify(parsed.sourceRouteAudit??null))
  fail('SEMANTIC_RECOMPUTED_MODEL_IR_MISMATCH');
 if(r.real3D){
  if(!actual.design||!actual.compiled)
   fail('SEMANTIC_B143_NOT_RECREATABLE');
  const originalHost=JSON.parse(read(
   path.join(abDir,'HOST_DERIVED_B143_SOURCE.json'),300000));
  if(JSON.stringify(originalHost)!==JSON.stringify(actual.design))
   fail('SEMANTIC_STORED_HOST_B143_CHANGED');
  const evidence=JSON.parse(read(
   path.join(abDir,'HOST_DERIVED_SOURCE_AUDIT.json'),100000));
  if(evidence.modelDidNotAuthorB143!==true||
   evidence.compilerSourceSha256!==parsed.hostDerivedSourceSha256||
   evidence.compilerGeometrySha256!==parsed.hostDerivedGeometrySha256||
   JSON.stringify(evidence.sourceRouteAudit)!==
    JSON.stringify(parsed.sourceRouteAudit))
   fail('SEMANTIC_STORED_ROUTE_PROOF_CHANGED');
  const template=read(path.resolve(here,'../source/ai/b143-viewer-template.html'),4000000);
  const trueHtml=renderB143Html(compileB143Gallery([actual.design]),template);
  if(sha(read(path.join(abDir,'HOST_DERIVED_SOURCE_TRUE_3D.html'),20000000))!==
   sha(trueHtml))fail('SEMANTIC_VIEWER_EVIDENCE_CHANGED');
  for(const side of ['front','rear','west','east','roof']){
   const svg=read(path.join(abDir,'HOST_DERIVED_'+side+'.svg'),3000000);
   if(sha(svg)!==sha(renderR164Elevation(
    actual.compiled,actual.design,side)))
    fail('SEMANTIC_ELEVATION_EVIDENCE_CHANGED_'+side.toUpperCase());
  }
 }
 return {schema:'minecraftaibuilder-r190ac-verified-host-semantic-study-v1',
  status:r.status,modelCalls:0,originalRawSha256:rawHash,
  baselineRawSha256:oldHash,modelNameClaimed:result.modelClaimed,
  modelIdentityCryptographicallyVerified:false,
  sameTaskAsR190AAPilot01:false,
  originalModelAuthoredB143:false,modelAuthoredIR:true,
  compilerDerivedB143SourceSha256:parsed.hostDerivedSourceSha256??null,
  compilerDerivedGeometrySha256:parsed.hostDerivedGeometrySha256??null,
  actualSourceVoxelCount:parsed.hostDerivedVoxelCount??null,
  independentSourceRouteProof:parsed.sourceRouteAudit??null,
  independentJapaneseRequirements:'NOT_CERTIFIED',
  weatherAndTidalResponse:'NOT_TESTED',
  additionalStoreyAndVerticalMovement:'UNSUPPORTED_BY_CURRENT_ENGINE',
  aestheticQuality:'ART_HOLD',winner:'NOT_ESTABLISHED',
  comparisonNotCausal:true,oldModel:oldAudit.selectedModel,
  sourceUnmodified:true,noNewModelCalls:true,...safe()};
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
 if(abResult?.contract==='semantic-space')return inspectSavedSemanticStudy({
  abDir,raw:abRaw,result:abResult,attempt:abAttempt,oldRaw:aaRaw,oldAudit:aaAudit
 });
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
 const viewerFailed=abResult.response.status==='HOLD_SOURCE_VIEWER_FAILED'&&
  ab.report.strictB143===true&&ab.report.real3D===true&&
  abResult.response.real3D===false;
 if((!viewerFailed&&ab.report.status!==abResult.response.status)||
  ab.report.strictB143!==abResult.response.strictB143||
  ab.report.declaredPlan!==abResult.response.declaredPlan||
  (!viewerFailed&&ab.report.real3D!==abResult.response.real3D)||
  ab.report.geometrySha256!==abResult.response.geometrySha256)
  fail('AB_RECOMPUTED_RESULT_MISMATCH');
 // Claimed geometry/route/roof numbers may not replace recomputed actual voxels.
 if(JSON.stringify(ab.report.physical??null)!==
    JSON.stringify(abResult.response.physical??null))
  fail('AB_REPORTED_PHYSICAL_MEASUREMENTS_CHANGED');
 // Independently regenerate images from ORIGINAL model-authored B143, not repairs.
 // A placeholder HTML or forged screenshot must NOT count as true source 3D.
 if(abResult.response.real3D===true){
  const design=ab.design;
  if(!design)fail('AB_VIEWER_WITHOUT_COMPILED_MODEL');
  let expectedHtml;
  try{
   const template=read(path.resolve(here,'../source/ai/b143-viewer-template.html'),4000000);
   expectedHtml=renderB143Html(compileB143Gallery([design]),template);
  }catch{fail('AB_INDEPENDENT_VIEWER_REBUILD_FAILED')}
  const viewer=path.join(abDir,'MODEL_SOURCE_TRUE_3D.html');
  if(!fs.existsSync(viewer)||
   sha(read(viewer,20000000))!==sha(expectedHtml))
   fail('AB_VIEWER_EVIDENCE_MISMATCH');
  const compiled=compileDesign(design);
  for(const side of ['front','rear','west','east','roof']){
   const svg=path.join(abDir,'MODEL_'+side+'.svg');
   if(!fs.existsSync(svg)||
    sha(read(svg,3000000))!==sha(renderR164Elevation(compiled,design,side)))
    fail('AB_ELEVATION_EVIDENCE_MISMATCH_'+side.toUpperCase());
  }
 }
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