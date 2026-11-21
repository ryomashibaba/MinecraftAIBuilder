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
export function deriveR170FourRoomVolumes(base,
 {studyStyle='R170_TERRACED_BASELINE'}={}){
 const massed=studyStyle==='R175_SETBACK_TERRACES';
 const sculpted=studyStyle==='R173_SCULPTED_CLERESTORY'||massed;
 if(!sculpted&&studyStyle!=='R170_TERRACED_BASELINE')
  fail('HOST_STUDY_STYLE_UNSUPPORTED');
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
 // Only the explicitly requested R173 host study expands the private B143
 // display bounds. This does NOT enlarge any Minecraft/world construction.
 if(sculpted)design.bounds.height=Math.max(h,18);
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
  const roofY=sculpted?
   [9,10,12,14][rank]:
   profile==='flat'?
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
   [xr-xl+1,design.bounds.height-6,zb-zf+1]);
 }
 for(const [i,s] of sections.entries()){
  const {x:[xl,xr],z:[zf,zb]}=s.perimeter;
  const height=s.roofY-6+(profile!=='flat'?2:0);
  if(s.roofY+(profile!=='flat'?2:0)>=design.bounds.height)
   fail('ROOF_ABOVE_SOURCE_BOUNDS');
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
   // R174: adjacent equal-height roof slices compile to identical voxels
   // as one B143 box; the old per-row format wasted element budget.
   const spans=[];
   for(let z=zf+1;z<zb;z++){
    const distance=Math.min(z-zf,zb-z);
    const height=profile==='ridge'?
     (distance>=4?2:distance>=2?1:0):
     Math.min(2,(z-zf)%4);
    if(height===0)continue;
    const prev=spans.at(-1);
    if(prev&&prev.height===height&&prev.z+prev.depth===z)
     prev.depth++;
    else spans.push({z,height,depth:1});
   }
   for(const [j,span] of spans.entries())
    addBox(design,'r170-profile-'+i+'-'+j,'add',
     [xl,s.roofY+1,span.z],
     [xr-xl+1,span.height,span.depth],roof.material);
  }

 }
 // R173 option: genuinely CUT the newly built upper wall and refill it
 // with colored glazing, rather than merely drawing rectangles on an SVG.
 // Use room ranges only. Never touch the model-selected doors, floor or
 // furnishings (all y<=5). Constrain windows to an exterior-facing side.
 let realClerestoryWindowCount=0;
 let omittedOptionalClerestoryWindows=0;
 const windowsPerRoom=Array(4).fill(0);
 if(sculpted){
  const required=[],optional=[];
  for(const [i,section] of sections.entries()){
   const {x:[xl,xr],z:[zf,zb]}=section.perimeter;
   const winHeight=Math.min(4,section.roofY-7);
   const winY=section.roofY-winHeight;
   const horizontal=Math.min(5,xr-xl-3);
   const longitudinal=Math.min(5,zb-zf-3);
   if(winHeight<2||horizontal<3||longitudinal<3)
    fail('R173_UPPER_GLAZING_NOT_FIT');
   const winX=xl+Math.floor((xr-xl-horizontal+1)/2);
   const winZ=zf+Math.floor((zb-zf-longitudinal+1)/2);
   const windows=[];
   if(zf===1)windows.push({side:'front',origin:[winX,winY,zf],
    size:[horizontal,winHeight,1]});
   if(zb===d-2)windows.push({side:'rear',origin:[winX,winY,zb],
    size:[horizontal,winHeight,1]});
   if(xl===1)windows.push({side:'west',origin:[xl,winY,winZ],
    size:[1,winHeight,longitudinal]});
   if(xr===w-2)windows.push({side:'east',origin:[xr,winY,winZ],
    size:[1,winHeight,longitudinal]});
   // Keep one physical exterior glass window in EVERY room first.
   // Optional second elevations are permitted only with spare B143 budget.
   if(windows.length===0)fail('R174_NO_EXTERIOR_WINDOW_SIDE');
   required.push({i,win:windows[0]});
   optional.push(...windows.slice(1).map(win=>({i,win})));
  }
  // Each actual opening takes a CUT and a separate glass ADD element.
  // Reserve six B143 elements for two actual upper roof setbacks.
  const capacity=Math.floor((160-design.elements.length-(massed?6:0))/2);
  if(capacity<required.length)
   fail('R174_MANDATORY_GLAZING_EXCEEDS_ELEMENT_BUDGET');
  const chosen=[...required,...optional.slice(0,capacity-required.length)];
  omittedOptionalClerestoryWindows=required.length+optional.length-chosen.length;
  for(const {i,win} of chosen){
   const name='r173-clerestory-'+i+'-'+win.side;
   addBox(design,name+'-cut','cut',win.origin,win.size);
   addBox(design,name+'-glass','add',win.origin,win.size,'glass');
   windowsPerRoom[i]++;
   realClerestoryWindowCount++;
  }
  if(realClerestoryWindowCount<4||windowsPerRoom.some(n=>n<1))
   fail('R173_NO_REAL_EXTERIOR_CLERESTORY');
 }

 // R175 changes actual UPPER volume occupancy, not a decorative label.
 // Keep original model-selected floor, entry, equipment and lower windows.
 const upperSetbackDecks=[];
 if(massed){
  for(const [i,s] of sections.entries()){
   if(s.rank<2)continue;
   const [xl,xr]=s.perimeter.x,[zf,zb]=s.perimeter.z;
   const side=xl===1?'west':xr===w-2?'east':null;
   const band=3,deckY=s.roofY-3;
   if(!side||xr-xl<9||zb-zf<9||deckY<8)
    fail('R175_UPPER_MASS_SETBACK_NOT_FIT');
   const outerX=side==='west'?xl:xr-band+1;
   const innerX=side==='west'?xl+band:xr-band;
   const prefix='r173-clerestory-'+i+'-'+side;
   const initial=design.elements.length;
   design.elements=design.elements.filter(e=>e.id!==prefix+'-cut'&&
    e.id!==prefix+'-glass');
   const removed=initial-design.elements.length;
   if(removed!==0&&removed!==2)fail('R175_OPTIONAL_WINDOW_PAIR');
   if(removed===2){
    windowsPerRoom[i]--;
    realClerestoryWindowCount--;
   }
   // Physically remove high wall, glazing, roofing and roof profile.
   addBox(design,'r175-upper-cut-'+i,'cut',
    [outerX,deckY+1,zf],[band,design.bounds.height-deckY-1,zb-zf+1]);
   // A lower roof plane and internal weather wall enclose the split volume.
   addBox(design,'r175-deck-'+i,'add',
    [outerX,deckY,zf],[band,1,zb-zf+1],roof.material);
   addBox(design,'r175-inner-wall-'+i,'add',
    [innerX,deckY+1,zf],[1,s.roofY-deckY,zb-zf+1],west.material);
   upperSetbackDecks.push({zoneId:s.zoneId,rank:s.rank,side,
    roofY:s.roofY,deckY,outerX,innerX,
    witnessZ:Math.floor((zf+zb)/2),optionalSideWindowRemoved:removed===2});
  }
  if(upperSetbackDecks.length!==2||windowsPerRoom.some(n=>n<1))
   fail('R175_DECK_OR_MANDATORY_ROOM_GLAZING');
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
 for(const t of upperSetbackDecks){
  const {outerX,innerX,roofY,deckY,witnessZ}=t;
  if(occupied.has([outerX,roofY,witnessZ].join(','))||
   !occupied.has([outerX,deckY,witnessZ].join(','))||
   !occupied.has([innerX,roofY,witnessZ].join(',')))
   fail('R175_REAL_UPPER_SETBACK_NOT_COMPILED');
 }
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
   studyStyle,sculptedVolumeVariant:sculpted,
   R175_HOST_DERIVED_NOT_MODEL_SELECTED:massed,
   upperSetbackDecks,originalGroundFootprintChanged:false,
   realExteriorClerestoryWindows:realClerestoryWindowCount,
   realExteriorClerestoryWindowsPerRoom:windowsPerRoom,
   omittedOptionalClerestoryWindows,
   b143SourceElementCount:design.elements.length,
   derivedBuildingBoundsHeight:design.bounds.height,
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
