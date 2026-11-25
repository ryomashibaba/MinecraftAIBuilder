/**
 * AUTHOR-selected, genre-neutral architectural equipment in real B143 voxels.
 * The untouched original model plan owns each room and role. The generic HOST
 * owns positions, SOURCE clearance, and deterministic, limited search.
 * No model, network, world IO, game physics or silent role replacement.
 */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditInteriorTopology} from './b198c-spatial-critic.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {auditR125PairedBayApproach} from './r125-room-daylight.mjs';
import {packR125AdjacentBoxes} from './r125-spatial-detail.mjs';

const BUDGET=540; // Dual-axis fallback search only; legacy success path unchanged.
const failPosition=diagnosis=>{
 const error=Error('R125_PLAN_FIXTURE_NO_REACHABLE_POSITION');
 error.fixturePlacement=diagnosis;throw error;
};
const intentKey=i=>i.level+':'+i.zoneIndex;
const roleWidth=kind=>
 ['service-bay','tool-rack','teaching-board','assembly-table'].includes(kind)?5:
 kind==='large-table'?7:3;
const roleDepth=kind=>['bed','service-bay'].includes(kind)?4:
 ['assembly-table','inspection-stand'].includes(kind)?3:
 kind==='large-table'?5:
 ['seating','washbasin','electronics','oven','table'].includes(kind)?2:1;

/**
 * Preserve a real contiguous two-cell aperture of room-side air behind each
 * MODEL-authored window when placing furniture. The existing daylight HOST
 * proves the glass, exterior air and interior air before this step.
 * Every test below uses actual FINAL B143 occupied voxels, not a lighting
 * simulation. No windows => exactly the legacy positioning behavior.
 */
export function auditR125FixtureDaylightView(scene,daylightTargets=[]){
 if(!Array.isArray(scene?.primitives)||!Array.isArray(daylightTargets))
  throw Error('R125_FIXTURE_DAYLIGHT_AUDIT_INPUT');
 if(!daylightTargets.length)
  return {status:'NO_AUTHORED_DAYLIGHT',windowCount:0,blocked:[]};
 const solid=new Set(scene.primitives.map(([x,y,z])=>x+','+y+','+z));
 const blocked=[];
 for(const t of daylightTargets){
  if(!['front','rear','east','west'].includes(t.face)||
     !Array.isArray(t.origin)||!Array.isArray(t.size)||
     t.origin.length!==3||t.size.length!==3||
     t.size.some(n=>!Number.isSafeInteger(n)||n<1))
   throw Error('R125_FIXTURE_DAYLIGHT_BAD_TARGET');
  const [x,y,z]=t.origin,[sx,sy,sz]=t.size;
  const alongX=t.face==='front'||t.face==='rear',span=alongX?sx:sz;
  const [dx,dz]=t.face==='front'?[0,1]:
   t.face==='rear'?[0,-1]:t.face==='east'?[-1,0]:[1,0];
  let clearRun=0,maxClearRun=0,clearColumns=0;
  for(let u=0;u<span;u++){
   const xx=x+(alongX?u:0)+dx,zz=z+(alongX?0:u)+dz;
   const clear=Array.from({length:sy},(_,v)=>
    !solid.has(xx+','+(y+v)+','+zz)).every(Boolean);
   if(clear){clearColumns++;clearRun++;maxClearRun=Math.max(maxClearRun,clearRun);}
   else clearRun=0;
  }
  const required=t.kind==='panorama'?4:2;
  if(maxClearRun<required)blocked.push({
   zoneId:t.zoneId,face:t.face,kind:t.kind,
   maxClearAdjacentColumns:maxClearRun,clearColumns,
   requiredContiguousColumns:required});
 }
 return {status:blocked.length?'DAYLIGHT_VIEW_HOLD':'DAYLIGHT_VIEW_CLEAR',
  windowCount:daylightTargets.length,blocked};
}

const fixtureIntents=p=>p.plan.levels.flatMap((l,li)=>
 l.spaces.flatMap((s,zi)=>s.fixtures?
  s.fixtures.map((kind,index)=>({
   level:li,zoneIndex:zi,zoneId:s.id,kind,index,multi:true,
   ...(s.fixtureDetail?{detail:s.fixtureDetail}:{}),
   ...(s.fixtureArrangement?{arrangement:s.fixtureArrangement}:{}),
   ...(kind==='oven'&&s.ovenHearth?{hearth:s.ovenHearth}:{})})):
  s.fixture===undefined?[]:
  [{level:li,zoneIndex:zi,zoneId:s.id,kind:s.fixture,multi:false,
   ...(s.fixtureDetail?{detail:s.fixtureDetail}:{}),
   ...(s.fixtureArrangement?{arrangement:s.fixtureArrangement}:{})}]));

