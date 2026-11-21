/**
 * R154: typology-neutral genuine 3D volume hierarchy built over R149 B143.
 * Architecture IR chooses SINGLE or PAIRED raised usable wing roofs, and
 * an optional, physically supported entrance threshold portico.
 * No room location, source placement, room connections or y<=5 voxels change.
 * The source has no world, Minecraft building, or aesthetic approval.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const R154_VOLUME_SCHEMA='minecraftaibuilder-r154-volume-ir-v1';
const fail=s=>{throw Error('R154_VOLUME_'+s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const key=p=>p.slice(0,3).join(',');
const freezeLower=compiled=>new Map(compiled.primitives.filter(p=>p[1]<=5&&
  p[2]>=1).map(p=>[key(p),p[3]]));
export function validateR154VolumeIntent(intent){
 const fields=['schema','entryHierarchy','daylightStrategy','roofEdge',
  'volumeHierarchy','arrivalSpace'];
 if(!intent||typeof intent!=='object'||Array.isArray(intent)||
  Object.keys(intent).length!==fields.length||
  !fields.every(f=>Object.hasOwn(intent,f))||
  intent.schema!==R154_VOLUME_SCHEMA||
  !['quiet','emphasized'].includes(intent.entryHierarchy)||
  !['even','focused'].includes(intent.daylightStrategy)||
  !['fine','parapet'].includes(intent.roofEdge)||
  !['single','paired'].includes(intent.volumeHierarchy)||
  !['flush','covered'].includes(intent.arrivalSpace))
  fail('STRICT_INTENT_CONTRACT');
 return true;
}
export function deriveR154VolumeComposition(base,{intent,authorship=
 'HOST_RESEARCH_NOT_ORIGINAL_QWEN'}={}){
 validateR154VolumeIntent(intent);
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  base.r149ExpressionEvidence?.unchangedInteriorVoxels!==true||
  base.r149ExpressionEvidence?.r152RealRoomRaisedSection!==null||
  !Array.isArray(base.program)||base.program.length!==1||
  !Array.isArray(base.program[0].zones)||
  !Array.isArray(base.placements)||
  ![3,4].includes(base.program[0].zones.length)||
  base.design?.bounds.height<12||!base.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !['HOST_RESEARCH_NOT_ORIGINAL_QWEN','CALLER_ARCHITECTURE_IR_NOT_AUTHENTICATED'].includes(authorship))
  fail('VERIFIED_CONTINUOUS_ROOF_BASE_REQUIRED');
 const design=structuredClone(base.design);
 const sourcePrefix=design.elements.length;
 const {width:w,depth:d}=design.bounds;
 const entry=design.elements.find(e=>e.id==='exterior-entrance');
 if(entry?.mode!=='cut'||entry?.shape!=='box'||
  !eq(entry.size,[2,3,1])||entry.origin[2]!==1)
  fail('SOURCE_ENTRY_NOT_PINNED');
 const [doorX]=entry.origin;
 const zones=base.program[0].zones;
 const primary=zones.find(z=>z.range?.z?.[0]===2&&
  doorX>=z.range.x[0]&&doorX+1<=z.range.x[1]);
 if(!primary||!primary.physicalSector)fail('REAL_ENTRY_WING_NOT_FOUND');
 const opposite=zones.find(z=>
  z.physicalSector.includes('rear')!==primary.physicalSector.includes('rear')&&
  z.physicalSector.includes('left')!==primary.physicalSector.includes('left'));
 const alternate=opposite??zones.find(z=>
  z.id!==primary.id&&z.physicalSector!==primary.physicalSector);
 if(intent.volumeHierarchy==='paired'&&!alternate)
  fail('NO_INDEPENDENT_SECOND_WING');
 const roofMat=base.design.elements.find(e=>e.id==='roof-base')?.material;
 const wallMat=base.design.elements.find(e=>e.id==='shell-west')?.material;
 if(!['wood','stone','concrete','metal'].includes(roofMat)||
  !['wood','stone','concrete','metal'].includes(wallMat))
  fail('SOURCE_WALL_ROOF_MATERIAL_MISSING');
 const add=(name,mode,material,origin,size)=>{
  design.elements.push({id:'r154-'+name,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 const raised=[];
 const makeWing=(z,roofY,index)=>{
  const x0=z.range.x[0]-1,x1=z.range.x[1]+1,
   z0=z.range.z[0]-1,z1=z.range.z[1]+1;
  const sx=x1-x0+1,sz=z1-z0+1;
  if(x0<1||z0<1||x1>w-2||z1>d-2||
   sx<7||sz<7||roofY<9||roofY>10)
   fail('WING_CANNOT_SUPPORT_ENCLOSED_VOLUME');
  const label='wing'+index;
  // Remove its REAL former ceiling/roof interior: false rooftop towers fail.
  add(label+'-clear-old-roof','cut',null,
   [x0+1,6,z0+1],[sx-2,roofY-6,sz-2]);
  add(label+'-front-wall','add',wallMat,[x0,6,z0],[sx,roofY-6,1]);
  add(label+'-back-wall','add',wallMat,[x0,6,z1],[sx,roofY-6,1]);
  add(label+'-west-wall','add',wallMat,[x0,6,z0+1],[1,roofY-6,sz-2]);
  add(label+'-east-wall','add',wallMat,[x1,6,z0+1],[1,roofY-6,sz-2]);
  // Two different wall heights produce an actual multi-volume hierarchy.
  const glazedSide=z.range.z[0]===2?z0:z1;
  add(label+'-high-window-cut','cut',null,[x0+2,7,glazedSide],
   [sx-4,roofY-7,1]);
  add(label+'-high-window-glass','add','glass',
   [x0+2,7,glazedSide],[sx-4,roofY-7,1]);
  add(label+'-roof-cap','add',roofMat,[x0,roofY,z0],[sx,1,sz]);
  // A projecting upper eave makes section legible at a distance.
  add(label+'-roof-overhang','add',roofMat,
   [Math.max(0,x0-1),roofY,z0],
   [Math.min(w-1,x1+1)-Math.max(0,x0-1)+1,1,sz]);
  raised.push({zoneId:z.id,physicalSector:z.physicalSector,
   roofHeight:roofY,formerCeiling:6,
   volumeFootprint:{x:[x0,x1],z:[z0,z1]},
   roofWitness:[x0+2,roofY,z0+2],
   headroomWitness:[x0+2,roofY-1,z0+2]});
 };
 makeWing(primary,10,1);
 if(intent.volumeHierarchy==='paired')makeWing(alternate,9,2);
 let portico=null;
 if(intent.arrivalSpace==='covered'){
  const half=Math.min(3,doorX-1,w-doorX-3);
  if(half<2)fail('SUPPORTED_ARRIVAL_SPAN_NOT_FIT');
  const left=doorX-half,right=doorX+1+half;
  // Existing R149 front eave already spans the portico at y=6.
  // Add real supported approach floor and two columns, WITHOUT blocking
  // the original two-wide exterior threshold x=doorX/doorX+1.
  add('arrival-support-floor','add','stone',[left,1,0],
   [right-left+1,1,1]);
  add('arrival-column-left','add',wallMat,[left,2,0],[1,4,1]);
  add('arrival-column-right','add',wallMat,[right,2,0],[1,4,1]);
  add('arrival-roof-structure','add',roofMat,[left,6,0],
   [right-left+1,1,1]);
  portico={clearDoorX:[doorX,doorX+1],
   supportedFloor:{from:left,to:right,y:1,z:0},
   structuralColumns:[left,right],roofY:6,
   depthCells:1,externalTerrainUnverified:true};
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||
  !eq(design.elements.slice(0,sourcePrefix),base.design.elements))
  fail('SOURCE_PREFIX_OR_COMPILATION_CHANGED');
 const before=freezeLower(base.compiled),after=freezeLower(compiled);
 if(!eq([...before.entries()].sort(),[...after.entries()].sort()))
  fail('REAL_ROOMS_EQUIPMENT_OR_WALLS_CHANGED');
 const vox=new Set(compiled.primitives.map(key));
 for(const volume of raised){
  if(!vox.has(volume.roofWitness.join(','))||
   vox.has(volume.headroomWitness.join(',')))
   fail('FAKE_OR_BLOCKED_UPPER_ROOM_SECTION');
 }
 for(const x of [doorX,doorX+1])for(const y of [2,3,4])
  if(vox.has([x,y,0].join(','))||vox.has([x,y,1].join(','))||
   vox.has([x,y,2].join(',')))
   fail('ARRIVAL_BLOCKS_REAL_THRESHOLD');
 if(portico){
  for(const x of [doorX,doorX+1]){
   if(!vox.has([x,1,0].join(','))||!vox.has([x,6,0].join(',')))
    fail('UNSUPPORTED_ARRIVAL_NOT_COVERED');
  }
 }
 const targets=base.placements.map(p=>({id:p.id,zoneId:p.zoneId,
  origin:p.origin,size:p.size}));
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.featureAccess.length!==targets.length||
  !routes.featureAccess.every(p=>p.reachableFromEntrance))
  fail('REAL_ROOM_OR_EQUIPMENT_ROUTES_REGRESSED');
 const evidence={
  schema:'minecraftaibuilder-r154-volume-composition-proof-v1',
  authorship,origin:'HOST_COMPILED_FROM_SEMANTIC_VOLUME_SELECTION',
  choice:structuredClone(intent),
  originalSourceSha256:base.sourceSha256,
  derivedSourceSha256:compiled.sourceSha256,
  originalVoxelCount:base.compiled.primitives.length,
  derivedVoxelCount:compiled.primitives.length,
  volumeCount:raised.length,raised,portico,
  originalRoomCount:zones.length,
  originalEquipmentCount:base.placements.length,
  immutabilityBelowRoof:true,
  realHighVolumeInteriorAndRoof:true,
  fullyAccessibleEquipment:routes.featureAccess.length,
  sourceRoutes:routes.status,
  visualAssessment:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  modelGeneralization:'NOT_TESTED',
  safety:'NOT_PREPARED_9_BLOCKED_BUILDPLAN_EMPTY_WORLD0'
 };
 return {...base,design,compiled,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:routes,r154VolumeEvidence:evidence,
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',
  aestheticApproved:false,constructionApproved:false,
  executionAllowed:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
}
