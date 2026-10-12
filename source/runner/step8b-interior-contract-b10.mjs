// Step8B/B10: standalone, provenance-pinned STATIC concept-to-source geometry contract.
// No production planner imports, Minecraft/Bridge access, world anchor, block IDs, or writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateB9Report} from './step8b-diversity-b9.mjs';

const shaBytes=b=>createHash('sha256').update(b).digest('hex');
const shaJson=o=>shaBytes(JSON.stringify(o));
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const B10_CANONICAL_REPORT_SHA='9446781f01d0400de1302b8994338270cdbc1000201aec0dac1fcbdf08700c55';
const frozen={
 'reports/B7_RECONCILED_REVIEW.json':'bc6cbe9946f80fd4b4d63400a192019fb545f7082e56bf7e26e8af95d4a821b4',
 'reports/B9_STATIC_REVIEW.json':'6a7263224edc05c7c0150f100139c6e73670002b793a9e4ef0bf858e89cc48b4',
 'samples/hotel/review.json':'c3a8bb262d0120ba36d9b6cf402371796b1761545e65239c7c3c00f7d588cc16',
 'samples/apartment/review.json':'41905a818c3135845a46299c03fe2e90c06943b34f35a7bf5bb57336a1478507',
 'samples/office/review.json':'fc03c3d71b2ad9e9184fd38d13a674ba506eb094a9c3b584b9957c724e5410cb'
};
export const B10_FROZEN_SHA256=Object.freeze({...frozen});
export function loadB10Frozen(base){
 const result={};
 for(const [rel,hash] of Object.entries(frozen)){
  const full=path.join(base,rel);const bytes=fs.readFileSync(full);
  if(shaBytes(bytes)!==hash)fail('B10_FROZEN_INPUT_CHANGED');
  result[rel]=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 }
 validateB9Report(result['reports/B9_STATIC_REVIEW.json']);
 const b7=result['reports/B7_RECONCILED_REVIEW.json'];
 if(b7.schema!=='minecraftaibuilder-step8b-b7-review-reconciliation-v1'||b7.deploymentGate!=='BLOCKED'||b7.BuildPlan?.status!=='NOT_PREPARED'||b7.BuildPlan?.operations?.length!==0)fail('B10_B7_UNSAFE');
 for(const p of ['hotel','apartment','office']){
  const rev=result[`samples/${p}/review.json`];
  if(rev.BuildPlan?.status!=='NOT_PREPARED'||rev.BuildPlan.operations.length!==0||rev.safety?.executionAllowed!==false)fail('B10_STEP8A_UNSAFE');
 }
 return {b7,b9:result['reports/B9_STATIC_REVIEW.json'],reviews:Object.fromEntries(['hotel','apartment','office'].map(p=>[p,result[`samples/${p}/review.json`]]))};
}
const idx=(x,z,w)=>z*w+x;
export function maskForFloor(rects,width,depth,floor){
 if(!Array.isArray(rects)||!Number.isSafeInteger(width)||!Number.isSafeInteger(depth)||!Number.isSafeInteger(floor)||width<1||depth<1||width>48||depth>40||floor<0||floor>=10)fail('B10_MASK_INVALID');
 const m=new Uint8Array(width*depth);
 for(const r of rects){
  if(![r.x,r.z,r.width,r.depth,r.start,r.end].every(Number.isSafeInteger)||r.x<0||r.z<0||r.width<1||r.depth<1||r.x+r.width>width||r.z+r.depth>depth||r.start<0||r.end>10||r.start>=r.end)fail('B10_RECTANGLE_INVALID');
  if(r.start<=floor&&floor<r.end)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)m[idx(x,z,width)]=1;
 }
 return m;
}
const count=m=>m.reduce((a,v)=>a+v,0);
function normalize(cells,w,d,code){
 if(!Array.isArray(cells))fail('B10_'+code+'_INVALID');
 const set=new Set();
 for(const p of cells){if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.z)||p.x<0||p.z<0||p.x>=w||p.z>=d)fail('B10_'+code+'_OUT_OF_BOUNDS');set.add(idx(p.x,p.z,w));}
 return set;
}
function roomCells(rooms,w,d){
 if(!Array.isArray(rooms))fail('B10_ROOMS_INVALID');
 const cells=new Set();
 for(const r of rooms){
  if(![r.x,r.z,r.width,r.depth].every(Number.isSafeInteger)||r.x<0||r.z<0||r.width<1||r.depth<1||r.x+r.width>w||r.z+r.depth>d)fail('B10_ROOM_OUT_OF_BOUNDS');
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)cells.add(idx(x,z,w));
 }
 return cells;
}
function compareSet(m,s){let outside=0;for(const i of s)outside+=m[i]===0?1:0;return {conceptCells:s.size,outsideSourceCells:outside,withinSourceCells:s.size-outside};}
function verifyNonExecuting(plan,label){if(plan?.status!=='NOT_PREPARED'||plan?.commandCount!==0||!Array.isArray(plan.operations)||plan.operations.length!==0)fail('B10_'+label+'_PLAN_UNSAFE');}
export function reconcileFrozenCandidate(legacy,concept,program){
 const comp=concept?.concept?.BuildingComposition,detail=concept?.detail,architecture=concept?.architecture;
 if(!comp||!detail||!architecture||!legacy||legacy.program!==program||legacy.id!==concept.id||comp.program!==program||legacy.massing!==comp.massing||legacy.orientation!==comp.orientation||legacy.dimensions.width!==comp.dimensions.width||legacy.dimensions.depth!==comp.dimensions.depth||legacy.dimensions.floors!==comp.floorCount)fail('B10_CANDIDATE_ID_OR_SHAPE_MISMATCH');
 for(const [name,p] of [['CONCEPT',concept.concept.BuildPlan],['ARCHITECTURE',architecture.BuildPlan],['DETAIL',detail.BuildPlan],['LEGACY',legacy.BuildPlan]])verifyNonExecuting(p,name);
 const {width:w,depth:d,floors:n}=legacy.dimensions;
 const details=detail.roomsAndCorridors?.floors;
 if(!Array.isArray(details)||details.length!==n||detail.stair?.shaft==null)fail('B10_INTERIOR_MISSING');
 const floors=[];let sourceOnly=0,conceptOnly=0,displaced=0;
 for(let f=0;f<n;f++){
  const a=maskForFloor(legacy.conceptRectangles,w,d,f),b=maskForFloor(legacy.sourcePredictedRectangles,w,d,f),layer=details[f];
  if(layer.level!==f+1||layer.footprintArea!==count(a))fail('B10_DETAIL_LEVEL_MISMATCH');
  const inConceptOnly=[],inSourceOnly=[];
  for(let i=0;i<a.length;i++){if(a[i]&&!b[i])inConceptOnly.push(i);if(b[i]&&!a[i])inSourceOnly.push(i);}
  const byType={
   stairReservation:compareSet(b,normalize(layer.coreStairCells,w,d,'STAIR')),
   elevatorReservation:compareSet(b,normalize(layer.elevatorCells,w,d,'ELEVATOR')),
   corridor:compareSet(b,normalize(layer.corridorCells,w,d,'CORRIDOR')),
   roomFootprints:compareSet(b,roomCells(layer.rooms,w,d)),
   roomDoorCells:compareSet(b,normalize(layer.rooms.map(x=>({x:x.door?.x,z:x.door?.z})),w,d,'DOOR')),
   roomHallCells:compareSet(b,normalize(layer.rooms.map(x=>({x:x.door?.hallX,z:x.door?.hallZ})),w,d,'HALL'))
  };
  for(const metric of Object.values(byType))displaced+=metric.outsideSourceCells;
  sourceOnly+=inSourceOnly.length;conceptOnly+=inConceptOnly.length;
  floors.push({level:f+1,conceptArea:count(a),sourceArea:count(b),conceptOnlyCells:inConceptOnly.length,sourceOnlyCells:inSourceOnly.length,
   masks:{concept:Array.from(a).join(''),source:Array.from(b).join('')},
   categories:byType,rooms:layer.rooms.length,stairSchematic:detail.stair.status,
   status:inConceptOnly.length||inSourceOnly.length?'GEOMETRY_DIFF_REVIEW_REQUIRED':'SAME_FOOTPRINT_STATIC_ONLY'});
 }
 const advertised=legacy.local.layers;
 if(floors.some((f,i)=>f.conceptArea!==advertised[i].conceptArea||f.sourceArea!==advertised[i].sourceArea||f.conceptOnlyCells!==advertised[i].conceptOnlyCells||f.sourceOnlyCells!==advertised[i].sourceOnlyCells))fail('B10_B7_RECONCILIATION_MISMATCH');
 if(sourceOnly+conceptOnly!==legacy.local.changedCells)fail('B10_B7_DELTA_MISMATCH');
 const warnings=[];
 if(conceptOnly||sourceOnly)warnings.push('SOURCE_VS_CONCEPT_2D_DIFFERENCE');
 if(displaced)warnings.push('CONCEPT_INTERIOR_OUTSIDE_SOURCE_ENVELOPE');
 if(detail.stair.headroomVerified!==false||detail.stair.minecraftStairBlocksVerified!==false||architecture.circulation.internalWallsAssumedAbsent!==true)fail('B10_INTERIOR_EVIDENCE_OVERCLAIM');
 return {key:program+'/'+concept.id,program,massing:legacy.massing,orientation:legacy.orientation,dimensions:legacy.dimensions,
  floorHeight:comp.floorHeight,levels:floors,summary:{conceptOnlyCells:conceptOnly,sourceOnlyCells:sourceOnly,interiorLayerOutsideCells:displaced,
  allInteriorReservationsFitSource:displaced===0,roomsTotal:floors.reduce((s,f)=>s+f.rooms,0),warnings},
  proofLevels:{massAndRoom2D:'STATIC_MASK_COMPARISON',stairPath:'STEP8A_SCHEMATIC_ONLY',corridorWalkability:'UNVERIFIED_WITH_ACTUAL_WALLS',evacuation:'UNVERIFIED',buildModules:'UNVERIFIED',materials:'UNVERIFIED'},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}};
}
export function buildB10Report({b7,b9,reviews}){
 validateB9Report(b9);
 if(b7?.schema!=='minecraftaibuilder-step8b-b7-review-reconciliation-v1'||b7.deploymentGate!=='BLOCKED'||b7.BuildPlan?.status!=='NOT_PREPARED'||b7.BuildPlan.operations.length!==0||!Array.isArray(b7.candidates)||b7.candidates.length!==5||!reviews)fail('B10_INPUT_UNSAFE');
 const sourceCandidates=[];
 for(const p of ['hotel','apartment','office']){
  const rev=reviews[p];if(!rev||rev.BuildPlan?.status!=='NOT_PREPARED'||rev.BuildPlan.operations.length!==0||!Array.isArray(rev.candidates)||rev.candidates.length!==(p==='office'?3:1))fail('B10_REVIEW_UNSAFE');
  for(const c of rev.candidates){const source=b7.candidates.find(x=>x.program===p&&x.id===c.id);sourceCandidates.push(reconcileFrozenCandidate(source,c,p));}
 }
 const totalDifferences=sourceCandidates.reduce((s,c)=>s+c.summary.conceptOnlyCells+c.summary.sourceOnlyCells,0);
 if(totalDifferences!==123||sourceCandidates.length!==5)fail('B10_FROZEN_DIFFERENCE_CHANGED');
 const paretoSamples=b9.diversity.groups.filter(g=>g.paretoFront).map(g=>{
  const c=b9.candidates.find(x=>x.id===g.selectedId);if(!c)fail('B10_PARETO_MISSING');
  return {id:c.id,program:c.program,massing:c.massing,dimensions:c.dimensions,orientation:c.orientation,levels:Array.from({length:c.dimensions.floors},(_,i)=>Array.from(maskForFloor(c.sourcePredictedRectangles,c.dimensions.width,c.dimensions.depth,i)).join('')),
   score:c.score,groupSize:g.geometryMemberCount,geometryHash:c.geometryHash};
 });
 if(paretoSamples.length!==14)fail('B10_PARETO_COUNT_CHANGED');
 const report={schema:'minecraftaibuilder-step8b-b10-interior-contract-v1',status:'STATIC_REVIEW_ONLY_NOT_PREPARED',
  sourceEvidence:{snapshotManifestSha256:b9.sourceEvidence.snapshotManifestSha256,plannerCriticalHash:b9.sourceEvidence.plannerCriticalHash,
   b7ReportSha256:b7.reportSha256,b9ReportSha256:b9.reportSha256,immutableSha256:{...frozen}},
  frozenBuildings:sourceCandidates,paretoGeometryOnly:paretoSamples,
  findings:{reviewedFrozenCandidates:5,paretoSamples:14,priorB8Candidates:432,priorB9UniqueGeometry:32,
   totalConceptVsSourceDifferenceCells:totalDifferences,interiorOutsideSourceByCandidate:sourceCandidates.map(x=>({key:x.key,displaced:x.summary.interiorLayerOutsideCells})),
   activeEngineSameBuild:'UNVERIFIED',materialPalette:'UNVERIFIED',worldAnchor:'UNVERIFIED',stairsFunctional:'UNVERIFIED',roomDoorsFunctional:'UNVERIFIED'},
  staticContract:{conceptX:'east',conceptZ:'south',sourcePredictionCoordinates:'local_unrotated',orientedComparison:'review_only',
   meanings:{source:'predictLocalRectangles_static_source_formula',interior:'step8a_detail_review_reservations_not_installed_modules'},
   productionPlanGenerated:false,liveAPIContacted:false,physicalInterferenceChecked:false,worldCoordinates:null,blockIds:[],
   action:'COMPARE_AND_REPORT_ONLY'},
  deploymentGate:'BLOCKED',BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,autoApplied:false}};
 report.reportSha256=shaJson(report);return report;
}
export function validateB10Report(report){
 const {reportSha256,...plain}=report||{};
 if(!report||report.schema!=='minecraftaibuilder-step8b-b10-interior-contract-v1'||shaJson(plain)!==reportSha256||
  report.deploymentGate!=='BLOCKED'||report.BuildPlan?.status!=='NOT_PREPARED'||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||
  report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||report.safety?.autoApplied!==false||
  report.staticContract?.productionPlanGenerated!==false||report.staticContract?.liveAPIContacted!==false||report.staticContract?.worldCoordinates!==null||report.staticContract?.blockIds?.length!==0||
  report.frozenBuildings?.length!==5||report.paretoGeometryOnly?.length!==14||report.findings?.totalConceptVsSourceDifferenceCells!==123||
  reportSha256!==B10_CANONICAL_REPORT_SHA||
  Object.entries(frozen).some(([k,v])=>report.sourceEvidence?.immutableSha256?.[k]!==v)||
  report.frozenBuildings.some(x=>x.BuildPlan?.status!=='NOT_PREPARED'||x.BuildPlan?.operations?.length||x.BuildPlan?.commandCount!==0||
   x.proofLevels?.corridorWalkability!=='UNVERIFIED_WITH_ACTUAL_WALLS'||x.proofLevels?.buildModules!=='UNVERIFIED'))fail('B10_REPORT_UNSAFE_OR_TAMPERED');
 return true;
}
