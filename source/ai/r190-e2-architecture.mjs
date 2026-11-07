/**
 * MinecraftAIBuilder E2-1: model-authored source geometry + explicit functional
 * zone witnesses. This does NOT invent architectural solids from labels.
 * Source-only; no Minecraft IO, MakeCode execution or ART acceptance.
 */
import {SCHEMA as B143,validateDesign,compileDesign,verifyCompiled,
 MATERIALS} from './b143-building-dsl.mjs';

export const E2_SCHEMA='minecraftaibuilder-e2-authored-architecture-v1';
const dirs=Object.freeze({
 north:[0,1],south:[0,-1],east:[1,0],west:[-1,0]});
const all=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(k=>keys.includes(k));
const exactly=(o,keys)=>all(o,keys)&&Object.keys(o).length===keys.length;
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const coord=(v,w,d)=>Array.isArray(v)&&v.length===2&&
 integer(v[0],0,w-2)&&integer(v[1],0,d-2);
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const label=s=>typeof s==='string'&&s.length>=2&&s.length<=150&&
 !/[\u0000-\u001f<>]/.test(s);
const key=(x,y,z)=>x+','+y+','+z;
const failure=code=>{throw Error('E2_'+code);};
const requireE2=(condition,code)=>{if(!condition)failure(code);};
const inZone=(x,z,q)=>x>=q[0]&&z>=q[1]&&
 x+1<q[0]+q[2]&&z+1<q[1]+q[3];

/** Deterministic, exact-format validation of only the author-authored plan. */
export function validateE2Architecture(p){
 requireE2(exactly(p,['schema','sourceDesign','programSpaces','entrance','glazedOpenings']),
  'TOP_FIELDS');
 requireE2(p.schema===E2_SCHEMA,'SCHEMA');
 requireE2(p.sourceDesign?.schema===B143,'B143_SCHEMA');
 validateDesign(p.sourceDesign);
 const {width:w,depth:d,height:h}=p.sourceDesign.bounds;
 requireE2(Array.isArray(p.programSpaces)&&
  p.programSpaces.length>=2&&p.programSpaces.length<=6,'PROGRAM_COUNT');
 const seen=new Set();
 for(const [i,s] of p.programSpaces.entries()){
  requireE2(exactly(s,['id','purpose','zone','witness']),'PROGRAM_FIELDS_'+i);
  requireE2(slug(s.id)&&!seen.has(s.id),'PROGRAM_ID_'+i);seen.add(s.id);
  requireE2(label(s.purpose),'PROGRAM_PURPOSE_'+i);
  requireE2(Array.isArray(s.zone)&&s.zone.length===4&&
   integer(s.zone[0],0,w-4)&&integer(s.zone[1],0,d-4)&&
   integer(s.zone[2],4,w-s.zone[0])&&
   integer(s.zone[3],4,d-s.zone[1]),'PROGRAM_ZONE_'+i);
  requireE2(coord(s.witness,w,d)&&
   inZone(s.witness[0],s.witness[1],s.zone),'PROGRAM_WITNESS_'+i);
 }
 const e=p.entrance;
 requireE2(exactly(e,['spaceId','face','approachPad','arrivalPad']),'ENTRANCE_FIELDS');
 requireE2(seen.has(e.spaceId)&&Object.hasOwn(dirs,e.face),'ENTRANCE_REFERENCE');
 requireE2(coord(e.approachPad,w,d)&&coord(e.arrivalPad,w,d),'ENTRANCE_PADS');
 const [ax,az]=e.approachPad;
 requireE2((e.face==='south'&&az===0)||
  (e.face==='north'&&az===d-2)||
  (e.face==='west'&&ax===0)||
  (e.face==='east'&&ax===w-2),'ENTRANCE_BOUNDARY');
 const entryZone=p.programSpaces.find(s=>s.id===e.spaceId).zone;
 requireE2(inZone(...e.arrivalPad,entryZone),'ENTRANCE_ARRIVAL_ZONE');
 requireE2(Array.isArray(p.glazedOpenings)&&
  p.glazedOpenings.length>=1&&p.glazedOpenings.length<=8,'GLAZING_COUNT');
 const windowCells=new Set();
 for(const [i,g] of p.glazedOpenings.entries()){
  requireE2(exactly(g,['spaceId','face','origin','width','height']),
   'GLAZING_FIELDS_'+i);
  requireE2(seen.has(g.spaceId)&&Object.hasOwn(dirs,g.face),'GLAZING_REFERENCE_'+i);
  requireE2(Array.isArray(g.origin)&&g.origin.length===3&&
   g.origin.every(v=>Number.isSafeInteger(v))&&
   integer(g.width,2,8)&&integer(g.height,2,4),'GLAZING_DIMENSIONS_'+i);
  const [x,y,z]=g.origin;
  const [lastX,lastZ]=['north','south'].includes(g.face)?
   [x+g.width-1,z]:[x,z+g.width-1];
  requireE2(x>=1&&z>=1&&lastX<w-1&&lastZ<d-1&&y>=3&&
   y+g.height<h,'GLAZING_BOUNDS_'+i);
  for(let v=0;v<g.height;v++)for(let u=0;u<g.width;u++){
   const px=x+(['north','south'].includes(g.face)?u:0),
    pz=z+(['east','west'].includes(g.face)?u:0);
   const k=key(px,y+v,pz);
   requireE2(!windowCells.has(k),'GLAZING_DUPLICATE_CELL');windowCells.add(k);
  }
 }
 return true;
}

/** Source-volume topology; 2x2 supported feet, 2 blocks of free body.
 * This is NOT proof of live Minecraft player locomotion.
 */
