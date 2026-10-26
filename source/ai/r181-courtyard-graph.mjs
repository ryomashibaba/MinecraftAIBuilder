/**
 * R181 independent graph of one two-room anchor mass + two single-room
 * satellites. This is a bounded THREE-VOLUME research gate, not a generic
 * building generator or model-authenticity proof. No Minecraft world access.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {SCHEMA as R134,validateR134MultiZonePlan}
 from './r134-multi-zone-plan.mjs';
import {validateR135SemanticObjects}
 from '../../scripts/r135-furnished-program.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {ASSEMBLED_SCHEMA,applyR125FeatureIntent}
 from './r125-functional-layer.mjs';

export const R181_SCHEMA='minecraftaibuilder-r181-courtyard-graph-ir-v1';
const fail=s=>{throw Error('R181_COURTYARD_GRAPH_'+s);};
const only=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const pair=(a,b)=>[a,b].sort().join('|');
const k=(x,y,z)=>x+','+y+','+z;
const canonical=o=>Array.isArray(o)?o.map(canonical):o!==null&&typeof o==='object'?
 Object.fromEntries(Object.keys(o).sort().map(k=>[k,canonical(o[k])])):o;
const sha=x=>createHash('sha256').update(
 typeof x==='string'?x:JSON.stringify(canonical(x))).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});

export const R181_MODEL_INSTRUCTIONS=[
 'Research opt-in: one JSON reply id,title,footprint,materials,layout,',
 'form,objects,relations,architecture. No construction commands.',
 'architecture.schema=minecraftaibuilder-r181-courtyard-graph-ir-v1.',
 'architecture keys exactly schema,volumes,links,entranceVolumeId.',
 'volumes: THREE unique IDs, each with id,roomIds,rect,roofY.',
 'rect uses x,z,width,depth integer B143 footprint coordinates.',
 'One west anchor volume has exactly two rooms: front and rear.',
 'Two east satellites have one room each, separated front and rear.',
 'links: two declared anchor-to-satellite edges, each {from,to,z}.',
 'relations.directAdjacencies: exactly the anchor front/rear room pair.',
 'Exterior entry faces first anchor room. Invalid geometry is HOLD.',
 'This initial bounded pilot is NOT arbitrary graph geometry.'
].join('\n');

function validate(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('RAW_REPLY_CONTRACT');
 let r;try{r=JSON.parse(raw);}catch{fail('INVALID_JSON');}
 if(!only(r,['id','title','footprint','materials','layout','form',
  'objects','relations','architecture']))fail('REPLY_FIELDS');
 const plan={schema:R134,id:r.id,title:r.title,
  brief:request?.naturalLanguageBrief,footprint:r.footprint,
  materials:r.materials,layout:r.layout,form:r.form};
 validateR134MultiZonePlan(plan);
 const {width:w,depth:d}=plan.footprint;
 if(w!==32||d!==32||plan.layout.spaces.length!==4)
  fail('BOUNDED_PILOT_32_FOUR_ROOMS');
 const semantic=validateR135SemanticObjects(r.objects,
  plan.layout.spaces.map(s=>s.id));
 const arch=r.architecture;
 if(!only(arch,['schema','volumes','links','entranceVolumeId'])||
  arch.schema!==R181_SCHEMA||
  !Array.isArray(arch.volumes)||arch.volumes.length!==3||
  !Array.isArray(arch.links)||arch.links.length!==2)
  fail('GRAPH_SCHEMA');
 const ids=plan.layout.spaces.map(s=>s.id),seen=new Set(),volumeIds=new Set();
 let main=null;
 const satellites=[];
 for(const v of arch.volumes){
  if(!only(v,['id','roomIds','rect','roofY'])||
   typeof v.id!=='string'||!/^[a-z][a-z0-9-]{2,20}$/.test(v.id)||
   volumeIds.has(v.id)||!Array.isArray(v.roomIds)||
   ![1,2].includes(v.roomIds.length)||
   !only(v.rect,['x','z','width','depth'])||
   ![v.rect.x,v.rect.z,v.rect.width,v.rect.depth,v.roofY]
    .every(Number.isSafeInteger)||
   v.roofY<8||v.roofY>13)
   fail('VOLUME_FIELDS');
  volumeIds.add(v.id);
  if(v.roomIds.some(id=>!ids.includes(id)||seen.has(id)))
   fail('ROOM_ASSIGNMENT');
  v.roomIds.forEach(id=>seen.add(id));
  const {x,z,width,depth}=v.rect;
  if(x<1||z<1||width<10||depth<10||x+width>w||z+depth>d)
   fail('VOLUME_BOUNDS');
  if(v.roomIds.length===2){
   if(main)fail('ANCHOR_COUNT');
   main=v;
  }else satellites.push(v);
 }
 if(!main||satellites.length!==2||seen.size!==4||
  arch.entranceVolumeId!==main.id||
  r.relations?.entryFacingZoneId!==main.roomIds[0]||
  !only(r.relations,['entryFacingZoneId','directAdjacencies'])||
  !Array.isArray(r.relations.directAdjacencies)||
  r.relations.directAdjacencies.length!==1||
  !Array.isArray(r.relations.directAdjacencies[0])||
  r.relations.directAdjacencies[0].length!==2||
  pair(...r.relations.directAdjacencies[0])!==pair(...main.roomIds))
  fail('MODEL_DECLARED_ADJACENCY');
 // Bounded pilot: real three-mass courtyard rather than 2 parallel wings.
 const m=main.rect;
 if(m.x!==1||m.z!==1||m.depth!==30||
  m.width<10||m.width>12)fail('ANCHOR_GEOMETRY');
 satellites.sort((a,b)=>a.rect.z-b.rect.z);
 const [front,rear]=satellites;
 if(front.rect.x<19||front.rect.x>21||
  front.rect.z<1||front.rect.z>3||
  front.rect.z+front.rect.depth-1<12||
  front.rect.z+front.rect.depth-1>14||
  rear.rect.x<18||rear.rect.x>20||
  rear.rect.z<20||rear.rect.z>22||
  rear.rect.z+rear.rect.depth-1!==30||
  front.rect.x+front.rect.width-1!==30||
  rear.rect.x+rear.rect.width-1!==30||
  front.rect.z+front.rect.depth>=rear.rect.z-3)
  fail('SATELLITE_COURT_GEOMETRY');
 if(front.rect.x-(m.x+m.width)<6||
  rear.rect.x-(m.x+m.width)<6)
  fail('GALLERY_SPAN');
 const want=new Set([front.id,rear.id]),have=new Set();
 const linkFor={};
 for(const e of arch.links){
  if(!only(e,['from','to','z'])||e.from!==main.id||
   !want.has(e.to)||have.has(e.to)||!Number.isSafeInteger(e.z))
   fail('LINK_GRAPH');
  have.add(e.to);linkFor[e.to]=e;
 }
 if(have.size!==2)fail('LINK_COVERAGE');
 const frontZ=linkFor[front.id].z,rearZ=linkFor[rear.id].z;
 if(frontZ<5||frontZ>8||rearZ<23||rearZ>26||
  frontZ+3>=front.rect.z+front.rect.depth-1||
  rearZ<=rear.rect.z||rearZ+3>=rear.rect.z+rear.rect.depth||
  rearZ-frontZ<11)
  fail('LINK_PLACEMENT');
 return {r,plan,semantic,main,front,rear,frontZ,rearZ};
}

export function parseR181CourtyardGraphReply(raw,request){
 const state=validate(raw,request);
 const {r,plan,semantic,main,front,rear,frontZ,rearZ}=state;
 const {floor,wall,roof}=plan.materials;
 const elements=[],zones=[];
 const box=(id,mode,origin,size,material)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 const bounds=plan.footprint;
 const roomInfo=new Map(plan.layout.spaces.map(s=>[s.id,s]));
 const mr=main.rect,split=16;
 for(const v of [main,front,rear]){
  const q=v.rect,{x,z,width,depth}=q,top=v.roofY;
  const xend=x+width-1,zend=z+depth-1;
  box(v.id+'-floor','add',[x,1,z],[width,1,depth],floor);
  box(v.id+'-west','add',[x,2,z],[1,top-2,depth],wall);
  box(v.id+'-east','add',[xend,2,z],[1,top-2,depth],wall);
  box(v.id+'-front','add',[x+1,2,z],[width-2,top-2,1],wall);
  box(v.id+'-rear','add',[x+1,2,zend],[width-2,top-2,1],wall);
  if(v===main){
   box(v.id+'-partition','add',[x+1,2,split],
    [width-2,top-2,1],wall);
   box(v.id+'-requested-direct-door','cut',[x+4,2,split],[2,3,1]);
  }
  box(v.id+'-roof','add',[x,top,z],[width,1,depth],roof);
  if(plan.form.roofProfile==='ridge'){
   box(v.id+'-ridge-step','add',[x+2,top+1,z],
    [width-4,1,depth],roof);
   box(v.id+'-ridge-crest','add',[x+4,top+2,z],
    [width-8,1,depth],roof);
  }else if(plan.form.roofProfile==='sawtooth'){
   for(let line=z+2;line<=zend-2;line+=6)
    box(v.id+'-saw-'+line,'add',[x,top+1,line],
     [width,1,Math.min(3,zend-line)],roof);
  }
  const roomRanges=v===main?
   [{id:v.roomIds[0],z0:z+1,z1:split-1},
    {id:v.roomIds[1],z0:split+1,z1:zend-1}]:
   [{id:v.roomIds[0],z0:z+1,z1:zend-1}];
  for(const info of roomRanges){
   const s=roomInfo.get(info.id);
   zones.push({id:info.id,purpose:s.purpose,relativeWeight:s.weight,
    range:{x:[x+1,xend-1],z:[info.z0,info.z1]},
    sourceVolumeId:v.id});
  }
  // The outer face window is independent of every gallery opening.
  box(v.id+'-window-cut','cut',[x+1,3,z],[2,2,1]);
  box(v.id+'-window-glass','add',[x+1,3,z],[2,2,1],'glass');
 }
 const mainEnd=mr.x+mr.width-1;
 const gallery=(v,z)=>{
  const span=v.rect.x-mainEnd-1,x=mainEnd+1;
  box('gallery-'+v.id+'-floor','add',[x,1,z],[span,1,4],floor);
  box('gallery-'+v.id+'-front','add',[x,2,z],[span,4,1],wall);
  box('gallery-'+v.id+'-rear','add',[x,2,z+3],[span,4,1],wall);
  box('gallery-'+v.id+'-roof','add',[x,6,z],[span,1,4],roof);
  box('gallery-'+v.id+'-main-door','cut',[mainEnd,2,z+1],[1,3,2]);
  box('gallery-'+v.id+'-pavilion-door','cut',[v.rect.x,2,z+1],[1,3,2]);
 };
 gallery(front,frontZ);gallery(rear,rearZ);
 const center=mainEnd+1+Math.floor((front.rect.x-mainEnd-2)/2);
 if(center+1>=Math.min(front.rect.x,rear.rect.x))fail('COURT_WALK_X');
 // Two-way outdoor supported court spine; real gallery wall apertures.
 box('court-walk','add',[center,1,frontZ+4],
  [2,1,rearZ-frontZ-4],floor);
 box('front-court-door','cut',[center,2,frontZ+3],[2,3,1]);
 box('rear-court-door','cut',[center,2,rearZ],[2,3,1]);
 box('exterior-entrance','cut',[mr.x+4,2,mr.z],[2,3,1]);
 const design={schema:B143,id:plan.id,title:plan.title,
  brief:plan.brief.slice(0,500),bounds:{width:32,height:16,depth:32},
  designOnly:true,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_COMPILE');
 const occupied=new Set(compiled.primitives.map(p=>k(p[0],p[1],p[2])));
 const has=(x,y,z)=>occupied.has(k(x,y,z));
 const skyZ=Math.floor((frontZ+4+rearZ-1)/2);
 for(let y=2;y<=14;y++)if(has(center,y,skyZ))
  fail('COURT_NOT_OPEN_TO_SKY');
 if(!has(center,1,skyZ))fail('COURT_NO_SUPPORT');
 const physical={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  spatialIRSchema:R181_SCHEMA,plan,design,compiled,
  program:[{level:0,splitAxis:'three-volumes-graph',
   standingFloorY:2,zones,partitionCount:1,
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'}],
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  planSha256:sha({plan,architecture:r.architecture,relations:r.relations}),
  ...safe()};
 const graph=auditR125SourceRoutes(physical);
 const courtZone={id:'r181-outdoor-court',
  range:{x:[center,center+1],z:[skyZ,skyZ]}};
 const courtyardGraph=auditR125SourceRoutes({
  ...physical,program:[{...physical.program[0],zones:[...zones,courtZone]}]});
 if(graph.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  graph.zones.length!==4||
  graph.zones.some(z=>!z.reachedFromEntrance)||
  courtyardGraph.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !courtyardGraph.zones.find(z=>z.id===courtZone.id)?.reachedFromEntrance)
  fail('ROOM_OR_COURT_UNREACHABLE');
 const featured=applyR125FeatureIntent({base:physical,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:physical.planSha256,
  objects:semantic.objects.map(o=>({...o,detail:'assembled'}))
 }});
 if(featured.placements.length!==r.objects.length||
  featured.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  featured.sourceRouteAudit.featureAccess.some(x=>!x.reachableFromEntrance)||
  featured.design.elements.length>160)
  fail('FURNITURE_OR_B143_LIMIT');
 const witness={schema:R181_SCHEMA,
  sourceModelAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  geometryAuthorship:'HOST_GEOMETRY_FROM_CALLER_R181_GRAPH',
  declaredVolumes:r.architecture.volumes,
  declaredLinks:r.architecture.links,
  volumesInPhysicalB143:3,
  modelRequestedIndoorDirectDoors:1,
  coveredLinks:2,
  outdoorCourtReachableFromEntrance:true,courtOpenToSky:true,
  courtWitness:[center,2,skyZ],
  reachedRooms:graph.zones.length,
  reachedFurniture:featured.sourceRouteAudit.featureAccess.length,
  trueVoxelCount:featured.compiled.primitives.length,
  geometricQuality:'SOURCE_QA_ONLY',aestheticStatus:'ART_HOLD',
  minecraftWalking:'NOT_TESTED',modelCalls:0,worldWrites:0};
 return {schema:'minecraftaibuilder-r181-source-review-v1',
  originalRawSha256:sha(raw),originalRawString:raw,parsedCallerInput:r,
  sourceOnly:true,modelCalls:0,designOnlySource:{
   ...featured,readiness:'NOT_PREPARED',...safe(),r181GraphEvidence:witness},
  ...safe()};
}
