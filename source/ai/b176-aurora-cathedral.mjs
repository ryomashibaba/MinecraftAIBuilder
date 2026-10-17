/**
 * B176 — AURORA TRANSIT CATHEDRAL.
 * Fourth independently strict-B143 module composing a genuinely new, hollow
 * multi-storey sky terminal, a ~110-column rear promenade and an additional
 * 18-step geometric transit flight continuous with B174's final station.
 * This is design-local geometry only. Minecraft writes stay prohibited.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,
 validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildStarRiver,analyzeSteppedInterfaces} from './b175-star-river.mjs';
import {ASCENT_STATIONS} from './b174-skycanyon.mjs';
export const SCHEMA='minecraftaibuilder-b176-aurora-transit-cathedral-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const guard=(ok,why)=>{if(!ok)throw Error('B176_'+why)};
const box=(id,origin,size,material='metal')=>
 ({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,mode:'add',shape:'ellipsoid',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,mode:'add',shape:'torus',center,axis:'z',
   majorRadius,tubeRadius,material});

/**
 * 18 deliberately separate, one-cell-high source stairs.
 * First 15 travel in +X from the inherited final B174 station at
 * [73,40,46]. The last three turn west around the eastern cantilever,
 * into the brand-new Y57 supported 2-wide sky corridor (X=10..119).
 * No in-game collision/traversal of these cube steps is asserted.
 */
