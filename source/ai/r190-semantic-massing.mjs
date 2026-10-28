/**
 * R190 semantic-space -> B143 source experiment. No typology dispatch, no
 * inherited R189 coordinates, no Minecraft command or world contact.
 * Input describes functional spaces, a rooted placement tree and optional
 * additional MODEL-AUTHORED direct links between non-parent rooms.
 * The bounded placer solves local coordinates rather than selecting a
 * named building silhouette. Unplaceable requirements fail closed.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';

export const R190_SCHEMA='minecraftaibuilder-r190-semantic-space-v1';
const fail=x=>{throw Error('R190_SEMANTIC_'+x);};
const ok=(p,x)=>{if(!p)fail(x);};
const exact=(v,ks)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(v);
const safeText=(v,n)=>typeof v==='string'&&v.length>=3&&v.length<=n&&
 !/[\u0000-\u001f<>]/.test(v);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=(x,y,z)=>[x,y,z].join(',');
const DIR=['north','south','east','west'];
const entranceFace=p=>p.entranceFace??'south';
function entranceApproach(r,face){
 const x=r.x+Math.floor((r.w-2)/2),z=r.z+Math.floor((r.d-2)/2);
 return face==='south'?{x,z:r.z-3,w:2,d:3}:
  face==='north'?{x,z:r.z+r.d,w:2,d:3}:
  face==='west'?{x:r.x-3,z,w:3,d:2}:
  {x:r.x+r.w,z,w:3,d:2};
}
function entranceDoor(r,face){
 const x=r.x+Math.floor((r.w-2)/2),z=r.z+Math.floor((r.d-2)/2);
 return face==='south'?{origin:[x,2,r.z],size:[2,3,1]}:
  face==='north'?{origin:[x,2,r.z+r.d-1],size:[2,3,1]}:
  face==='west'?{origin:[r.x,2,z],size:[1,3,2]}:
  {origin:[r.x+r.w-1,2,z],size:[1,3,2]};
}
function approachSeed(r,face){
 const a=entranceApproach(r,face);
 return ['south','north'].includes(face)?[a.x,a.z+1]:[a.x+1,a.z];
}
// Geometry alternatives preserve model-supplied room sizes and relations.
export const R190_LAYOUT_STRATEGIES=Object.freeze([
 'centered','negative-tangent','positive-tangent'
]);
const SHIFT_ORDERS=Object.freeze({
 centered:[0,-2,2,-4,4,-6,6,-8,8,-10,10,-12,12],
 'negative-tangent':[-8,-6,-10,-4,-12,-2,0,2,4,6,8,10,12],
 'positive-tangent':[8,6,10,4,12,2,0,-2,-4,-6,-8,-10,-12]
});
const palette=['wood','stone','concrete','metal'];

// Model-authored roof section, never chosen by a host typology lookup.
// These relative voxel elevations are a deterministic geometric realization
// of an explicitly selected profile, axis, rise, and (if needed) tooth width.
export function r190RoofElevation(index,span,form){
 ok(int(index,0,span-1)&&int(span,7,22),'ROOF_SPAN');
 if(form.profile==='shed')return Math.floor(index*form.rise/(span-1));
 if(form.profile==='ridge'){
  const center=Math.floor((span-1)/2);
  return Math.floor(Math.min(index,span-1-index)*form.rise/center);
 }
 if(form.profile==='sawtooth')
  return Math.floor((index%form.toothWidth)*form.rise/(form.toothWidth-1));
 fail('ROOF_PROFILE');
}


export function validateR190SemanticPlan(p){
 const standard=['schema','id','title','brief','site','entrySpaceId','spaces','materials'];
 ok(Object.keys(p??{}).length>=standard.length&&
  Object.keys(p??{}).every(k=>[...standard,'entranceFace','formIntent','roofFormIntent','skyCourtIntent','crossConnections','glazedOpenings'].includes(k))&&
  standard.every(k=>Object.hasOwn(p,k)),'FIELDS');
 ok(p.schema===R190_SCHEMA&&slug(p.id)&&safeText(p.title,100)&&
  safeText(p.brief,400),'IDENTITY');
 ok(exact(p.site,['width','depth','height'])&&
  int(p.site.width,24,80)&&int(p.site.depth,24,80)&&
  int(p.site.height,10,32)&&
  p.site.width*p.site.depth*p.site.height<=500000,'SITE');
 ok(exact(p.materials,['floor','wall','roof'])&&
  palette.includes(p.materials.floor)&&palette.includes(p.materials.wall)&&
  palette.includes(p.materials.roof),'MATERIALS');
 ok(Array.isArray(p.spaces)&&p.spaces.length>=2&&p.spaces.length<=6&&
  slug(p.entrySpaceId),'PROGRAM');
 const ids=new Set(),parents=new Map();
 const fields=['id','purpose','width','depth','height','parentId','side','privacy'];
 for(const s of p.spaces){
  ok(Object.keys(s??{}).every(k=>[...fields,'spatialRole','tangentShift'].includes(k))&&
   fields.every(k=>Object.hasOwn(s??{},k))&&
   (s.id!==p.entrySpaceId||s.tangentShift===undefined)&&
   (s.tangentShift===undefined||int(s.tangentShift,-24,24))&&
   (s.spatialRole===undefined||['enclosed','open-court'].includes(s.spatialRole))&&
   slug(s.id)&&!ids.has(s.id)&&safeText(s.purpose,150)&&
   int(s.width,7,22)&&int(s.depth,7,22)&&
   int(s.height,7,p.site.height-2)&&
   ['public','shared','private'].includes(s.privacy),'SPACE');
  ids.add(s.id);
  ok(s.id===p.entrySpaceId?
   (s.parentId===null&&s.side===null):
   (slug(s.parentId)&&DIR.includes(s.side)),'RELATION');
  parents.set(s.id,s.parentId);
 }
 ok(ids.has(p.entrySpaceId),'MISSING_ENTRANCE_SPACE');
 ok(p.entranceFace===undefined||DIR.includes(p.entranceFace),'ENTRANCE_FACE');
 // Optional model/caller instruction to construct ONE real occupied wing
 // with a faceted footprint. Never infer a form from a building-type name.
 if(p.formIntent!==undefined){
  const f=p.formIntent;
  ok(exact(f,['spaceId','face','cornerInset'])&&
   slug(f.spaceId)&&['north','south','east','west'].includes(f.face)&&
   int(f.cornerInset,2,3),'FORM_INTENT');
  const chosen=p.spaces.find(s=>s.id===f.spaceId);
  ok(chosen&&chosen.spatialRole!=='open-court','FORM_SPACE');
  const ns=['north','south'].includes(f.face);
  ok((ns?chosen.width:chosen.depth)>=2*f.cornerInset+6&&
   (ns?chosen.depth:chosen.width)>=f.cornerInset+5,
   'FACET_CANNOT_FIT');
 }
 // R190-K: opt-in, model-authored cross-section of ONE enclosed wing.
 // It changes the weather envelope and usable height, not a roof applique.
 if(p.roofFormIntent!==undefined){
  const f=p.roofFormIntent;
  const standardRoof=['spaceId','profile','axis','rise'];
  ok((exact(f,standardRoof)||exact(f,[...standardRoof,'toothWidth']))&&
   slug(f.spaceId)&&['ridge','shed','sawtooth'].includes(f.profile)&&
   ['x','z'].includes(f.axis)&&int(f.rise,2,5)&&
   (f.profile==='sawtooth'?
    int(f.toothWidth,3,8):f.toothWidth===undefined),
   'ROOF_FORM');
  const space=p.spaces.find(s=>s.id===f.spaceId);
  ok(space&&space.spatialRole!=='open-court'&&
   p.formIntent?.spaceId!==space.id,'ROOF_SPACE');
  const span=f.axis==='x'?space.width:space.depth;
  ok(space.height+f.rise<p.site.height&&
   (f.profile!=='sawtooth'||span>=2*f.toothWidth),
   'ROOF_SECTION_CANNOT_FIT');
 }
 // R190-AN: one architect-selected interior, open-sky courtyard.
 // It is a void in the roof generated natively, not a box later CUT.
 // Neither a courtyard type nor its location is invented by the host.
 if(p.skyCourtIntent!==undefined){
  const v=p.skyCourtIntent;
  ok((exact(v,['spaceId','offsetX','offsetZ','width','depth'])||
   exact(v,['spaceId','offsetX','offsetZ','width','depth','openFace']))&&
   (v.openFace===undefined||DIR.includes(v.openFace))&&
   slug(v.spaceId)&&int(v.width,4,14)&&int(v.depth,4,14)&&
   Number.isSafeInteger(v.offsetX)&&Number.isSafeInteger(v.offsetZ),
   'SKY_COURT_FIELDS');
  const room=p.spaces.find(s=>s.id===v.spaceId);
  ok(room&&room.spatialRole!=='open-court'&&
   p.formIntent?.spaceId!==room.id&&
   p.roofFormIntent?.spaceId!==room.id,'SKY_COURT_CONFLICT');
  if(v.openFace===undefined){
   ok(v.offsetX>=2&&v.offsetZ>=2&&
    v.offsetX+v.width<=room.width-2&&
    v.offsetZ+v.depth<=room.depth-2,'SKY_COURT_EXTENTS');
  }else{
   const dir=v.openFace;
   const reaches=dir==='east'?v.offsetX+v.width===room.width:
    dir==='west'?v.offsetX===0:dir==='north'?
     v.offsetZ+v.depth===room.depth:v.offsetZ===0;
   const margins=['east','west'].includes(dir)?
    v.offsetZ>=2&&v.offsetZ+v.depth<=room.depth-2&&
    (dir==='east'?v.offsetX>=2:v.offsetX+v.width<=room.width-2):
    v.offsetX>=2&&v.offsetX+v.width<=room.width-2&&
    (dir==='north'?v.offsetZ>=2:v.offsetZ+v.depth<=room.depth-2);
   ok(reaches&&margins,'SKY_COURT_MOUTH_EXTENTS');
   const opposite={north:'south',south:'north',east:'west',west:'east'};
   ok(!(room.id===p.entrySpaceId&&dir===entranceFace(p))&&
    !(room.parentId!==null&&room.side===opposite[dir])&&
    !p.spaces.some(c=>c.parentId===room.id&&c.side===dir),
    'SKY_COURT_MOUTH_PORTAL_CONFLICT');
   ok(!(p.glazedOpenings??[]).some(g=>g.spaceId===room.id&&g.face===dir),
    'SKY_COURT_MOUTH_GLAZING_CONFLICT');
  }
 }
 // Phase-C evidence permits one real open-air spatial void, not a faux CUT.
 const courts=p.spaces.filter(s=>s.spatialRole==='open-court');
 ok(courts.length<=1&&p.spaces.length-courts.length>=2,'COURT_BUDGET');
 for(const s of p.spaces){
  if(s.id===p.entrySpaceId)continue;
  ok(ids.has(s.parentId)&&s.parentId!==s.id,'PARENT_MISSING');
  // Only the model-selected entry facade is reserved for the approach.
  ok(!(s.parentId===p.entrySpaceId&&s.side===entranceFace(p)),'ENTRY_COLLISION');
  const seen=new Set([s.id]);let at=s.parentId;
  while(at!==null){ok(!seen.has(at),'CYCLE');seen.add(at);at=parents.get(at);}
  ok(seen.has(p.entrySpaceId),'DISCONNECTED');
 }
 // R190-L: explicit non-tree room links are part of the MODEL'S floor plan.
 // They are not generated from typology/keywords or retrospectively guessed.
 if(p.crossConnections!==undefined){
  ok(Array.isArray(p.crossConnections)&&p.crossConnections.length>=1&&
   p.crossConnections.length<=4,'CROSS_CONNECTIONS');
  const seen=new Set();
  for(const pair of p.crossConnections){
   ok(Array.isArray(pair)&&pair.length===2&&
    pair.every(id=>typeof id==='string'&&ids.has(id))&&
    pair[0]!==pair[1],'CROSS_CONNECTION_PAIR');
   const [a,b]=pair,key=[...pair].sort().join('|');
   ok(!seen.has(key),'CROSS_CONNECTION_DUPLICATE');
   seen.add(key);
   ok(parents.get(a)!==b&&parents.get(b)!==a,
    'CROSS_CONNECTION_IS_TREE_EDGE');
  }
 }
 // R190-P opt-in, entirely authored glazing locations; no typology templates.
 if(p.glazedOpenings!==undefined){
  ok(Array.isArray(p.glazedOpenings)&&p.glazedOpenings.length>=1&&
   p.glazedOpenings.length<=8,'GLAZING_COUNT');
  const seen=new Set();
  for(const g of p.glazedOpenings){
   ok(exact(g,['spaceId','face','offset','baseY','width','height'])&&
    slug(g.spaceId)&&DIR.includes(g.face)&&
    int(g.width,2,6)&&int(g.height,2,4)&&
    Number.isSafeInteger(g.offset)&&Number.isSafeInteger(g.baseY),
    'GLAZING_FIELDS');
   const r=p.spaces.find(s=>s.id===g.spaceId);
   ok(r&&r.spatialRole!=='open-court'&&p.formIntent?.spaceId!==r.id,
    'GLAZING_ROOM_UNSUPPORTED');
   const span=['north','south'].includes(g.face)?r.width:r.depth;
   ok(g.offset>=2&&g.offset+g.width<=span-2&&
    g.baseY>=5&&g.baseY+g.height<=r.height-1,
    'GLAZING_OUT_OF_WALL');
   // A south-facing window on the entry room can legally be above the
   // centered front door, but must not depend on the three-block-high
   // doorway's removed top cell for its physical bottom sill.
   // Reject the conflict BEFORE source voxel operations and auditing;
   // do not move the model-selected glazing or silently repair its intent.
   if(g.spaceId===p.entrySpaceId&&g.face===entranceFace(p)&&g.baseY===5){
    const faceSpan=['north','south'].includes(g.face)?r.width:r.depth;
    const doorOffset=Math.floor((faceSpan-2)/2);
    ok(g.offset+g.width<=doorOffset||g.offset>=doorOffset+2,
     'GLAZING_ENTRY_DOOR_CONFLICT');
   }
   const key=[g.spaceId,g.face,g.offset,g.baseY,g.width,g.height].join(':');
   ok(!seen.has(key),'GLAZING_DUPLICATE');seen.add(key);
  }
 }
 return true;
}
const overlap=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])+1;
const intersects=(a,b)=>overlap([a.x,a.x+a.w-1],[b.x,b.x+b.w-1])>0&&
 overlap([a.z,a.z+a.d-1],[b.z,b.z+b.d-1])>0;
const near=(parent,child,side,shift)=>{
 const xBase=parent.x+Math.floor((parent.w-child.width)/2);
 const zBase=parent.z+Math.floor((parent.d-child.depth)/2);
 const xy={north:{x:xBase+shift,z:parent.z+parent.d-1},
  south:{x:xBase+shift,z:parent.z-child.depth+1},
  east:{x:parent.x+parent.w-1,z:zBase+shift},
  west:{x:parent.x-child.width+1,z:zBase+shift}}[side];
 return {...xy,w:child.width,d:child.depth,h:child.height,id:child.id,
  parentId:child.parentId,side};
};
function sharedPortal(a,b,side){
 if(side==='east'||side==='west'){
  const lo=Math.max(a.z,b.z)+1,hi=Math.min(a.z+a.d-1,b.z+b.d-1)-1;
  if(hi-lo+1<2)return null;
  return {x:side==='east'?a.x+a.w-1:a.x,z:Math.floor((lo+hi-1)/2),axis:'x'};
 }
 const lo=Math.max(a.x,b.x)+1,hi=Math.min(a.x+a.w-1,b.x+b.w-1)-1;
 if(hi-lo+1<2)return null;
 return {x:Math.floor((lo+hi-1)/2),z:side==='north'?a.z+a.d-1:a.z,axis:'z'};
}
// A direct room link requires one TRUE shared wall plane, a two-wide opening
// with corner clearance, and no physical overlap beyond that wall. The
// caller's parent/child placement tree does not imply extra model link edges.
export function r190SharedCrossPortal(a,b){
 const ox=overlap([a.x,a.x+a.w-1],[b.x,b.x+b.w-1]);
 const oz=overlap([a.z,a.z+a.d-1],[b.z,b.z+b.d-1]);
 let portal=null;
 if(ox===1&&oz>=4){
  if(a.x+a.w-1===b.x)portal=sharedPortal(a,b,'east');
  else if(b.x+b.w-1===a.x)portal=sharedPortal(a,b,'west');
 }else if(oz===1&&ox>=4){
  if(a.z+a.d-1===b.z)portal=sharedPortal(a,b,'north');
  else if(b.z+b.d-1===a.z)portal=sharedPortal(a,b,'south');
 }
 return portal?{...portal,a:a.id,b:b.id,kind:'cross'}:null;
}
export function layoutR190SemanticPlan(p,{strategy='centered',layoutVariantIndex=0}={}){
 validateR190SemanticPlan(p);
 ok(R190_LAYOUT_STRATEGIES.includes(strategy),'LAYOUT_STRATEGY');
 // Zero is the original deterministic first layout. Nonzero variants are
 // bounded read-only research alternatives, never adopted as model choices.
 ok(int(layoutVariantIndex,0,3),'LAYOUT_VARIANT_INDEX');
 const source=structuredClone(p),byId=new Map(source.spaces.map(s=>[s.id,s]));
 const root=byId.get(p.entrySpaceId),face=entranceFace(p);
 const approach=entranceApproach({x:0,z:0,w:root.width,d:root.depth},face);
 // Solve room relationships in relative coordinates first; placing the
 // entrance at the site center is a preference, NOT a hard design constraint.
 const placements=new Map([[root.id,{id:root.id,parentId:null,side:null,
  x:0,z:0,w:root.width,d:root.depth,h:root.height}]]);
 const footprintBounds=(candidate)=>{
  const rooms=[...placements.values(),...(candidate?[candidate]:[])];
  return {minX:Math.min(approach.x,...rooms.map(s=>s.x)),
   maxX:Math.max(approach.x+approach.w,...rooms.map(s=>s.x+s.w)),
   minZ:Math.min(approach.z,...rooms.map(s=>s.z)),
   maxZ:Math.max(approach.z+approach.d,...rooms.map(s=>s.z+s.d))};
 };
 const fitsSite=b=>b.maxX-b.minX<=p.site.width-2&&
  b.maxZ-b.minZ<=p.site.depth-1;
 const extra=source.crossConnections??[];
 const edgeKeys=new Set(extra.map(p=>[...p].sort().join('|')));
 const isCross=(a,b)=>edgeKeys.has([a,b].sort().join('|'));
 const portals=[],pending=new Set(source.spaces.filter(s=>s.id!==root.id).map(s=>s.id));
 // Stable bounded search; positions depend on relations and requirements,
 // not building-type names or a fixed prior building grid.
 let completedLayouts=0,variantCandidateAttempts=0;
 function solve(){
  if(!pending.size)return completedLayouts++===layoutVariantIndex;
  const choices=[...pending].map(id=>byId.get(id))
   .filter(s=>placements.has(s.parentId)).sort((a,b)=>
    a.parentId.localeCompare(b.parentId)||a.id.localeCompare(b.id));
  for(const s of choices){
   const parent=placements.get(s.parentId);
   // An authored wing position is binding. No silent substitute shift.
   for(const shift of (s.tangentShift===undefined?
    SHIFT_ORDERS[strategy]:[s.tangentShift])){
    // A non-first candidate must not turn pathological layouts into an
    // unbounded search. The historical first-layout behavior is unchanged.
    if(layoutVariantIndex>0&&++variantCandidateAttempts>20000)
     fail('LAYOUT_VARIANT_BUDGET');
    const candidate=near(parent,s,s.side,shift);
    // Preserve the model-chosen exterior approach even if a remote child
    // swings around the front of the root.
    if(intersects(candidate,approach))continue;
    if(!fitsSite(footprintBounds(candidate)))continue;
    const portal=sharedPortal(parent,candidate,s.side);
    if(!portal)continue;
    // A non-tree pair may physically share ONE actual wall only when the
    // model demanded that extra link. Otherwise preserve the old no-overlap
    // rule. Fail this candidate if any already-placed required link cannot
    // receive a real two-wide seam portal.
    if([...placements.values()].some(existing=>existing.id!==parent.id&&
      (isCross(existing.id,candidate.id)?
       !r190SharedCrossPortal(existing,candidate):
       intersects(existing,candidate))))continue;
    const common=overlap([parent.x,parent.x+parent.w-1],
      [candidate.x,candidate.x+candidate.w-1])*
      overlap([parent.z,parent.z+parent.d-1],
      [candidate.z,candidate.z+candidate.d-1]);
    if(common<3||common>Math.max(parent.w,parent.d,candidate.w,candidate.d))continue;
    placements.set(s.id,candidate);portals.push({...portal,a:parent.id,b:s.id});
    pending.delete(s.id);
    if(solve())return true;
    pending.add(s.id);portals.pop();placements.delete(s.id);
   }
  }
  return false;
 }
 if(!solve())fail(layoutVariantIndex>0&&completedLayouts>0?
  'LAYOUT_VARIANT_UNAVAILABLE':'NO_FEASIBLE_SPATIAL_LAYOUT');
 const bounds=footprintBounds();
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const dx=clamp(Math.floor((p.site.width-root.width)/2),
  1-bounds.minX,p.site.width-1-bounds.maxX);
 const dz=clamp(Math.floor((p.site.depth-root.depth)/2),
  -bounds.minZ,p.site.depth-1-bounds.maxZ);
 const authorOffsets=source.spaces.filter(s=>Object.hasOwn(s,'tangentShift'))
  .map(s=>({spaceId:s.id,tangentShift:s.tangentShift}));
 const crossPortals=extra.map(([a,b])=>{
  const portal=r190SharedCrossPortal(placements.get(a),placements.get(b));
  ok(portal!==null,'NON_TREE_PORTAL_MISSING');
  return portal;
 });
 return {strategy,spaces:source.spaces.map(s=>{
   const room=placements.get(s.id);
   return {...room,x:room.x+dx,z:room.z+dz};
  }),
  portals:[...portals,...crossPortals].map(v=>({
   ...v,x:v.x+dx,z:v.z+dz
  })),
  entranceFace:face,
  sitePlacement:{mode:'rigid-translation-of-model-spaces',
   rootOffset:[dx,dz],roomDimensionsModified:false,
   roomRelationsModified:false,requiredEntranceApproachCells:3,
   occupiedRelativeBounds:bounds,
   ...(authorOffsets.length?{authorLockedTangentialOffsets:authorOffsets}:{})},
  sourcePlanSha256:hash(source)};
}
export function r190GlazingCells(room,g){
 const cells=[];
 for(let y=g.baseY;y<g.baseY+g.height;y++)
  for(let u=g.offset;u<g.offset+g.width;u++){
   const x=g.face==='west'?room.x:g.face==='east'?
    room.x+room.w-1:room.x+u;
   const z=g.face==='south'?room.z:g.face==='north'?
    room.z+room.d-1:room.z+u;
   const dx=g.face==='east'?1:g.face==='west'?-1:0;
   const dz=g.face==='north'?1:g.face==='south'?-1:0;
   cells.push({x,y,z,dx,dz});
  }
 return cells;
}
function sourceDesign(p,l){
 const elements=[];
 const roles=new Map(p.spaces.map(s=>[s.id,s.spatialRole??'enclosed']));
 const box=(id,mode,material,origin,size)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 // A deliberately bounded first polygonal envelope: its physical floor,
 // wall and roof use the SAME clipped footprint, rather than facade applique
 // on six solid rectangular panels. Portal locations remain model/layout-led.
 function facetedEnclosedSpace(s,f){
  const ns=f.face==='south'||f.face==='north';
  const span=ns?s.w:s.d,depth=ns?s.d:s.w,r=f.cornerInset;
  const cell=(u,v)=>{
   if(f.face==='south')return [s.x+u,s.z+v];
   if(f.face==='north')return [s.x+u,s.z+s.d-1-v];
   if(f.face==='west')return [s.x+v,s.z+u];
   return [s.x+s.w-1-v,s.z+u];
  };
  const shapedBox=(id,material,y,hh,u,v,su,sv)=>{
   const a=cell(u,v),b=cell(u+su-1,v+sv-1);
   box(id,'add',material,
    [Math.min(a[0],b[0]),y,Math.min(a[1],b[1])],
    [Math.abs(a[0]-b[0])+1,hh,Math.abs(a[1]-b[1])+1]);
  };
  // Each strip is a physically occupied footprint, not a CUT of a legacy box.
  for(let row=0;row<r;row++){
   const inset=r-row,available=span-2*inset;
   shapedBox(s.id+'-facet-floor-'+row,p.materials.floor,1,1,inset,row,available,1);
   shapedBox(s.id+'-facet-roof-'+row,p.materials.roof,s.h,1,inset,row,available,1);
   shapedBox(s.id+'-facet-wall-left-'+row,p.materials.wall,2,s.h-2,inset,row,1,1);
   shapedBox(s.id+'-facet-wall-right-'+row,p.materials.wall,2,s.h-2,span-inset-1,row,1,1);
  }
  shapedBox(s.id+'-facet-floor-core',p.materials.floor,1,1,0,r,span,depth-r);
  shapedBox(s.id+'-facet-roof-core',p.materials.roof,s.h,1,0,r,span,depth-r);
  shapedBox(s.id+'-facet-wall-left-core',p.materials.wall,2,s.h-2,0,r,1,depth-r);
  shapedBox(s.id+'-facet-wall-right-core',p.materials.wall,2,s.h-2,span-1,r,1,depth-r);
  shapedBox(s.id+'-facet-front-wall',p.materials.wall,2,s.h-2,r,0,span-2*r,1);
  shapedBox(s.id+'-facet-rear-wall',p.materials.wall,2,s.h-2,0,depth-1,span,1);
 }
 // The MODEL selects the roof section. The host only translates it to
 // individual, physical B143 roof strips and gable/perimeter infill.
 // Unlike a solid mass cap, the ceiling below a raised strip is actual AIR.
 function profiledRoof(s,f){
  const alongX=f.axis==='x',span=alongX?s.w:s.d;
  for(let i=0;i<span;i++){
   const raise=r190RoofElevation(i,span,f),x=s.x+(alongX?i:0),
    z=s.z+(alongX?0:i);
   box(s.id+'-roof-strip-'+i,'add',p.materials.roof,
    [x,s.h+raise,z],alongX?[1,1,s.d]:[s.w,1,1]);
   if(raise===0)continue;
   // Cap the profile at the two end facades: no triangular open holes.
   const face=alongX?[1,raise,1]:[1,raise,1];
   box(s.id+'-roof-gable-a-'+i,'add',p.materials.wall,
    [x,s.h,z],face);
   box(s.id+'-roof-gable-b-'+i,'add',p.materials.wall,
    [alongX?x:s.x+s.w-1,s.h,alongX?s.z+s.d-1:z],face);
   // A roof-to-roof height drop needs a physical vertical step face.
   // Only the HIGH strip receives an infill, from one above the lower roof
   // to immediately below its own roof slab. This is a real facade closure,
   // not a generic solid infill of the whole high-ceiling interior.
   const lowerNeighbor=Math.min(raise,
    i>0?r190RoofElevation(i-1,span,f):raise,
    i<span-1?r190RoofElevation(i+1,span,f):raise);
   const wallHeight=raise-lowerNeighbor-1;
   if(wallHeight>0)
    box(s.id+'-roof-rise-seal-'+i,'add',p.materials.wall,
     [x,s.h+lowerNeighbor+1,z],
     alongX?[1,wallHeight,s.d]:[s.w,wallHeight,1]);
   // An elevated side edge also needs a wall, e.g. high end of shed.
   if(i===0||i===span-1)
    box(s.id+'-roof-edge-'+i,'add',p.materials.wall,
     [x,s.h,z],alongX?[1,raise,s.d]:[s.w,raise,1]);
  }
 }
 for(const s of l.spaces){
  const tag=s.id;
  box(tag+'-floor','add',p.materials.floor,[s.x,1,s.z],[s.w,1,s.d]);
  // An outdoor court is ground and sky, not a room carved out of a box.
  if(roles.get(tag)==='open-court')continue;
  if(p.formIntent?.spaceId===tag){
   // Remove the legacy rectangular floor too; the faceted envelope owns
   // the entire footprint, including supported circulation surfaces.
   elements.pop();
   facetedEnclosedSpace(s,p.formIntent);
   continue;
  }
  const court=p.skyCourtIntent?.spaceId===tag?p.skyCourtIntent:null;
  for(const face of ['west','east','south','north']){
   const x=face==='west'?s.x:face==='east'?s.x+s.w-1:s.x+1;
   const z=face==='south'?s.z:face==='north'?s.z+s.d-1:s.z;
   if(court?.openFace!==face){
    box(tag+'-'+face,'add',p.materials.wall,[x,2,z],
     ['west','east'].includes(face)?[1,s.h-2,s.d]:[s.w-2,s.h-2,1]);
   }else if(face==='west'||face==='east'){
    box(tag+'-'+face+'-near','add',p.materials.wall,
     [x,2,s.z],[1,s.h-2,court.offsetZ]);
    box(tag+'-'+face+'-far','add',p.materials.wall,
     [x,2,s.z+court.offsetZ+court.depth],
     [1,s.h-2,s.d-court.offsetZ-court.depth]);
   }else{
    box(tag+'-'+face+'-left','add',p.materials.wall,
     [s.x+1,2,z],[court.offsetX-1,s.h-2,1]);
    box(tag+'-'+face+'-right','add',p.materials.wall,
     [s.x+court.offsetX+court.width,2,z],
     [s.w-court.offsetX-court.width-1,s.h-2,1]);
   }
  }
  if(p.roofFormIntent?.spaceId===tag)
   profiledRoof(s,p.roofFormIntent);
  else if(p.skyCourtIntent?.spaceId===tag){
   const v=p.skyCourtIntent,roof=p.materials.roof;
   // Four mutually disjoint strips form a ring from the outset.
   // The uncovered void is genuine exterior sky; no roof CUT is made.
   if(v.offsetZ>0)box(tag+'-court-roof-south','add',roof,
    [s.x,s.h,s.z],[s.w,1,v.offsetZ]);
   if(s.d-v.offsetZ-v.depth>0)box(tag+'-court-roof-north','add',roof,
    [s.x,s.h,s.z+v.offsetZ+v.depth],
    [s.w,1,s.d-v.offsetZ-v.depth]);
   if(v.offsetX>0)box(tag+'-court-roof-west','add',roof,
    [s.x,s.h,s.z+v.offsetZ],[v.offsetX,1,v.depth]);
   if(s.w-v.offsetX-v.width>0)box(tag+'-court-roof-east','add',roof,
    [s.x+v.offsetX+v.width,s.h,s.z+v.offsetZ],
    [s.w-v.offsetX-v.width,1,v.depth]);
  }
  else box(tag+'-roof','add',p.materials.roof,[s.x,s.h,s.z],[s.w,1,s.d]);
 }
 for(const [i,v] of l.portals.entries()){
  box('adjacency-'+i,'cut',undefined,[v.x,2,v.z],
   v.axis==='x'?[1,3,2]:[2,3,1]);
 }
 const entry=l.spaces.find(s=>s.id===p.entrySpaceId);
 const door=entranceDoor(entry,entranceFace(p));
 const outside=entranceApproach(entry,entranceFace(p));
 if(roles.get(entry.id)!=='open-court')
  box('entry-cut','cut',undefined,door.origin,door.size);
 box('approach-floor','add',p.materials.floor,
  [outside.x,1,outside.z],[outside.w,1,outside.d]);
 for(const [i,g] of (p.glazedOpenings??[]).entries()){
  const room=l.spaces.find(s=>s.id===g.spaceId);
  const first=r190GlazingCells(room,g)[0];
  const along=['north','south'].includes(g.face);
  const origin=[first.x,g.baseY,first.z];
  const size=along?[g.width,g.height,1]:[1,g.height,g.width];
  box('glazing-cut-'+i,'cut',undefined,origin,size);
  box('glazing-glass-'+i,'add','glass',origin,size);
 }
 return {schema:B143,id:p.id,title:p.title,brief:p.brief,
  bounds:{width:p.site.width,height:p.site.height,depth:p.site.depth},
  designOnly:true,elements};
}
/** Actual compiled 2x2 walking pads: each column has floor and two air cells. */
export function auditR190SourceRoutes(plan,layout,design,compiled){
 ok(verifyCompiled(design,compiled),'STALE_B143');
 const c=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const has=(x,y,z)=>c.has(key(x,y,z));
 const {width,depth}=plan.site;
 const stand=(x,z)=>x>=0&&z>=0&&x+1<width&&z+1<depth&&
  [x,x+1].every(a=>[z,z+1].every(b=>has(a,1,b)&&
   !has(a,2,b)&&!has(a,3,b)));
 const entry=layout.spaces.find(s=>s.id===plan.entrySpaceId);
 const face=entranceFace(plan),outside=entranceApproach(entry,face);
 const [x,z]=approachSeed(entry,face);
 ok(stand(x,z),'APPROACH_NOT_WALKABLE');
 for(let u=outside.x;u<outside.x+outside.w;u++)
  for(let v=outside.z;v<outside.z+outside.d;v++)
   ok(has(u,1,v)&&!has(u,2,v)&&!has(u,3,v),
    'APPROACH_CELL_BLOCKED');
 const queue=[[x,z]],seen=new Set([x+','+z]);
 for(let i=0;i<queue.length;i++){
  const [a,b]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const u=a+dx,v=b+dz,k=u+','+v;
   if(!seen.has(k)&&stand(u,v)){seen.add(k);queue.push([u,v]);}
  }
 }
 const witnesses=[];
 for(const room of layout.spaces){
  let witness=null;
  for(let a=room.x+1;a<=room.x+room.w-3&&!witness;a++)
   for(let b=room.z+1;b<=room.z+room.d-3&&!witness;b++)
    if(seen.has(a+','+b))witness=[a,2,b];
  ok(witness!==null,'ROOM_UNREACHABLE_'+room.id);
  witnesses.push({id:room.id,reachableTwoWideSourceCell:witness});
 }
 for(const v of layout.portals){
  const portalAir=v.axis==='x'?[[v.x,v.z],[v.x,v.z+1]]:
   [[v.x,v.z],[v.x+1,v.z]];
  ok(portalAir.every(([a,b])=>!has(a,2,b)&&!has(a,3,b)),
   'PHYSICAL_DOOR_BLOCKED_'+v.a+'_'+v.b);
 }
 // Prove independently of a topology graph that each model-requested
 // shortcut has two physically supported pads traversable from the entry.
 const linkedPortals=layout.portals.filter(p=>p.kind==='cross');
 ok(linkedPortals.length===(plan.crossConnections??[]).length,
  'CROSS_PORTAL_COUNT');
 const crossWitnesses=[];
 for(const [a,b] of plan.crossConnections??[]){
  const portal=linkedPortals.find(v=>
   (v.a===a&&v.b===b)||(v.a===b&&v.b===a));
  ok(portal!==undefined,'CROSS_PORTAL_NOT_REALIZED');
  const physicallyExpected=r190SharedCrossPortal(
   layout.spaces.find(s=>s.id===a),layout.spaces.find(s=>s.id===b));
  ok(physicallyExpected!==null&&portal.x===physicallyExpected.x&&
   portal.z===physicallyExpected.z&&portal.axis===physicallyExpected.axis,
   'CROSS_PORTAL_NOT_DIRECT');
  const pads=portal.axis==='x'?
   [[portal.x-1,portal.z],[portal.x,portal.z]]:
   [[portal.x,portal.z-1],[portal.x,portal.z]];
  ok(pads.every(([px,pz])=>stand(px,pz)&&seen.has(px+','+pz)),
   'CROSS_PORTAL_NOT_TWO_WIDE_REACHABLE');
  crossWitnesses.push({modelSpaceIds:[a,b],seam:portal,
   walkingPads:pads.map(([px,pz])=>[px,2,pz]),
   realSourceAirVerified:true,sourceWalkingOnly:true});
 }
 // Verify actual external glass-filled apertures in the compiled voxel set.
 // Exterior is judged against other room bounds, not merely empty voxels:
 // an unglazed neighboring ROOM would otherwise look like outside air.
 const glazed=[],materials=new Map(compiled.primitives.map(v=>
  [key(v[0],v[1],v[2]),v[3]]));
 for(const [i,g] of (plan.glazedOpenings??[]).entries()){
  const room=layout.spaces.find(r=>r.id===g.spaceId),
   cells=r190GlazingCells(room,g),along=['north','south'].includes(g.face);
  const cut=compiled.stats.designOperations.find(v=>v.element==='glazing-cut-'+i);
  const add=compiled.stats.designOperations.find(v=>v.element==='glazing-glass-'+i);
  ok(cut?.removed===cells.length&&add?.added===cells.length,
   'GLAZING_NOT_REAL_CUT');
  for(const q of cells){
   ok(materials.get(key(q.x,q.y,q.z))===3,'GLAZING_NOT_REAL_GLASS');
   ok(!has(q.x+q.dx,q.y,q.z+q.dz)&&
    !has(q.x-q.dx,q.y,q.z-q.dz),'GLAZING_AIR_BLOCKED');
   ok(!layout.spaces.some(s=>s.id!==g.spaceId&&
    q.x+q.dx>=s.x&&q.x+q.dx<s.x+s.w&&
    q.z+q.dz>=s.z&&q.z+q.dz<s.z+s.d),
    'GLAZING_NOT_EXTERIOR');
   if(q.y===g.baseY)ok(has(q.x,q.y-1,q.z),'GLAZING_SILL_MISSING');
   if(q.y===g.baseY+g.height-1)
    ok(has(q.x,q.y+1,q.z),'GLAZING_HEADER_MISSING');
   const u=along?q.x:q.z,low=(along?room.x:room.z)+g.offset;
   if(u===low)
    ok(has(q.x-(along?1:0),q.y,q.z-(along?0:1)),
     'GLAZING_SIDE_FRAME_MISSING');
   if(u===low+g.width-1)
    ok(has(q.x+(along?1:0),q.y,q.z+(along?0:1)),
     'GLAZING_SIDE_FRAME_MISSING');
  }
  glazed.push({spaceId:g.spaceId,face:g.face,
   modelSelectedOffset:g.offset,modelSelectedBaseY:g.baseY,
   width:g.width,height:g.height,realExteriorGlassCells:cells.length,
   sourceAirBothSides:true,framed:true,daylightSimulation:'NOT_PERFORMED'});
 }
 // Prove source voxels really leave sky open across the courtyard's
 // inhabitable inner area. Do not mistake a walkable covered hall for a court.
 let skyColumns=0;
 for(const s of plan.spaces.filter(s=>s.spatialRole==='open-court')){
  const r=layout.spaces.find(x=>x.id===s.id);
  for(let a=r.x+1;a<r.x+r.w-1;a++)
   for(let b=r.z+1;b<r.z+r.d-1;b++){
    for(let y=2;y<plan.site.height;y++)
     ok(!has(a,y,b),'COURT_SKY_OBSTRUCTED_'+s.id);
    skyColumns++;
   }
 }
 // The facade's roof genuinely steps away from both corners, while the
 // occupied inner field is still roofed and has supported two-block clearance.
 // Audit the compiled geometry, never the planned element list alone.
 let facetAudit=null;
 if(plan.formIntent){
  const f=plan.formIntent,s=layout.spaces.find(v=>v.id===f.spaceId);
  const ns=f.face==='south'||f.face==='north';
  const span=ns?s.w:s.d,depth=ns?s.d:s.w,r=f.cornerInset;
  const cell=(u,v)=>{
   if(f.face==='south')return [s.x+u,s.z+v];
   if(f.face==='north')return [s.x+u,s.z+s.d-1-v];
   if(f.face==='west')return [s.x+v,s.z+u];
   return [s.x+s.w-1-v,s.z+u];
  };
  let occupiedRoof=0,realMissingCornerRoof=0;
  for(let v=0;v<depth;v++)for(let u=0;u<span;u++){
   const [x,z]=cell(u,v),inset=Math.max(0,r-v);
   const belongs=u>=inset&&u<span-inset;
   if(belongs){
    ok(has(x,1,z)&&has(x,s.h,z),'FACET_SUPPORT_OR_ROOF_MISSING');
    occupiedRoof++;
   }else{
    ok(!has(x,s.h,z),'FACET_NOT_TRULY_OPEN');
    realMissingCornerRoof++;
   }
  }
  ok(realMissingCornerRoof===r*(r+1),'FACET_SILHOUETTE');
  facetAudit={spaceId:f.spaceId,face:f.face,cornerInset:r,
   occupiedRoofColumns:occupiedRoof,
   missingRoofCornerColumns:realMissingCornerRoof,
   minecraftEnvelopeWeatherproofing:'NOT_TESTED'};
 }
 // R190-K verifies ACTUAL finished B143 voxels for each authored roof
 // strip, raised interior air, end gable seals, and the chosen silhouette.
 let roofFormAudit=null;
 if(plan.roofFormIntent){
  const f=plan.roofFormIntent,s=layout.spaces.find(x=>x.id===f.spaceId),
   alongX=f.axis==='x',span=alongX?s.w:s.d,
   crossSpan=alongX?s.d:s.w,heights=[];
  let raisedOpenInteriorColumns=0;
  for(let i=0;i<span;i++){
   const raise=r190RoofElevation(i,span,f),roofY=s.h+raise;
   heights.push(raise);
   for(let j=0;j<crossSpan;j++){
    const x=s.x+(alongX?i:j),z=s.z+(alongX?j:i);
    ok(has(x,roofY,z),'ROOF_PROFILE_MISSING_'+i+'_'+j);
    if(raise>0&&(j===0||j===crossSpan-1))
     for(let y=s.h;y<roofY;y++)
      ok(has(x,y,z),'ROOF_GABLE_LEAK_'+i+'_'+j);
    if(raise>0&&j>0&&j<crossSpan-1){
     const lowerNeighbor=Math.min(raise,
      i>0?r190RoofElevation(i-1,span,f):raise,
      i<span-1?r190RoofElevation(i+1,span,f):raise);
     for(let y=s.h;y<roofY;y++){
      const riserFace=i===0||i===span-1||y>s.h+lowerNeighbor;
      ok(has(x,y,z)===riserFace,
       'ROOF_SECTION_AIR_OR_STEP_SEAL_MISMATCH_'+i+'_'+j);
     }
     if(raise>lowerNeighbor+1)
      for(let y=s.h+lowerNeighbor+1;y<roofY;y++)
       ok(has(x,y,z),'ROOF_DROP_EXTERIOR_LEAK_'+i+'_'+j);
     if(i>0&&i<span-1)raisedOpenInteriorColumns++;
    }
   }
  }
  ok(Math.min(...heights)===0&&Math.max(...heights)===f.rise,
   'ROOF_RISE_NOT_REALIZED');
  if(f.profile==='sawtooth')
   ok(heights.some((y,i)=>i>0&&y<heights[i-1]),
    'ROOF_SAWTOOTH_NOT_REAL');
  roofFormAudit={spaceId:f.spaceId,profile:f.profile,
   axis:f.axis,modelAuthoredRise:f.rise,toothWidth:f.toothWidth??null,
   achievedRise:Math.max(...heights),roofSliceCount:heights.length,
   sourceHeightProfile:heights,raisedOpenInteriorColumns,
   verifiedPhysicalEndGables:true,
   sourceModelAuthorship:'CALLER_PROVIDED_IR_UNVERIFIED',
   actualMinecraftWeatherproofing:'NOT_TESTED'};
 }
 // Check that every author-chosen courtyard column is truly open to sky,
 // surrounded by a roof ring, and retains its occupied walking floor.
 let skyCourtAudit=null;
 if(plan.skyCourtIntent){
  const v=plan.skyCourtIntent,s=layout.spaces.find(x=>x.id===v.spaceId);
  let openColumns=0,roofRingColumns=0;
  for(let dx=0;dx<s.w;dx++)for(let dz=0;dz<s.d;dz++){
   const x=s.x+dx,z=s.z+dz;
   const court=dx>=v.offsetX&&dx<v.offsetX+v.width&&
    dz>=v.offsetZ&&dz<v.offsetZ+v.depth;
   if(court){
    ok(has(x,1,z)&&!has(x,2,z)&&!has(x,3,z),
     'SKY_COURT_UNSUPPORTED_OR_BLOCKED_FLOOR');
    for(let y=s.h;y<plan.site.height;y++)
     ok(!has(x,y,z),'SKY_COURT_NOT_OPEN_TO_SKY');
    openColumns++;
   }else{
    ok(has(x,s.h,z),'SKY_COURT_ROOF_RING_MISSING');
    roofRingColumns++;
   }
  }
  ok(openColumns===v.width*v.depth&&
    roofRingColumns===s.w*s.d-v.width*v.depth,
   'SKY_COURT_COLUMN_COUNT');
  if(v.openFace){
   const delta={north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]}[v.openFace];
   const mouth=[];
   if(delta[0]){
    const x=delta[0]>0?s.x+s.w-1:s.x;
    for(let z=s.z+v.offsetZ;z<s.z+v.offsetZ+v.depth;z++)mouth.push([x,z]);
   }else{
    const z=delta[1]>0?s.z+s.d-1:s.z;
    for(let x=s.x+v.offsetX;x<s.x+v.offsetX+v.width;x++)mouth.push([x,z]);
   }
   ok(mouth.length>=4,'SKY_COURT_MOUTH_WIDTH');
   for(const [x,z] of mouth){
    for(let y=2;y<s.h;y++)ok(!has(x,y,z),'SKY_COURT_MOUTH_BLOCKED');
    const a=x+delta[0],b=z+delta[1];
    ok(!layout.spaces.some(other=>other.id!==v.spaceId&&
      a>=other.x&&a<other.x+other.w&&b>=other.z&&b<other.z+other.d),
     'SKY_COURT_MOUTH_NOT_EXTERIOR');
    ok(!has(a,2,b)&&!has(a,3,b),'SKY_COURT_MOUTH_OUTSIDE_BLOCKED');
   }
  }
  skyCourtAudit={spaceId:v.spaceId,modelChosenOffset:[v.offsetX,v.offsetZ],
   openFace:v.openFace??null,
   modelChosenSize:[v.width,v.depth],actualOpenSkyColumns:openColumns,
   actualRoofRingColumns:roofRingColumns,supportedWalkableFloor:true,
   sourceOpenSkyVerified:true,daylightSimulation:'NOT_PERFORMED',
   weatherproofing:'NOT_CERTIFIED',humanAesthetics:'ART_HOLD'};
 }
 return {glazedOpenings:glazed,realGlazingCells:glazed.reduce((a,v)=>a+v.realExteriorGlassCells,0),
  daylightSimulation:'NOT_PERFORMED',
  crossConnections:crossWitnesses,nonTreePortalCount:crossWitnesses.length,
  nonTreePhysicalWalkableTwoWide:true,
  roofForm:roofFormAudit,skyCourt:skyCourtAudit,sourceWalkingPads:seen.size,
  facetedEnvelope:facetAudit,
  outdoorCourtCount:plan.spaces.filter(s=>s.spatialRole==='open-court').length,
  verifiedOpenSkyColumns:skyColumns,
  entranceFace:face,entranceApproachTwoWide:true,allProgramSpacesReachable:true,witnesses,
  minecraftPlayerWalking:'NOT_TESTED',structuralEngineering:'NOT_TESTED'};
}
export function compileR190SemanticPlan(raw,{layoutStrategy='centered',layoutVariantIndex=0}={}){
 const p=typeof raw==='string'?JSON.parse(raw):raw;
 validateR190SemanticPlan(p);
 ok(R190_LAYOUT_STRATEGIES.includes(layoutStrategy),'LAYOUT_STRATEGY');
 const plan=structuredClone(p),layout=layoutR190SemanticPlan(plan,{strategy:layoutStrategy,layoutVariantIndex});
 const design=sourceDesign(plan,layout),compiled=compileDesign(design);
 const audit=auditR190SourceRoutes(plan,layout,design,compiled);
 return {schema:'minecraftaibuilder-r190-source-research-v1',
  inputPlan:plan,inputSha256:hash(plan),layout,design,compiled,audit,
  modelAuthorship:'CALLER_PROVIDED_IR_UNVERIFIED',
  actualLocalModelCallsByCompiler:0,art:'ART_HOLD',
  minecraftPlayerWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldWrites:0,worldContacts:0};
}

