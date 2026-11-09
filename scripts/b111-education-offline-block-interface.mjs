/**
 * Read-only B110 Minecraft Education interface preflight.
 * Uses actual canonical B104/B105/B110/B111 source geometries; emits NO world
 * coordinates, block-state placements, commands or executable BuildPlan.
 * Published Bedrock state names are NOT installed Education 26.33 certification.
 */
import {auditB110Model,B110_BLOCK_CANDIDATES}
 from '../source/parallel/b110/main/b110-functional-interfaces.mjs';
import {auditB111Model} from '../source/parallel/b111/main/b111-interior-access.mjs';
import {auditB105} from '../source/parallel/b105/main/b105-building-volume.mjs';

const k=(x,y,z)=>x+','+y+','+z;
const kv=p=>k(p.x,p.y,p.z);
const k2=p=>p.x+','+p.z;
const fail=x=>{throw Error('B110_EDU_OFFLINE_'+x);};
const expect=(x,ok)=>{if(!ok)fail(x);};
const inside=(r,p)=>p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1;
const published=Object.freeze({
 door:{id:'minecraft:spruce_door',states:['minecraft:cardinal_direction','door_hinge_bit','open_bit','upper_block_bit']},
 stairs:{id:'minecraft:oak_stairs',states:['weirdo_direction','upside_down_bit','minecraft:corner']},
 bed:{id:'minecraft:bed',states:['direction','head_piece_bit','occupied_bit']}
});
export function auditB110OfflineEducationInterfaces(design,volume,b110,b111){
 const before=JSON.stringify([design,volume,b110,b111]);
 const safe=x=>x?.constructionApproved===false&&x.worldContacts===0&&
  x.BuildPlan?.status==='NOT_PREPARED'&&x.BuildPlan?.operations?.length===0;
 expect('SOURCE_SAFETY',safe(design)&&safe(volume)&&safe(b110)&&safe(b111)&&
  design.readonlyDesign===true&&volume.readonlyArchitecturalIR===true&&
  design.worldCoordinates===null&&volume.worldCoordinates===null&&
  b110.worldCoordinates===null&&b111.BuildPlan.worldCoordinates===null);
 const b105=auditB105(volume,design.plan);
 expect('BASELINE_B105',b105.envelopeConflicts===0&&b105.issueCount===0&&
  b105.roofCoverageGaps===0&&b105.portalVoidGaps===0&&
  b105.furniturePathViolations===0&&b105.stairInterfaceGaps===0);
 expect('BASELINE_B110_B111',auditB110Model(b110)&&auditB111Model(b111,design,b110));
 for(const [name,reference] of Object.entries(published)){
  const current=B110_BLOCK_CANDIDATES[name];
  expect('PUBLISHED_BEDROCK_REFERENCE_'+name,current?.id===reference.id&&
   JSON.stringify(current.states)===JSON.stringify(reference.states)&&
   current.verifiedEducation===false);
 }
 const byCell=new Map(volume.voxels.map(v=>[kv(v),v]));
 expect('DUPLICATE_VOLUME',byCell.size===volume.voxels.length);
 const free=p=>{const v=byCell.get(kv(p));return !v||v.kind==='EXTERIOR_PORTAL_VOID_PROXY';};
 const roomMap=new Map(design.plan.floors.flatMap(f=>f.rooms.map(r=>[f.level+':'+r.id,r])));
 const b111Map=new Map(b111.rooms.map(r=>[r.level+':'+r.roomId,r]));
 const failures=[];let doorsOK=0,stairOK=0,beds=0,bedsOK=0;
 for(const door of b110.doors){
  const r=roomMap.get(door.level+':'+door.roomId),a=b111Map.get(door.level+':'+door.roomId);
  expect('DOOR_ROOM_MISSING',r&&a);
  const yy=door.level*5+1;
  const good=door.clearTwoHigh===true&&door.conceptualRouteConnected===true&&
   door.localUpper.y===door.localLower.y+1&&door.localLower.y===yy&&
   door.localLower.x===door.localUpper.x&&door.localLower.z===door.localUpper.z&&
   door.localLower.x===r.conceptualDoorOpening.x&&
   door.localLower.z===r.conceptualDoorOpening.z&&
   k2(a.doorInterior)===k2(door.interiorCell)&&
   [door.localLower,door.localUpper].every(free)&&
   [door.interiorCell,door.externalGalleryCell].every(p=>
    [yy,yy+1].every(y=>free({x:p.x,y,z:p.z})));
  if(good)doorsOK++;
  else failures.push({kind:'DOOR_SOURCE_HOLD',level:door.level,room:door.roomId});
 }
 for(const stair of b110.stairs){
  const good=stair.nominalSixTreads===true&&stair.steps.length===6&&
   stair.connectsExistingB105Landings===true&&stair.unobstructedByB105Envelope===true&&
   stair.steps.every((s,i)=>s.riseIndex===i&&s.y===stair.fromLevel*5+i+1&&
    !byCell.has(kv(s))&&s.headroomAirSample.length===2&&
    s.headroomAirSample.every(p=>!byCell.has(kv(p))));
  if(good)stairOK++;
  else failures.push({kind:'STAIR_SOURCE_HOLD',level:stair.fromLevel,core:stair.coreIndex});
 }
 for(const r of b111.rooms){
  const room=roomMap.get(r.level+':'+r.roomId);
  expect('ROOM_MISSING',room);
  const originalFixtures=b110.fixtures.filter(f=>f.level===r.level&&f.roomId===r.roomId);
  for(const f of r.furniture){
   if(f.role!=='bed')continue;
   beds++;
   const anchor=originalFixtures[f.fixtureIndex]?.localAnchor;
   expect('BED_ANCHOR_PROVENANCE',anchor&&anchor.x===f.anchor.x&&anchor.z===f.anchor.z);
   const positions=f.footprint;
   const good=positions.length===2&&positions[0].x===anchor.x&&
    positions[0].z===anchor.z&&
    Math.abs(positions[0].x-positions[1].x)+Math.abs(positions[0].z-positions[1].z)===1&&
    positions.every(p=>inside(room,p))&&
    byCell.get(k(anchor.x,anchor.y,anchor.z))?.kind==='FURNITURE_PLACEHOLDER'&&
    !byCell.has(k(positions[1].x,anchor.y,positions[1].z))&&
    positions.every(p=>!byCell.has(k(p.x,anchor.y+1,p.z)));
   if(good)bedsOK++;
   else failures.push({kind:'BED_SOURCE_HOLD',level:r.level,room:r.roomId,fixture:f.fixtureIndex});
  }
 }
 expect('INPUTS_MUTATED',JSON.stringify([design,volume,b110,b111])===before);
 return {schema:'mab-b110-bedrock-interface-offline-source-study-v1',
  candidateId:design.candidateId,
  summary:{conceptRooms:b111.rooms.length,doorCandidates:b110.doors.length,
   doorsWithTwoHighSourceAir:doorsOK,stairLinks:b110.stairs.length,
   stairLinksWithSourceHeadroom:stairOK,bedPairs:beds,
   bedPairsWithConceptualSourceClearance:bedsOK,sourceHolds:failures.length},
  issues:failures,
  reference:{publishedBedrockStateNamesMatch:true,installedEducation26_33StatesVerified:false},
  limitations:{doorSwing:'UNKNOWN',doorHinge:'UNKNOWN',doorActualPassage:'NOT_TESTED',
   stairPhysicalTreads:'NOT_TESTED',stairPlayerTravel:'NOT_TESTED',
   bedBlockPairOrientation:'NOT_TESTED',floorSupport:'NOT_MODELLED'},
  safety:{worldContacts:0,worldWrites:0,worldCoordinates:null,constructionApproved:false,
   executionAllowed:false,readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
   gates:Array(9).fill('BLOCKED')}};
}