export const FLIGHT=Object.freeze([
 ...Array.from({length:15},(_,n)=>Object.freeze({
  id:n,origin:Object.freeze([75+3*n,39+n,46]),
  standing:Object.freeze([75+3*n,40+n,46]),
  axis:'x'})),
 ...[0,1,2].map((n)=>Object.freeze({
  id:15+n,origin:Object.freeze([120,54+n,46-3*n]),
  standing:Object.freeze([120,55+n,46-3*n]),axis:n?'z':'x'}))
]);
export function auroraParts(){
 const e=[];
 FLIGHT.forEach(s=>e.push(box('b176-transit-flight-'+
  String(s.id).padStart(2,'0'),s.origin,[3,1,3],
  s.id%3===0?'accent':'metal')));
 // A genuine, rear-of-building multistorey elevated public artery.
 e.push(
  box('b176-rear-public-promenade',[10,56,39],[110,1,7],'concrete'),
  box('b176-rear-edge-light',[10,57,37],[110,2,2],'glow'),
  box('b176-rear-glass-parapet',[10,57,46],[110,2,2],'glass')
 );
 // Three enormous hollow glazed terminal lanterns; no miniature furniture.
 for(const zone of [
  {id:'north',cx:24,x:11,w:27},
  {id:'core',cx:62,x:47,w:31},
  {id:'south',cx:101,x:88,w:27}
 ]){
  e.push(
   box('b176-'+zone.id+'-hanging-auditorium',[zone.x,61,37],
    [zone.w,1,11],'concrete'),
   box('b176-'+zone.id+'-overlook-mezzanine',[zone.x+2,65,39],
    [zone.w-4,1,9],'wood'),
   box('b176-'+zone.id+'-sky-chapel-floor',[zone.x+4,69,39],
    [zone.w-8,1,8],'accent'),
   ell('b176-'+zone.id+'-aurora-shell',[zone.cx,68,40],
    zone.id==='core'?[15,9,9]:[13,9,9],'glass',1),
   tor('b176-'+zone.id+'-chancel-ring',[zone.cx,69,40],6,2,'glow'),
   box('b176-'+zone.id+'-hanging-ridge',[zone.x+5,73,42],
    [zone.w-10,1,4],'metal'),
   box('b176-'+zone.id+'-balcony-spine',[zone.x+4,63,47],
    [zone.w-8,1,2],'glow'),
   beam('b176-'+zone.id+'-crown-chord-left',
    [zone.x+1,60,38],[zone.cx-3,74,43],'metal',1),
   beam('b176-'+zone.id+'-crown-chord-right',
    [zone.x+zone.w-2,60,38],[zone.cx+3,74,43],'accent',1)
  );
  // Four giant paired indoor-looking pylons. No fake flat UI-only ribs.
  for(let i=0;i<4;i++){
   const x=zone.x+3+i*6;
   e.push(
    beam('b176-'+zone.id+'-back-support-'+i,
     [x,56,37],[x,71,38],i%2===0?'metal':'glow',1),
    beam('b176-'+zone.id+'-outer-butress-'+i,
     [x,53,48],[x,67,48],i%2===0?'accent':'metal',1)
   );
  }
 }
 // Horizontal connectors, floor surfaces, raised cross-hall volumes:
 // site-local design only; never equate these with real traversal clearance.
 e.push(
  box('b176-upper-cross-span-west',[35,65,41],[16,1,5],'glass'),
  box('b176-upper-cross-span-east',[74,65,41],[17,1,5],'glass'),
  box('b176-cathedral-middle-sky-balcony',[46,72,39],[33,1,8],'metal'),
  beam('b176-north-core-aerial-chord',[33,60,34],[53,73,37],'accent',2),
  beam('b176-core-south-aerial-chord',[72,73,37],[92,60,34],'accent',2)
 );
 guard(e.length>=75&&e.length<=160,'MODULE_VOLUME_ELEMENT_COUNT');
 guard(new Set(e.map(p=>p.id)).size===e.length,'DUPLICATE_ELEMENT');
 return e;
}
export function createAuroraModule(){
 const d={schema:DSL,id:'nebula-ark-aurora-transit-module',
  title:'NEBULA ARK — AURORA TRANSIT CATHEDRAL',
  brief:'巨大三大ドームの背面に中空の巨大ガラス聖堂、三層空中広場、全長百ブロック級回廊と新たな18段の概念上昇経路を実3D形状として追加。施工・実機歩行は未認証。',
  bounds:{width:124,height:78,depth:50},elements:auroraParts(),designOnly:true};
 validateDesign(d);return d;
}
/** This is source-level adjacency with 2-wide *staging*, not step physics. */
export function analyzeAuroraTransit(scene){
 const occ=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 const floor=(x,y,z)=>occ.has(K(x,y-1,z));
 const body=(x,y,z)=>!occ.has(K(x,y,z))&&!occ.has(K(x,y+1,z));
 const checkStation=(s,reason)=>{
  const [x,y,z]=s;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   guard(floor(x+dx,y,z+dz),'MISSING_STATION_FLOOR_'+reason);
   guard(body(x+dx,y,z+dz),'BLOCKED_STATION_ENVELOPE_'+reason);
  }
 };
 // Proven original last 2-wide standing area and 2 intermediate horizontal
 // X steps to the added first tread, with its full 2x2 support.
 for(let x=73;x<=75;x++)checkStation([x,40,46],'old-new-join-'+x);
 const checkSeam=(old,next,i)=>{
  const [x,y,z]=old.standing,[a,b,c]=next.standing;
  guard(b-y===1,'RISER_NOT_ONE_'+i);
  let valid=0;
  if(a-x===3&&z===c){
   // Check two *complete* 2x2 lower-staging footprints; do not falsely
   // require headspace spanning the taller next tread's solid riser.
   for(let dx=0;dx<=1;dx++)checkStation([x+dx,y,z],'x-seam-'+i+'-'+dx);
   for(let dz=0;dz<2;dz++){
    guard(floor(x+2,y,z+dz),'LAST_LOWER_SUPPORT_'+i);
    guard(floor(a,b,c+dz),'NEXT_HIGHER_SUPPORT_'+i);
   }
   valid=2;
  }else if(a===x&&z-c===3){
   // Turn on two orthogonal axes at the far eastern sky-tower.
   for(let dz=0;dz<=1;dz++)checkStation([x,y,z+dz],'z-seam-'+i+'-'+dz);
   for(let dx=0;dx<2;dx++){
    guard(floor(x+dx,y,z+2),'LAST_LOWER_SUPPORT_'+i);
    guard(floor(a+dx,b,c+2),'NEXT_HIGHER_SUPPORT_'+i);
   }
   valid=2;
  }
  guard(valid===2,'TREAD_NOT_EDGE_ADJACENT_'+i);
 };
 for(const step of FLIGHT)checkStation(step.standing,'flight-'+step.id);
 for(let i=0;i<FLIGHT.length-1;i++)checkSeam(FLIGHT[i],FLIGHT[i+1],i);
 // The last higher tread is edge-connected to the flat upper promenade.
 // X119 is the last floor-supported public corridor origin. At X120 the
 // terminal flight's top tread is at identical standing Y57 and Z40..42.
 for(let x=118;x<=120;x++)checkStation([x,57,40],'new-gallery-link-'+x);
 // The final stair at Z40..42 reaches the 100+ step long passage on
 // Z43..44 via a TWO-WIDE horizontal Z-turn at X118 on the open terrace.
 for(let z=40;z<=43;z++)checkStation([118,57,z],'promenade-z-turn-'+z);
 let travel=0;
 for(let x=12;x<=117+1;x++){
  checkStation([x,57,43],'promenade-'+x);travel++;
 }
 return {previousB174Steps:ASCENT_STATIONS.length,
  newOneRiseStairs:FLIGHT.length,
  newAdjacentMixedHeightSeams:FLIGHT.length-1,
  horizontalOldToNewJoinStations:3,
  newHorizontal2WideCorridorMoves:travel-1,
  upperGalleryStandingY:57,sourceOnly:true,
  continuousMinecraftWalkingCertified:false,
  physicalStairCollisionCertified:false,
  fallGuardrailCoverageCertified:false,
  evidenceSha256:sha({old:ASCENT_STATIONS.length,
   flight:FLIGHT,flatMoves:travel-1})};
}
function historicalRoutes(scene){
 const occ=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 for(const [y,z,a,b] of [[14,7,10,112],[26,20,12,110],[60,3,12,112]]){
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   guard(occ.has(K(x,y-1,z+dz)),'HISTORIC_SUPPORT_'+y+'_'+x);
   guard(!occ.has(K(x,y,z+dz))&&!occ.has(K(x,y+1,z+dz)),
    'HISTORIC_OBSTRUCTED_'+y+'_'+x);
  }
 }
 return [102,98,100];
}
function compose(old,addon,design){
 const cells=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let unique=0,overlap=0;
 for(const p of addon.primitives){
  const key=K(p[0],p[1],p[2]);
  if(cells.has(key)){overlap++;continue;}
  cells.set(key,p);unique++;
 }
 guard(unique>=2000,'INSUFFICIENT_NEW_BUILDING_VOLUME');
 guard(cells.size<=MAX_CELLS,'GLOBAL_MAX_CELLS');
 const primitives=[...cells.values()].sort((a,b)=>
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 const layers=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  for(let i=0;i<3;i++){low[i]=Math.min(low[i],p[i]);high[i]=Math.max(high[i],p[i]);}
  layers[MATERIALS[p[3]]]++;
 }
 guard(high[0]<124&&high[1]<78&&high[2]<50,'OUT_OF_DESIGN_ENVELOPE');
 const sourceSha256=sha({schema:SCHEMA,parentSource:old.sourceSha256,
  moduleSource:addon.sourceSha256,policy:'preserve-all-parent-cells'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-aurora-transit-cathedral',
  title:'NEBULA ARK — AURORA TRANSIT / 立体回廊・大聖堂',
  brief:'三大大型中空天空聖堂と立体交通大回廊を持つ未来公共建築。',
  primitives,sourceSha256,geometrySha256,
  bounds:{minX:low[0],maxX:high[0],minY:low[1],maxY:high[1],
   minZ:low[2],maxZ:high[2]},
  levels:Math.floor(high[1]/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:4,designOperations:[
    ...old.stats.designOperations,
    ...addon.stats.designOperations.map(op=>({...op,module:design.id}))]}},
 unique,overlap};
}
export function buildAuroraCathedral(){
 const parent=buildStarRiver(),design=createAuroraModule(),
  addon=compileDesign(design);
 guard(verifyCompiled(design,addon),'MODULE_INTEGRITY');
 const merged=compose(parent.compiled,addon,design);
 const oldInterfaces=analyzeSteppedInterfaces(merged.compiled);
 const transit=analyzeAuroraTransit(merged.compiled);
 const legacy=historicalRoutes(merged.compiled);
 const report={schema:SCHEMA,modelId:merged.compiled.id,
  parentId:parent.compiled.id,parentGeometrySha256:parent.compiled.geometrySha256,
  sourceSha256:merged.compiled.sourceSha256,
  geometrySha256:merged.compiled.geometrySha256,
  moduleSourceSha256:addon.sourceSha256,
  inheritedVoxels:parent.compiled.primitives.length,
  final3dCells:merged.compiled.primitives.length,
  newUnique3dCells:merged.unique,
  parentCellsOverlappedAndPreserved:merged.overlap,
  inheritedElements:parent.report.totalAuthoredElements,
  newElements:design.elements.length,
  totalElements:parent.report.totalAuthoredElements+design.elements.length,
  moduleCount:4,strictPerModuleElementCap:160,globalVoxelCap:MAX_CELLS,
  priorMixedHeightSeams:oldInterfaces.verifiedGeometricInterfaces,
  newGeometricStairSeams:transit.newAdjacentMixedHeightSeams,
  newSourceStairTreads:transit.newOneRiseStairs,
  newRearFlat2WideMoves:transit.newHorizontal2WideCorridorMoves,
  oldFlat2WideMoves:legacy,
  sourceOnlyTransitGeometry:true,
  minecraftInterfloorTraversalCertified:false,
  realMinecraftCollisionsCertified:false,
  structuralStabilityCertified:false,
  fallSafetyCertified:false,
  past36GalleryUnmodified:true,B172ThroughB175SourceUnmodified:true,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 guard(verifyAuroraReport(report),'REPORT_SAFETY');
 return {parent,design,addon,compiled:merged.compiled,transit,report};
}
export function verifyAuroraReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.modelId==='nebula-ark-aurora-transit-cathedral'&&
  r.moduleCount===4&&r.strictPerModuleElementCap===160&&
  r.globalVoxelCap===MAX_CELLS&&
  r.inheritedVoxels===68914&&r.newUnique3dCells>=2000&&
  r.final3dCells===r.inheritedVoxels+r.newUnique3dCells&&
  r.inheritedElements===280&&r.newElements>=75&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.geometrySha256?.length===64&&r.sourceSha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.priorMixedHeightSeams===14&&
  r.newGeometricStairSeams===17&&r.newSourceStairTreads===18&&
  r.newRearFlat2WideMoves>=100&&
  JSON.stringify(r.oldFlat2WideMoves)==='[102,98,100]'&&
  r.sourceOnlyTransitGeometry===true&&
  r.minecraftInterfloorTraversalCertified===false&&
  r.realMinecraftCollisionsCertified===false&&
  r.structuralStabilityCertified===false&&r.fallSafetyCertified===false&&
  r.past36GalleryUnmodified===true&&r.B172ThroughB175SourceUnmodified===true&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
