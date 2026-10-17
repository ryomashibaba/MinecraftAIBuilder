/**
 * B173 — NEBULA ARK / ATRIUM CASCADE
 * A substantial *volumetric* interior architectural expansion of B172.
 * The historical 37th source design and all other source files remain intact.
 * All positions here are LOCAL DESIGN coordinates, never Minecraft world sites.
 */
import {createHash} from 'node:crypto';
import {createNebulaArkDesign,buildNebulaArk} from './b172-nebula-ark.mjs';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b173-nebula-ark-atrium-cascade-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const requireSafe=(v,why)=>{if(!v)throw Error('B173_'+why)};
const box=(id,origin,size,material='metal')=>({id,shape:'box',mode:'add',origin,size,material});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});
const beam=(id,start,end,material='metal',thickness=1)=>({id,shape:'beam',mode:'add',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({
 id,shape:'torus',mode:'add',center,axis:'y',majorRadius,tubeRadius,material});
const ell=(id,center,radii,shell=1,material='glass')=>({
 id,shape:'ellipsoid',mode:'add',center,radii,shell,material});

/** Entirely new 3D massing + internal cuts, not viewer overlays. */
export function atriumCascadeElements(){
 const e=[];
 // Two separate twelve-level monumental internal stepped ascents.
 // Blocks are design geometry only. Their vanilla stair shape, climbability,
 // fall risk and Minecraft real-player continuity are NOT certified.
 for(const [side,x] of [['west',48],['east',72]]){
  for(let n=0;n<12;n++){
   e.push(box('b173-'+side+'-ascent-'+String(n).padStart(2,'0'),
    [x,14+n,26+n],[4,1,2],n%3===0?'accent':'metal'));
  }
 }
 // Three enormous atrium floors, carved back to preserve multistorey voids.
 e.push(
  box('b173-north-middle-tribune',[12,34,16],[23,1,21],'wood'),
  box('b173-south-middle-tribune',[89,34,16],[23,1,21],'wood'),
  box('b173-core-star-gallery',[52,35,23],[21,1,17],'accent'),
  box('b173-north-orbit-veranda',[14,47,17],[20,1,19],'glass'),
  box('b173-core-orbit-veranda',[51,48,17],[23,1,22],'glass'),
  box('b173-south-orbit-veranda',[91,47,17],[20,1,19],'glass')
 );
 // Source-real inter-terminal overhead walking surfaces (physical
 // player traversal and cross-floor connections remain NOT CERTIFIED).
 e.push(
  box('b173-mid-west-glass-crossing',[33,34,24],[22,1,4],'glass'),
  box('b173-mid-east-glass-crossing',[71,34,24],[24,1,4],'glass'),
  box('b173-high-west-flying-bridge',[35,48,30],[20,1,5],'metal'),
  box('b173-high-east-flying-bridge',[71,48,30],[18,1,5],'metal')
 );
 // Monumental luminous orbital atria: four large architectural rings
 // suspended through the terminal's genuine occupied geometry.
 e.push(
  tor('b173-west-hall-oculus',[24,39,27],9,1,'glow'),
  tor('b173-east-hall-oculus',[101,39,27],9,1,'glow'),
  tor('b173-core-grand-oculus',[62,46,27],12,2,'accent'),
  tor('b173-core-aurora-oculus',[62,53,27],10,1,'glow'),
  ell('b173-crown-glazed-canopy',[62,59,28],[15,4,12],1,'glass')
 );
 // Huge exposed diagonals and sightline-defining ribs behind the promenades.
 const diagonals=[
  [[13,16,42],[19,47,40]],[[35,16,42],[29,47,40]],
  [[90,16,42],[96,47,40]],[[113,16,42],[107,47,40]],
  [[46,31,42],[54,52,42]],[[79,31,42],[71,52,42]],
  [[34,35,35],[49,50,35]],[[90,35,35],[75,50,35]]
 ];
 diagonals.forEach(([a,b],i)=>e.push(
  beam('b173-grand-diagonal-'+i,a,b,i%2?'accent':'metal',1)));
 e.push(
  beam('b173-west-floor-column',[37,13,43],[37,40,43]),
  beam('b173-east-floor-column',[87,13,43],[87,40,43]),
  beam('b173-west-orbit-pier',[48,26,40],[48,49,40]),
  beam('b173-east-orbit-pier',[76,26,40],[76,49,40])
 );
 // Hollow three REAL multilevel light wells. Preserve B172's lower
 // Y13 footings and its guaranteed upper Y25 walkway at Z19..24.
 // These are OFFLINE cuts in the design array, never setblock/fill.
 e.push(
  cut('b173-north-open-skywell',[18,15,28],[12,39,7]),
  cut('b173-central-vertical-atrium',[55,15,14],[15,42,5]),
  cut('b173-south-open-skywell',[95,15,28],[12,39,7])
 );
 requireSafe(e.length===54,'EXTENSION_PARTS');
 return e;
}

export function createNebulaArkB173Design(){
 const base=createNebulaArkDesign();
 requireSafe(base.elements.at(-1).id==='ark-protected-upper-promenade',
  'ORIGINAL_FINAL_ROUTE_CUT_MOVED');
 const result={...base,id:'nebula-ark-atrium-cascade',
  title:'NEBULA ARK — 巨大三大ターミナル・多層アトリウムと空中回廊',
  brief:'B172の三連巨大ドームと軌道環に、内部の三大吹き抜け、二系統の階段状の立体造形、連続展望テラス、四重の天空環、空中回廊と巨大ガラス天蓋を実ボクセルで増設したオフライン設計。Minecraft実施工・階間移動は未認証。',
  elements:[...base.elements.slice(0,-1),...atriumCascadeElements(),
   base.elements.at(-1)]};
 validateDesign(result);
 return result;
}
function flatProof(scene,y,z,start,end){
 const c=new Set(scene.primitives.map(p=>key(p[0],p[1],p[2])));
 for(let x=start;x<=end+1;x++)for(let dz=0;dz<2;dz++){
  requireSafe(c.has(key(x,y-1,z+dz)),
   'MISSING_SUPPORT_'+x+'_'+y);
  requireSafe(!c.has(key(x,y,z+dz))&&!c.has(key(x,y+1,z+dz)),
   'BLOCKED_2X2_BODY_'+x+'_'+y);
 }
 return end-start;
}
export function buildNebulaArkB173(){
 const original=buildNebulaArk();
 const design=createNebulaArkB173Design();
 const compiled=compileDesign(design);
 requireSafe(verifyCompiled(design,compiled),'COMPILER_MISMATCH');
 const routeLower=flatProof(compiled,14,7,10,112);
 const routeUpper=flatProof(compiled,26,20,12,110);
 const before=new Set(original.compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const after=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 let added=0,removed=0;
 for(const k of after)if(!before.has(k))added++;
 for(const k of before)if(!after.has(k))removed++;
 const asBuilt=new Set(after);
 let risingTreads=0;
 for(const x of [49,73])for(let n=0;n<12;n++){
  requireSafe(asBuilt.has(key(x,14+n,26+n)),
   'MISSING_REAL_STAIR_SHAPED_VOXEL_'+x+'_'+n);
  risingTreads++;
 }
 requireSafe(added>=150&&removed>=50,
  'NO_MATERIAL_NEW_ARCHITECTURE_OR_ATRIUM_CARVING');
 requireSafe(compiled.geometrySha256!==original.report.geometrySha256,
  'UNMODIFIED_GEOMETRY');
 const report={
  schema:SCHEMA,modelId:design.id,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  parentModelId:original.design.id,parentGeometrySha256:original.report.geometrySha256,
  original3dVoxels:original.compiled.primitives.length,
  final3dVoxels:compiled.primitives.length,addedCellCoordinates:added,
  removedCellCoordinates:removed,netVoxelDifference:compiled.primitives.length-original.compiled.primitives.length,
  inheritedElements:original.design.elements.length,
  newVolumetricElements:atriumCascadeElements().length,
  totalElements:design.elements.length,materialCounts:compiled.stats.layerCounts,
  upperFlat2x2Moves:routeUpper,lowerFlat2x2Moves:routeLower,
  conceptualSteppedAscentTreads:risingTreads,actualStairMovementCertified:false,
  actualInterfloorRouteCertified:false,realMinecraftWalkingCertified:false,
  structuralLoadCertified:false,fallProtectionCertified:false,
  historic36GalleryUnmodified:true,versionedB172SourceUnmodified:true,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 requireSafe(verifyNebulaArkB173(report),'WORLD_SECURITY_CONSTRAINT');
 return {design,compiled,report};
}
export function verifyNebulaArkB173(p){
 return Boolean(p&&p.schema===SCHEMA&&p.modelId==='nebula-ark-atrium-cascade'&&
  p.final3dVoxels>0&&p.newVolumetricElements===54&&p.totalElements===151&&
  p.addedCellCoordinates>=150&&p.removedCellCoordinates>=50&&
  p.netVoxelDifference===p.final3dVoxels-p.original3dVoxels&&
  p.sourceSha256?.length===64&&p.geometrySha256?.length===64&&
  p.geometrySha256!==p.parentGeometrySha256&&
  p.lowerFlat2x2Moves===102&&p.upperFlat2x2Moves===98&&
  p.conceptualSteppedAscentTreads===24&&
  p.actualStairMovementCertified===false&&
  p.actualInterfloorRouteCertified===false&&
  p.realMinecraftWalkingCertified===false&&p.structuralLoadCertified===false&&
  p.fallProtectionCertified===false&&p.worldCoordinates===null&&
  p.worldContacts===0&&p.worldWrites===0&&
  p.constructionApproved===false&&p.readiness==='NOT_PREPARED'&&
  p.gates?.length===9&&p.gates.every(g=>g==='BLOCKED')&&
  Array.isArray(p.BuildPlan?.operations)&&p.BuildPlan.operations.length===0&&
  p.historic36GalleryUnmodified===true&&p.versionedB172SourceUnmodified===true);
}
