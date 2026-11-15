/**
 * AUTHOR-selected, genre-neutral architectural equipment in real B143 voxels.
 * The untouched original model plan owns each room and role. The generic HOST
 * owns positions, SOURCE clearance, and deterministic, limited search.
 * No model, network, world IO, game physics or silent role replacement.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

const BUDGET=360;
const failPosition=diagnosis=>{
 const error=Error('R125_PLAN_FIXTURE_NO_REACHABLE_POSITION');
 error.fixturePlacement=diagnosis;throw error;
};
const intentKey=i=>i.level+':'+i.zoneIndex;
const roleDepth=kind=>kind==='bed'?4:
 ['seating','washbasin','electronics'].includes(kind)?2:1;

const fixtureIntents=p=>p.plan.levels.flatMap((l,li)=>
 l.spaces.flatMap((s,zi)=>s.fixtures?
  s.fixtures.map((kind,index)=>({
   level:li,zoneIndex:zi,zoneId:s.id,kind,index,multi:true})):
  s.fixture===undefined?[]:
  [{level:li,zoneIndex:zi,zoneId:s.id,kind:s.fixture,multi:false}]));

function positions(intent,product){
 const range=product.program[intent.level].zones[intent.zoneIndex].range;
 const depth=roleDepth(intent.kind);
 const corners=[
  [range.x[0],range.z[1]-depth+1],
  [range.x[1]-2,range.z[1]-depth+1],
  [range.x[0],range.z[0]],
  [range.x[1]-2,range.z[0]]
 ];
 const mx=Math.floor((range.x[0]+range.x[1]-2)/2);
 const mz=Math.floor((range.z[0]+range.z[1]-depth+1)/2);
 const candidates=intent.multi?
  [...corners,[mx,range.z[0]],[mx,range.z[1]-depth+1],
   [range.x[0],mz],[range.x[1]-2,mz],[mx,mz]]:corners;
 if(intent.multi&&intent.index%2===1)candidates.reverse();
 if(intent.multi){
  const seen=new Set(candidates.map(([x,z])=>x+','+z));
  for(let z=range.z[0];z<=range.z[1]-depth+1;z++)
   for(let x=range.x[0];x<=range.x[1]-2;x++){
    const key=x+','+z;
    if(!seen.has(key)){seen.add(key);candidates.push([x,z]);}
   }
 }
 return {candidates,range,depth};
}
function makeParts(intent,x,y,z){
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
   add('rack-controller',2,2,1,1,1,1,'metal')]
 };
 const parts=families[intent.kind]?.();
 if(!parts)throw Error('R125_PLAN_FIXTURE_UNKNOWN_ROLE');
 return {key,parts};
}
function tryOrigin(product,targets,intent,x,z,auditCirculation){
 const floor=product.program[intent.level];
 const range=floor.zones[intent.zoneIndex].range,y=floor.standingFloorY;
 const depth=roleDepth(intent.kind);
 const rejected=(reason,evidence)=>({
  ok:false,rejection:{at:[x,y,z],reason,...(evidence?{evidence}:{})}
 });
 if(x<range.x[0]||x+2>range.x[1]||
    z<range.z[0]||z+depth-1>range.z[1])
  return rejected('OUTSIDE_AUTHORED_ZONE');
 const {key,parts}=makeParts(intent,x,y,z);
 const occupied=new Set(product.compiled.primitives.map(c=>
  c[0]+','+c[1]+','+c[2]));
 const has=(a,b,c)=>occupied.has(a+','+b+','+c);
 let unsupported=null,collision=null;
 for(let a=x;a<x+3;a++)for(let c=z;c<z+depth;c++)
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
  origin:[x,y,z],size:[3,3,depth],kind:intent.kind};
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
  searchLimitReached:false,arrangementFound:false,
  affectedZone:zoneIntents[0].zoneId,
  roleOrder:zoneIntents.map(x=>x.kind)};
 const dfs=(index,product,placed)=>{
  if(index===zoneIntents.length)
   return {product,targets:placed};
  const intent=zoneIntents[index];
  const {candidates}=positions(intent,product);
  const used=new Set();
  for(const [x,z] of candidates){
   const key=x+','+z;
   if(used.has(key))continue;
   used.add(key);
   if(tracker.candidateEvaluations>=BUDGET){
    tracker.searchLimitReached=true;return null;
   }
   tracker.candidateEvaluations++;
   const step=tryOrigin(product,[...previousTargets,...placed],
    intent,x,z,auditCirculation);
   if(!step.ok)continue;
   const result=dfs(index+1,step.product,[...placed,step.target]);
   if(result)return result;
   if(tracker.searchLimitReached)break;
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
  // Greedy placements of earlier roles can themselves block the last role.
  // Only after an actual multi-role failure, reconstruct THIS zone from the
  // checkpoint while keeping all other zones byte-for-byte unchanged.
  let fallback=null;
  if(intent.multi){
   const start=zoneStarts.get(zkey);
   const roles=intents.filter(i=>intentKey(i)===zkey&&
    i.multi&&i.index<=intent.index);
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
    id:t.id,zoneId:t.zoneId,kind:t.kind,origin:t.origin,size:t.size})),
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
