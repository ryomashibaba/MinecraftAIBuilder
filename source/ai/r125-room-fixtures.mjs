/**
 * R125 optional, AUTHOR-selected room utility. This is one category-neutral
 * voxel HOST. No keyword-to-genre mapping, silent role replacement, world IO,
 * LLM call or revision of the model-authored ArchitecturePlan.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const requirePosition=()=>{throw Error('R125_PLAN_FIXTURE_NO_REACHABLE_POSITION');};

export function addAuthoredRoomFixtures(product,{auditCirculation}={}){
 const intents=product.plan.levels.flatMap((l,li)=>
  l.spaces.flatMap((s,zi)=>s.fixture===undefined?[]:
   [{level:li,zoneIndex:zi,zoneId:s.id,kind:s.fixture}]));
 if(!intents.length)return product; // historical B143 hashes identical
 if(typeof auditCirculation!=='function')throw Error('R125_PLAN_FIXTURE_AUDITOR_REQUIRED');
 let current=product;
 const targets=[];
 for(const intent of intents){
  const floor=current.program[intent.level];
  const range=floor.zones[intent.zoneIndex].range,y=floor.standingFloorY;
  const depth=intent.kind==='seating'?2:1;
  const candidates=[
   [range.x[0],range.z[1]-depth+1],
   [range.x[1]-2,range.z[1]-depth+1],
   [range.x[0],range.z[0]],
   [range.x[1]-2,range.z[0]]
  ];
  const occupied=new Set(current.compiled.primitives.map(c=>
   c[0]+','+c[1]+','+c[2]));
  const has=(x,yy,z)=>occupied.has(x+','+yy+','+z);
  let placed=false;
  for(const [x,z] of candidates){
   if(x<range.x[0]||x+2>range.x[1]||
      z<range.z[0]||z+depth-1>range.z[1])continue;
   const key='fx-l'+intent.level+'-z'+intent.zoneIndex;
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
    storage:()=>[add('posts',0,0,0,3,3,1,'wood')],
    seating:()=>[add('seat',0,0,0,3,1,1,'wood'),
     add('back',0,1,1,3,1,1,'wood')]
   };
   const shapes=families[intent.kind]?.();
   if(!shapes)throw Error('R125_PLAN_FIXTURE_UNKNOWN_ROLE');
   let blocked=false;
   for(let a=x;a<x+3;a++)for(let c=z;c<z+depth;c++)
    if(!has(a,y-1,c))blocked=true;
   for(const part of shapes){
    const [ax,ay,az]=part.origin,[sx,sy,sz]=part.size;
    for(let a=ax;a<ax+sx;a++)for(let yy=ay;yy<ay+sy;yy++)
     for(let c=az;c<az+sz;c++)if(has(a,yy,c))blocked=true;
   }
   if(blocked)continue;
   const design={...current.design,
    elements:[...current.design.elements,...shapes]};
   const compiled=compileDesign(design);
   if(!verifyCompiled(design,compiled))
    throw Error('R125_PLAN_FIXTURE_SOURCE_MISMATCH');
   const trial={...current,design,compiled,
    sourceSha256:compiled.sourceSha256,
    geometrySha256:compiled.geometrySha256};
   const target={id:key,zoneId:intent.zoneId,
    origin:[x,y,z],size:[3,3,depth]};
   const routes=auditR125SourceRoutes(trial,{featureTargets:[...targets,target]});
   if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      routes.featureAccess.some(f=>!f.reachableFromEntrance))continue;
   if(auditCirculation(trial).status!=='SOURCE_CLEARANCE_PROBES_PASS')continue;
   targets.push(target);current=trial;placed=true;break;
  }
  if(!placed)requirePosition();
 }
 return {...current,fixtureTargets:targets,
  fixtureRoleOwner:'MODEL',fixtureGeometryOwner:'GENERIC_HOST',
  fixtureAccess:'SOURCE_TWO_WIDE_PASS_NOT_GAME_TESTED'};
}
