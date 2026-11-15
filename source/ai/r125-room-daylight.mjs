/** Generic model-selected true glazed openings with daylight to room air.
 * Not a genre template, automatic model repair, or Minecraft execution.
 */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const key=(x,y,z)=>x+','+y+','+z;
const fail=why=>{throw Error('R125_PLAN_DAYLIGHT_'+why)};
export function addAuthoredRoomDaylight(product,{auditCirculation}={}){
 const asks=product.plan.levels.flatMap((level,li)=>
  level.spaces.flatMap((s,zi)=>s.daylight===undefined?[]:
   [{li,zi,id:s.id,kind:s.daylight}]));
 if(asks.length===0)return product;
 if(typeof auditCirculation!=='function')fail('AUDITOR_REQUIRED');
 let current=product;
 const chosen=[];
 for(const ask of asks){
  const zone=current.program[ask.li].zones[ask.zi].range;
  const floorY=current.program[ask.li].standingFloorY;
  const wide=ask.kind==='wide-bay',width=wide?4:5,height=wide?2:1;
  const wy=floorY+(wide?1:2);
  const p=current.plan,e=p.expression,w=p.footprint.width,d=p.footprint.depth;
  const right=w-2-(ask.li===1&&e?.setbackSide==='east'?e.setbackDepth:0);
  const rear=d-2-(ask.li===1&&e?.setbackSide==='rear'?e.setbackDepth:0);
  const edges=[
   {face:'front',axis:'z',wall:1,inside:1,valid:zone.z[0]===2,lo:zone.x[0],hi:zone.x[1]},
   {face:'rear',axis:'z',wall:rear,inside:-1,valid:zone.z[1]===rear-1,lo:zone.x[0],hi:zone.x[1]},
   {face:'east',axis:'x',wall:right,inside:-1,valid:zone.x[1]===right-1,lo:zone.z[0],hi:zone.z[1]},
   {face:'west',axis:'x',wall:1,inside:1,valid:zone.x[0]===2,lo:zone.z[0],hi:zone.z[1]}
  ];
  const matrix=new Map(current.compiled.primitives.map(v=>
   [key(...v.slice(0,3)),v[3]]));
  const at=(x,y,z)=>matrix.get(key(x,y,z));
  const material=MATERIALS.indexOf(p.materials.wall);
  let created=null;
  for(const edge of edges){
   if(!edge.valid)continue;
   const starts=[];
   for(let k=edge.lo+1;k<=edge.hi-width;k++)starts.push(k);
   const mid=(edge.lo+edge.hi-width+1)/2;
   starts.sort((x,z)=>Math.abs(x-mid)-Math.abs(z-mid)||x-z);
   const locate=(i,side=0)=>edge.axis==='z'?
    [i,wy,edge.wall+side]:[edge.wall+side,wy,i];
   for(const pos of starts){
    let okay=true;
    for(let dx=0;dx<width&&okay;dx++){
     const [x,,z]=locate(pos+dx);
     const [ix,,iz]=locate(pos+dx,edge.inside);
     const [ox,,oz]=locate(pos+dx,-edge.inside);
     if(at(x,wy-1,z)!==material||
        at(x,wy+height,z)!==material){okay=false;break}
     for(let dy=0;dy<height;dy++)
      if(at(x,wy+dy,z)!==material||
         at(ix,wy+dy,iz)!==undefined||
         at(ox,wy+dy,oz)!==undefined){okay=false;break}
    }
    if(!okay)continue;
    const origin=locate(pos),size=edge.axis==='z'?
     [width,height,1]:[1,height,width];
    const tag='daylight-l'+ask.li+'-z'+ask.zi;
    const design={...current.design,elements:[
     ...current.design.elements,
     {id:tag+'-cut',shape:'box',mode:'cut',origin,size},
     {id:tag+'-glass',shape:'box',mode:'add',material:'glass',origin,size}
    ]};
    const compiled=compileDesign(design);
    if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
    const trial={...current,design,compiled,
     sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
    if(auditCirculation(trial).status!=='SOURCE_CLEARANCE_PROBES_PASS')continue;
    if(auditR125SourceRoutes(trial).status!=='SOURCE_ROUTES_REACH_ALL_ZONES')continue;
    current=trial;
    created={zoneId:ask.id,kind:ask.kind,face:edge.face,origin,size,
     outsideAirVerified:true,sillLintelVerified:true,
     MinecraftWalking:'NOT_TESTED',worldWrites:0};
    break;
   }
   if(created)break;
  }
  if(!created)fail('NO_SUPPORTED_EXTERIOR_BAY_'+ask.id);
  chosen.push(created);
 }
 return {...current,daylightTargets:chosen,
  daylightChoiceOwner:'MODEL',daylightGeometryOwner:'GENERIC_HOST'};
}
