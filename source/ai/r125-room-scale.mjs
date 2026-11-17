/**
 * Opt-in room-scale B143 geometry for existing MODEL-selected equipment.
 * No added role, no change to authored plan, no model/world calls.
 * Model-owned "fixtureScale:expanded" fails closed if no safe fit exists.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditInteriorTopology} from './b198c-spatial-critic.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {auditR125FixtureDaylightView} from './r125-room-fixtures.mjs';
import {auditR125PairedBayApproach} from './r125-room-daylight.mjs';
const ROLES={
 counter:['accent','wood'],workbench:['wood','metal'],
 display:['stone','stone'],storage:['wood','wood'],
 seating:['wood','wood'],desk:['wood','wood'],
 washbasin:['stone','concrete'],electronics:['wood','metal']
};
const cell=(x,y,z)=>x+','+y+','+z;
const fail=reason=>{throw Error('R125_PLAN_ROOM_SCALE_'+reason);};
export function expandR125RoomScale(product,{auditCirculation,includeHostStudy=false}={}){
 if(!Array.isArray(product?.fixtureTargets)||!Array.isArray(product?.program)||
    typeof auditCirculation!=='function'||product.worldWrites!==0||
    product.gates?.length!==9||product.gates.some(x=>x!=='BLOCKED'))
  fail('INPUT_OR_WORLD_GATES');
 const authoredRooms=new Set(product.plan.levels.flatMap(l=>
  l.spaces.filter(s=>s.fixtureScale==='expanded').map(s=>s.id)));
 if(!authoredRooms.size&&!includeHostStudy)return product;
 const elevations=new Set(product.program.map(l=>l.standingFloorY));
 let current=product;
 const changes=[],skipped=[];
 for(const station of product.fixtureTargets){
  const authored=authoredRooms.has(station.zoneId);
  if(!authored&&!includeHostStudy)continue;
  const materials=ROLES[station.kind];
  if(!materials){
   if(authored)fail('UNSUPPORTED_AUTHORED_ROLE_'+station.kind);
   skipped.push({id:station.id,reason:'UNSUPPORTED_ROLE'});continue;
  }
  const level=current.program.find(l=>l.standingFloorY===station.origin[1]&&
   l.zones.some(z=>z.id===station.zoneId));
  const zone=level?.zones.find(z=>z.id===station.zoneId);
  if(!zone)fail('ZONE_MISMATCH');
  const oriented=station.orientation==='quarter-turn';
  const long=oriented?2:0,short=oriented?0:2;
  const base=station.origin,baseSize=station.size;
  const occupied=new Map(current.compiled.primitives.map(v=>
   [cell(v[0],v[1],v[2]),v[3]]));
  const before=auditInteriorTopology({
   design:current.design,compiled:current.compiled
  }).elevationConnectivity;
  let accepted=null;
  for(const len of [4,3,2]){
   if(accepted)break;
   for(const dir of [1,-1]){
    if(accepted)break;
    for(const shift of [0,-1]){
     if(current.design.elements.length+3>160)break;
     const origin=[...base],size=[baseSize[0],1,baseSize[2]];
     size[long]=len;size[short]=Math.max(baseSize[short],2);
     origin[long]=dir===1?base[long]+baseSize[long]:base[long]-len;
     origin[short]+=shift;
     const [x,y,z]=origin,[w,,d]=size;
     if(x<zone.range.x[0]||x+w-1>zone.range.x[1]||
        z<zone.range.z[0]||z+d-1>zone.range.z[1])continue;
     let free=true;
     for(let xx=x;xx<x+w;xx++)for(let zz=z;zz<z+d;zz++)
      if(!occupied.has(cell(xx,y-1,zz))||
         occupied.has(cell(xx,y,zz))||
         occupied.has(cell(xx,y+1,zz)))free=false;
     if(!free)continue;
     const far=dir===1?origin[long]+size[long]-1:origin[long];
     const post=[...origin],postSize=[w,1,d];
     post[long]=far;postSize[long]=1;
     const id='host-scale-'+station.id;
     const parts=[
      {id:id+'-surface',shape:'box',mode:'add',material:materials[0],
       origin:[x,y+1,z],size:[w,1,d]},
      {id:id+'-support',shape:'box',mode:'add',material:materials[1],
       origin:post,size:postSize}
     ];
     if(['display','storage','electronics'].includes(station.kind)){
      for(let xx=post[0];xx<post[0]+postSize[0];xx++)
       for(let zz=post[2];zz<post[2]+postSize[2];zz++)
        if(occupied.has(cell(xx,y+2,zz)))free=false;
      if(!free)continue;
      parts.push({id:id+'-upright',shape:'box',mode:'add',
       material:station.kind==='storage'?'metal':'glass',
       origin:[post[0],y+2,post[2]],size:postSize});
     }
     const design={...current.design,
      elements:[...current.design.elements,...parts]};
     let compiled;
     try{compiled=compileDesign(design);}catch{continue;}
     if(!verifyCompiled(design,compiled)||compiled.worldContacts!==0||
        compiled.BuildPlan?.operations?.length!==0)continue;
     const trial={...current,design,compiled,
      sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
     const routes=auditR125SourceRoutes(trial,{featureTargets:product.fixtureTargets});
     if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
        routes.featureAccess.some(t=>!t.reachableFromEntrance)||
        auditCirculation(trial).status!=='SOURCE_CLEARANCE_PROBES_PASS'||
        auditR125FixtureDaylightView(compiled,product.daylightTargets??[])
         .status==='DAYLIGHT_VIEW_HOLD')continue;
     if(product.daylightTargets?.some(t=>t.kind==='paired-bays')&&
        auditR125PairedBayApproach(trial,product.daylightTargets)
         .status!=='PAIRED_BAY_APPROACH_PASS')continue;
     const after=auditInteriorTopology({design,compiled}).elevationConnectivity;
     if([...elevations].some(y=>
       before.find(r=>r.standingY===y)?.componentCount!==
       after.find(r=>r.standingY===y)?.componentCount))continue;
     const changed=compiled.primitives.filter(v=>
      occupied.get(cell(v[0],v[1],v[2]))!==v[3]).length;
     if(!changed)continue;
     accepted={trial,change:{stationId:station.id,zoneId:station.zoneId,
      kind:station.kind,scaleOwner:authored?'MODEL':'HOST_REVIEW',
      origin,size,changedVoxels:changed}};
     break;
    }
   }
  }
  if(!accepted){
   if(authored)fail('AUTHORED_NO_SAFE_FIT_'+station.zoneId);
   skipped.push({id:station.id,reason:'NO_SOURCE_SAFE_EXTENSION'});continue;
  }
  current=accepted.trial;changes.push(accepted.change);
 }
 if(includeHostStudy&&!changes.length)fail('NO_SAFE_EXTENSION');
 if(current.worldWrites!==0||current.gates.some(x=>x!=='BLOCKED')||
    current.compiled.BuildPlan?.operations?.length!==0)fail('WORLD_GUARDS_CHANGED');
 return {...current,roomScaleReview:{
  schema:'r125-room-scale-source-art-review-v1',
  status:'SOURCE_CONNECTED_STATION_EXTENSION_ART_HOLD',
  modelSelectedRolesUnchanged:true,originalPlanUnchanged:true,
  stationCount:product.fixtureTargets.length,hostStudy:includeHostStudy,
  changes,skipped,modelCalls:0,worldWrites:0,
  minecraftWalking:'NOT_TESTED',humanArt:'NOT_REVIEWED'}};
}
