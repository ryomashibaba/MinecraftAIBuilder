/**
 * AUTHOR-selected, genre-neutral architectural equipment in real B143 voxels.
 * The untouched original model plan owns each room and role. The generic HOST
 * owns positions, SOURCE clearance, and deterministic, limited search.
 * No model, network, world IO, game physics or silent role replacement.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {packR125AdjacentBoxes} from './r125-spatial-detail.mjs';

const BUDGET=540; // Dual-axis fallback search only; legacy success path unchanged.
const failPosition=diagnosis=>{
 const error=Error('R125_PLAN_FIXTURE_NO_REACHABLE_POSITION');
 error.fixturePlacement=diagnosis;throw error;
};
const intentKey=i=>i.level+':'+i.zoneIndex;
const roleDepth=kind=>kind==='bed'?4:
 ['seating','washbasin','electronics','oven'].includes(kind)?2:1;

const fixtureIntents=p=>p.plan.levels.flatMap((l,li)=>
 l.spaces.flatMap((s,zi)=>s.fixtures?
  s.fixtures.map((kind,index)=>({
   level:li,zoneIndex:zi,zoneId:s.id,kind,index,multi:true,
   ...(s.fixtureDetail?{detail:s.fixtureDetail}:{})})):
  s.fixture===undefined?[]:
  [{level:li,zoneIndex:zi,zoneId:s.id,kind:s.fixture,multi:false,
   ...(s.fixtureDetail?{detail:s.fixtureDetail}:{})}]));

function positions(intent,product,turned=false,exhaustive=false){
 const range=product.program[intent.level].zones[intent.zoneIndex].range;
 const width=turned?roleDepth(intent.kind):3;
 const depth=turned?3:roleDepth(intent.kind);
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
   add('hearth-glow',1,1,1,1,1,1,'glow')]
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
   oven:()=>[add('heat-control',2,2,0,1,1,1,'accent')]
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
  return {...part,origin:[x+dz,y+dy,z+3-(dx+sx)],
   size:[sz,sy,sx]};
 });
 return {key,parts:rotated};
}
function tryOrigin(product,targets,intent,x,z,auditCirculation,turned=false){
 const floor=product.program[intent.level];
 const range=floor.zones[intent.zoneIndex].range,y=floor.standingFloorY;
 const width=turned?roleDepth(intent.kind):3;
 const depth=turned?3:roleDepth(intent.kind);
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
 const target={id:key,zoneId:intent.zoneId,
  origin:[x,y,z],size:[width,3,depth],kind:intent.kind,
  ...(intent.detail?{detail:intent.detail}:{}),
  ...(turned?{orientation:'quarter-turn'}:{})};
 const routes=auditR125SourceRoutes(trial,{featureTargets:[...targets,target]});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.featureAccess.some(f=>!f.reachableFromEntrance))
  return rejected('SOURCE_SERVICE_ACCESS_HOLD',
   {routeIssues:routes.issues.slice(0,12),
    blockedServiceFeatures:routes.featureAccess.filter(f=>
     !f.reachableFromEntrance).map(f=>f.id)});
 const circulation=auditCirculation(trial);
 if(circulation.status!=='SOURCE_CLEARANCE_PROBES_PASS')
  return rejected('SOURCE_CIRCULATION_HOLD',
   {circulationFailures:(circulation.failures??[]).slice(0,12)});
 return {ok:true,product:trial,target};
}
function repairZone(start,previousTargets,zoneIntents,auditCirculation){
 // Up to three model-authored utilities per zone. Only their HOST positions
 // are variable. No author plan/role edit, false service pass or model call.
 const tracker={attempted:true,mode:'BOUNDED_ZONE_LOCAL_BACKTRACK',
  maxCandidateEvaluations:BUDGET,candidateEvaluations:0,
  rotatedCandidateEvaluations:0,searchLimitReached:false,
  arrangementFound:false,
  affectedZone:zoneIntents[0].zoneId,
  roleOrder:zoneIntents.map(x=>x.kind)};
 const dfs=(index,product,placed)=>{
  if(index===zoneIntents.length)
   return {product,targets:placed};
  const intent=zoneIntents[index];
  const zone=product.program[intent.level].zones[intent.zoneIndex].range;
  const width=zone.x[1]-zone.x[0]+1;
  // In a narrow room, rotate shallow desks and shelving toward the wall
  // before spending the entire search budget on 3-wide path blockers.
  const variants=width<=4?
   (roleDepth(intent.kind)===1?[true,false]:[false,true]):
   [false]; // Preserve the proven existing search order in wider rooms.
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
     intent,x,z,auditCirculation,turned);
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
   const probe=tryOrigin(current,targets,intent,x,z,auditCirculation);
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
  let fallback=null;
  {
   const start=zoneStarts.get(zkey);
   const roles=intent.multi?intents.filter(i=>intentKey(i)===zkey&&
    i.multi&&i.index<=intent.index):[intent];
   fallback=repairZone(start.product,start.targets,roles,auditCirculation);
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
    footprint:[3,depth]},
   previouslyPlaced:targets.map(t=>({
    id:t.id,zoneId:t.zoneId,kind:t.kind,origin:t.origin,size:t.size,
    ...(t.orientation?{orientation:t.orientation}:{})})),
   candidateCount:candidates.length,
   rejectedCandidates:rejected,
   ...(fallback?{zoneLocalSearch:fallback.tracker}:{}),
   sourceOnly:true,originalPlanEdited:false,modelCalls:0,worldWrites:0
  });
 }
 return {...current,fixtureTargets:targets,
  ...(searchWitnesses.length?{fixtureSearch:searchWitnesses}:{}),
  fixtureRoleOwner:'MODEL',fixtureGeometryOwner:'GENERIC_HOST',
  fixtureAccess:'SOURCE_TWO_WIDE_PASS_NOT_GAME_TESTED'};
}
