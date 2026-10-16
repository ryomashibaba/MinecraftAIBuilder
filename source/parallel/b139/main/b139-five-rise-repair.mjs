/**
 * B139: use true B113/B138 15-building source to test 5-rise concept stair
 * locations against B105 conceptual voxels and B113 gallery repairs.
 * Never interpret B136/B137 live evidence as certification of 102 stairs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {b138Fleet,b138FiveRiseSketch,verifyB138} from '../../b138/main/b138-five-rise-fleet.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const id=p=>p.x+','+p.z;
const vkey=p=>p.x+','+p.y+','+p.z;
const validPoint=p=>p&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.z);
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const nearby=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1;
const stairCells=(origin,ascent)=>Array.from({length:7},(_,i)=>[0,1].map(w=>({
 x:origin.x+ascent.dx*i-ascent.dz*w,z:origin.z+ascent.dz*i+ascent.dx*w
}))).flat();
export const B139_LIMITS=Object.freeze({
 sourceBuildings:15,sourceFloors:66,sourceStairs:102,
 requiredSourceFloorRise:5,searchRadius:10,searchMaxSamples:3,
 maxSourceStairAlternatives:3,worldWriteOperations:0
});
function layer(design,case113,index){
 const floor=design.plan.floors[index],route=case113.horizontalRoutes[index];
 if(!floor||!route||route.level!==index||route.repair?.sourceCellsPreserved!==true)
  throw Error('B139_INVALID_FLOOR_OR_REPAIR');
 const gallery=new Map([...floor.gallery,...route.repair.addedCells].map(p=>[id(p),p]));
 return {floor,original:new Set(floor.gallery.map(id)),proposed:new Set(gallery.keys())};
}
function connectedTwoWide(points,walkable,blocked=new Set()){
 if(!Array.isArray(points)||points.length!==2||
  !points.every(validPoint)||!nearby(points[0],points[1]))return false;
 const options=points.map(p=>dirs.map(([dx,dz])=>({x:p.x+dx,z:p.z+dz}))
  .filter(q=>walkable.has(id(q))&&!blocked.has(id(q))));
 return options[0].some(a=>options[1].some(b=>id(a)!==id(b)&&nearby(a,b)));
}
function hasSingleAdjacent(landing,walkable,blocked){
 return landing.some(p=>dirs.some(([dx,dz])=>{
  const q={x:p.x+dx,z:p.z+dz};
  return walkable.has(id(q))&&!blocked.has(id(q));
 }));
}
function pathBlocked(floor,p){
 return floor.footprintRows?.[p.z]?.[p.x]!=='1';
}
function test2DFootprint(design,stair,res,low,high){
 const a=stairCells(res.origin,res.ascent),stairset=new Set(a.map(id));
 const bottom=a.slice(0,2),top=a.slice(-2);
 const lower=design.plan.floors[stair.fromLevel],upper=design.plan.floors[stair.toLevel];
 const own=design.plan.cores[stair.coreIndex];
 if(!own)throw Error('B139_SOURCE_CORE_MISSING');
 const overlapsOwn=a.some(p=>inside(own,p));
 const outside=a.some(p=>pathBlocked(lower,p)||pathBlocked(upper,p));
 const room=a.some(p=>[...lower.rooms,...upper.rooms].some(r=>inside(r,p)));
 const foreignCore=a.some(p=>design.plan.cores.some((r,i)=>i!==stair.coreIndex&&inside(r,p)));
 const full=overlapsOwn&&!outside&&!room&&!foreignCore;
 const from=connectedTwoWide(bottom,low.proposed,stairset);
 const to=connectedTwoWide(top,high.proposed,stairset);
 const single=hasSingleAdjacent(bottom,low.proposed,stairset)&&
   hasSingleAdjacent(top,high.proposed,stairset);
 const issues=[
  ...(!overlapsOwn?['NO_CORE_OVERLAP']:[]),
  ...(outside?['OUTSIDE_SOURCE_FLOOR_PLATE']:[]),
  ...(room?['PROTECTED_ROOM_INTERSECTION']:[]),
  ...(foreignCore?['OTHER_CORE_INTERSECTION']:[]),
  ...(!from?['LOWER_TWO_WIDE_CORRIDOR_SEAM_NOT_PROVEN']:[]),
  ...(!to?['UPPER_TWO_WIDE_CORRIDOR_SEAM_NOT_PROVEN']:[])
 ];
 return {footprint:a,lowerLanding:bottom,upperLanding:top,
  geometryFitsWithoutRoomOrCoreChanges:full,
  lowerTwoWideSeam:from,upperTwoWideSeam:to,
  bothTwoWideSeamsProven:from&&to,
  singleLaneFallbackAtBothEnds:single,
  issueCodes:issues,
  sourceFrozen:true};
}
export function b139AuditCandidate(design,case113,stair,sketch,volume){
 if(!sketch||!Array.isArray(sketch.positions)||sketch.positions.length!==14||
  sketch.sourceFloorRise!==5||!volume?.voxels)throw Error('B139_INVALID_SKETCH_OR_VOXEL_SOURCE');
 const low=layer(design,case113,stair.fromLevel),
  high=layer(design,case113,stair.toLevel);
 const footprint=new Set(sketch.positions.map(p=>id(p.position))),
  voxelIndex=new Map(volume.voxels.map(v=>[vkey(v),v])),
  upperFloorY=stair.toLevel*5;
 const cuts=new Map(),foreign=new Map(),roomHits=new Map(),galleryHits=new Map();
 const freeHeadroomBlocks=new Set(),supports=new Set();
 const touch=(map,p,v)=>{const k=vkey(p);if(!map.has(k))map.set(k,{...p,kind:v?.kind??null});};
 const candidateFootprint=sketch.positions.map(p=>({x:p.position.x,z:p.position.z}));
 const badFootprint=candidateFootprint.some(p=>
  pathBlocked(low.floor,p)||pathBlocked(high.floor,p)||
  [...low.floor.rooms,...high.floor.rooms].some(r=>inside(r,p))||
  design.plan.cores.some((r,i)=>i!==stair.coreIndex&&inside(r,p)));
 const lowerRoot=connectedTwoWide(sketch.lowerSeam,low.proposed,footprint),
  upperRoot=connectedTwoWide(sketch.upperSeam,high.proposed,footprint);
 const fromPlan=sketch.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT');
 for(const part of fromPlan){
  const p=part.position;
  supports.add(vkey({...p,y:p.y-1}));
  // Walk envelope checks the stair voxel itself and the two blocks above.
  for(let dy=0;dy<=2;dy++){
   const q={...p,y:p.y+dy},existing=voxelIndex.get(vkey(q));
   if(dy>0)freeHeadroomBlocks.add(vkey(q));
   if(q.y===upperFloorY&&high.floor.footprintRows[q.z]?.[q.x]==='1'){
    // Part of the upstairs slab is a *conceptual cut*. Real opening not approved.
    touch(cuts,q,{kind:'UPPER_FLOOR_APERTURE_REQUIRED'});
    if(high.floor.rooms.some(r=>inside(r,q)))touch(roomHits,q,{kind:'ROOM_CANNOT_REMOVE'});
    if(high.original.has(id(q)))touch(galleryHits,q,{kind:'SOURCE_GALLERY_CANNOT_REMOVE'});
   }
   if(existing&&existing.kind!=='EXTERIOR_PORTAL_VOID_PROXY'){
    // Protected static B105 source. Roofs/fixtures/facades cannot be deleted
    // as a side effect of "stair placement"; flag independently.
    touch(foreign,q,existing);
   }
  }
 }
 const issueCodes=[
  ...(badFootprint?['FLOOR_PLATE_OR_PROTECTED_2D_FOOTPRINT_CONFLICT']:[]),
  ...(!lowerRoot?['LOWER_TWO_LANE_REPAIRED_CORRIDOR_SEAM_HOLD']:[]),
  ...(!upperRoot?['UPPER_TWO_LANE_REPAIRED_CORRIDOR_SEAM_HOLD']:[]),
  ...(foreign.size?['B105_STATIC_VOXELS_INTERSECT_STAIR_OR_HEADROOM']:[]),
  ...(roomHits.size?['UPPER_APERTURE_TOUCHES_PROTECTED_ROOM']:[]),
  ...(galleryHits.size?['UPPER_APERTURE_TOUCHES_PROTECTED_SOURCE_GALLERY']:[]),
  ...(cuts.size?['UPPER_SLAB_CUTS_NOT_APPROVED']:[]),
  'STAIR_SUPPORT_AND_PLAYER_COLLISION_NOT_CERTIFIED',
  'NEIGHBORING_STAIR_VOLUMES_NOT_CERTIFIED'
 ];
 return {
  stairIndex:stair.stairIndex??null,sourceFloorRise:5,
  conceptualLowerAndUpperCorridorConnected:lowerRoot&&upperRoot,
  lowerCorridorTwoWide:lowerRoot,upperCorridorTwoWide:upperRoot,
  protectedFloorMaskUnchanged:true,footprintSourceCompatible:!badFootprint,
  requiredUpperFloorOpeningCells:[...cuts.values()],
  potentialB105StaticVoxelConflicts:[...foreign.values()],
  protectedUpperRoomOpeningConflicts:[...roomHits.values()],
  protectedSourceGalleryOpeningConflicts:[...galleryHits.values()],
  requiredSupportLocations:[...supports],
  observedUniqueHeadroomLocations:freeHeadroomBlocks.size,
  issueCodes,needs3DRepairOrApproval:true,
  candidateOnWorldCollisionCertified:false,sourceChanged:false,
  allowedWorldModifications:[],worldContacts:0
 };
}
export function b139FindMissingAlternatives(design,case113,stair,{radius=B139_LIMITS.searchRadius}={}){
 if(!Number.isInteger(radius)||radius<0||radius>12)
  throw Error('B139_SEARCH_RADIUS_INVALID');
 const own=design.plan.cores[stair.coreIndex];
 if(!own)throw Error('B139_MISSING_CORE');
 const low=layer(design,case113,stair.fromLevel),high=layer(design,case113,stair.toLevel);
 const totals={examined:0,sourceGeometryFits:0,
  lowerTwoWide:0,upperTwoWide:0,bothTwoWide:0,
  twoWideNotBothButSingleLaneFallback:0,roomOrCoreOrPlateBlocked:0};
 const results=[],dirsOrder=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}];
 for(const ascent of dirsOrder)
  for(let x=own.x-radius;x<=own.x+own.width+radius;x++)
   for(let z=own.z-radius;z<=own.z+own.depth+radius;z++){
    const origin={x,z};
    const r=test2DFootprint(design,stair,{origin,ascent},low,high);
    totals.examined++;
    if(!r.geometryFitsWithoutRoomOrCoreChanges){
     totals.roomOrCoreOrPlateBlocked++;continue;
    }
    totals.sourceGeometryFits++;
    if(r.lowerTwoWideSeam)totals.lowerTwoWide++;
    if(r.upperTwoWideSeam)totals.upperTwoWide++;
    if(r.bothTwoWideSeamsProven)totals.bothTwoWide++;
    else if(r.singleLaneFallbackAtBothEnds)totals.twoWideNotBothButSingleLaneFallback++;
    // Only record candidates attached to BOTH repaired corridor ends.
    // Single-lane or no seam candidates would be unusable as a 2-wide route.
    if(!r.bothTwoWideSeamsProven)continue;
    const descriptor={origin,ascent,footprintCells:r.footprint,
     lowerLanding:r.lowerLanding,upperLanding:r.upperLanding};
    const sketch=b138FiveRiseSketch(stair,descriptor);
    const coreCenter={x:own.x+(own.width-1)/2,z:own.z+(own.depth-1)/2};
    results.push({origin,ascent,score:Math.abs(origin.x-coreCenter.x)+
      Math.abs(origin.z-coreCenter.z),
     footprintCells:descriptor.footprintCells,lowerLanding:descriptor.lowerLanding,
     upperLanding:descriptor.upperLanding,
     sketch,sourceAndRepairedCorridor2DWideSeams:true,
     worldPositionKnown:false,actualCollisionCertified:false});
   }
 results.sort((a,b)=>a.score-b.score||
  a.origin.x-b.origin.x||a.origin.z-b.origin.z||
  a.ascent.dx-b.ascent.dx||a.ascent.dz-b.ascent.dz);
 const top=results.slice(0,B139_LIMITS.maxSourceStairAlternatives);
 return {searchRadius:radius,stats:totals,
  geometricTwoWideOptions:results.length,
  proposedAlternatives:top,
  status:top.length?'POTENTIAL_ALTERNATIVES_REQUIRE_3D_VOXEL_AND_PERMISSION':
   totals.sourceGeometryFits===0?'NO_ROOM_PRESERVING_7x2_FOOTPRINT_IN_SEARCH_RADIUS':
   'ROOM_FREE_FOOTPRINT_EXISTS_BUT_TWO_WIDE_ENDS_NOT_BOTH_CONNECTED',
  sourceRoomsMoved:false,sourceCoresMoved:false,worldContacts:0,
  operations:[]};
}
export function b139AssembleCase(design,case113,case138){
 if(design.candidateId!==case113.id||case138.id!==case113.id||
  case113.stairs.length!==case138.stairInterfaces.length)
  throw Error('B139_SOURCE_STAIR_ID_DRIFT');
 const volume=generateB105(design),qa=auditB105(volume,design.plan);
 if(qa.issueCount||qa.envelopeConflicts)
  throw Error('B139_B105_SOURCE_VOXEL_QUALITY_FAIL_'+design.candidateId);
 const rows=case138.stairInterfaces.map((entry,i)=>{
  const stair=case113.stairs[i];
  if(stair.fromLevel!==entry.fromLevel||stair.toLevel!==entry.toLevel||
   stair.coreIndex!==entry.coreIndex)
   throw Error('B139_B113_TO_B138_SOURCE_ID_MISMATCH');
  if(entry.fiveRiseSketch){
   const audited=b139AuditCandidate(design,case113,
    {...stair,stairIndex:i},entry.fiveRiseSketch,volume);
   return {stairIndex:i,fromLevel:entry.fromLevel,toLevel:entry.toLevel,
    b138HasPinned7x2Footprint:true,audit:audited,
    alternatives:null,routeStatus:'EXISTING_CANDIDATE_REQUIRES_3D_REPAIR',
    worldOperations:[]};
  }
  const found=b139FindMissingAlternatives(design,case113,stair);
  const checks=found.proposedAlternatives.map(p=>b139AuditCandidate(
   design,case113,{...stair,stairIndex:i},p.sketch,volume));
  return {stairIndex:i,fromLevel:entry.fromLevel,toLevel:entry.toLevel,
   b138HasPinned7x2Footprint:false,audit:null,alternatives:{
    ...found,scopedCandidate3DAudits:checks},
   routeStatus:found.status,worldOperations:[]};
 });
 return {id:case113.id,floors:design.plan.floors.length,
  originalStairs:rows.length,
  b138PinnedCandidateCount:rows.filter(x=>x.b138HasPinned7x2Footprint).length,
  b138MissingCandidateCount:rows.filter(x=>!x.b138HasPinned7x2Footprint).length,
  newlySearchedAlternatives:rows.filter(x=>x.alternatives?.geometricTwoWideOptions>0).length,
  rows,sourceVoxelVolumeNotChanged:true,worldCoordinatesKnown:false};
}
export function b139Fleet(parent,b113,b138){
 if(!validateB113(b113)||!verifyB138(b138)||
    b138.inheritedB113Integrity!==b113.integritySha256||
    parent?.sourceDesigns?.length!==15||b113.cases?.length!==15||
    b138.cases?.length!==15)
  throw Error('B139_SOURCE_QUALITY_OR_CHAIN_INVALID');
 const cases=parent.sourceDesigns.map(design=>{
  const a=b113.cases.find(x=>x.id===design.candidateId),
   b=b138.cases.find(x=>x.id===design.candidateId);
  if(!a||!b)throw Error('B139_SOURCE_BUILDING_MISSING');
  return b139AssembleCase(design,a,b);
 });
 const rows=cases.flatMap(c=>c.rows.map(r=>({...r,buildingId:c.id})));
 const existing=rows.filter(r=>r.b138HasPinned7x2Footprint);
 const missing=rows.filter(r=>!r.b138HasPinned7x2Footprint);
 const issueCounts={};
 for(const a of [...existing.map(x=>x.audit),
  ...missing.flatMap(x=>x.alternatives?.scopedCandidate3DAudits??[])])
  for(const issue of a.issueCodes)issueCounts[issue]=(issueCounts[issue]??0)+1;
 const totals={sourceBuildings:cases.length,sourceFloors:cases.reduce((n,c)=>n+c.floors,0),
  originalStairs:rows.length,
  b138PinnedCandidates:existing.length,b138WithoutPinnedCandidate:missing.length,
  b139MissingSitesWithTwoWideAlternatives:missing.filter(x=>x.alternatives.proposedAlternatives.length>0).length,
  b139StillWithoutTwoWideAlternative:missing.filter(x=>!x.alternatives.proposedAlternatives.length).length,
  existingCandidateCorridorBothSeams:existing.filter(x=>x.audit.conceptualLowerAndUpperCorridorConnected).length,
  existingCandidateConceptualSlabCuts:existing.reduce((n,r)=>n+r.audit.requiredUpperFloorOpeningCells.length,0),
  existingCandidateB105StaticConflictCells:existing.reduce((n,r)=>n+r.audit.potentialB105StaticVoxelConflicts.length,0),
  actualWorldWritesAllowed:0,realMinecraftContacts:0};
 if(totals.sourceBuildings!==15||totals.sourceFloors!==66||
    totals.originalStairs!==102||totals.b138PinnedCandidates!==78||
    totals.b138WithoutPinnedCandidate!==24||
    totals.b139MissingSitesWithTwoWideAlternatives+totals.b139StillWithoutTwoWideAlternative!==24)
  throw Error('B139_FLEET_15_66_102_OR_78_24_INVENTORY_DRIFT');
 const data={
  schema:'minecraftaibuilder-b139-five-rise-3d-remediation-v1',
  B113Integrity:b113.integritySha256,
  B138Integrity:b138.integritySha256,
  geometryInterpretation:{
   b137SixRiseRouteNotApplicableWithoutAdaptation:true,
   sourceFiveRiseTwoLaneStairConceptOnly:true,
   upperFloorSlabCutsAreNotApproved:true,
   b105VoxelKindIsConceptualNotLiveWorldOccupancy:true,
   lowerUpperDoorSwingAndNeighborStairsNotIndependentlyChecked:true,
   worldLocationUnresolved:true
  },
  totals,issueCounts,cases,
  prioritizedUnresolved:missing.map(r=>({
   buildingId:r.buildingId,stairIndex:r.stairIndex,
   tier:r.alternatives.proposedAlternatives.length?
    'REVIEW_3D_AND_UPPER_APERTURE':'NEEDS_LAYOUT_OR_GALLERY_REDRAW',
   classification:r.routeStatus,
   search:r.alternatives.stats,options:r.alternatives.geometricTwoWideOptions
  })).sort((a,b)=>Number(b.options===0)-Number(a.options===0)||
    a.buildingId.localeCompare(b.buildingId,'en-US')||
    a.stairIndex-b.stairIndex),
  sourceDesignChanged:false,worldContacts:0,worldCoordinates:null,
  commandCount:0,executionAllowed:false,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:b113.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...data,integritySha256:hash(data)};
}
export function verifyB139(report){
 try{
  const {integritySha256,...copy}=report;
  return integritySha256===hash(copy)&&
   report.schema==='minecraftaibuilder-b139-five-rise-3d-remediation-v1'&&
   report.totals.sourceBuildings===15&&report.totals.sourceFloors===66&&
   report.totals.originalStairs===102&&report.totals.b138PinnedCandidates===78&&
   report.totals.b138WithoutPinnedCandidate===24&&
   report.totals.actualWorldWritesAllowed===0&&
   report.cases.length===15&&report.prioritizedUnresolved.length===24&&
   report.cases.every(c=>c.sourceVoxelVolumeNotChanged&&c.rows.every(
    r=>r.worldOperations.length===0))&&
   report.geometryInterpretation.upperFloorSlabCutsAreNotApproved===true&&
   report.sourceDesignChanged===false&&report.worldContacts===0&&
   report.worldCoordinates===null&&report.commandCount===0&&
   report.executionAllowed===false&&report.constructionApproved===false&&
   report.readiness==='NOT_PREPARED'&&
   report.gates.length===9&&report.gates.every(g=>g.status==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB139(report,dir=path.join(ROOT,'b139-review-output')){
 if(!verifyB139(report))throw Error('B139_OUTPUT_NOT_SAFE');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B139_15_Building_5_Rise_3D_Review.json');
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n');
 const t=report.totals;
 const lines=[
 '# B139 — 5ブロック上昇階段・3D干渉と24箇所の再配置案',
 '',
 'この結果は既存のB113/B138データとB105建物ボクセルから自動生成。',
 '**実Minecraftワールドのブロック占有、歩行可能性、衝突の合格とは異なります。**',
 '',
 '|指標|結果|','|---|---:|',
 '|建物・階床・元階段|'+t.sourceBuildings+' / '+t.sourceFloors+' / '+t.originalStairs+'|',
 '|B138のソース整合済み5-rise候補|'+t.b138PinnedCandidates+'|',
 '|B138で候補なしだった箇所|'+t.b138WithoutPinnedCandidate+'|',
 '|B139の拡張探索で幅2廊下両端に接続できる新候補が見つかった箇所|'+t.b139MissingSitesWithTwoWideAlternatives+'|',
 '|現在も幅2両端接続の候補がない箇所|'+t.b139StillWithoutTwoWideAlternative+'|',
 '|既存78候補で幅2廊下両端を接続したもの|'+t.existingCandidateCorridorBothSeams+'|',
 '|既存78候補で必要と推定された上階スラブ開口セル|'+t.existingCandidateConceptualSlabCuts+'|',
 '|既存78候補のB105静的ボクセルと重なるセル|'+t.existingCandidateB105StaticConflictCells+'|',
 '',
 '## 要確認の3D障害・開口理由（候補単位）',
 ...Object.entries(report.issueCounts).sort((a,b)=>b[1]-a[1])
   .map(([key,n])=>'- '+key+': '+n),
 '',
 '## 元B138の候補がなかった24階段の優先作業',
 '|建物|階段|対応方針|両端幅2接続候補数|',
 '|---|---:|---|---:|',
 ...report.prioritizedUnresolved.map(x=>'|'+x.buildingId+'|'+x.stairIndex+
  '|'+x.tier+'|'+x.options+'|'),
 '',
 '見つかった追加配置は**仮検討**に留まり、隣接階段、全室、支持材、',
 '上階の開口施工、実ゲームのブロック状態をまだ包括保証しません。',
 '元設計は不変。9件のゲートはBLOCKED、実機操作なし。',
 '次工程は候補同士の干渉解消と上階開口、2列廊下の具体的な改修案。',
 '',
 '**NOT_PREPARED / worldContacts=0 / BuildPlan.operations=[]**'
 ];
 const markdown=path.join(dir,'B139_REMEDIATION_SUMMARY_JA.md');
 fs.writeFileSync(markdown,lines.join('\n')+'\n');
 return {json,markdown,totals:t,integritySha256:report.integritySha256};
}
export async function runB139(){
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B139_B113_PIN_FAILED');
 const b138=b138Fleet(parent,b113);
 if(!verifyB138(b138))throw Error('B139_B138_PIN_FAILED');
 return writeB139(b139Fleet(parent,b113,b138));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runB139(),null,2));}
 catch(e){console.error('B139_HOLD:',e.message);process.exitCode=1;}
}
