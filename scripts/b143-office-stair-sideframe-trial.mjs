/**
 * B143 NON-ADOPTED side-frame geometry trial for B142's SUPPORT-ONLY two
 * staircase candidates. Never installs blocks, cuts slabs, or overrides SOURCE.
 * Full-block vertical stair stacks were a conservative B142 assumption, NOT a
 * Minecraft structural requirement. This trial does NOT prove side frames
 * support, attach, look attractive, or allow passage in Education.
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
import {makeB142,validateB142} from './b142-support-vs-gallery.mjs';
const k=p=>p.x+','+p.z, q=p=>p.x+','+p.y+','+p.z;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const inside=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const fail=x=>{throw Error('B143_OFFLINE_'+x);};
const clearCube=(obj,pos)=>obj?.get(q(pos))===undefined;
const problem=(name,pos)=>({code:name,at:q(pos)});
const passFloor=(f,p)=>f.footprintRows?.[p.z]?.[p.x]==='1';
const sorted=x=>x.sort((a,b)=>a.code.localeCompare(b.code)||a.at.localeCompare(b.at));
export function evaluateB143SideFrame(design,case140,case141,volume,stairIndex){
 if(design?.candidateId!==case140?.id||case140?.id!==case141?.id||
    volume?.candidateId!==design.candidateId||
    volume.worldContacts!==0||volume.constructionApproved!==false||
    volume.readonlyArchitecturalIR!==true||case140.rows?.length!==case141.sourceStairs)
  fail('SOURCE_ID_OR_GUARD');
 const row=case140.rows.find(r=>r.stairIndex===stairIndex);
 if(!row?.selected||row.toLevel!==row.fromLevel+1)
  fail('SOURCE_STAIR_NOT_SELECTED');
 const sketch=row.selected.sketch;
 if(sketch?.sourceFloorRise!==5||sketch.positions?.length!==14)
  fail('INVALID_SOURCE_FLIGHT');
 const parts=sketch.positions.filter(p=>p.kind==='NORMAL_OAK_STAIR_CONCEPT');
 if(parts.length!==10)fail('INVALID_TREADS');
 const sourceSolids=new Map(volume.voxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY').map(v=>[q(v),v]));
 const merged=case141.merged.levels;
 const joined=merged.map(f=>new Set(f.combinedCells.map(k)));
 const flightBodies=new Map();
 // Conservatively exclude the ACTUAL source candidate stair occupancy and
 // the two blocks above it. Source B140 'normal oak stair' is not installed.
 for(const r of case140.rows.filter(r=>r.selected)){
  for(const p of r.selected.sketch.positions.filter(x=>x.kind==='NORMAL_OAK_STAIR_CONCEPT')){
   for(let dy=0;dy<=2;dy++){
    const at={...p.position,y:p.position.y+dy},key=q(at);
    const owners=flightBodies.get(key)??new Set();owners.add(r.stairIndex);
    flightBodies.set(key,owners);
   }
  }
 }
 const selected=[];
 for(const side of ['LEFT','RIGHT']){
  const brackets=[],issues=[];
  for(let index=1;index<=5;index++){
   const left=parts.find(p=>p.index===index&&p.lane===0);
   const right=parts.find(p=>p.index===index&&p.lane===1);
   if(!left||!right)fail('MISSING_TWO_LANE_PAIR');
   const lx=right.position.x-left.position.x,lz=right.position.z-left.position.z;
   if(Math.abs(lx)+Math.abs(lz)!==1)fail('NON_ADJACENT_LANES');
   const a=(side==='LEFT'?left:right).position;
   const at={x:a.x+(side==='LEFT'?-lx:lx),
    y:a.y-1,z:a.z+(side==='LEFT'?-lz:lz)};
   // Five consecutive outboard bracket blocks at step y-1. No inner columns.
   brackets.push(at);
   const lo=design.plan.floors[row.fromLevel],hi=design.plan.floors[row.toLevel];
   if(!passFloor(lo,at)||!passFloor(hi,at))
    issues.push(problem('OUTSIDE_TWO_FLOOR_FOOTPRINT',at));
   if(lo.rooms.some(r=>inside(r,at))||hi.rooms.some(r=>inside(r,at)))
    issues.push(problem('BRACKET_IN_PROTECTED_ROOM',at));
   if(design.plan.cores.some((c,i)=>i!==row.coreIndex&&inside(c,at)))
    issues.push(problem('BRACKET_IN_ANOTHER_CORE',at));
   if(!clearCube(sourceSolids,at))
    issues.push(problem('B105_SOURCE_SOLID_OVERLAP',at));
   if([...(flightBodies.get(q(at))??[])].some(id=>id!==stairIndex))
    issues.push(problem('OTHER_STAIR_OR_HEADROOM_OVERLAP',at));
   if(at.y<=5*row.fromLevel+2&&joined[row.fromLevel].has(k(at)))
    issues.push(problem('BLOCKS_TWO_WIDE_LOWER_GALLERY',at));
   if(at.y>=5*row.toLevel+1&&joined[row.toLevel].has(k(at)))
    issues.push(problem('BLOCKS_TWO_WIDE_UPPER_GALLERY',at));
  }
  if(new Set(brackets.map(q)).size!==5)fail('DUPLICATE_FRAME_POSITION');
  selected.push({side,bracketPositions:brackets,brackets:brackets.length,
   violations:sorted([...new Map(issues.map(i=>[i.code+':'+i.at,i])).values()]),
   checks:{noInnerFullCubeColumns:true,preexistingB105Preserved:true,
    fromActualSourceSketch:true,minecraftBearingAndJointStrengthVerified:false,
    visualAndPhysicalWalkthroughVerified:false},
   worldCommands:[],constructionApproved:false});
 }
 const eligible=selected.filter(s=>s.violations.length===0);
 return {id:design.candidateId,stairIndex,fromLevel:row.fromLevel,toLevel:row.toLevel,
  status:eligible.length?'UNADOPTED_OUTBOARD_SIDEFRAME_GEOMETRY_ONLY':
   'HOLD_NO_CLEAR_SIDEFRAME_WITHIN_SOURCE_FLOORPLATE',
  choices:selected,clearSideOptions:eligible.length,
  suggestedSide:eligible[0]?.side??null,sideFrameApplied:false,physicalSupportCertified:false,
  worldWrites:0};
}
export function b143TwoOfficeCases(parent,b140,b141,b142){
 if(!verifyB140(b140)||!verifyB141(b141)||!validateB142(b142)||
  b142.parentB140!==b140.integritySha256||
  b142.parentB141!==b141.integritySha256||
  parent?.sourceDesigns?.length!==15)fail('STAGE_INTEGRITY');
 const cases=[];
 for(let i=0;i<15;i++){
  const design=parent.sourceDesigns[i],c142=b142.cases[i];
  if(design.candidateId!==c142.building||design.candidateId!==b140.cases[i].id||
   design.candidateId!==b141.cases[i].id)fail('CASE_PROVENANCE');
  const supportOnly=c142.rows.filter(r=>r.conflicts>0&&
   Object.keys(r.byKind).every(k=>k.startsWith('SUPPORT_'))).map(r=>r.stairIndex);
  if(!supportOnly.length)continue;
  const v=generateB105(design),check=auditB105(v,design.plan);
  if(check.issueCount||check.envelopeConflicts||check.furniturePathViolations)
   fail('SOURCE_B105_INVALID');
  for(const stairIndex of supportOnly){
   const entry=evaluateB143SideFrame(design,b140.cases[i],b141.cases[i],v,stairIndex);
   const source=c142.rows.find(r=>r.stairIndex===stairIndex);
   if(!source||Object.keys(source.byKind).some(k=>!k.startsWith('SUPPORT_')))
    fail('NOT_SUPPORT_ONLY');
   cases.push({...entry,previousSupportKinds:source.byKind});
  }
 }
 const t={sourceBuildings:15,sourceStairs:102,b141Selected:70,b141Held:32,
  b142Flagged:64,supportOnlyCandidates:cases.length,
  sideFrameWithNoDetected2DFullCubeConflicts:cases.filter(c=>c.clearSideOptions>0).length,
  sideFrameStillBlocked:cases.filter(c=>c.clearSideOptions===0).length,
  adoptedAlternative:0,educationWalkingCertified:0,realSupportOrBeautyCertified:0,worldWrites:0};
 if(t.supportOnlyCandidates!==2||t.sideFrameWithNoDetected2DFullCubeConflicts+t.sideFrameStillBlocked!==2||
    cases.some(c=>!['OFFICE_V1','OFFICE_V2'].includes(c.id)))
  fail('SCOPE_OR_COUNT_DRIFT');
 const result={schema:'mab-b143-two-office-stair-side-frame-trial-v1',
  b142SourceSha:b142.integritySha256,b141SourceSha:b141.integritySha256,
  limitations:'Concept side brackets at outside lane and one block below tread; not proven physically connected or supported; no block placement; no ART judgment',
  totals:t,cases,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{status:'NOT_PREPARED',operations:[]}};
 return {...result,integritySha256:sha(result)};
}
export function verifyB143(result){
 try{
  const {integritySha256,...content}=result;
  return sha(content)===integritySha256&&result.schema==='mab-b143-two-office-stair-side-frame-trial-v1'&&
   result.totals.sourceBuildings===15&&result.totals.sourceStairs===102&&
   result.totals.supportOnlyCandidates===2&&result.totals.adoptedAlternative===0&&
   result.totals.realSupportOrBeautyCertified===0&&result.totals.worldWrites===0&&
   result.cases.length===2&&result.cases.every(c=>!c.sideFrameApplied&&
    !c.physicalSupportCertified&&c.worldWrites===0&&
    c.choices.length===2&&c.choices.every(s=>s.brackets===5&&
     s.worldCommands.length===0&&s.constructionApproved===false))&&
   result.constructionApproved===false&&result.executionAllowed===false&&
   result.readiness==='NOT_PREPARED'&&result.worldContacts===0&&
   result.worldCoordinates===null&&result.gates.length===9&&
   result.gates.every(s=>s==='BLOCKED')&&result.BuildPlan.operations.length===0;
 }catch{return false;}
}
export async function run(){
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113))fail('INVALID_B113');
 const b138=b138Fleet(parent,b113);if(!verifyB138(b138))fail('INVALID_B138');
 const b139=b139Fleet(parent,b113,b138);if(!verifyB139(b139))fail('INVALID_B139');
 const b140=b140Fleet(parent,b113,b138,b139);if(!verifyB140(b140))fail('INVALID_B140');
 const b141=b141Fleet(parent,b113,b138,b139,b140);if(!verifyB141(b141))fail('INVALID_B141');
 const b142=makeB142(parent,b140,b141);if(!validateB142(b142))fail('INVALID_B142');
 const result=b143TwoOfficeCases(parent,b140,b141,b142);if(!verifyB143(result))fail('INVALID_REPORT');
 fs.mkdirSync('b143-research-output',{recursive:true});
 fs.writeFileSync('b143-research-output/B143_Office_Sideframe_Source_Trial.json',
  JSON.stringify(result,null,2)+'\n');
 console.log('B143_REAL_SOURCE_RESULT='+JSON.stringify({
  totals:result.totals,
  offices:result.cases.map(c=>({id:c.id,stairIndex:c.stairIndex,
   status:c.status,clearSideOptions:c.clearSideOptions,
   leftViolations:c.choices[0].violations.length,
   rightViolations:c.choices[1].violations.length}))}));
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 run().catch(e=>{console.error('B143_RESEARCH_HOLD',e.stack??e.message);process.exitCode=1;});
}
