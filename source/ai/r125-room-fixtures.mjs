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
  l.spaces.flatMap((s,zi)=>s.fixtures?
   s.fixtures.map((kind,index)=>({
    level:li,zoneIndex:zi,zoneId:s.id,kind,index,multi:true})):
   s.fixture===undefined?[]:
   [{level:li,zoneIndex:zi,zoneId:s.id,kind:s.fixture,multi:false}]));
 if(!intents.length)return product; // historical B143 hashes identical
 if(typeof auditCirculation!=='function')throw Error('R125_PLAN_FIXTURE_AUDITOR_REQUIRED');
 let current=product;
 const targets=[];
 for(const intent of intents){
  const floor=current.program[intent.level];
  const range=floor.zones[intent.zoneIndex].range,y=floor.standingFloorY;
  const depth=intent.kind==='seating'||intent.kind==='washbasin'||
   intent.kind==='electronics'?2:intent.kind==='bed'?4:1;
  // Historical single "fixture" geometry stays byte-identical.
  const corners=[
   [range.x[0],range.z[1]-depth+1],
   [range.x[1]-2,range.z[1]-depth+1],
   [range.x[0],range.z[0]],
   [range.x[1]-2,range.z[0]]
  ];
  // Optional multi-role interiors try both wall lines and mid-wall
  // positions, not an ever-growing fixed genre-specific room template.
  const mx=Math.floor((range.x[0]+range.x[1]-2)/2);
  const mz=Math.floor((range.z[0]+range.z[1]-depth+1)/2);
  const candidates=intent.multi?
   [...corners,[mx,range.z[0]],[mx,range.z[1]-depth+1],
    [range.x[0],mz],[range.x[1]-2,mz],[mx,mz]]:
   corners;
  if(intent.multi&&intent.index%2===1)candidates.reverse();
  const occupied=new Set(current.compiled.primitives.map(c=>
   c[0]+','+c[1]+','+c[2]));
  const has=(x,yy,z)=>occupied.has(x+','+yy+','+z);
  let placed=false;
  for(const [x,z] of candidates){
   if(x<range.x[0]||x+2>range.x[1]||
      z<range.z[0]||z+depth-1>range.z[1])continue;
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
    // Real open shelf bays, not a solid three-block-thick fake cupboard.
    storage:()=>[add('left-upright',0,0,0,1,3,1,'wood'),
     add('right-upright',2,0,0,1,3,1,'wood'),
     add('bottom-shelf',0,0,0,3,1,1,'metal'),
     add('top-shelf',0,2,0,3,1,1,'metal')],
    seating:()=>[add('seat',0,0,0,3,1,1,'wood'),
     add('back',0,1,1,3,1,1,'wood')],
    // Clearly modeled bed, not one generic seat standing for a bedroom.
    bed:()=>[add('bedframe',0,0,0,3,1,4,'wood'),
     add('mattress',0,1,0,3,1,3,'concrete'),
     add('headboard',0,1,3,3,2,1,'wood'),
     add('pillow',1,2,2,1,1,1,'stone')],
    desk:()=>[add('desk-leg-a',0,0,0,1,1,1,'wood'),
     add('desk-leg-b',2,0,0,1,1,1,'wood'),
     add('desk-top',0,1,0,3,1,1,'wood'),
     add('desk-display',1,2,0,1,1,1,'glass')],
    // Visual proxy only, not functional water/plumbing in Minecraft.
    washbasin:()=>[add('basin-back',0,0,1,3,1,1,'stone'),
     add('basin-side-a',0,1,0,1,1,2,'concrete'),
     add('basin-side-b',2,1,0,1,1,2,'concrete'),
     add('basin-rear-rim',1,1,1,1,1,1,'concrete'),
     add('basin-tap',1,2,1,1,1,1,'metal')],
    // Two-wide electronics bench with a physically visible instrument
    // screen; no claim of working redstone/electronic functionality.
    electronics:()=>[add('rack-leg-a',0,0,0,1,1,1,'metal'),
     add('rack-leg-b',2,0,0,1,1,1,'metal'),
     add('rack-desk',0,1,0,3,1,2,'wood'),
     add('rack-screen',0,2,1,2,1,1,'glass'),
     add('rack-controller',2,2,1,1,1,1,'metal')]
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
    origin:[x,y,z],size:[3,3,depth],kind:intent.kind};
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
