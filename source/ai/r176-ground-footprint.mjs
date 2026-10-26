/**
 * R176 — optional ground-outline study for genuine B143 voxel geometry.
 *
 * This is a HOST-OWNED, category-neutral proposal. It carves a shallow
 * open-air corner from an already verified R175 four-room building. Candidate
 * selection uses the actual semantic room weights, functional placements,
 * entry zone, and protected room-access audit; never a fixed genre template.
 *
 * The host is not claiming that the LLM selected this footprint. Room range
 * bounding rectangles are unchanged: this study is NOT a general freeform
 * polygon planner, Minecraft construction, or human aesthetic approval.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

const fail=reason=>{throw Error('R176_GROUND_FOOTPRINT_'+reason);};
const key=p=>p.slice(0,3).join(',');
const add=(design,id,mode,origin,size,material)=>design.elements.push({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
function mapOf(compiled){
 return new Map(compiled.primitives.map(p=>[key(p),p[3]]));
}
function overlaps(a,b){
 return a.x[0]<=b.x[1]&&a.x[1]>=b.x[0]&&
  a.z[0]<=b.z[1]&&a.z[1]>=b.z[0];
}
function rect(origin,size){
 return {x:[origin[0],origin[0]+size[0]-1],
  z:[origin[2],origin[2]+size[2]-1]};
}
const safe=o=>o?.readiness==='NOT_PREPARED'&&
 o.constructionApproved===false&&o.executionAllowed===false&&
 o.worldWrites===0&&o.worldContacts===0&&
 o.BuildPlan?.operations?.length===0&&o.gates?.length===9&&
 o.gates.every(x=>x==='BLOCKED');

export function deriveR176GroundFootprint(base){
 const evidence=base?.r170FourRoomVolumeEvidence;
 if(!base?.design||!base?.compiled||!verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  evidence?.studyStyle!=='R175_SETBACK_TERRACES'||
  evidence.upperSetbackDecks?.length!==2||
  base.program?.length!==1||base.program[0].zones?.length!==4||
  !Array.isArray(base.placements)||base.placements.length<4||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !safe(base)||base.design.elements.some(e=>e.id.startsWith('r176-')))
  fail('VERIFIED_R175_SOURCE_AND_BLOCKED_CONSTRUCTION_REQUIRED');
 const original=JSON.stringify(base.design);
 const {width:w,height:h,depth:d}=base.design.bounds;
 const shell=base.design.elements.find(e=>e.id==='shell-west');
 const floor=base.design.elements.find(e=>e.id==='floor-0');
 const entrance=base.design.elements.find(e=>e.id==='exterior-entrance');
 if(w<24||d<24||h<18||!shell?.material||!floor||
  !entrance||entrance.mode!=='cut')
  fail('VALID_ENVELOPE_AND_FRONT_ENTRY_REQUIRED');
 const sections=evidence.roomSections;
 const zones=base.program[0].zones;
 const roomById=new Map(zones.map(z=>[z.id,z]));
 const sectionById=new Map(sections.map(s=>[s.zoneId,s]));
 const entryZone=base.relationIntent?.entryFacingZoneId ??
  base.r168GridEvidence?.assignment?.find(id=>roomById.has(id)&&
   roomById.get(id).range.z[0]===2);
 // The entrance origin and room proximity, not a genre rule, prohibit
 // cutting into an entry-facing room or a model-requested direct door.
 const candidates=[];
 for(const zone of zones){
  const range=zone.range,s=sectionById.get(zone.id);
  if(!s||!Number.isInteger(zone.relativeWeight)||!range?.x||!range?.z)
   fail('PROTECTED_ROOM_PROGRAM_REQUIRED');
  const west=range.x[0]===2,east=range.x[1]===w-3;
  const front=range.z[0]===2,rear=range.z[1]===d-3;
  if((west===east)||(front===rear)||zone.id===entryZone)continue;
  const sideX=west?'west':'east',sideZ=front?'front':'rear';
  for(const sideLength of [6,5]){
   const x0=west?0:w-sideLength,z0=front?0:d-sideLength;
   const x1=x0+sideLength-1,z1=z0+sideLength-1;
   const returnX=west?x1+1:x0-1,returnZ=front?z1+1:z0-1;
   const cut={x:[x0,x1],z:[z0,z1]};
   const addX={x:[returnX,returnX],z:[Math.min(z0,returnZ),Math.max(z1,returnZ)]};
   const addZ={x:[Math.min(x0,returnX),Math.max(x1,returnX)],z:[returnZ,returnZ]};
   // No furnished equipment/semantic object may be pruned or blocked by
   // the void or either new enclosing return wall.
   if(base.placements.some(p=>{
    const r=rect(p.origin,p.size);
    return overlaps(r,cut)||overlaps(r,addX)||overlaps(r,addZ);
   }))continue;
   // Keep original front entrance and original partition-door openings.
   const protectedDoors=base.design.elements.filter(e=>
    e.id==='exterior-entrance'||e.id.startsWith('r168-door-'));
   if(protectedDoors.some(e=>e.shape==='box'&&
    [cut,addX,addZ].some(region=>overlaps(rect(e.origin,e.size),region))))
    continue;
   candidates.push({zoneId:zone.id,weight:zone.relativeWeight,
    zonePurpose:zone.purpose,sideX,sideZ,size:sideLength,
    cut,addX,addZ,returnX,returnZ,roofY:s.roofY});
  }
 }
 candidates.sort((a,b)=>a.weight-b.weight||
  b.size-a.size||a.zoneId.localeCompare(b.zoneId));
 if(candidates.length===0)fail('NO_UNOCCUPIED_CORNER_WITH_PROTECTED_ENTRY');
 const baseMap=mapOf(base.compiled),rejections=[];
 for(const [index,c] of candidates.entries()){
  const design=structuredClone(base.design);
  const [x0,x1]=c.cut.x,[z0,z1]=c.cut.z;
  const wallTop=Math.min(h-2,c.roofY+2);
  // Remove actual FLOOR, envelope, roof, glazing and roof projections
  // through the roof-height stack to make genuine open sky in this pocket.
  add(design,'r176-open-corner-cut','cut',
   [x0,1,z0],[x1-x0+1,h-1,z1-z0+1]);
  add(design,'r176-weather-return-x','add',
   [c.returnX,2,Math.min(z0,c.returnZ)],
   [1,wallTop-1,Math.max(z1,c.returnZ)-Math.min(z0,c.returnZ)+1],
   shell.material);
  add(design,'r176-weather-return-z','add',
   [Math.min(x0,c.returnX),2,c.returnZ],
   [Math.max(x1,c.returnX)-Math.min(x0,c.returnX)+1,wallTop-1,1],
   shell.material);
  if(design.elements.length>160){rejections.push('B143_ELEMENT_BUDGET');continue;}
  let compiled;
  try{compiled=compileDesign(design);}catch(e){
   rejections.push('COMPILE:'+String(e.message));continue;
  }
  if(!verifyCompiled(design,compiled)){
   rejections.push('VERIFY_COMPILED');continue;
  }
  const m=mapOf(compiled);
  // Every changed voxel (all y, not merely interior) must be inside the
  // explicit corner removal or the two return-wall bounds.
  const allowed=(x,z)=>[c.cut,c.addX,c.addZ].some(r=>
   x>=r.x[0]&&x<=r.x[1]&&z>=r.z[0]&&z<=r.z[1]);
  const all=new Set([...baseMap.keys(),...m.keys()]);
  let outsideChange=false;
  for(const p of all){
   if(baseMap.get(p)===m.get(p))continue;
   const [x,,z]=p.split(',').map(Number);
   if(!allowed(x,z)){outsideChange=true;break;}
  }
  if(outsideChange){rejections.push('OUTSIDE_FOOTPRINT_GEOMETRY_CHANGED');continue;}
  const removedSupport=[];
  for(const [p] of baseMap){
   const [x,y,z]=p.split(',').map(Number);
   if(y===1&&x>=x0&&x<=x1&&z>=z0&&z<=z1&&!m.has(p))
    removedSupport.push([x,y,z]);
  }
  if(removedSupport.length<9){rejections.push('GROUND_FLOOR_NOT_REALLY_CHANGED');continue;}
  const witness=[c.sideX==='west'?x0+2:x1-2,
   c.sideZ==='front'?z0+2:z1-2];
  if(!baseMap.has([witness[0],1,witness[1]].join(','))||
   m.has([witness[0],1,witness[1]].join(','))){
   rejections.push('REAL_OPEN_COURT_WITNESS_NOT_AIR');continue;
  }
  if(!m.has([c.returnX,2,c.returnZ].join(','))){
   rejections.push('RETURN_WALL_CORNER_MISSING');continue;
  }
  // In addition to area exclusion above, require unchanged source voxels
  // occupied by every semantic furnishing even after weather-wall rebuild.
  let featureChanged=false;
  for(const placement of base.placements){
   const {origin:[px,py,pz],size:[sx,sy,sz]}=placement;
   for(let y=py;y<py+sy;y++)for(let z=pz;z<pz+sz;z++)
    for(let x=px;x<px+sx;x++){
     const keyCell=[x,y,z].join(',');
     if(m.get(keyCell)!==baseMap.get(keyCell))featureChanged=true;
    }
  }
  if(featureChanged){rejections.push('FURNISHING_CHANGED');continue;}
  const result={
   schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
   design,compiled,program:base.program,
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256
  };
  const targets=base.placements.map(p=>({
   id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size
  }));
  let route;
  try{route=auditR125SourceRoutes(result,{featureTargets:targets});}
  catch(e){rejections.push('ROUTE_THROW:'+String(e.message));continue;}
  if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   route.zones.length!==4||
   !route.zones.every(z=>z.reachedFromEntrance&&z.reachedTwoWidePadCount>0)||
   route.featureAccess.length!==targets.length||
   !route.featureAccess.every(f=>f.reachableFromEntrance)){
   rejections.push('REAL_ROUTE_REGRESSION');continue;
  }
  if(JSON.stringify(base.design)!==original)
   fail('ORIGINAL_SOURCE_MUTATED');
  return {...base,design,compiled,
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   sourceRouteAudit:route,
   readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
   r176GroundFootprintEvidence:{
    schema:'r176-true-open-corner-study-v1',
    HOST_DESIGNED_NOT_MODEL_SELECTED:true,
    sourceOnly:true,
    inheritedArchitecture:'R175_SETBACK_TERRACES',
    groundFloorOutlineChanged:true,
    chosenZoneId:c.zoneId,
    chosenZonePurpose:c.zonePurpose,
    chosenModelWeight:c.weight,
    courtAt:c.sideZ+'-'+c.sideX,
    cornerSize:c.size,removedActualY1FloorCells:removedSupport.length,
    cutBounds:{x:c.cut.x,z:c.cut.z,y:[1,h-1]},
    actualReturnWalls:[c.addX,c.addZ],
    sourceElements:design.elements.length,
    preservedModelDoors:base.modelRequestedDirectDoorEvidence?.length??null,
    unchangedFurnishingVoxelCells:true,
    protectedOtherCellsUnchanged:true,
    allRoomsAndEquipmentSourceReachable:true,
    candidateCount:candidates.length,selectedCandidateOrder:index+1,
    rejectedAlternatives:rejections,
    modelCalls:0,humanArtReview:'ART_HOLD',
    minecraftWalking:'NOT_TESTED',worldWrites:0,
    constructionApproved:false
   }};
 }
 fail('NO_CANDIDATE_SURVIVES_VOXEL_AND_ROUTE_QA_'+rejections.join('_').slice(0,180));
}