function positions(intent,product,turned=false,exhaustive=false){
 const range=product.program[intent.level].zones[intent.zoneIndex].range;
 const width=turned?roleDepth(intent.kind):roleWidth(intent.kind);
 const depth=turned?roleWidth(intent.kind):roleDepth(intent.kind);
 const corners=[
  [range.x[0],range.z[1]-depth+1],
  [range.x[1]-width+1,range.z[1]-depth+1],
  [range.x[0],range.z[0]],
  [range.x[1]-width+1,range.z[0]]
 ];
 const mx=Math.floor((range.x[0]+range.x[1]-width+1)/2);
 const mz=Math.floor((range.z[0]+range.z[1]-depth+1)/2);
 // A single authored fixture keeps its original four-corner placement first.
 // Only after those fail, try other positions with the same bounded search
 // already used for multiple fixtures. This rescues wide useful rooms where
 // every corner is obstructed but wall or middle floor remains accessible.
 const candidates=(intent.multi||exhaustive)?
  [...corners,[mx,range.z[0]],[mx,range.z[1]-depth+1],
   [range.x[0],mz],[range.x[1]-width+1,mz],[mx,mz]]:corners;
 if(product.fixturePlacement==='wall-aligned'){
  // Keep equipment off the middle of a room, reserving it for movement.
  // The same SOURCE placement audits still decide whether a wall position fits.
  const wallCandidates=[...corners,[mx,range.z[0]],[mx,range.z[1]-depth+1],
   [range.x[0],mz],[range.x[1]-width+1,mz]];
  if(intent.multi&&intent.index%2===1)wallCandidates.reverse();
  candidates.splice(0,candidates.length,...wallCandidates,[mx,mz]);
 }else if(intent.multi&&intent.index%2===1)candidates.reverse();
 if(product.fixturePlacement==='activity-layout'){
  // Explicit HOST-derived study: group MODEL-chosen functions into readable
  // activity areas instead of scattering them across four corners.
  // This chooses POSITIONS ONLY. It never invents or duplicates roles.
  // Every candidate still passes collision, supported floor, 2-wide source
  // routing, authored daylight and topology checks in tryOrigin().
  const dx=width+2,dz=depth+2;
  const ring=[
   [mx+dx,mz],[mx-dx,mz],[mx,mz+dz],[mx,mz-dz],
   [mx+dx,mz+dz],[mx-dx,mz+dz],
   [mx+dx,mz-dz],[mx-dx,mz-dz]
  ];
  const priority=intent.multi&&intent.index>0?
   [...ring,[mx,mz]]:[[mx,mz],...ring];
  const seen=new Set();
  const ordered=[...priority,...candidates].filter(([x,z])=>{
   if(x<range.x[0]||x+width-1>range.x[1]||
      z<range.z[0]||z+depth-1>range.z[1])return false;
   const key=x+','+z;
   if(seen.has(key))return false;
   seen.add(key);return true;
  });
  candidates.splice(0,candidates.length,...ordered);
 }
 if(intent.arrangement==='focal-island'){
  // An AUTHOR-chosen central activity focal point, not a forced template.
  // Try one central 3xD workstation, then a ring of independent adjacent
  // stations with a two-cell gap. Every position still goes through the
  // unchanged B143 service, collision, floor and window access gates.
  const separationX=width+2,separationZ=depth+2;
  const centerFirst=[
   [mx,mz],
   [mx+separationX,mz],[mx-separationX,mz],
   [mx,mz+separationZ],[mx,mz-separationZ],
   [mx+separationX,mz+separationZ],
   [mx-separationX,mz+separationZ],
   [mx+separationX,mz-separationZ],
   [mx-separationX,mz-separationZ]
  ];
  const ring=intent.multi&&intent.index>0?
   [...centerFirst.slice(1),centerFirst[0]]:centerFirst;
  const seen=new Set();
  const preferred=[...ring,...candidates].filter(([x,z])=>{
   if(x<range.x[0]||x+width-1>range.x[1]||
      z<range.z[0]||z+depth-1>range.z[1])return false;
   const k=x+','+z;
   if(seen.has(k))return false;
   seen.add(k);return true;
  });
  candidates.splice(0,candidates.length,...preferred);
 }
 if(intent.multi||exhaustive){
  const seen=new Set(candidates.map(([x,z])=>x+','+z));
  for(let z=range.z[0];z<=range.z[1]-depth+1;z++)
   for(let x=range.x[0];x<=range.x[1]-width+1;x++){
    const key=x+','+z;
    if(!seen.has(key)){seen.add(key);candidates.push([x,z]);}
   }
 }
 return {candidates,range,width,depth};
}
function makeParts(intent,x,y,z,turned=false,wallAligned=false){
 const key='fx-l'+intent.level+'-z'+intent.zoneIndex+
  (intent.multi?'-i'+intent.index:'');
 const add=(name,dx,dy,dz,sx,sy,sz,material)=>({
  id:key+'-'+name,shape:'box',mode:'add',material,
  origin:[x+dx,y+dy,z+dz],size:[sx,sy,sz]});
 const families={
  counter:()=>[add('body',0,0,0,3,1,1,'wood'),
   add('top',0,1,0,3,1,1,'accent')],
  workbench:()=>[add('leg-a',0,0,0,1,1,1,'metal'),
   add('leg-b',2,0,0,1,1,1,'metal'),
   add('top',0,1,0,3,1,1,'wood')],
  display:()=>[add('plinth',0,0,0,3,1,1,'stone'),
   add('glass',0,1,0,3,1,1,'glass')],
  storage:()=>[add('left-upright',0,0,0,1,3,1,'wood'),
   add('right-upright',2,0,0,1,3,1,'wood'),
   add('bottom-shelf',0,0,0,3,1,1,'metal'),
   add('top-shelf',0,2,0,3,1,1,'metal')],
  seating:()=>[add('seat',0,0,0,3,1,1,'wood'),
   add('back',0,1,1,3,1,1,'wood')],
  bed:()=>[add('bedframe',0,0,0,3,1,4,'wood'),
   add('mattress',0,1,0,3,1,3,'concrete'),
   add('headboard',0,1,3,3,2,1,'wood'),
   add('pillow',1,2,2,1,1,1,'stone')],
  desk:()=>[add('desk-leg-a',0,0,0,1,1,1,'wood'),
   add('desk-leg-b',2,0,0,1,1,1,'wood'),
   add('desk-top',0,1,0,3,1,1,'wood'),
   add('desk-display',1,2,0,1,1,1,'glass')],
  washbasin:()=>[add('basin-back',0,0,1,3,1,1,'stone'),
   add('basin-side-a',0,1,0,1,1,2,'concrete'),
   add('basin-side-b',2,1,0,1,1,2,'concrete'),
   add('basin-rear-rim',1,1,1,1,1,1,'concrete'),
   add('basin-tap',1,2,1,1,1,1,'metal')],
  electronics:()=>[add('rack-leg-a',0,0,0,1,1,1,'metal'),
   add('rack-leg-b',2,0,0,1,1,1,'metal'),
   add('rack-desk',0,1,0,3,1,2,'wood'),
   add('rack-screen',0,2,1,2,1,1,'glass'),
   add('rack-controller',2,2,1,1,1,1,'metal')],
  // Optional author-selected food-heating station, 3 x 2 x 3. Geometric
  // Minecraft blocks only: not a functional cooking or baking machine.
  oven:()=>[add('base',0,0,0,3,1,2,'stone'),
   add('side-a',0,1,0,1,2,2,'metal'),
   add('side-b',2,1,0,1,2,2,'metal'),
   add('hood',0,2,0,3,1,2,'metal'),
   add('door-glass',1,1,0,1,1,1,'glass'),
   add('hearth-glow',1,1,1,1,1,1,intent.hearth??'glow')],
  // These are purely geometric forms explicitly chosen by the model.
  'service-bay':()=>[
   add('left-floor-guide',0,0,0,1,1,4,'metal'),
   add('right-floor-guide',4,0,0,1,1,4,'metal'),
   add('repair-pedestal',2,0,2,1,2,1,'stone'),
   add('overhead-support',1,2,2,3,1,1,'metal'),
   add('front-wheel-stop',2,0,0,1,1,1,'accent')],
  'tool-rack':()=>[
   add('base',0,0,0,5,1,1,'wood'),
   add('vertical-panel',0,1,0,5,2,1,'metal'),
   add('tool-mark-a',1,2,0,1,1,1,'accent'),
   add('tool-mark-b',3,2,0,1,1,1,'stone')],
  'teaching-board':()=>[
   add('support-left',0,0,0,1,1,1,'wood'),
   add('support-right',4,0,0,1,1,1,'wood'),
   add('board-frame',0,1,0,5,2,1,'wood'),
   add('writing-face',1,1,0,3,2,1,'concrete')],
  'inspection-stand':()=>[
   add('supported-platform',0,0,0,3,1,3,'stone'),
   add('inspection-pillar',1,1,1,1,1,1,'metal'),
   add('instrument-arm',0,2,1,3,1,1,'accent')],
  'assembly-table':()=>[
   add('near-left-leg',0,0,0,1,1,1,'wood'),
   add('near-right-leg',4,0,0,1,1,1,'wood'),
   add('far-left-leg',0,0,2,1,1,1,'wood'),
   add('far-right-leg',4,0,2,1,1,1,'wood'),
   add('large-work-surface',0,1,0,5,1,3,'wood'),
   add('workpiece-marker',2,2,1,1,1,1,'accent')],
  // Ordinary compact shared work/meal surface, not a machine or chart table.
  table:()=>[add('leg-nw',0,0,0,1,1,1,'wood'),
   add('leg-ne',2,0,0,1,1,1,'wood'),
   add('leg-sw',0,0,1,1,1,1,'wood'),
   add('leg-se',2,0,1,1,1,1,'wood'),
   add('tabletop',0,1,0,3,1,2,'wood')],
  'large-table':()=>[
   add('table-leg-near-west',0,0,0,1,1,1,'wood'),
   add('table-leg-near-east',6,0,0,1,1,1,'wood'),
   add('table-leg-far-west',0,0,4,1,1,1,'wood'),
   add('table-leg-far-east',6,0,4,1,1,1,'wood'),
   add('continuous-tabletop',0,1,0,7,1,5,'wood'),
   add('inlaid-chart-area',1,2,1,5,1,3,'accent')]
 };
 const parts=families[intent.kind]?.();
 if(!parts)throw Error('R125_PLAN_FIXTURE_UNKNOWN_ROLE');
 // OPTIONAL authored detail. Every part fits inside the established
 // 3 x roleDepth footprint and 3-high access volume, even when rotated.
 // Legacy roles without detail keep their exact historic B143 elements.
 if(intent.detail==='crafted'){
  const details={
   counter:()=>[add('register',1,2,0,1,1,1,'metal')],
   workbench:()=>[add('bench-vise',1,2,0,1,1,1,'metal')],
   display:()=>[add('display-object',1,2,0,1,1,1,'accent')],
   storage:()=>[add('shelf-object',1,1,0,1,1,1,'accent')],
   seating:()=>[add('left-arm',0,1,0,1,1,1,'accent'),
    add('right-arm',2,1,0,1,1,1,'accent')],
   bed:()=>[add('foot-left',0,2,0,1,1,1,'wood'),
    add('foot-right',2,2,0,1,1,1,'wood')],
   desk:()=>[add('monitor-frame-left',0,2,0,1,1,1,'metal'),
    add('monitor-frame-right',2,2,0,1,1,1,'metal')],
   washbasin:()=>[add('basin-water',1,1,0,1,1,1,'glass')],
   electronics:()=>[add('control-unit',2,2,0,1,1,1,'accent')],
   oven:()=>[add('heat-control',2,2,0,1,1,1,'accent')],
   'service-bay':()=>[add('fixture-adjuster',2,2,2,1,1,1,'accent')],
   'tool-rack':()=>[add('center-tool',2,2,0,1,1,1,'accent')],
   'teaching-board':()=>[add('diagram-marker',2,2,0,1,1,1,'accent')],
   'inspection-stand':()=>[add('inspection-gauge',1,2,1,1,1,1,'glass')],
   'assembly-table':()=>[add('bench-tool',1,2,1,1,1,1,'metal')],
   table:()=>[add('table-apron',1,0,0,1,1,2,'accent')],
   'large-table':()=>[add('chart-corner-weight',1,3,1,1,1,1,'metal')]
  };
  parts.push(...details[intent.kind]());
 }
 if(wallAligned&&intent.kind==='bed'){
  // A mattress, pillow and modest headboard share a two-block furniture
  // height; the legacy three-high pillow/posts remain unchanged by default.
  for(const part of parts){
   if(part.id.endsWith('-headboard'))part.size[1]=1;
   if(/-(pillow|foot-left|foot-right)$/.test(part.id))part.origin[1]=y+1;
  }
 }
 if(!turned)return {key,parts};
 // Rotate physical shapes 90 degrees about the fixture's local footprint
 // origin. All material cells and model-authored roles remain identical.
 // An ordinary 3x1 desk becomes a 1x3 desk, leaving 2-wide access alongside
 // it in a narrow 3-wide zone.
 const rotated=parts.map(part=>{
  const [px,py,pz]=part.origin,[sx,sy,sz]=part.size;
  const dx=px-x,dy=py-y,dz=pz-z;
  return {...part,origin:[x+dz,y+dy,z+roleWidth(intent.kind)-(dx+sx)],
   size:[sz,sy,sx]};
 });
 return {key,parts:rotated};
}
function tryOrigin(product,targets,intent,x,z,auditCirculation,
 floorComponentBaseline,turned=false){
 const floor=product.program[intent.level];
 const range=floor.zones[intent.zoneIndex].range,y=floor.standingFloorY;
 const width=turned?roleDepth(intent.kind):roleWidth(intent.kind);
 const depth=turned?roleWidth(intent.kind):roleDepth(intent.kind);
 const rejected=(reason,evidence)=>({
  ok:false,rejection:{at:[x,y,z],reason,
  ...(turned?{orientation:'quarter-turn'}:{}),
  ...(evidence?{evidence}:{})}
 });
 if(x<range.x[0]||x+width-1>range.x[1]||
    z<range.z[0]||z+depth-1>range.z[1])
  return rejected('OUTSIDE_AUTHORED_ZONE');
 const made=makeParts(intent,x,y,z,turned,product.fixturePlacement==='wall-aligned'),key=made.key;
 const parts=product.fixturePlacement==='wall-aligned'?
  packR125AdjacentBoxes(made.parts):made.parts;
 const occupied=new Set(product.compiled.primitives.map(c=>
  c[0]+','+c[1]+','+c[2]));
 const has=(a,b,c)=>occupied.has(a+','+b+','+c);
 let unsupported=null,collision=null;
 for(let a=x;a<x+width;a++)for(let c=z;c<z+depth;c++)
  if(!has(a,y-1,c)&&unsupported===null)unsupported=[a,y-1,c];
 for(const part of parts){
  const [ax,ay,az]=part.origin,[sx,sy,sz]=part.size;
  for(let a=ax;a<ax+sx;a++)for(let yy=ay;yy<ay+sy;yy++)
   for(let c=az;c<az+sz;c++)
    if(has(a,yy,c)&&collision===null)collision=[a,yy,c];
 }
 if(unsupported||collision)
  return rejected(unsupported?'UNSUPPORTED_FLOOR':'EXISTING_VOXEL_COLLISION',
   {firstUnsupported:unsupported,firstCollision:collision});
 const design={...product.design,
  elements:[...product.design.elements,...parts]};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))
  throw Error('R125_PLAN_FIXTURE_SOURCE_MISMATCH');
 const trial={...product,design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 // The chosen furniture LOCATION must not hide the only usable aperture
 // of an authored glass window. Reject and try another location if it does.
 if(product.daylightTargets?.length){
  const view=auditR125FixtureDaylightView(compiled,product.daylightTargets);
  if(view.status!=='DAYLIGHT_VIEW_CLEAR')
   return rejected('MODEL_DAYLIGHT_VIEW_OCCLUDED',{
    blockedWindows:view.blocked});
 }
 // HOST-owned furniture may not disconnect a program floor that was
 // connected before furniture placement. Compare true 2x2 supported B143
 // pads on every authored program elevation; route/circulation checks alone
 // can accept a one-wide path behind a blocked public threshold.
 if(floorComponentBaseline.size){
  const after=auditInteriorTopology({design,compiled}).elevationConnectivity;
  for(const [standingY,baselineCount] of floorComponentBaseline){
   const current=after.find(row=>row.standingY===standingY);
   if((current?.componentCount??0)!==baselineCount)
    return rejected('PROGRAM_FLOOR_COMPONENT_COUNT_CHANGED',{
     standingY,baselineCount,currentCount:current?.componentCount??0,
     totalStandingSquares:current?.totalStandingSquares??0});
  }
 }
 const target={id:key,zoneId:intent.zoneId,
  origin:[x,y,z],size:[width,3,depth],kind:intent.kind,
  ...(intent.detail?{detail:intent.detail}:{}),
  ...(intent.arrangement?{arrangement:intent.arrangement}:{}),
  ...(turned?{orientation:'quarter-turn'}:{})};
 const routes=auditR125SourceRoutes(trial,{featureTargets:[...targets,target]});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.featureAccess.some(f=>!f.reachableFromEntrance))
  return rejected('SOURCE_SERVICE_ACCESS_HOLD',
   {routeIssues:routes.issues.slice(0,12),
    blockedServiceFeatures:routes.featureAccess.filter(f=>
     !f.reachableFromEntrance).map(f=>f.id)});
 if(product.daylightTargets?.some(t=>t.kind==='paired-bays')){
  const approach=auditR125PairedBayApproach(trial,product.daylightTargets);
  if(approach.status!=='PAIRED_BAY_APPROACH_PASS')
   return rejected('MODEL_PAIRED_BAY_APPROACH_BLOCKED',
    {blockedWindows:approach.blocked});
 }
 const circulation=auditCirculation(trial);
 if(circulation.status!=='SOURCE_CLEARANCE_PROBES_PASS')
  return rejected('SOURCE_CIRCULATION_HOLD',
   {circulationFailures:(circulation.failures??[]).slice(0,12)});
 return {ok:true,product:trial,target};
}
function repairZone(start,previousTargets,zoneIntents,auditCirculation,
 floorComponentBaseline,quarterTurnOnly=false){
 // Up to three model-authored utilities per zone. Only their HOST positions
 // are variable. No author plan/role edit, false service pass or model call.
 const tracker={attempted:true,mode:'BOUNDED_ZONE_LOCAL_BACKTRACK',
  maxCandidateEvaluations:BUDGET,candidateEvaluations:0,
  rotatedCandidateEvaluations:0,searchLimitReached:false,
  arrangementFound:false,
  affectedZone:zoneIntents[0].zoneId,
  roleOrder:zoneIntents.map(x=>x.kind),
  ...(quarterTurnOnly?{orientationFallback:'WIDE_ZONE_AFTER_LEGACY_HOLD'}:{})};
 const dfs=(index,product,placed)=>{
  if(index===zoneIntents.length)
   return {product,targets:placed};
  const intent=zoneIntents[index];
  const zone=product.program[intent.level].zones[intent.zoneIndex].range;
  const width=zone.x[1]-zone.x[0]+1;
  // In a narrow room, rotate shallow desks and shelving toward the wall
  // before spending the entire search budget on 3-wide path blockers.
  // The second pass is reached ONLY after the unchanged wide-room search
  // failed. Preserve every previous successful model-authored layout.
  const variants=quarterTurnOnly?[true]:width<=4?
   (roleDepth(intent.kind)===1?[true,false]:[false,true]):
   [false]; // Original wide-room search remains untouched.
  for(const turned of variants){
   const {candidates}=positions(intent,product,turned,true);
   const used=new Set();
   for(const [x,z] of candidates){
    const key=x+','+z;
    if(used.has(key))continue;
    used.add(key);
    if(tracker.candidateEvaluations>=BUDGET){
     tracker.searchLimitReached=true;return null;
    }
    tracker.candidateEvaluations++;
    if(turned)tracker.rotatedCandidateEvaluations++;
    const step=tryOrigin(product,[...previousTargets,...placed],
     intent,x,z,auditCirculation,floorComponentBaseline,turned);
    if(!step.ok)continue;
    const result=dfs(index+1,step.product,[...placed,step.target]);
    if(result)return result;
    if(tracker.searchLimitReached)return null;
   }
  }
  return null;
 };
 const result=dfs(0,start,[]);
 tracker.arrangementFound=Boolean(result);
 return {tracker,result};
}
export function addAuthoredRoomFixtures(product,{auditCirculation}={}){
 const intents=fixtureIntents(product);
 if(!intents.length)return product;
 if(typeof auditCirculation!=='function')
  throw Error('R125_PLAN_FIXTURE_AUDITOR_REQUIRED');
 const programElevations=new Set(product.program.map(level=>level.standingFloorY));
 const floorComponentBaseline=new Map(auditInteriorTopology({
  design:product.design,compiled:product.compiled
 }).elevationConnectivity.filter(row=>programElevations.has(row.standingY))
  .map(row=>[row.standingY,row.componentCount]));
 let current=product,targets=[],searchWitnesses=[];
 const zoneStarts=new Map();
 for(const intent of intents){
  const zkey=intentKey(intent);
  if(!zoneStarts.has(zkey))
   zoneStarts.set(zkey,{product:current,targets:[...targets]});
  const {candidates,range,depth}=positions(intent,current);
  let selected=null;
  const rejected=[];
  for(const [x,z] of candidates){
   const probe=tryOrigin(current,targets,intent,x,z,auditCirculation,
    floorComponentBaseline);
   if(probe.ok){selected=probe;break;}
   rejected.push(probe.rejection);
  }
  if(selected){
   current=selected.product;targets.push(selected.target);
   continue;
  }
  // Only after the existing corner candidates all fail, use the proven
  // bounded single-zone placement search. Historically the recovery was
  // available to multiple fixtures only, so a lone 3x1 workbench in a
  // 3..4-wide room could fail even with an accessible 90-degree layout.
  // Preserve every successfully placed old building exactly.
  // A single item in a wide zone can also have all four corners unavailable.
  // The fallback changes ONLY a previously failed placement; the valid
  // original four-corner path and multi-item search remain unchanged.
  let fallback=null,quarterTurnSearch=null;
  {
   const start=zoneStarts.get(zkey);
   const roles=intent.multi?intents.filter(i=>intentKey(i)===zkey&&
    i.multi&&i.index<=intent.index):[intent];
   fallback=repairZone(start.product,start.targets,roles,auditCirculation,
    floorComponentBaseline);
   // A useful room wider than four blocks can still need a rotated desk,
   // counter or bed to preserve a true two-wide route. Retry only after
   // ALL original placements failed; never alter previously successful
   // buildings, authored roles, or the original model response.
   if(!fallback.result&&range.x[1]-range.x[0]+1>4){
    quarterTurnSearch=repairZone(start.product,start.targets,roles,
     auditCirculation,floorComponentBaseline,true);
    if(quarterTurnSearch.result)fallback=quarterTurnSearch;
   }
   if(fallback.result){
    current=fallback.result.product;
    targets=[...start.targets,...fallback.result.targets];
    searchWitnesses.push(fallback.tracker);
    continue;
   }
  }
  failPosition({
   schema:'r125-fixture-placement-failure-v1',
   failed:{level:intent.level,zoneIndex:intent.zoneIndex,
    zoneId:intent.zoneId,kind:intent.kind,
    fixtureIndex:intent.multi?intent.index:null,
    range,standingFloorY:current.program[intent.level].standingFloorY,
    footprint:[roleWidth(intent.kind),depth]},
   previouslyPlaced:targets.map(t=>({
    id:t.id,zoneId:t.zoneId,kind:t.kind,origin:t.origin,size:t.size,
    ...(t.orientation?{orientation:t.orientation}:{})})),
   candidateCount:candidates.length,
   rejectedCandidates:rejected,
   ...(fallback?{zoneLocalSearch:fallback.tracker}:{}),
   ...(quarterTurnSearch?{wideZoneQuarterTurnSearch:quarterTurnSearch.tracker}:{}),
   sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
  });
 }
 return {...current,fixtureTargets:targets,
  ...(searchWitnesses.length?{fixtureSearch:searchWitnesses}:{}),
  fixtureRoleOwner:'MODEL',fixtureGeometryOwner:'GENERIC_HOST',
  fixtureAccess:'SOURCE_TWO_WIDE_PASS_NOT_GAME_TESTED'};
}

