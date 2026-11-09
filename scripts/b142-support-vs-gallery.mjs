/**
 * B142 research: locate full-cube stair-support conflicts with actual-source
 * B105 solids, B113/B141 corridors, and protected upper-floor slab cells.
 * Never claim real Minecraft support, collision, or permission to construct.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../source/parallel/b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../source/parallel/b113/main/compile-b113.mjs';
import {b138Fleet,verifyB138} from '../source/parallel/b138/main/b138-five-rise-fleet.mjs';
import {b139Fleet,verifyB139} from '../source/parallel/b139/main/b139-five-rise-repair.mjs';
import {b140Fleet,verifyB140} from '../source/parallel/b140/main/b140-two-wide-gallery-bridge.mjs';
import {b141Fleet,verifyB141} from '../source/parallel/b141/main/b141-integrated-network.mjs';
import {generateB105,auditB105} from '../source/parallel/b105/main/b105-building-volume.mjs';
const xy=p=>p.x+','+p.z;
const xyz=p=>p.x+','+p.y+','+p.z;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B142_RESEARCH_'+s);};
const hasFloor=(floor,p)=>floor?.footprintRows?.[p.z]?.[p.x]==='1';
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const asSet=arr=>new Set(arr.map(xy));
const add=(map,key,owner)=>{const row=map.get(key)??new Set();row.add(owner);map.set(key,row);};
/** Handles a single building and returns evidence, never an executable design. */
export function auditB142Support(design,c140,c141,volume){
 if(!design?.plan?.floors||design.candidateId!==c140?.id||
   c140.id!==c141?.id||c140.rows?.length!==c141.sourceStairs||
   c141.merged?.levels?.length!==design.plan.floors.length||
   volume?.candidateId!==design.candidateId||volume.worldContacts!==0||
   volume.constructionApproved!==false||volume.readonlyArchitecturalIR!==true)
  fail('PINNED_SOURCE_INVALID');
 const floors=design.plan.floors;
 const solids=new Set(volume.voxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY').map(xyz));
 const selected=c140.rows.filter(r=>r.selected);
 if(selected.length!==c141.selectedStairs)fail('SELECTED_COUNT_CHANGED');
 const treads=new Map(),heads=new Map();
 for(const row of selected){
  const sketch=row.selected.sketch;
  if(sketch?.positions?.length!==14||sketch.sourceFloorRise!==5||
     sketch.worldOperations?.length!==0||row.toLevel!==row.fromLevel+1)
   fail('STAIR_SKETCH_CHANGED');
  for(const part of sketch.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT')){
   if(part.index<1||part.index>5||part.position.y!==row.fromLevel*5+part.index)
    fail('STEP_HEIGHT_INVALID');
   add(treads,xyz(part.position),row.stairIndex);
   for(let dy=0;dy<=2;dy++)
    add(heads,xyz({...part.position,y:part.position.y+dy}),row.stairIndex);
  }
 }
 const rows=[];
 for(const row of selected){
  const lo=floors[row.fromLevel],hi=floors[row.toLevel];
  const original=asSet(lo.gallery),combined=asSet(c141.merged.levels[row.fromLevel].combinedCells);
  const hiOriginal=asSet(hi.gallery),hiCombined=asSet(c141.merged.levels[row.toLevel].combinedCells);
  const issues=new Map(),supports=new Set(),cuts=new Set();
  const flag=(kind,at)=>{
   const pos=xyz(at);issues.set(kind+':'+pos,{kind,position:pos});
  };
  const sketch=row.selected.sketch;
  for(const part of sketch.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT')){
   const p=part.position;
   if(!hasFloor(lo,p)||!hasFloor(hi,p)||
      lo.rooms.some(r=>inside(r,p))||hi.rooms.some(r=>inside(r,p)))
    fail('SOURCE_PLATE_OR_PROTECTED_ROOM');
   for(let dy=0;dy<=2;dy++){
    const at={...p,y:p.y+dy},position=xyz(at);
    if(solids.has(position))flag('B105_SOURCE_HEADROOM_SOLID',at);
    if([...heads.get(position)??[]].some(x=>x!==row.stairIndex))
     flag('OTHER_STAIR_HEADROOM',at);
    if(at.y===5*row.toLevel&&hasFloor(hi,at)){
     cuts.add(position);
     if(hiOriginal.has(xy(at)))flag('UPPER_CUT_HITS_ORIGINAL_GALLERY',at);
     else if(hiCombined.has(xy(at)))flag('UPPER_CUT_HITS_PLANNED_GALLERY',at);
     if(hi.rooms.some(r=>inside(r,at)))flag('UPPER_CUT_HITS_ROOM',at);
    }
   }
   // Full-block supports are ONLY a conservative hypothetical model.
   // Every stair above the first needs a vertical stack down to the
   // conceptual source floor. This stack can close the corridor beneath it.
   for(let y=row.fromLevel*5+1;y<p.y;y++){
    const at={...p,y},position=xyz(at);supports.add(position);
    if(solids.has(position))flag('SUPPORT_HITS_B105_SOLID',at);
    if([...treads.get(position)??[]].some(x=>x!==row.stairIndex))
     flag('SUPPORT_HITS_OTHER_STAIR',at);
    if([...heads.get(position)??[]].some(x=>x!==row.stairIndex))
     flag('SUPPORT_HITS_OTHER_HEADROOM',at);
    if(y<=row.fromLevel*5+2){
     if(original.has(xy(at)))flag('SUPPORT_HITS_ORIGINAL_GALLERY',at);
     else if(combined.has(xy(at)))flag('SUPPORT_HITS_PLANNED_GALLERY',at);
    }
   }
  }
  for(const part of sketch.positions.filter(p=>p.kind==='UPPER_FLOOR_SEAM')){
   if(!hasFloor(hi,part.position))fail('UPPER_LANDING_UNSUPPORTED_SOURCE');
   if(cuts.has(xyz(part.position)))flag('SHAFT_CUTS_UPPER_LANDING',part.position);
  }
  const conflicts=[...issues.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.position.localeCompare(b.position));
  const byKind={};
  for(const x of conflicts)byKind[x.kind]=(byKind[x.kind]??0)+1;
  rows.push({stairIndex:row.stairIndex,fromLevel:row.fromLevel,toLevel:row.toLevel,
   supportCells:supports.size,upperSlabCutCells:cuts.size,conflicts:conflicts.length,
   byKind,examples:conflicts.slice(0,8),
   state:conflicts.length?'HOLD_ABSTRACT_SUPPORT_OR_SHAFT_CONFLICT':'HOLD_EDUCATION_PHYSICS_AND_SUPPORT_UNVERIFIED',
   physicalSupportsPlaced:0,worldCommands:[]});
 }
 return {building:design.candidateId,sourceStairs:c141.sourceStairs,
  selected:rows.length,oldHeld:c141.unresolved.length,
  flagged:rows.filter(x=>x.conflicts>0).length,unflagged:rows.filter(x=>x.conflicts===0).length,
  supportsClaimed:rows.reduce((a,b)=>a+b.supportCells,0),
  upperCutsClaimed:rows.reduce((a,b)=>a+b.upperSlabCutCells,0),
  byKind:Object.fromEntries([...new Set(rows.flatMap(r=>Object.keys(r.byKind)))].sort().map(kind=>[
   kind,rows.reduce((a,r)=>a+(r.byKind[kind]??0),0)])),
  rows,sourceUnchanged:true,worldWrites:0};
}
export function makeB142(parent,b140,b141){
 if(!verifyB140(b140)||!verifyB141(b141)||parent?.sourceDesigns?.length!==15||
   b140.cases.length!==15||b141.cases.length!==15)
  fail('FROZEN_PARENT');
 const cases=parent.sourceDesigns.map((design,i)=>{
  const v=generateB105(design),a=auditB105(v,design.plan);
  if(a.issueCount||a.envelopeConflicts||a.furniturePathViolations)
   fail('B105_SOURCE_INVALID');
  return auditB142Support(design,b140.cases[i],b141.cases[i],v);
 });
 const sum=k=>cases.reduce((n,c)=>n+c[k],0);
 const totals={buildings:cases.length,floors:parent.sourceDesigns.reduce((n,d)=>n+d.plan.floors.length,0),
  stairs:sum('sourceStairs'),selected:sum('selected'),heldFromB141:sum('oldHeld'),
  flagged:sum('flagged'),unflagged:sum('unflagged'),
  fullBlockSupportClaims:sum('supportsClaimed'),upperSlabCutClaims:sum('upperCutsClaimed'),
  actualInstalled:0,physicalCertification:0,worldWrites:0};
 if(totals.buildings!==15||totals.floors!==66||totals.stairs!==102||
  totals.selected!==70||totals.heldFromB141!==32||
  totals.flagged+totals.unflagged!==70)fail('15_66_102_70_32_DRIFT');
 const allKinds=[...new Set(cases.flatMap(c=>Object.keys(c.byKind)))].sort();
 const report={schema:'b142-unadopted-support-gallery-review-v1',
  parentB140:b140.integritySha256,parentB141:b141.integritySha256,
  assumptions:'Full-block conceptual supports, not engineered or Education-verified',
  totals,byKind:Object.fromEntries(allKinds.map(k=>[
   k,cases.reduce((n,c)=>n+(c.byKind[k]??0),0)])),
  cases,readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{status:'NOT_PREPARED',operations:[]},
  sourceModified:false};
 return {...report,integritySha256:hash(report)};
}
export function validateB142(r){
 try{
  const {integritySha256,...body}=r;
  return hash(body)===integritySha256&&r.schema==='b142-unadopted-support-gallery-review-v1'&&
   r.totals.buildings===15&&r.totals.floors===66&&r.totals.stairs===102&&
   r.totals.selected===70&&r.totals.heldFromB141===32&&
   r.totals.flagged+r.totals.unflagged===70&&r.totals.actualInstalled===0&&
   r.totals.physicalCertification===0&&r.totals.worldWrites===0&&
   r.sourceModified===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.gates.length===9&&
   r.gates.every(x=>x==='BLOCKED')&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export async function run(){
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113))fail('B113_INVALID');
 const b138=b138Fleet(parent,b113);if(!verifyB138(b138))fail('B138_INVALID');
 const b139=b139Fleet(parent,b113,b138);if(!verifyB139(b139))fail('B139_INVALID');
 const b140=b140Fleet(parent,b113,b138,b139);if(!verifyB140(b140))fail('B140_INVALID');
 const b141=b141Fleet(parent,b113,b138,b139,b140);if(!verifyB141(b141))fail('B141_INVALID');
 const report=makeB142(parent,b140,b141);
 if(!validateB142(report))fail('OUTPUT_INVALID');
 fs.mkdirSync('b142-research-output',{recursive:true});
 fs.writeFileSync('b142-research-output/B142_Support_Gallery_Audit.json',
  JSON.stringify(report,null,2)+'\n');
 console.log('B142_SOURCE_AUDIT='+JSON.stringify({totals:report.totals,byKind:report.byKind}));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 run().catch(e=>{console.error('B142_HOLD',e.stack??e);process.exitCode=1;});
