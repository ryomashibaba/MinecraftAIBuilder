/**
 * R125 V4D, opt-in SOURCE study: AUTHOR owns a staggered civic spine,
 * changing roof datum, public threshold and porous side loggia.
 * No fixed genre recipe, private model data, Minecraft coordinates or writes.
 * V1-V4C and the Education construction adapter are not imported or edited.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,MATERIALS,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const V4D_SCHEMA='minecraftaibuilder-r125-sculpted-public-spine-v4d';
const fail=s=>{throw Error('R125_V4D_'+s)};
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===fields.slice().sort().join('|');
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=100&&!/[\u0000-\u001f<>]/.test(s);
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const endX=b=>b.x+b.width-1;
const endZ=b=>b.z+b.depth-1;
const key=(x,y,z)=>x+','+y+','+z;
const rect=(a,b)=>a.x<=endX(b)&&b.x<=endX(a)&&a.z<=endZ(b)&&b.z<=endZ(a);
const element=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});

export function validateSculptedSpineV4D(plan){
 if(!exact(plan,['schema','id','title','brief','materials','bands','portals','entry','forecourt','canopy','loggia','glazing'])||
  plan.schema!==V4D_SCHEMA||!slug(plan.id)||!prose(plan.title)||!prose(plan.brief)||
  !exact(plan.materials,['floor','wall','roof','public'])||
  !['stone','concrete','wood'].includes(plan.materials.floor)||
  !['concrete','stone','metal','wood'].includes(plan.materials.wall)||
  !['metal','wood','concrete','stone'].includes(plan.materials.roof)||
  !['stone','concrete','accent'].includes(plan.materials.public))
  fail('PLAN_CONTRACT');
 const bs=plan.bands;
 if(!Array.isArray(bs)||bs.length<3||bs.length>5||
  !Array.isArray(plan.portals)||plan.portals.length!==bs.length-1)
  fail('BAND_COUNT');
 const seen=new Set(),joins=[];
 for(const [i,b] of bs.entries()){
  if(!exact(b,['id','purpose','x','z','width','depth','roofY'])||
   !slug(b.id)||seen.has(b.id)||!prose(b.purpose)||
   !int(b.x,8,88)||!int(b.z,17,95)||!int(b.width,18,40)||
   !int(b.depth,12,30)||!int(b.roofY,9,21)||
   endX(b)>122||endZ(b)>122)fail('BAND_CONTRACT');
  seen.add(b.id);
  if(!i)continue;
  const prev=bs[i-1],overlapMin=Math.max(prev.x,b.x),
   overlapMax=Math.min(endX(prev),endX(b)),span=overlapMax-overlapMin+1,
   portal=plan.portals[i-1];
  if(b.z!==endZ(prev)||span<10||!exact(portal,['from','to','offset'])||
   portal.from!==prev.id||portal.to!==b.id||
   !int(portal.offset,2,span-4))fail('SERIAL_PORTAL_CONTRACT');
  joins.push({x:overlapMin+portal.offset,z:b.z,from:prev.id,to:b.id});
 }
 if(Math.max(...bs.slice(1).map((b,i)=>Math.abs(b.x-bs[i].x)))<5||
  Math.max(...bs.slice(1).map((b,i)=>Math.abs(b.roofY-bs[i].roofY)))<4||
  new Set(bs.map(b=>b.roofY)).size<3)
  fail('NO_MAJOR_SILHOUETTE_DIFFERENCE');
 // Every other non-neighbor footprint must remain disconnected rather than
 // silently intersect a previously authored public/program space.
 for(let i=0;i<bs.length;i++)for(let j=i+2;j<bs.length;j++)
  if(rect(bs[i],bs[j]))fail('NONLOCAL_MASS_OVERLAP');
 const root=bs[0],e=plan.entry,q=plan.forecourt,c=plan.canopy;
 if(!exact(e,['bandId','offset'])||e.bandId!==root.id||
  !int(e.offset,3,root.width-5))fail('ENTRY_CONTRACT');
 const entryX=root.x+e.offset;
 if(!exact(q,['x','width','depth','purpose'])||!prose(q.purpose)||
  !int(q.x,1,106)||!int(q.width,18,32)||!int(q.depth,8,16)||
  root.z-q.depth<1||q.x>entryX||q.x+q.width-1<entryX+1)
  fail('FORECOURT_CONTRACT');
 const plaza={x:q.x,z:root.z-q.depth,width:q.width,depth:q.depth};
 if(bs.some(b=>rect(plaza,b)))fail('PLAZA_MASS_COLLISION');
 if(!exact(c,['x','z','width','depth','roofY'])||
  !int(c.x,2,108)||!int(c.z,2,106)||
  !int(c.width,14,28)||!int(c.depth,6,12)||!int(c.roofY,7,root.roofY-2)||
  c.z+c.depth-1!==root.z||c.x<q.x||c.x+c.width-1>endX(plaza)||
  c.z<plaza.z||c.z>root.z-5||c.x>entryX-2||
  c.x+c.width-1<entryX+3)
  fail('CANOPY_CONTRACT');
 if(bs.slice(1).some(b=>rect({x:c.x,z:c.z,width:c.width,depth:c.depth},b)))
  fail('CANOPY_MASS_COLLISION');
 const l=plan.loggia,b=bs.find(v=>v.id===l?.bandId);
 if(!exact(l,['bandId','side','apronWidth','purpose','bays'])||
  !b||!['west','east'].includes(l.side)||!prose(l.purpose)||
  !int(l.apronWidth,4,8)||!Array.isArray(l.bays)||
  l.bays.length<2||l.bays.length>4)
  fail('LOGGIA_CONTRACT');
 const apronX=l.side==='west'?b.x-l.apronWidth:endX(b)+1;
 if(apronX<1||apronX+l.apronWidth>125)fail('APRON_BOUNDS');
 const apron={x:apronX,z:b.z+1,width:l.apronWidth,depth:b.depth-2};
 if(bs.some(v=>v.id!==b.id&&rect(v,apron))||rect(apron,plaza))
  fail('APRON_MASS_COLLISION');
 let lastEnd=-2;
 for(const bay of l.bays){
  if(!exact(bay,['offsetZ','width'])||
   !int(bay.offsetZ,2,b.depth-5)||!int(bay.width,3,6)||
   bay.offsetZ+bay.width>b.depth-2||
   bay.offsetZ-lastEnd<2)fail('LOGGIA_BAY_CONTRACT');
  lastEnd=bay.offsetZ+bay.width-1;
 }
 const g=plan.glazing,gb=bs.find(v=>v.id===g?.bandId);
 if(!exact(g,['bandId','side','offsetZ','length','sillY','height'])||
  !gb||!['west','east'].includes(g.side)||
  !int(g.offsetZ,2,gb.depth-6)||!int(g.length,6,gb.depth-2-g.offsetZ)||
  !int(g.sillY,7,13)||!int(g.height,2,5)||
  g.sillY+g.height>gb.roofY-1||
  (g.bandId===l.bandId&&g.side===l.side))
  fail('GLAZING_CONTRACT');
 return {bs,joins,entryX,plaza,canopy:c,loggia:l,apron,loggiaBand:b,glazing:g,glazingBand:gb};
}

export function compileSculptedSpineV4D(input){
 const plan=structuredClone(input),v=validateSculptedSpineV4D(plan),m=plan.materials,
  el=[];
 for(const [i,b] of v.bs.entries()){
  el.push(
   element('band'+i+'-floor','add',[b.x,1,b.z],[b.width,1,b.depth],m.floor),
   element('band'+i+'-west','add',[b.x,2,b.z],[1,b.roofY-2,b.depth],m.wall),
   element('band'+i+'-east','add',[endX(b),2,b.z],[1,b.roofY-2,b.depth],m.wall),
   element('band'+i+'-north','add',[b.x+1,2,b.z],[b.width-2,b.roofY-2,1],m.wall),
   element('band'+i+'-south','add',[b.x+1,2,endZ(b)],[b.width-2,b.roofY-2,1],m.wall),
   element('band'+i+'-roof','add',[b.x,b.roofY,b.z],[b.width,1,b.depth],m.roof)
  );
 }
 for(const [i,p] of v.joins.entries())
  el.push(element('spine-portal-'+i,'cut',[p.x,2,p.z],[2,3,1]));
 el.push(element('exterior-entrance','cut',
  [v.entryX,2,v.bs[0].z],[2,3,1]));
 el.push(element('public-forecourt','add',
  [v.plaza.x,1,v.plaza.z],[v.plaza.width,1,v.plaza.depth],m.public));
 el.push(element('public-loggia-apron','add',
  [v.apron.x,1,v.apron.z],[v.apron.width,1,v.apron.depth],m.public));
 for(const [i,bay] of v.loggia.bays.entries()){
  const edge=v.loggia.side==='west'?v.loggiaBand.x:endX(v.loggiaBand);
  el.push(element('loggia-bay-'+i,'cut',
   [edge,2,v.loggiaBand.z+bay.offsetZ],[1,5,bay.width]));
 }
 const c=v.canopy;
 el.push(
  element('civic-canopy','add',[c.x,c.roofY,c.z],
   [c.width,1,c.depth],m.roof),
  element('canopy-pier-west','add',[c.x,2,c.z],
   [1,c.roofY-2,1],m.wall),
  element('canopy-pier-east','add',[c.x+c.width-1,2,c.z],
   [1,c.roofY-2,1],m.wall)
 );
 const g=v.glazing,gb=v.glazingBand,gx=g.side==='west'?gb.x:endX(gb),
  gOrigin=[gx,g.sillY,gb.z+g.offsetZ],gSize=[1,g.height,g.length];
 el.push(element('clerestory-void','cut',gOrigin,gSize));
 el.push(element('clerestory-real-glass','add',gOrigin,gSize,'glass'));
 if(el.length>160)fail('ELEMENT_BUDGET');
 const width=Math.max(...v.bs.map(endX),endX(v.plaza),
  endX(v.apron),c.x+c.width-1)+3,
  depth=Math.max(...v.bs.map(endZ),v.plaza.z+v.plaza.depth-1)+3,
  height=Math.max(...v.bs.map(b=>b.roofY))+3;
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds:{width,height,depth},elements:el,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_DRIFT');
 const occupied=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const has=(x,y,z)=>occupied.has(key(x,y,z));
 const walk=(x,z)=>has(x,1,z)&&has(x+1,1,z)&&
  [2,3].every(y=>!has(x,y,z)&&!has(x+1,y,z));
 for(let z=v.plaza.z;z<=v.bs[0].z+1;z++)
  if(!walk(v.entryX,z))fail('PUBLIC_THRESHOLD_BLOCKED');
 for(const portal of v.joins)
  for(let z=portal.z-1;z<=portal.z+1;z++)
   if(!walk(portal.x,z))fail('SPINE_PORTAL_BLOCKED');
 let apronPads=0;
 for(let z=v.apron.z;z<=endZ(v.apron);z++)
  for(let x=v.apron.x;x<endX(v.apron);x++){
   if(!walk(x,z))fail('PUBLIC_LOGGIA_APRON_BLOCKED');
   apronPads++;
  }
 for(const bay of v.loggia.bays){
  const sideX=v.loggia.side==='west'?v.loggiaBand.x:endX(v.loggiaBand);
  for(let z=v.loggiaBand.z+bay.offsetZ;
   z<v.loggiaBand.z+bay.offsetZ+bay.width;z++)
   for(let y=2;y<=6;y++)
    if(has(sideX,y,z))fail('LOGGIA_BAY_BLOCKED');
 }
 let glazingCount=0;
 for(let z=gOrigin[2];z<gOrigin[2]+gSize[2];z++)
  for(let y=gOrigin[1];y<gOrigin[1]+gSize[1];y++){
   if(occupied.get(key(gOrigin[0],y,z))!==MATERIALS.indexOf('glass'))
    fail('NOT_REAL_GLAZING');
   glazingCount++;
  }
 const program=[{level:0,standingFloorY:2,zones:[
  ...v.bs.map(b=>({id:b.id,purpose:b.purpose,
   range:{x:[b.x+1,endX(b)-1],z:[b.z+1,endZ(b)-1]}})),
  {id:'public-loggia',purpose:v.loggia.purpose,
   range:{x:[v.apron.x,endX(v.apron)],z:[v.apron.z,endZ(v.apron)]}}
 ]}];
 const evidence={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(evidence);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==v.bs.length+1||
  routes.zones.some(zone=>!zone.reachedFromEntrance))
  fail('TWO_WIDE_SOURCE_ROUTES_HOLD');
 return {schema:'r125-v4d-authored-sculpted-spine-source-study-v1',
  authorIR:plan,originalPlanSha256:digest(plan),
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  design,compiled,program,sourceRoutes:routes,
  sourceProof:{bandCount:v.bs.length,roofDatums:v.bs.map(b=>b.roofY),
   xOffsets:v.bs.map(b=>b.x),
   authoredPortals:v.joins.map(p=>[p.from,p.to,p.x,p.z]),
   openLoggiaBays:v.loggia.bays.length,
   twoWideReachableApronPads:apronPads,
   actualGlassVoxels:glazingCount,
   underCanopyPassage:true,exteriorTerrain:'NOT_TESTED'},
  provenance:'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN',
  authorIsRealModel:'NOT_ATTESTED',
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0};
}
