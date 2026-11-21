/**
 * R183 bounded room-to-courtyard NEGATIVE MASS research.
 *
 * Three real courtyard-facing voids replace the former roof and upper
 * walls with usable unroofed terraces, re-closed room facades and supported
 * two-wide spurs to the existing outdoor court. Geometry comes from
 * explicit caller IR, not typology presets or automatically repaired intent.
 *
 * Source-only. No Qwen/Gemma invocation and NO world access.
 */
import {createHash} from 'node:crypto';
import {parseR181CourtyardGraphReply,R181_SCHEMA}
 from './r181-courtyard-graph.mjs';
import {compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes}
 from './r125-source-routes.mjs';

export const R183_SCHEMA='minecraftaibuilder-r183-courtyard-negative-mass-ir-v1';
const fail=s=>{throw Error('R183_COURTYARD_VOID_'+s);};
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const intersects=(a0,a1,b0,b1)=>a0<=b1&&b0<=a1;
const entryFloor=(p,rect)=>p.origin[0]>=rect.x&&
 p.origin[0]+p.size[0]-1<=rect.x+rect.width-1&&
 p.origin[2]>=rect.z&&p.origin[2]+p.size[2]-1<=rect.z+rect.depth-1;
const range=(r)=>({x0:r.x,x1:r.x+r.width-1,z0:r.z,z1:r.z+r.depth-1});

export const R183_MODEL_INSTRUCTIONS=[
 'Research opt-in: R181 JSON reply with additional massingVoids.',
 'massingVoids exactly {schema,terraces}; terraces exactly 3 entries.',
 'schema minecraftaibuilder-r183-courtyard-negative-mass-ir-v1.',
 'Each terrace has {volumeId,roomId,rect,accessZ}.',
 'rect is {x,z,width,depth}: a physical COURTYARD-FACING notch.',
 'The host REMOVES old roof/wall voxels, closes the interior room faces,',
 'and lays two-wide courtyard-to-terrace access paths as B143 source.',
 'This bounded pilot supports the anchor rear room, north and south rooms.',
 'The caller must choose notch coordinates without furniture collision.',
 'Unsafe positions or blocked paths are rejected, never silently repaired.',
 'No external world coordinates, building execution or art certification.'
].join('\n');

