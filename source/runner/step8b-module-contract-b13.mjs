// B13 read-only, source-fingerprint-pinned INPUT CONTRACT review. NO production planner execution.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB12Report,validateB12Report} from './step8b-spatial-contract-b12.mjs';
import {loadB10Frozen} from './step8b-interior-contract-b10.mjs';
const fail=(code)=>{const e=Error('B13_'+code);e.code='B13_'+code;throw e;};
const sha=b=>createHash('sha256').update(b).digest('hex');
const stable=o=>sha(JSON.stringify(o));
const PIN=Object.freeze({
 'engine/src/general-building-planner.js':'23be6e8b03827698fb890661f6fd0957a76ac4718f3347531121c8a7dc0450c8',
 'engine/src/building-grammar.js':'71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a',
 'engine/src/architectural-quality.js':'5cadf22d51867a18fd35f6e9ec2e1318732eca2f2e666d2cfc4b2b32cbede530',
 'modules/architectural-library.js':'19fa126051a687bfb5c5f6bdf199a6d42aa70b475d908dd38a99e9f354532eee',
 'styles/urban_japanese.json':'cefb23009e7a96f8d5900e44242c5fa426646be64c5391048f52e29506f1ceec'
});
export const B13_WINDOWS_PINNED=PIN;
// Optional source inspection is exact byte matching only; never import or execute the engine.
export function verifyPinnedSnapshot(snapshotDir){
 if(typeof snapshotDir!=='string'||!snapshotDir)fail('SNAPSHOT_INVALID');
 const seen={};
 for(const [relative,expected] of Object.entries(PIN)){
  const full=path.join(snapshotDir,...relative.split('/'));
  let b;try{const s=fs.lstatSync(full);if(!s.isFile()||s.isSymbolicLink())fail('SNAPSHOT_UNSAFE');b=fs.readFileSync(full);}catch(e){if(e.code?.startsWith('B13_'))throw e;fail('SNAPSHOT_MISSING');}
  if(sha(b)!==expected)fail('SNAPSHOT_CHANGED');seen[relative]=expected;
 }
 return Object.freeze(seen);
}
function maskCount(mask){return [...mask].filter(x=>x==='1').length;}
export function inspectOfficeRootCause(candidate,b7){
 if(!candidate||candidate.key!=='office/candidate-02'||!b7||b7.program!=='office'||b7.id!=='candidate-02'||b7.massing!=='asymmetric_block'||b7.style!=='urban_japanese'||b7.seed!==0)fail('OFFICE_PROVENANCE');
 const {width:w,depth:d,floors}=b7.dimensions;
 if(w!==24||d!==20||floors!==6||candidate.levels.length!==floors)fail('OFFICE_INPUT');
 const min=Math.min(w,d),seed=b7.seed,styleProportion=1;
 const inferredWing=Math.max(3,Math.floor(min/4))+seed%2;
 const sourceWing=Math.min(Math.floor((min-3)/2),inferredWing+styleProportion);
 if(b7.massingDetail?.conceptInferredWingCells!==inferredWing||b7.massingDetail?.sourceStyleWingCells!==sourceWing||sourceWing!==6||inferredWing!==5)fail('OFFICE_WING');
 const split=Math.floor(w*.55),a=[{x:0,z:0,width:split,depth:d-sourceWing,start:0,end:floors},{x:split-2,z:sourceWing,width:w-split+2,depth:d-sourceWing,start:0,end:floors-1}];
 if(JSON.stringify(a)!==JSON.stringify(b7.sourcePredictedRectangles))fail('OFFICE_RECTANGLES');
 let mismatch=0,outside=0;
 const byLevel=candidate.levels.map(l=>{
  if(l.sourceMask.length!==w*d||l.conceptMask.length!==w*d)fail('OFFICE_MASK');
  let n=0;for(let j=0;j<l.sourceMask.length;j++)if(l.sourceMask[j]!==l.conceptMask[j])n++;
  if(n!==l.conceptVsEngineChangedCells||l.trimOnlyRemovedCells.length!==3)fail('OFFICE_LEVEL_DELTA');
  mismatch+=n;outside+=l.sourceCorridorOutsideCells;
  return {level:l.level,sourceCells:maskCount(l.sourceMask),conceptCells:maskCount(l.conceptMask),changedCells:n,conceptCorridorOutsideSource:l.sourceCorridorOutsideCells,trimSuggestionCells:l.trimOnlyRemovedCells.length};
 });
 if(mismatch!==123||outside!==18)fail('OFFICE_BASELINE_DIVERGED');
 return {key:candidate.key,style:b7.style,seed,formula:'min(floor((min(width,depth)-3)/2),max(3,floor(min(width,depth)/4))+seed%2+style.proportion)',
  styleProportion,conceptWing:inferredWing,sourceWing,sourceFormulaRectangles:a,levels:byLevel,changedCells:mismatch,unplacedCorridorCells:outside,
  causalChain:['style proportion +1','source wing 5 -> 6','source rectangle z/depth changes','static footprints differ 123 cells','nominal corridors outside footprint 18 cells'],
  proof:'STATIC_PINNED_SOURCE_FORMULA_AND_B12_MASKS_ONLY'};
}
const alternative=(id,desc,geom,corridor,trim)=>({id,description:desc,sourcePredictedFootprintChanges:false,conceptualMismatchCells:geom,nominalCorridorOutsideCells:corridor,reviewTrimCells:trim,
   autoApplied:false,approved:false,actualWalkability:'UNVERIFIED',actualConstruction:'UNVERIFIED',worldAnchor:null,materialIds:[],operations:[]});