export function auditE2Architecture(plan,scene){
 requireE2(verifyCompiled(plan.sourceDesign,scene),'SOURCE_STALE');
 const {width:w,depth:d,height:h}=plan.sourceDesign.bounds;
 const occupied=new Map(scene.primitives.map(c=>[key(c[0],c[1],c[2]),c[3]]));
 const material=(x,y,z)=>occupied.get(key(x,y,z));
 const present=(x,y,z)=>occupied.has(key(x,y,z));
 const floorY=1,glass=MATERIALS.indexOf('glass');
 const walk=(x,z)=>x>=0&&z>=0&&x+1<w&&z+1<d&&
  [x,x+1].every(px=>[z,z+1].every(pz=>
   present(px,floorY,pz)&&!present(px,floorY+1,pz)&&
   !present(px,floorY+2,pz)));
 const e=plan.entrance;
 requireE2(walk(...e.approachPad),'ENTRANCE_APPROACH_NOT_WALKABLE');
 requireE2(walk(...e.arrivalPad),'ENTRANCE_ARRIVAL_NOT_WALKABLE');
 const queue=[e.approachPad],found=new Set([e.approachPad.join(',')]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const a=x+dx,b=z+dz,mark=a+','+b;
   if(!found.has(mark)&&walk(a,b)){found.add(mark);queue.push([a,b]);}
  }
 }
 requireE2(found.has(e.arrivalPad.join(',')),'ENTRANCE_NOT_SOURCE_CONNECTED');
 const witness=[];
 for(const s of plan.programSpaces){
  const [x,z]=s.witness;
  requireE2(walk(x,z),'PROGRAM_PAD_NOT_WALKABLE_'+s.id);
  requireE2(found.has(x+','+z),'PROGRAM_UNREACHABLE_'+s.id);
  // One independent weatherproofing witness, NOT full building weatherproofing.
  const roof=[x,x+1].every(px=>[z,z+1].every(pz=>{
   for(let y=4;y<h;y++)if(present(px,y,pz))return true;
   return false;
  }));
  requireE2(roof,'PROGRAM_WITNESS_NO_ROOF_'+s.id);
  witness.push({spaceId:s.id,sourceTwoWidePad:[x,2,z],
   reachableFromOutside:true,roofWitness:true});
 }
 const glazing=[];
 for(const [i,g] of plan.glazedOpenings.entries()){
  const zone=plan.programSpaces.find(s=>s.id===g.spaceId).zone;
  const [dx,dz]=dirs[g.face],[x,y,z]=g.origin,
   ns=g.face==='north'||g.face==='south';
  const windowCells=[];
  for(let v=0;v<g.height;v++)for(let u=0;u<g.width;u++){
   const px=x+(ns?u:0),py=y+v,pz=z+(ns?0:u),
    exteriorX=px+dx,exteriorZ=pz+dz,
    interiorX=px-dx,interiorZ=pz-dz;
   requireE2(material(px,py,pz)===glass,
    'GLAZING_NOT_REAL_GLASS_'+i);
   requireE2(!present(exteriorX,py,exteriorZ)&&
    !present(interiorX,py,interiorZ),
    'GLAZING_AIR_BLOCKED_'+i);
   requireE2(interiorX>=zone[0]&&interiorX<zone[0]+zone[2]&&
    interiorZ>=zone[1]&&interiorZ<zone[1]+zone[3],
    'GLAZING_NOT_PROGRAM_EXTERIOR_'+i);
   // Exterior source ray cannot hit a neighboring room/wall at window height.
   for(let rx=exteriorX,rz=exteriorZ;
    rx>=0&&rx<w&&rz>=0&&rz<d;rx+=dx,rz+=dz)
    requireE2(!present(rx,py,rz),'GLAZING_RAY_BLOCKED_'+i);
   if(v===0)requireE2(present(px,py-1,pz),'GLAZING_SILL_MISSING_'+i);
   if(v===g.height-1)
    requireE2(present(px,py+1,pz),'GLAZING_HEADER_MISSING_'+i);
   windowCells.push([px,py,pz]);
  }
  glazing.push({spaceId:g.spaceId,face:g.face,verifiedGlassCells:windowCells,
   sourceOutsideRayFree:true});
 }
 return {schema:'minecraftaibuilder-e2-offline-physical-audit-v1',
  mode:'SOURCE_WITNESS_ONLY',sourceSha256:scene.sourceSha256,
  geometrySha256:scene.geometrySha256,spaces:witness,
  reachableSourcePads:found.size,glazing,
  fullWeatherproofing:'NOT_TESTED',buildingStructuralStrength:'NOT_TESTED',
  minecraftPlayerWalking:'NOT_TESTED',humanArt:'NOT_REVIEWED',
  worldWrites:0,worldContacts:0,constructionApproved:false};
}

/** Compiles only the exact model-authored B143 source. No geometry is inserted. */
export function compileE2Architecture(original){
 validateE2Architecture(original);
 const raw=JSON.stringify(original);
 const plan=structuredClone(original);
 const scene=compileDesign(plan.sourceDesign);
 requireE2(verifyCompiled(plan.sourceDesign,scene),'NONDETERMINISTIC_B143');
 const audit=auditE2Architecture(plan,scene);
 requireE2(JSON.stringify(original)===raw,'AUTHOR_ORIGINAL_MUTATED');
 return {schema:'minecraftaibuilder-e2-source-study-v1',
  plan,design:plan.sourceDesign,scene,audit,
  provenance:'CALLER_SUPPLIED_UNVERIFIED_NOT_MODEL_PROVEN',
  sourceReady:true,art:'ART_HOLD',minecraftPlayerWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0};
}