function validate(raw,request){
 if(typeof raw!=='string'||raw.length<30||raw.length>26000)
  fail('RAW_REPLY_BOUNDS');
 let input;try{input=JSON.parse(raw);}catch{fail('INVALID_JSON');}
 if(!exact(input,['id','title','footprint','materials','layout','form',
  'objects','relations','architecture','massingVoids']))
  fail('TOP_LEVEL_FIELDS');
 const intent=input.massingVoids;
 if(!exact(intent,['schema','terraces'])||intent.schema!==R183_SCHEMA||
  !Array.isArray(intent.terraces)||intent.terraces.length!==3)
  fail('TERRACE_IR_FIELDS');
 if(input.architecture?.schema!==R181_SCHEMA)
  fail('R181_SOURCE_REQUIRED');
 const original=structuredClone(input);
 delete original.massingVoids;
 const before=parseR181CourtyardGraphReply(JSON.stringify(original),request);
 const old=before.designOnlySource;
 if(!verifyCompiled(old.design,old.compiled)||
  old.r181GraphEvidence?.outdoorCourtReachableFromEntrance!==true||
  old.placements?.length!==4)
  fail('UNVERIFIED_BASE');
 const volumeMap=new Map(input.architecture.volumes.map(v=>[v.id,v]));
 const anchor=input.architecture.volumes.find(v=>v.roomIds.length===2);
 const satellites=input.architecture.volumes.filter(v=>v.roomIds.length===1)
  .sort((a,b)=>a.rect.z-b.rect.z);
 if(!anchor||satellites.length!==2)fail('THREE_VOLUME_TOPOLOGY');
 const [north,south]=satellites;
 const galleryZ=new Map(input.architecture.links.map(l=>[l.to,l.z]));
 const positions=new Map();
 for(const q of intent.terraces){
  if(!exact(q,['volumeId','roomId','rect','accessZ'])||
   typeof q.volumeId!=='string'||!volumeMap.has(q.volumeId)||
   positions.has(q.volumeId)||
   !exact(q.rect,['x','z','width','depth'])||
   ![q.rect.x,q.rect.z,q.rect.width,q.rect.depth,q.accessZ]
    .every(Number.isSafeInteger))
   fail('TERRACE_FIELDS');
  const v=volumeMap.get(q.volumeId),r=v.rect,n=q.rect;
  const bx=r.x+r.width-1,bz=r.z+r.depth-1;
  const x1=n.x+n.width-1,z1=n.z+n.depth-1;
  if(n.width<3||n.width>5||n.depth<3||n.depth>7||
   n.x<r.x||n.z<r.z||x1>bx||z1>bz||
   q.accessZ<n.z||q.accessZ+1>z1)
   fail('TERRACE_GEOMETRY_BOUNDS');
  if(v===anchor){
   if(q.roomId!==v.roomIds[1]||x1!==bx||
    n.z<18||z1>23||n.x<r.x+5||n.z<=16||
    q.accessZ<18||q.accessZ+1>23)
    fail('ANCHOR_REAR_COURT_GEOMETRY');
  }else if(v===north){
   if(q.roomId!==v.roomIds[0]||n.x!==r.x||z1!==bz||
    n.z<galleryZ.get(v.id)+4||n.z<r.z+5||
    x1>=bx-3)
    fail('NORTH_REAR_COURT_GEOMETRY');
  }else if(v===south){
   if(q.roomId!==v.roomIds[0]||n.x!==r.x||n.z!==r.z||
    z1>=galleryZ.get(v.id)+1||x1>=bx-3)
    fail('SOUTH_FRONT_COURT_GEOMETRY');
  }else fail('UNSUPPORTED_TERRACE_TOPOLOGY');
  // The caller's furniture geometry MUST stay where it was planned.
  // Never hide a conflict by moving a desk or altering the room program.
  for(const p of old.placements){
   if(!entryFloor(p,{x:n.x-1,z:n.z-1,width:n.width+2,depth:n.depth+2}))
    continue;
   fail('FURNITURE_NEAR_DECLARED_VOID');
  }
  for(const p of old.placements){
   const a=p.origin,b=p.size;
   if(intersects(a[0],a[0]+b[0]-1,n.x-1,x1+1)&&
    intersects(a[2],a[2]+b[2]-1,n.z-1,z1+1))
    fail('FURNITURE_COLLISION_NO_REPAIR');
  }
  positions.set(v.id,q);
 }
 if(positions.size!==3)fail('TERRACE_COVERAGE');
 return {input,intent,old,anchor,north,south,positions};
}