/**
 * Phase B exploratory placements, not independent design concepts.
 * All candidates preserve the same semantic program; no model re-inference,
 * aesthetics acceptance, Minecraft IO, or runtime execution is performed.
 */
export function exploreR190SemanticPlan(raw){
 const plan=typeof raw==='string'?JSON.parse(raw):raw;
 validateR190SemanticPlan(plan);
 const candidates=[],fingerprints=new Set(),rejections=[];
 for(const strategy of R190_LAYOUT_STRATEGIES){
  let candidate;
  try{candidate=compileR190SemanticPlan(plan,{layoutStrategy:strategy});}
  catch(e){
   if(String(e?.message)==='R190_SEMANTIC_NO_FEASIBLE_SPATIAL_LAYOUT'){
    rejections.push({strategy,reason:'NO_FEASIBLE_SPATIAL_LAYOUT'});
    continue;
   }
   throw e;
  }
  const root=candidate.layout.spaces.find(s=>s.id===plan.entrySpaceId);
  const fingerprint=candidate.layout.spaces.map(s=>
   [s.id,s.x-root.x,s.z-root.z,s.w,s.d,s.h].join(':')).join('|');
  if(fingerprints.has(fingerprint)){
   rejections.push({strategy,reason:'DUPLICATE_SPATIAL_LAYOUT'});
   continue;
  }
  fingerprints.add(fingerprint);candidates.push(candidate);
 }
 ok(candidates.length>=2,'INSUFFICIENT_DISTINCT_LAYOUTS');
 return {schema:'minecraftaibuilder-r190-placement-exploration-v1',
  provenance:'CALLER_PROVIDED_IR_UNVERIFIED',art:'ART_HOLD',
  conceptsIndependentlyDesigned:false,sourceOnly:true,
  actualLocalModelCalls:0,inputSha256:hash(plan),candidates,rejections};
}
