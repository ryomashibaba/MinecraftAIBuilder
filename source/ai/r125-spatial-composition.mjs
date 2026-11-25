/**
 * Opt-in generic architectural composition: AI chooses functional rooms,
 * dimensions, roof heights and a relative adjacency tree. HOST computes only
 * safe exact coordinates and real B143 voxels. No typology-specific templates.
 * Minimum 6x6 allows a 4x4 usable clear interior before source route checks.\n * Every accepted original still must satisfy REAL 2-wide voxel circulation.\n * Never approves Minecraft construction.
 */
import {createHash} from 'node:crypto';
import {taperedR125RidgeHeight} from './r125-roof-profiles.mjs';
import {SCHEMA as B143,compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const SCHEMA='minecraftaibuilder-r125-spatial-composition-v1';
const fail=s=>{throw Error('R125_SPATIAL_'+s)};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const keys=(o,ks)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join(',')===ks.slice().sort().join(',');
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const prose=s=>typeof s==='string'&&s.length>=3&&s.length<=500&&!/[<>]/.test(s);
const digest=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const maxX=r=>r.x+r.width-1;
const maxZ=r=>r.z+r.depth-1;
const overlap=(a,b,axis)=>axis==='x'?
 [Math.max(a.x,b.x),Math.min(maxX(a),maxX(b))]:
 [Math.max(a.z,b.z),Math.min(maxZ(a),maxZ(b))];
const span=r=>r[1]-r[0]+1;
export function validateSpatialComposition(p){
 const hasEntry=Object.hasOwn(p??{},'entry');
 if(!keys(p,['schema','id','title','brief','materials','rooms',
  ...(hasEntry?['entry']:[])])||
  p.schema!==SCHEMA||!slug(p.id)||!prose(p.title)||!prose(p.brief)||
  (hasEntry&&(!keys(p.entry,['shelterDepth',
    ...(Object.hasOwn(p.entry??{},'portalStyle')?['portalStyle']:[])])||
   !int(p.entry.shelterDepth,1,3)||
   (p.entry.portalStyle!==undefined&&p.entry.portalStyle!=='projecting-frame')))||
  !keys(p.materials,['floor','wall','roof'])||
  !['wood','stone','concrete'].includes(p.materials.floor)||
  !['concrete','stone','wood','metal'].includes(p.materials.wall)||
  !['stone','metal','wood','concrete'].includes(p.materials.roof))
   fail('PLAN_CONTRACT');
 if(!Array.isArray(p.rooms)||p.rooms.length<2||p.rooms.length>5)
  fail('ROOM_COUNT');
 const seen=new Set();
 for(const [i,r] of p.rooms.entries()){
  const optionalDaylight=Object.hasOwn(r,'daylight')?['daylight']:[];
  const optionalSpatialUse=Object.hasOwn(r,'spatialUse')?['spatialUse']:[];
  const optionalRoofForm=Object.hasOwn(r,'roofForm')?['roofForm']:[];
  const optionalRoofAxis=Object.hasOwn(r,'roofAxis')?['roofAxis']:[];
  const optionalFacadeRelief=Object.hasOwn(r,'facadeRelief')?['facadeRelief']:[];
  if(!keys(r,i===0?['id','purpose','width','depth','roofY',...optionalDaylight,...optionalSpatialUse,...optionalRoofForm,...optionalRoofAxis,...optionalFacadeRelief]:
    ['id','purpose','width','depth','roofY','attach',...optionalDaylight,...optionalSpatialUse,...optionalRoofForm,...optionalRoofAxis,...optionalFacadeRelief])||
   !slug(r.id)||seen.has(r.id)||!prose(r.purpose)||
   !int(r.width,6,14)||!int(r.depth,6,14)||!int(r.roofY,6,10)||
   (r.daylight!==undefined&&
    !['wide-bay','clerestory','paired-bays','panorama'].includes(r.daylight))||
   (r.spatialUse!==undefined&&
    (r.spatialUse!=='open-court'||i!==0||r.daylight!==undefined))||
   (r.facadeRelief!==undefined&&
    (r.facadeRelief!=='front-piers'||r.spatialUse==='open-court'))||
   (r.roofForm===undefined&&r.roofAxis!==undefined)||
   (r.roofForm!==undefined&&
    (!['ridge','shed','gable'].includes(r.roofForm)||!['x','z'].includes(r.roofAxis)||
     r.spatialUse==='open-court')))
    fail('ROOM_CONTRACT');
  if(i>0&&(!keys(r.attach,['to','side','shift'])||
    !seen.has(r.attach.to)||
    !['east','west','north','south'].includes(r.attach.side)||
    !int(r.attach.shift,-3,3)))fail('ADJACENCY_CONTRACT');
  seen.add(r.id);
 }
 return true;
}
export function placeSpatialRooms(plan){
 validateSpatialComposition(plan);
 const rooms=[],byId=new Map(),doors=[];
 for(const [i,r] of plan.rooms.entries()){
  const p=i?byId.get(r.attach.to):null;
  let x=0,z=0;
  if(p){
   const {side,shift}=r.attach;
   if(side==='east'||side==='west'){
    x=side==='east'?maxX(p):p.x-r.width+1;
    z=p.z+Math.floor((p.depth-r.depth)/2)+shift;
   }else{
    z=side==='south'?maxZ(p):p.z-r.depth+1;
    x=p.x+Math.floor((p.width-r.width)/2)+shift;
   }
  }
  const placed={...r,x,z};
  for(const prior of rooms)
   if(span(overlap(prior,placed,'x'))>1&&
      span(overlap(prior,placed,'z'))>1)
    fail('VOLUMES_OVERLAP_'+r.id);
  if(p){
   const axis=['east','west'].includes(r.attach.side)?'z':'x';
   const common=overlap(p,placed,axis);
   const joint=overlap(p,placed,axis==='z'?'x':'z');
   if(span(common)<4||span(joint)!==1)fail('NO_TWO_WIDE_CONNECTION_'+r.id);
   doors.push({axis,wall:joint[0],along:common[0]+Math.floor((span(common)-2)/2)});
  }
  rooms.push(placed);byId.set(r.id,placed);
 }
 const root=rooms[0],entryX=root.x+Math.floor((root.width-2)/2);
 for(const other of rooms.slice(1))
  if(other.z<=root.z&&maxZ(other)>=root.z&&
     other.x<=entryX+1&&maxX(other)>=entryX)
   fail('PUBLIC_ENTRY_NOT_EXTERIOR');
 return {rooms,doors,entrance:{x:entryX,z:root.z}};
}
export function compileSpatialComposition(value){
 const plan=structuredClone(value),raw=placeSpatialRooms(plan);
 const sx=2-Math.min(...raw.rooms.map(r=>r.x));
 const shelterDepth=plan.entry?.shelterDepth??0;
 const sz=2-Math.min(...raw.rooms.map(r=>r.z))+shelterDepth;
 const rooms=raw.rooms.map(r=>({...r,x:r.x+sx,z:r.z+sz}));
 const doors=raw.doors.map(d=>({...d,
  wall:d.wall+(d.axis==='z'?sx:sz),
  along:d.along+(d.axis==='z'?sz:sx)}));
 const bounds={width:Math.max(...rooms.map(maxX))+3,
  height:Math.max(...rooms.map(r=>r.roofY+(r.roofForm==='gable'?4:2)))+1,
  depth:Math.max(...rooms.map(maxZ))+3};
 if(bounds.width>128||bounds.depth>128)fail('BOUNDS');
 const elements=[],mat=plan.materials;
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 for(const [i,r] of rooms.entries()){
  const tag='space-'+i;
  box(tag+'-floor','add',mat.floor,[r.x,1,r.z],[r.width,1,r.depth]);
  // Explicit public open court: real continuous ground and one-block
  // boundary, no ceiling. Adjacent rooms stay fully enclosed. The existing
  // 2-wide entrance and adjacency door cuts still provide usable access.
  const height=r.spatialUse==='open-court'?1:r.roofY-2;
  box(tag+'-west','add',mat.wall,[r.x,2,r.z],[1,height,r.depth]);
  box(tag+'-east','add',mat.wall,[maxX(r),2,r.z],[1,height,r.depth]);
  box(tag+'-front','add',mat.wall,[r.x+1,2,r.z],[r.width-2,height,1]);
  box(tag+'-rear','add',mat.wall,[r.x+1,2,maxZ(r)],[r.width-2,height,1]);
  if(r.spatialUse!=='open-court'){
   if(['ridge','shed','gable'].includes(r.roofForm)){
    // MODEL-authored roofs. Historic ridge elements stay unchanged.
    // Shed rises toward positive roofAxis and has a sealed high end.
    const axis=r.roofAxis,n=axis==='x'?r.width:r.depth;
    const rise=k=>r.roofForm==='shed'?
     Math.min(2,Math.floor(k*3/n)):
     r.roofForm==='gable'?taperedR125RidgeHeight(k,n,4):
      Math.min(2,Math.floor(Math.min(k,n-1-k)/2));
    for(let start=0;start<n;){
     const h=rise(start);let end=start+1;
     while(end<n&&rise(end)===h)end++;
     const run=end-start;
     if(r.roofForm==='gable'&&start>0){
      const previous=rise(start-1),high=h>previous?start:start-1;
      box(tag+'-gable-riser-'+start,'add',mat.roof,
       axis==='x'?[r.x+high,r.roofY+Math.min(h,previous),r.z]:
        [r.x,r.roofY+Math.min(h,previous),r.z+high],
       axis==='x'?[1,1,r.depth]:[r.width,1,1]);
     }
     if(r.roofForm==='shed'&&start>0){
      // A stepped roof can be face-disconnected: lower skin at height H
      // touches the next higher skin only diagonally. Seal the exact
      // model-authored step with a one-block-deep vertical riser beneath
      // the higher skin. Preserve full interior height below the roof
      // and preserve every historical ridge and flat B143 voxel.
      const previous=rise(start-1);
      if(h>previous)box(tag+'-shed-riser-'+start,'add',mat.wall,
       axis==='x'?[r.x+start,r.roofY+previous,r.z+1]:
        [r.x+1,r.roofY+previous,r.z+start],
       axis==='x'?[1,h-previous,r.depth-2]:
        [r.width-2,h-previous,1]);
     }
     box(tag+'-'+r.roofForm+'-skin-'+start,'add',mat.roof,
      axis==='x'?[r.x+start,r.roofY+h,r.z]:[r.x,r.roofY+h,r.z+start],
      axis==='x'?[run,1,r.depth]:[r.width,1,run]);
     if(h){
      const gables=axis==='x'?
       [[r.x+start,r.roofY,r.z],[r.x+start,r.roofY,maxZ(r)]]:
       [[r.x,r.roofY,r.z+start],[maxX(r),r.roofY,r.z+start]];
      gables.forEach((origin,j)=>box(tag+'-'+r.roofForm+'-gable-'+start+'-'+j,
       'add',mat.wall,origin,axis==='x'?[run,h,1]:[1,h,run]));
      if(r.roofForm==='shed'&&end===n){
       // Gables close the corners, this wall closes the high face.
       box(tag+'-shed-high-end','add',mat.wall,
        axis==='x'?[maxX(r),r.roofY,r.z+1]:
         [r.x+1,r.roofY,maxZ(r)],
        axis==='x'?[1,h,r.depth-2]:[r.width-2,h,1]);
      }
     }
     start=end;
    }
   }else box(tag+'-roof','add',mat.roof,
    [r.x,r.roofY,r.z],[r.width,1,r.depth]);
  }
 }
 // CUT last, after every volume is created, to preserve real thresholds.
 const entrance=[raw.entrance.x+sx,2,raw.entrance.z+sz];
 box('exterior-entrance','cut',null,entrance,[2,3,1]);
 if(shelterDepth){
  const frontZ=entrance[2]-shelterDepth;
  box('entry-canopy-roof','add',mat.roof,
   [entrance[0]-1,5,frontZ],[4,1,shelterDepth]);
  box('entry-canopy-support-left','add',mat.wall,
   [entrance[0]-1,2,frontZ],[1,3,1]);
  box('entry-canopy-support-right','add',mat.wall,
   [entrance[0]+2,2,frontZ],[1,3,1]);
 }
 // Model-opted portal: two real side columns and a raised lintel one block
 // ahead of the existing door. The two-wide opening stays untouched.
 if(plan.entry?.portalStyle==='projecting-frame'){
  for(const [j,x] of [entrance[0]-1,entrance[0]+2].entries())
   box('entry-portal-pier-'+j,'add',mat.roof,[x,2,entrance[2]-1],[1,4,1]);
  box('entry-portal-lintel','add',mat.roof,
   [entrance[0]-1,6,entrance[2]-1],[4,1,1]);
 }
 // Model-opted front piers visibly project from the wall. Refuse a pier
 // intersecting a different authored room; never infer a replacement facade.
 for(const [i,r] of rooms.entries()){
  if(r.facadeRelief!=='front-piers')continue;
  const outsideZ=r.z-1;
  for(const [j,x] of [r.x+1,maxX(r)-1].entries()){
   if(rooms.some(o=>o.id!==r.id&&o.x<=x&&maxX(o)>=x&&
    o.z<=outsideZ&&maxZ(o)>=outsideZ))
    fail('FACADE_FRONT_PIER_BLOCKED_'+r.id);
   box('space-'+i+'-front-pier-'+j,'add',mat.roof,
    [x,2,outsideZ],[1,r.roofY-2,1]);
  }
 }
 doors.forEach((d,i)=>box('joint-'+i,'cut',null,
  d.axis==='z'?[d.wall,2,d.along]:[d.along,2,d.wall],
  d.axis==='z'?[1,3,2]:[2,3,1]));
 // Glaze actual exposed wall segments without cutting joints or doors.
 let windows=0;
 const panoramicTargets=[];
 for(const [i,r] of rooms.entries()){
  if(r.spatialUse==='open-court')continue; // Sky is already open; no fake glazing.
  const cands=[
   {axis:'z',wall:maxZ(r),side:'rear',at:[r.x+2,3,maxZ(r)],size:[2,2,1]},
   {axis:'x',wall:maxX(r),side:'east',at:[maxX(r),3,r.z+2],size:[1,2,2]},
   {axis:'x',wall:r.x,side:'west',at:[r.x,3,r.z+2],size:[1,2,2]},
   {axis:'z',wall:r.z,side:'front',at:[r.x+2,3,r.z],size:[2,2,1]}
  ];
  // Preserve the original single 2x2 bay exactly when the author did not
  // specify daylight. Author-selected daylight changes REAL wall openings,
  // not facade paint or an after-the-fact host interpretation.
  const requested=r.daylight;
  // Author-selected public frontage, not a mandatory genre facade.
  // A 14+ block public root has room for two real 3x2 display windows,
  // one block of solid wall beside its unchanged two-wide entrance.
  // Existing unrequested daylight and narrower rooms remain untouched.
  if(i===0&&requested==='paired-bays'&&r.width>=14){
   const entryX=r.x+Math.floor((r.width-2)/2);
   cands.unshift(...[entryX-4,entryX+3].map(x=>({
    axis:'z',wall:r.z,side:'front',frontFlank:true,
    at:[x,3,r.z],size:[3,2,1]
   })));
  }
  const requiredOpenings=requested==='paired-bays'?2:1;
  let opened=0;
  for(const c of cands){
   // Keep the exact established legacy bay and model-authored paired-front
   // apertures. Only explicitly requested non-frontage windows use the
   // exposed-segment search below.
   if(i===0&&c.side==='front'&&!c.frontFlank)continue;
   let at=c.at,size=c.size;
   if(c.frontFlank){
    // Existing entrance-flanking apertures, unchanged.
    if(rooms.some(o=>o.id!==r.id&&
     o.z<=c.wall&&maxZ(o)>=c.wall&&
     o.x<=c.at[0]+c.size[0]-1&&maxX(o)>=c.at[0]))continue;
   }else if(!requested){
    // A plan without authored daylight retains its original B143 geometry.
    if(rooms.some(o=>o.id!==r.id&&
     (c.axis==='z'?o.z<=c.wall&&maxZ(o)>=c.wall&&span(overlap(r,o,'x'))>0:
      o.x<=c.wall&&maxX(o)>=c.wall&&span(overlap(r,o,'z'))>0)))continue;
   }else{
    const faceSpan=c.axis==='z'?r.width:r.depth;
    const length=requested==='panorama'?8:requested==='wide-bay'?4:
     requested==='clerestory'?Math.min(4,faceSpan-4):
     Math.min(3,faceSpan-4);
    // A model-authored wide-bay is exactly four cells wide. Narrow faces
    // must HOLD, never silently compile a three-cell substitute.
    // All requested openings also retain two solid corner blocks per side.
    if(length<3||faceSpan<length+4)continue;
    const faceStart=c.axis==='z'?r.x:r.z;
    const preferred=faceStart+Math.floor((faceSpan-length)/2);
    const outside=['rear','east'].includes(c.side)?c.wall+1:c.wall-1;
    const starts=[];
    // Search contiguous exposed wall segments, retain two corner piers, and
    // inspect the requested aperture plus one supporting jamb on each side.
    for(let first=faceStart+2;first+length<=faceStart+faceSpan-2;first++)
     starts.push(first);
    starts.sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred)||a-b);
    let chosen=null;
    for(const first of starts){
     const low=first-1,high=first+length;
     if(rooms.some(o=>o.id!==r.id&&
      (c.axis==='z'?
       (o.z<=Math.max(c.wall,outside)&&maxZ(o)>=Math.min(c.wall,outside)&&
        o.x<=high&&maxX(o)>=low):
       (o.x<=Math.max(c.wall,outside)&&maxX(o)>=Math.min(c.wall,outside)&&
        o.z<=high&&maxZ(o)>=low))))continue;
     const jointAxis=c.axis==='z'?'x':'z';
     if(doors.some(d=>d.axis===jointAxis&&d.wall===c.wall&&
      d.along<=high&&d.along+1>=low))continue;
     if(c.axis==='z'&&c.wall===entrance[2]&&
      entrance[0]<=high&&entrance[0]+1>=low)continue;
     chosen=first;break;
    }
    if(chosen===null)continue;
    const y=requested==='clerestory'?r.roofY-2:3;
    const height=requested==='clerestory'?1:2;
    at=c.axis==='z'?[chosen,y,c.wall]:[c.wall,y,chosen];
    size=c.axis==='z'?[length,height,1]:[1,height,length];
   }
   const id='glaze-'+i+(requested?'-'+opened:'');
   box(id+'-void','cut',null,at,size);
   box(id+'-glass','add','glass',at,size);
   if(requested==='panorama')panoramicTargets.push({zoneId:r.id,kind:requested,
    face:c.side,origin:at,size,outsideAirVerified:true,sillLintelVerified:true,
    MinecraftWalking:'NOT_TESTED',worldWrites:0});
   windows++;opened++;
   if(opened===requiredOpenings)break;
  }
  if(requested&&opened<requiredOpenings)fail('DAYLIGHT_OPENING_UNAVAILABLE_'+r.id);
 }
 if(windows===0)fail('NO_EXTERIOR_WINDOW');
 const design={schema:B143,id:plan.id,title:plan.title,brief:plan.brief,
  bounds,elements,designOnly:true};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
 // Panoramic windows are checked against FINAL physical voxels, including
 // the other wings and authored portal. No historical window is reinterpreted.
 if(panoramicTargets.length){
  const cells=new Map(compiled.primitives.map(v=>[v.slice(0,3).join(','),v[3]]));
  const wall=MATERIALS.indexOf(mat.wall),glass=MATERIALS.indexOf('glass');
  const at=(x,y,z)=>cells.get([x,y,z].join(','));
  for(const t of panoramicTargets){
   const [x,y,z]=t.origin,alongX=t.face==='front'||t.face==='rear';
   const [dx,dz]=t.face==='front'?[0,1]:t.face==='rear'?[0,-1]:
    t.face==='east'?[-1,0]:[1,0];
   for(let i=0;i<8;i++){
    const xx=x+(alongX?i:0),zz=z+(alongX?0:i);
    if(at(xx,y-1,zz)!==wall||at(xx,y+2,zz)!==wall)
     fail('PANORAMA_SILL_LINTEL_'+t.zoneId);
    for(let yy=y;yy<y+2;yy++)if(at(xx,yy,zz)!==glass||
      at(xx+dx,yy,zz+dz)!==undefined||at(xx-dx,yy,zz-dz)!==undefined)
     fail('PANORAMA_AIR_OR_GLASS_'+t.zoneId);
   }
  }
 }
 const program=[{level:0,standingFloorY:2,zones:rooms.map(r=>({
  id:r.id,purpose:r.purpose,
  range:{x:[r.x+1,maxX(r)-1],z:[r.z+1,maxZ(r)-1]}
 }))}];
 const result={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  planSha256:digest(plan),plan,design,compiled,program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  modelAuthorship:'CALLER_PROVIDED_PLAN_UNVERIFIED',
  geometricRules:'MODEL_PROGRAM_TREE_HOST_GENERIC_VOXEL_COMPILER',
  architecturalQuality:'NOT_REVIEWED',inGameWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')};
 const routes=auditR125SourceRoutes(result);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   routes.zones.length!==rooms.length||
   routes.zones.some(z=>!z.reachedFromEntrance))
  fail('REAL_VOXEL_CIRCULATION_HOLD');
 return {...result,sourceRoutes:routes,
  ...(panoramicTargets.length?{daylightTargets:panoramicTargets,
   daylightChoiceOwner:'MODEL',daylightGeometryOwner:'GENERIC_HOST'}:{}),layout:{
  entry:{face:'front',position:'center',shelterDepth,
   ...(plan.entry?.portalStyle?{portalStyle:plan.entry.portalStyle}:{})},
  rooms:rooms.map(r=>({id:r.id,x:r.x,z:r.z,width:r.width,depth:r.depth,roofY:r.roofY,
   ...(r.daylight?{daylight:r.daylight}:{}),
   ...(r.facadeRelief?{facadeRelief:r.facadeRelief}:{}),
   ...(r.roofForm?{roofForm:r.roofForm,roofAxis:r.roofAxis}:{}),
   ...(r.spatialUse?{spatialUse:r.spatialUse}:{})})),
  connectedDoors:doors.length,exteriorWindows:windows
 }};
}