export function parseR183CourtyardVoidReply(raw,request){
 const {input,intent,old,anchor,north,south,positions}=validate(raw,request);
 const out=structuredClone(old.design);
 const floor=input.materials.floor,wall=input.materials.wall;
 const add=(id,mode,origin,size,material)=>{
  out.elements.push({id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 const courtCenter=old.r181GraphEvidence.courtWitness[0];
 const geometry=[];
 for(const v of [anchor,north,south]){
  const spec=positions.get(v.id),r=spec.rect,
   {x0,x1,z0,z1}=range(r),yRoof=v.roofY;
  const id='r183-'+v.id;
  // CUT is AFTER legacy assembled furniture: a real collision is
  // prohibited above, never silently erased by subtractive geometry.
  add(id+'-remove-upper-mass','cut',[x0,2,z0],
   [r.width,14,r.depth]);
  // The original supported y=1 floor remains: a ground-level terrace,
  // not a bottomless pit or a cosmetic void.
  if(v===anchor){
   add(id+'-enclose-inner-x','add',[x0-1,2,z0],
    [1,yRoof-2,r.depth],wall);
   for(const [suffix,z] of [['front',z0-1],['rear',z1+1]])
    add(id+'-enclose-'+suffix,'add',[x0,2,z],
     [r.width,yRoof-2,1],wall);
  }else{
   add(id+'-enclose-inner-x','add',[x1+1,2,z0],
    [1,yRoof-2,r.depth],wall);
   const boundary=v===north?z0-1:z1+1;
   add(id+'-enclose-end-z','add',[x0,2,boundary],
    [r.width,yRoof-2,1],wall);
  }
  const windowX=v===anchor?x0-1:x1+1,
   // North pocket meets an ORIGINAL rear facade at z1. Its two-cell
   // recessed glass must stay entirely inside the new inner wall, not
   // replace existing original outer-wall cells beyond the declared void.
   windowZ=v===north?z0:z0+1;
  add(id+'-recessed-window-cut','cut',[windowX,3,windowZ],
   [1,2,2]);
  add(id+'-recessed-window-glass','add',[windowX,3,windowZ],
   [1,2,2],'glass');
  // At least one continuous TWO-WIDE source-only physical spur per
  // courtyard pocket. Its z is explicitly selected by the caller.
  const startX=v===anchor?v.rect.x+v.rect.width:courtCenter;
  const endX=v===anchor?courtCenter+1:v.rect.x+1;
  if(startX>endX)fail('ACCESS_SPUR_REVERSED');
  add(id+'-two-wide-court-spur','add',[startX,1,spec.accessZ],
   [endX-startX+1,1,2],floor);
  geometry.push({volumeId:v.id,roomId:spec.roomId,
   rect:structuredClone(r),accessZ:spec.accessZ,
   roofY:yRoof,window:[windowX,3,windowZ],
   groundSample:[x0+1,1,z0+1],
   clearAirSample:[x0+1,3,z0+1]});
 }
 if(out.elements.length>160)fail('B143_ELEMENT_LIMIT');
 const compiled=compileDesign(out);
 if(!verifyCompiled(out,compiled))fail('REAL_B143_COMPILE');
 const beforeCells=new Map(old.compiled.primitives.map(p=>
  [key(p[0],p[1],p[2]),p[3]]));
 const afterCells=new Map(compiled.primitives.map(p=>
  [key(p[0],p[1],p[2]),p[3]]));
 const coordinateInVoid=(x,y,z)=>y>=2&&
  geometry.some(g=>x>=g.rect.x&&x<g.rect.x+g.rect.width&&
   z>=g.rect.z&&z<g.rect.z+g.rect.depth);
 // No old voxel outside the three explicitly requested volumes may
 // disappear or change material. This includes ALL ORIGINAL FURNITURE.
 for(const [coord,material] of beforeCells){
  const [x,y,z]=coord.split(',').map(Number);
  if(!coordinateInVoid(x,y,z)&&afterCells.get(coord)!==material)
   fail('UNDECLARED_SOURCE_CELL_MODIFIED');
 }
 for(const g of geometry){
  const v=input.architecture.volumes.find(v=>v.id===g.volumeId);
  const {x,z,width,depth}=g.rect;
  // The old roof actually existed in this region, and the NEW one
  // does not. This proves a true plan-level silhouette change.
  if(!beforeCells.has(key(x+1,v.roofY,z+1))||
   afterCells.has(key(x+1,v.roofY,z+1)))
   fail('ORIGINAL_ROOF_WAS_NOT_REPLACED');
  for(let xx=x+1;xx<x+width-1;xx++)
   for(let zz=z+1;zz<z+depth-1;zz++)
    for(let yy=2;yy<=15;yy++)
     if(afterCells.has(key(xx,yy,zz)))
      fail('POCKET_NOT_OPEN_TO_SKY');
  if(!afterCells.has(key(...g.groundSample))||
   afterCells.has(key(...g.clearAirSample))||
   afterCells.get(key(...g.window))!==3)
   fail('PHYSICAL_TERRACE_OR_RECESSED_GLASS_ABSENT');
 }
 const physical={...old,schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design:out,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const route=auditR125SourceRoutes(physical,{featureTargets:old.placements});
 const court=old.r181GraphEvidence.courtWitness;
 const exteriorTargets=[
  {id:'r183-main-court',range:{x:[court[0],court[0]+1],
    z:[court[2],court[2]]}},
  ...geometry.map(g=>({id:'r183-terrace-'+g.volumeId,
   range:{x:[g.rect.x+1,g.rect.x+g.rect.width-1],
    z:[g.accessZ,g.accessZ+1]}}))
 ];
 // R125's old room ranges were rectangular. A new terrace cannot be
 // counted as proof that the remaining ENCLOSED room still works. Demand
 // separate supported interior pad witnesses far from every carved pocket.
 const indoorTargets=input.architecture.volumes.flatMap(v=>{
  const g=geometry.find(z=>z.volumeId===v.id);
  const q=g.rect,rect=v.rect;
  return v.roomIds.map(roomId=>{
   const room=old.program[0].zones.find(z=>z.id===roomId);
   const a=v===anchor?
    [rect.x+1,q.x-2]:
    [q.x+q.width+1,rect.x+rect.width-2];
   const x=a[0]<=a[1]?a:[rect.x+1,rect.x+rect.width-2];
   return {id:'r183-enclosed-'+roomId,
    range:{x,z:[...room.range.z]}};
  });
 });
 const courtyard=auditR125SourceRoutes({...physical,
  program:[{...old.program[0],zones:[
   ...old.program[0].zones,...exteriorTargets,...indoorTargets]}]});
 if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  route.zones.length!==4||route.featureAccess.length!==4||
  route.zones.some(z=>!z.reachedFromEntrance)||
  route.featureAccess.some(x=>!x.reachableFromEntrance)||
  courtyard.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  [...exteriorTargets,...indoorTargets].some(t=>
   !courtyard.zones.find(z=>z.id===t.id)?.reachedFromEntrance))
  fail('INDOOR_OR_THREE_OUTDOOR_ROUTES_BLOCKED');
 const indoorWitness=indoorTargets.map(t=>({
  id:t.id,pad:courtyard.zones.find(z=>z.id===t.id)?.sourceWitness
 }));
 const result={...old,design:out,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:route,
  r183VoidEvidence:{
   schema:R183_SCHEMA,authorship:'CALLER_PROVIDED_UNVERIFIED',
   geometryAuthorship:'HOST_B143_FROM_EXPLICIT_NEGATIVE_MASS_IR',
   originalSourceSha256:old.sourceSha256,
   requestedOutdoorPocketCount:3,
   actualRoofVoidsAndReclosedWallsVerified:true,
   usableOutdoorTerracesSourceReached:3,
   unchangedExistingFurnitureFour:true,
   indoorWitness,outdoorRouteWitnesses:exteriorTargets.map(t=>
    courtyard.zones.find(z=>z.id===t.id)?.sourceWitness),
   terraceGeometry:geometry,
   realSourceGeometryChanged:compiled.geometrySha256!==old.geometrySha256,
   localModelInvocations:0,aestheticStatus:'ART_HOLD',
   minecraftWalking:'NOT_TESTED',worldWrites:0},
  ...safe()};
 if(!result.r183VoidEvidence.realSourceGeometryChanged)
  fail('NO_TRUE_MASSING_CHANGE');
 return {schema:'minecraftaibuilder-r183-source-only-void-study-v1',
  originalRawString:raw,originalRawSha256:sha(raw),
  modelAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  parsedCallerInput:input,designOnlySource:result,
  sourceOnly:true,modelCalls:0,...safe()};
}