// Optional SOURCE-only ART trial. Inlay actual existing floor cells around a
// MODEL-selected activity, without moving rooms, equipment or changing air.
// Keep the default historical B143 output unchanged.
export function addR125ActivityFloorInlays(product){
 if(!product?.plan||!Array.isArray(product?.fixtureTargets)||
    !Array.isArray(product?.program)||!product?.compiled?.primitives)
  throw Error('R125_PLAN_ACTIVITY_INLAY_INPUT');
 const before=new Map(product.compiled.primitives.map(v=>
  [v.slice(0,3).join(','),v[3]]));
 const floorMaterial=MATERIALS.indexOf(product.plan.materials.floor);
 const accentMaterial=MATERIALS.indexOf('accent');
 if(floorMaterial<0||accentMaterial<0)
  throw Error('R125_PLAN_ACTIVITY_INLAY_MATERIAL');
 const priority={oven:10,workbench:9,washbasin:8,electronics:7,
  display:6,counter:5,desk:4,seating:3,storage:2,bed:1};
 const patches=[],expected=new Set();
 for(const level of product.program)for(const zone of level.zones){
  const targets=product.fixtureTargets.filter(t=>t.zoneId===zone.id)
   .sort((a,b)=>(priority[b.kind]??0)-(priority[a.kind]??0));
  for(const target of targets){
   const x0=zone.range.x[0],x1=zone.range.x[1],
    z0=zone.range.z[0],z1=zone.range.z[1];
   const w=Math.min(x1-x0+1,target.size[0]+2);
   const d=Math.min(z1-z0+1,target.size[2]+2);
   const x=Math.max(x0,Math.min(target.origin[0]-1,x1-w+1));
   const z=Math.max(z0,Math.min(target.origin[2]-1,z1-d+1));
   const y=level.standingFloorY-1;
   if(w<3||d<2)continue;
   const cells=[];
   for(let xx=x;xx<x+w;xx++)for(let zz=z;zz<z+d;zz++)
    cells.push(xx+','+y+','+zz);
   // No gaps, doors or stairs may be silently filled in. Inlaid SOURCE
   // support uses only existing cells of the original floor material.
   if(cells.some(k=>before.get(k)!==floorMaterial||expected.has(k)))
    continue;
   patches.push({zoneId:zone.id,kind:target.kind,origin:[x,y,z],
    size:[w,1,d],cells});
   for(const k of cells)expected.add(k);
   break;
  }
 }
 if(!patches.length)throw Error('R125_PLAN_ACTIVITY_INLAY_NO_SUPPORTED_FLOOR');
 // An 'add' overwrites the MATERIAL of a supported, already-occupied
 // B143 cell. The prior cut was redundant and consumed half the budget.
 // Select by existing model-authored functional importance; report skips.
 const available=Math.max(0,160-product.design.elements.length);
 if(available===0)throw Error('R125_PLAN_ACTIVITY_INLAY_ELEMENT_BUDGET');
 const selected=patches.map((p,i)=>({...p,order:i}))
  .sort((a,b)=>(priority[b.kind]??0)-(priority[a.kind]??0)||
   a.order-b.order)
  .slice(0,available).sort((a,b)=>a.order-b.order);
 const chosenCells=new Set(selected.flatMap(p=>p.cells));
 const extra=selected.map((p,i)=>({
  id:'host-art-inlay-fill-'+i,shape:'box',mode:'add',
  material:'accent',origin:p.origin,size:p.size
 }));
 const design={...product.design,elements:[...product.design.elements,...extra]};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.worldContacts!==0||
    compiled.BuildPlan?.operations?.length!==0)
  throw Error('R125_PLAN_ACTIVITY_INLAY_COMPILER');
 const after=new Map(compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 if(after.size!==before.size||[...before].some(([k,m])=>
   after.get(k)!==(chosenCells.has(k)?accentMaterial:m)))
  throw Error('R125_PLAN_ACTIVITY_INLAY_NONFLOOR_DRIFT');
 return {...product,design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  activityInlayReview:{
   status:selected.length===patches.length?
    'SOURCE_FLOOR_MATERIAL_ONLY_ART_HOLD':
    'SOURCE_FLOOR_MATERIAL_PARTIAL_ELEMENT_BUDGET_ART_HOLD',
   roomCount:selected.length,eligibleRooms:patches.length,
   skippedRooms:patches.length-selected.length,
   remainingB143Elements:160-design.elements.length,
   changedCells:chosenCells.size,
   rooms:selected.map(({zoneId,kind,origin,size})=>({zoneId,kind,origin,size})),
   originalAuthoredPlanUnchanged:true,occupancyUnchanged:true,
   fixtureLocationsUnchanged:true,minecraftWalking:'NOT_TESTED',
   modelCalls:0,worldWrites:0}};
}

