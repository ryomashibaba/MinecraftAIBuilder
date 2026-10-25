/**
 * R170 / HOST-ONLY research of actually volumetric FOUR-ROOM architecture.
 * Replaces a uniform over-room cap with four sealed raised roof volumes,
 * derived from room footprints + LLM-selected room weights, not genre labels.
 *
 * Explicit opt-in, never misattribute generated heights to original model.
 * Verified old floor/walls/doors/furniture (all cells y<=5) and 2-wide
 * source room/fixture access remain identical or fail closed.
 * No Minecraft connection, model calls, world writing, or construction.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R170_FOUR_ROOM_'+s);};
const k=p=>p.slice(0,3).join(',');
const sorted=m=>JSON.stringify([...m].sort(([a],[b])=>a.localeCompare(b)));
const addBox=(design,id,mode,origin,size,material)=>design.elements.push({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
export function deriveR170FourRoomVolumes(base){
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  base?.r149ExpressionEvidence?.unchangedInteriorVoxels!==true||
  !base.design||!base.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  base.program?.length!==1||base.program[0].zones?.length!==4||
  !Array.isArray(base.placements)||base.placements.length<4||
  base.placements.length>8||
  base.design.elements.some(e=>e.id.startsWith('r170-')))
  fail('VERIFIED_FOUR_ROOM_FURNISHED_SOURCE_REQUIRED');
 const zones=base.program[0].zones;
 const {width:w,height:h,depth:d}=base.design.bounds;
 if(h<12||h>96||w<24||d<24)
  fail('BOUNDS_UNSUPPORTED');
 const roof=base.design.elements.find(e=>e.id==='roof-base');
 const west=base.design.elements.find(e=>e.id==='shell-west');
 // R149 returns a derived furnished-source wrapper without base.plan.
 // The verified host envelope evidence pins the ORIGINAL model roof family.
 // Never guess it from the material or roof silhouette.
 const profile=base.r149ExpressionEvidence?.originalRoofProfile;
 if(!roof||roof.shape!=='box'||roof.mode!=='add'||
  roof.origin?.[1]!==6||roof.size?.[1]!==1||
  roof.size?.[0]!==w-2||roof.size?.[2]!==d-2||
  !west||west.mode!=='add'||!west.material||
  !['flat','ridge','sawtooth'].includes(profile))
  fail('ORIGINAL_ROOF_CONTRACT');
 const design=structuredClone(base.design);
 // Rebuild the legacy profile only above y=6; keep all lower model-selected
 // rooms and equipment as exact voxels. Never delete a semantic room.
 const legacyProfileIds=design.elements.filter(e=>
  e.id.startsWith('roof-profile-')).map(e=>e.id);
 design.elements=design.elements.filter(e=>
  !e.id.startsWith('roof-profile-'));
 const ranks=zones.map(z=>z.id).sort((a,b)=>{
  const wa=zones.find(z=>z.id===a).relativeWeight;
  const wb=zones.find(z=>z.id===b).relativeWeight;
  return wa-wb||a.localeCompare(b);
 });
 if(zones.some(z=>!Number.isInteger(z.relativeWeight)||
   z.relativeWeight<1||z.relativeWeight>4))
  fail('MODEL_ROOM_WEIGHT_REQUIRED');
 const sections=zones.map((z,i)=>{
  const [x0,x1]=z.range.x,[z0,z1]=z.range.z;
  if(![x0,x1,z0,z1].every(Number.isSafeInteger)||
   x0<2||z0<2||x1>w-3||z1>d-3||
   x1-x0+1<7||z1-z0+1<7)
   fail('ROOM_BOUNDS_OR_MINIMUM_USABLE_SIZE');
  const rank=ranks.indexOf(z.id);
  const roofY=profile==='flat'?
   8+(rank>=2?1:0)+(rank===3?1:0):
   8+(rank>=2?1:0);
  return {
   zoneId:z.id,modelSelectedWeight:z.relativeWeight,
   rank,roofY,
   interior:{x:[x0,x1],z:[z0,z1]},
   perimeter:{x:[x0-1,x1+1],z:[z0-1,z1+1]},
   clearanceWitness:[Math.floor((x0+x1)/2),Math.floor((z0+z1)/2)]
  };
 });
 // Clear the OLD ceiling all the way through roof profile positions inside
 // each real room, then construct perimeter extensions + new weather roofs.
 for(const [i,s] of sections.entries()){
  const {x:[xl,xr],z:[zf,zb]}=s.interior;
  addBox(design,'r170-clear-'+i,'cut',[xl,6,zf],
   [xr-xl+1,h-6,zb-zf+1]);
 }
 for(const [i,s] of sections.entries()){
  const {x:[xl,xr],z:[zf,zb]}=s.perimeter;
  const height=s.roofY-6+(profile!=='flat'?2:0);
  if(s.roofY+(profile!=='flat'?2:0)>=h)fail('ROOF_ABOVE_SOURCE_BOUNDS');
  addBox(design,'r170-wall-west-'+i,'add',[xl,6,zf],
   [1,height,zb-zf+1],west.material);
  addBox(design,'r170-wall-east-'+i,'add',[xr,6,zf],
   [1,height,zb-zf+1],west.material);
  addBox(design,'r170-wall-front-'+i,'add',[xl+1,6,zf],
   [xr-xl-1,height,1],west.material);
  addBox(design,'r170-wall-rear-'+i,'add',[xl+1,6,zb],
   [xr-xl-1,height,1],west.material);
 }
 for(const [i,s] of sections.entries()){
  const {x:[xl,xr],z:[zf,zb]}=s.perimeter;
  addBox(design,'r170-roof-'+i,'add',[xl,s.roofY,zf],
   [xr-xl+1,1,zb-zf+1],roof.material);
  // Preserve the model's selected RIDGE/SAWTOOTH family: physically raised
  // rooftop steps per section, not a mere decorative façade label.
  if(profile!=='flat'){
   for(let z=zf+1;z<zb;z++){
    const distance=Math.min(z-zf,zb-z);
    const height=profile==='ridge'?
     (distance>=4?2:distance>=2?1:0):
     Math.min(2,(z-zf)%4);
    if(height>0)addBox(design,'r170-profile-'+i+'-'+z,'add',
     [xl,s.roofY+1,z],[xr-xl+1,height,1],roof.material);
   }
  }
 }
 if(design.elements.length>160)
  fail('B143_ELEMENT_BUDGET_EXCEEDED');
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))
  fail('SOURCE_COMPILATION');
 const before=new Map(base.compiled.primitives.filter(p=>p[1]<=5)
  .map(p=>[k(p),p[3]]));
 const after=new Map(compiled.primitives.filter(p=>p[1]<=5)
  .map(p=>[k(p),p[3]]));
 if(sorted(before)!==sorted(after))
  fail('ORIGINAL_ROOMS_DOORS_FURNITURE_CHANGED');
 const occupied=new Set(compiled.primitives.map(k));
 let extraVoid=0;
 for(const s of sections){
  const [mx,mz]=s.clearanceWitness;
  for(let y=6;y<s.roofY;y++)
   if(occupied.has([mx,y,mz].join(',')))
    fail('ROOM_HEIGHT_IS_NOT_REAL_CLEAR_AIR');
  if(!occupied.has([mx,s.roofY,mz].join(',')))
   fail('HIGH_ROOM_ROOF_NOT_REAL');
  let clear=0;
  for(let x=s.interior.x[0];x<=s.interior.x[1];x++)
   for(let z=s.interior.z[0];z<=s.interior.z[1];z++){
    if(!occupied.has([x,6,z].join(','))&&
      !occupied.has([x,7,z].join(',')))clear++;
   }
  if(clear<30)fail('ROOM_HEIGHT_NO_USABLE_AREA');
  s.extraAirColumnsAtY6Y7=clear;
  extraVoid+=clear;
 }
 const product={
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 };
 const targets=base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size
 }));
 const sourceRouteAudit=auditR125SourceRoutes(product,{featureTargets:targets});
 if(sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  sourceRouteAudit.zones.length!==4||
  sourceRouteAudit.featureAccess.length!==base.placements.length||
  !sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance))
  fail('ROOM_OR_FURNITURE_ROUTE_REGRESSION');
 return {...base,design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  r170FourRoomVolumeEvidence:{
   sourceOnly:true,hostArtStudyNotModelHeightChoice:true,
   legacyRoofProfileRemovedFromDerivedOnly:legacyProfileIds,
   modelSelectedRoofFamilyPreserved:profile,
   modelSelectedRoomCount:4,
   modelSelectedRoomWeightUsed:true,
   roomSections:sections,
   oldSourceSha256:base.sourceSha256,
   newSourceSha256:compiled.sourceSha256,
   originalLowerFiveLevelsUnchanged:true,
   clearHighInteriorSampleCount:extraVoid,
   usableAccessSourceOnly:true,
   aestheticApproved:false,
   actualMinecraftWalking:'NOT_TESTED',
   worldWrites:0
  }
 };
}