export function compareOfficeB13(root){
 if(root.changedCells!==123||root.unplacedCorridorCells!==18)fail('ALTERNATIVE_BASELINE');
 return [
  alternative('KEEP_FROZEN','凍結設計保持。外形差分と廊下はみ出しは残る',123,18,0),
  alternative('TRIM_CORRIDOR_REVIEW','廊下端だけレビュー上で18セル除外。外形差分は残る',123,0,18),
  {...alternative('REBASE_CONCEPT_TO_SOURCE_REVIEW','概念上の輪郭をエンジン予測へ合わせるだけ。室内予約のはみ出しは残る',0,18,0),conceptEnvelopeReferenceOnly:true},
  {...alternative('REBASE_AND_TRIM_REVIEW','概念輪郭整合と廊下端補正の組合せ。新たな概念設計候補のみ',0,0,18),conceptEnvelopeReferenceOnly:true}
 ];
}
const COVERAGE=Object.freeze([
 {id:'EXTERNAL_FLOOR_PLATES',engine:'EMITTER_IDENTIFIED',concept:'FOOTPRINT_ONLY',source:'general-building-planner.js: plate(masks[f],base,"floor",...)',physical:'UNVERIFIED'},
 {id:'EXTERNAL_FACADE_WALLS',engine:'EMITTER_IDENTIFIED',concept:'EXTERNAL_ENVELOPE_ONLY',source:'architectural-quality.js: composeFacade solid_wall',physical:'UNVERIFIED'},
 {id:'EXTERNAL_ENTRANCE',engine:'EMITTER_IDENTIFIED',concept:'BUILDING_ENTRANCE_NOT_ROOM_DOORS',source:'general-building-planner.js: emitModule(entrance,...)',physical:'UNVERIFIED'},
 {id:'INTERIOR_PARTITION_WALLS',engine:'NO_EMITTER_IDENTIFIED_IN_INSPECTED_PLANNER',concept:'ROOM_RECTANGLES_ONLY',source:'inspected planner/module scope',physical:'UNVERIFIED'},
 {id:'INTERIOR_ROOM_DOORS',engine:'NO_EMITTER_IDENTIFIED_IN_INSPECTED_PLANNER',concept:'314_NOMINAL_PORTS',source:'inspected planner/module scope',physical:'UNVERIFIED'},
 {id:'STAIRCASE_BLOCK_ASSEMBLY',engine:'NO_EMITTER_IDENTIFIED_IN_INSPECTED_PLANNER',concept:'25_NOMINAL_INTERFLOOR_LINKS',source:'inspected planner/module scope',physical:'UNVERIFIED'},
 {id:'ELEVATOR_MECHANISM',engine:'NO_EMITTER_IDENTIFIED_IN_INSPECTED_PLANNER',concept:'5_VERTICAL_RESERVATION_STACKS',source:'inspected planner/module scope',physical:'UNVERIFIED'}
]);
export function buildB13Report(root){
 const b12=buildB12Report(root);validateB12Report(b12,root);
 const frozen=loadB10Frozen(root);
 const b7=frozen.b7.candidates.find(x=>x.program==='office'&&x.id==='candidate-02');
 const office=inspectOfficeRootCause(b12.candidates.find(x=>x.key==='office/candidate-02'),b7);
 const alternatives=compareOfficeB13(office);
 const office02Visualization=b12.candidates.find(x=>x.key==='office/candidate-02').levels.map(l=>({c:l.conceptMask,s:l.sourceMask,removed:l.trimOnlyRemovedCells}));
 const c=b12.candidates.map(x=>({key:x.key,levels:x.levels.length,doorPorts:x.summary.doorInterfaces,
  doorConstructionEvidence:'NONE_IN_INSPECTED_PLANNER',roomPartitionEvidence:'NONE_IN_INSPECTED_PLANNER',staircaseConstructionEvidence:'NONE_IN_INSPECTED_PLANNER',
  sourceFootprintDiff:x.summary.sourceMismatchCells,corridorOutside:x.summary.localCorridorTrimCells,nominalVerticalAligned:x.vertical.schematicAlignmentPass}));
 if(c.length!==5||c.reduce((n,x)=>n+x.doorPorts,0)!==314||c.reduce((n,x)=>n+x.levels,0)!==30)fail('COUNTS');
 const report={schema:'minecraftaibuilder-step8b-b13-module-handoff-contract-v1',status:'OFFLINE_STATIC_MODULE_CONTRACT',
  evidence:{b12ReportSha256:b12.reportSha256,pinnedSnapshotFiles:PIN,sourceScope:'GENERAL_BUILDING_PLANNER_AND_ARCHITECTURAL_MODULE_REGISTRY_ONLY',
   inspection:'SOURCE_BYTE_HASH_MATCHED_ON_2026_10_10',executedPlanner:false},
  coverage:COVERAGE,candidates:c,office02:office,office02Visualization,office02ReviewAlternatives:alternatives,
  findings:{sourceFootprintMismatch:123,office02NominalCorridorOutside:18,nominalRoomDoorPorts:314,nominalFloorLayers:30,nominalInterfloorStairLinks:25,
   nominalElevatorStacks:5,verifiedInteriorDoorEmitters:0,verifiedPartitionEmitters:0,verifiedStairAssemblers:0,verifiedElevatorAssemblers:0,
   limitation:'NO_EMITTER_IDENTIFIED does not prove that no other component exists'},
  requiredNextContracts:['INTERIOR_PARTITION_GEOMETRY','ROOM_DOOR_BOUNDARY_TO_BLOCK_OPENING','STAIR_FLIGHT_TO_BLOCK_AND_HEADROOM','ELEVATOR_OR_ALTERNATE_VERTICAL_PASSAGE','MATERIAL_ID_SUPPORTED_IN_EDUCATION','WORLD_ANCHOR_AND_SCAN','RUNNING_ENGINE_IDENTITY','EXPLICIT_USER_CONSTRUCTION_APPROVAL'],
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,legacyModified:false,frozenEvidenceModified:false,existingWorldModified:false,apiAccess:false},
  deploymentGate:'BLOCKED',BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 report.reportSha256=stable(report);return report;
}
export function validateB13Report(report,root){
 if(!report||report.schema!=='minecraftaibuilder-step8b-b13-module-handoff-contract-v1'||report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||
  report.BuildPlan?.commandCount!==0||!Array.isArray(report.BuildPlan?.operations)||report.BuildPlan.operations.length||report.BuildPlan.worldCoordinates!==null||report.BuildPlan.materialIds?.length!==0||
  report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||report.safety?.apiAccess!==false||report.safety?.existingWorldModified!==false||
  report.evidence?.executedPlanner!==false||report.findings?.verifiedInteriorDoorEmitters!==0||report.findings?.verifiedPartitionEmitters!==0||
  report.findings?.verifiedStairAssemblers!==0||report.findings?.verifiedElevatorAssemblers!==0||report.office02ReviewAlternatives?.some(x=>x.approved||x.autoApplied||x.operations?.length||x.worldAnchor!==null||x.materialIds?.length)||
  Object.keys(PIN).some(k=>report.evidence.pinnedSnapshotFiles[k]!==PIN[k]))fail('UNSAFE_REPORT');
 const {reportSha256,...payload}=report;if(stable(payload)!==reportSha256||stable(buildB13Report(root))!==stable(report))fail('ALTERED_REPORT');
 return true;
}