// Opt-in generic equipment silhouettes in REAL, frozen B143 voxels.
// Retain the authored room, roles, station positions and element budget.
// Shapes remain in the same 3-high station envelope; no world operations.
export function restyleR125FixtureForms(product,{auditCirculation}={}){
 if(!Array.isArray(product?.fixtureTargets)||!product.fixtureTargets.length||
    typeof auditCirculation!=='function')throw Error('R125_FIXTURE_FORM_INPUT');
 const shape={
  oven:{hood:[0,2,1,3,1,1]},
  display:{glass:[1,1,0,1,1,1]},
  storage:{'bottom-shelf':[0,1,0,3,1,1]},
  seating:{back:[0,1,1,3,2,1]},
  workbench:{'leg-b':[2,0,0,1,3,1]},
  electronics:{'rack-controller':[2,2,0,1,1,1]},
  desk:{'desk-display':[0,2,0,2,1,1]},
  washbasin:{'basin-tap':[1,2,0,1,1,1]},
  bed:{pillow:[1,2,2,2,1,1]}
 };
 const edits=new Map(),eligible=[];
 for(const t of product.fixtureTargets){
  let count=0;
  for(const [suffix,[dx,dy,dz,sx,sy,sz]] of Object.entries(shape[t.kind]??{})){
   const id=t.id+'-'+suffix;
   const e=product.design.elements.find(e=>e.id===id);
   if(!e||e.mode!=='add'||e.repeat)continue;
   const [x,y,z]=t.origin,turned=t.orientation==='quarter-turn';
   const origin=turned?[x+dz,y+dy,z+3-(dx+sx)]:[x+dx,y+dy,z+dz];
   const size=turned?[sz,sy,sx]:[sx,sy,sz];
   edits.set(id,{origin,size});count++;
  }
  if(count)eligible.push({id:t.id,kind:t.kind});
 }
 if(!edits.size)throw Error('R125_FIXTURE_FORM_NO_ELIGIBLE_EQUIPMENT');
 const design={...product.design,
  elements:product.design.elements.map(e=>edits.has(e.id)?
   {...e,...edits.get(e.id)}:e)};
 const compiled=compileDesign(design);
 if(design.elements.length!==product.design.elements.length||
    !verifyCompiled(design,compiled)||compiled.worldContacts!==0||
    compiled.BuildPlan?.operations?.length!==0)
  throw Error('R125_FIXTURE_FORM_COMPILER_HOLD');
 const oldCells=new Map(product.compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const newCells=new Map(compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
 const different=new Set();
 for(const [key,m] of oldCells)if(newCells.get(key)!==m)different.add(key);
 for(const [key,m] of newCells)if(oldCells.get(key)!==m)different.add(key);
 if(!different.size)throw Error('R125_FIXTURE_FORM_NOT_PHYSICALLY_DIFFERENT');
 // Forbid ANY voxel drift outside pre-existing authored station envelopes.
 for(const key of different){
  const [x,y,z]=key.split(',').map(Number);
  if(!product.fixtureTargets.some(t=>x>=t.origin[0]&&
    x<t.origin[0]+t.size[0]&&y>=t.origin[1]&&y<t.origin[1]+t.size[1]&&
    z>=t.origin[2]&&z<t.origin[2]+t.size[2]))
   throw Error('R125_FIXTURE_FORM_OUTSIDE_EXISTING_EQUIPMENT');
 }
 const candidate={...product,design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(candidate,
  {featureTargets:product.fixtureTargets});
 const movement=auditCirculation(candidate);
 const daylight=auditR125FixtureDaylightView(compiled,product.daylightTargets??[]);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.featureAccess.some(x=>!x.reachableFromEntrance)||
    movement.status!=='SOURCE_CLEARANCE_PROBES_PASS'||
    daylight.status==='DAYLIGHT_VIEW_HOLD')
  throw Error('R125_FIXTURE_FORM_ROUTE_HOLD');
 const floorYs=product.program.map(x=>x.standingFloorY);
 const oldTopology=auditInteriorTopology(product).elevationConnectivity;
 const newTopology=auditInteriorTopology(candidate).elevationConnectivity;
 if(floorYs.some(y=>oldTopology.find(x=>x.standingY===y)?.componentCount!==
    newTopology.find(x=>x.standingY===y)?.componentCount))
  throw Error('R125_FIXTURE_FORM_FLOOR_TOPOLOGY_HOLD');
 return {...candidate,fixtureFormReview:{
  status:'SOURCE_EQUIPMENT_SILHOUETTES_ART_HOLD',
  profile:'readable-v1',modifiedParts:edits.size,
  changedCells:different.size,modelChosenStationCount:product.fixtureTargets.length,
  modifiedStations:eligible,modelOriginalUnchanged:true,
  fixtureRolesAndPositionsUnchanged:true,elementCountUnchanged:true,
  realMinecraftEquipmentOperation:'NOT_TESTED',humanArt:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0}};
}
