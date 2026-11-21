/**
 * R125 V4A opt-in, genre-neutral public threshold with an actual open-air
 * recessed approach. The AUTHOR chooses width/depth/offset; HOST never
 * guesses them from the genre. Keeps the V1 plan and source immutable.
 * All returned geometry is verified B143 SOURCE; NO world operations.
 *
 * Deliberate research limit: one north-facing root room, single-storey
 * axis-aligned shell. Not a general architecture or ART certification.
 */
import {createHash} from 'node:crypto';
import {compileSpatialComposition} from './r125-spatial-composition.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const APPROACH_SCHEMA='minecraftaibuilder-r125-author-public-approach-v4a';
const fail=s=>{throw Error('R125_APPROACH_'+s)};
const exact=(o,ks)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const intersects=(a0,a1,b0,b1)=>a0<=b1&&b0<=a1;
const maxX=r=>r.x+r.width-1;
const maxZ=r=>r.z+r.depth-1;
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});

/** Validate every model decision. Never normalize, clip or choose a default. */
export function validatePublicApproachIntent(originalPlan,intent,source){
 if(!exact(intent,['schema','planId','rootRoomId','offset','width','depth'])||
  intent.schema!==APPROACH_SCHEMA||intent.planId!==originalPlan?.id||
  intent.rootRoomId!==originalPlan?.rooms?.[0]?.id)
  fail('AUTHOR_CONTRACT');
 const root=source?.layout?.rooms?.[0];
 if(!root||!int(intent.offset,2,12)||!int(intent.width,4,6)||
  !int(intent.depth,2,3)||intent.offset+intent.width>root.width-2||
  intent.depth>root.depth-4)
  fail('AUTHOR_BOUNDS');
 // Do not excavate someone else's connected room or an obstructed approach.
 const x0=root.x+intent.offset,z0=root.z,x1=x0+intent.width-1;
 const z1=z0+intent.depth;
 for(const r of source.layout.rooms.slice(1)){
  if(intersects(x0,x1,r.x,maxX(r))&&
    intersects(z0,z1,r.z,maxZ(r)))fail('OTHER_ROOM_OBSTRUCTS_APPROACH');
 }
 return true;
}

/**
 * Takes an accepted V1 source and emits a separate V4A source. The forecourt
 * retains a real supported floor but is open to the sky. Side returns and
 * a new back wall enclose the recessed entrance; its two-wide door is
 * independently re-audited along with every original program room.
 */
export function compilePublicApproachV4A({originalPlan,intent}={}){
 const original=compileSpatialComposition(originalPlan);
 validatePublicApproachIntent(originalPlan,intent,original);
 const root=original.layout.rooms[0],x=root.x+intent.offset,z=root.z;
 const {width:w,depth:d}=intent;
 const keep=original.design.elements.filter(e=>e.id!=='exterior-entrance');
 if(keep.length!==original.design.elements.length-1||
    original.design.elements.filter(e=>e.id==='exterior-entrance').length!==1)
  fail('LEGACY_ENTRANCE_CONTRACT');
 const m=originalPlan.materials;
 const elements=[
  ...keep,
  // Cut old facade, roof, and initial floor across a TRUE outdoor pocket.
  box('v4a-open-sky-court','cut',[x,1,z],[w,root.roofY,d]),
  // Restore a supported outdoor approach on the same datum as original floor.
  box('v4a-public-paving','add',[x,1,z],[w,1,d],m.floor),
  box('v4a-left-return','add',[x,2,z],[1,root.roofY-2,d+1],m.wall),
  box('v4a-right-return','add',[x+w-1,2,z],
   [1,root.roofY-2,d+1],m.wall),
  box('v4a-recessed-back-wall','add',[x,2,z+d],
   [w,root.roofY-2,1],m.wall),
  // V1 route contract requires this exact id; only the AUTHOR sets x/z.
  box('exterior-entrance','cut',[x+1,2,z+d],[2,3,1])
 ];
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...original.design,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_SOURCE_MISMATCH');
 if(compiled.geometrySha256===original.geometrySha256)
  fail('NO_GENUINE_GEOMETRY_CHANGE');
 const occupied=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const has=(x,y,z)=>occupied.has(K(x,y,z));
 let paving=0,roofRemoved=0,skyClear=0;
 for(let dz=0;dz<d;dz++)for(let dx=1;dx<w-1;dx++){
  const px=x+dx,pz=z+dz;
  if(!has(px,1,pz))fail('UNSUPPORTED_APPROACH_FLOOR');
  paving++;
  for(let y=2;y<=root.roofY;y++)
   if(has(px,y,pz))fail('FORECOURT_NOT_OPEN_TO_SKY');
  if(!has(px,root.roofY,pz))roofRemoved++;
  skyClear++;
 }
 for(let dz=0;dz<d;dz++)for(const side of [x,x+w-1])
  for(let y=2;y<root.roofY;y++)
   if(!has(side,y,z+dz))fail('COURT_RETURN_WALL_GAP');
 for(let px=x;px<x+w;px++)for(let y=2;y<root.roofY;y++)
  if((px<x+1||px>x+2)&&!has(px,y,z+d))
   fail('RECESSED_BACK_WALL_GAP');
 for(const px of [x+1,x+2]){
  for(let pz=z;pz<=z+d;pz++){
   if(!has(px,1,pz))fail('APPROACH_THRESHOLD_UNSUPPORTED');
   for(let y=2;y<=4;y++)
    if(has(px,y,pz))fail('APPROACH_THRESHOLD_BLOCKED');
  }
  // Must have a walkable pad one block INSIDE the new doorway.
  if(!has(px,1,z+d+1)||has(px,2,z+d+1)||has(px,3,z+d+1))
   fail('INTERIOR_THRESHOLD_BLOCKED');
 }
 const result={...original,design,compiled,
  geometrySha256:compiled.geometrySha256,sourceSha256:compiled.sourceSha256};
 const routes=auditR125SourceRoutes(result);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==original.layout.rooms.length||
  routes.zones.some(r=>!r.reachedFromEntrance))
  fail('REAL_B143_CIRCULATION_HOLD');
 return {
  schema:'r125-v4a-public-approach-source-study-v1',
  originalPlanSha256:sha(originalPlan),intentSha256:sha(intent),
  originalGeometrySha256:original.geometrySha256,
  originalSourceSha256:original.sourceSha256,
  geometrySha256:compiled.geometrySha256,sourceSha256:compiled.sourceSha256,
  authoredIntent:structuredClone(intent),design,compiled,
  originalPlan:structuredClone(originalPlan),sourceRoutes:routes,
  sourceProof:{supportedCourtyardCells:paving,roofCellsRemoved:roofRemoved,
   skyClearPlanCells:skyClear,
   authorSelectedEntrance:[x+1,2,z+d],
   outsideWorldTerrainVerified:false,
   realMinecraftWalkable:'NOT_TESTED'},
  authorship:'SUPPLIED_EXTERNAL_INTENT_NOT_PROVEN_REAL_MODEL',
  art:'NOT_REVIEWED',minecraft:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
  gates:Array(9).fill('BLOCKED')
 };
}
