/**
 * B198C: inspect TRUE compiled voxel geometry, not model's own critique.
 * Produces a conservative 2x2 2-headroom source-surface graph, contiguous
 * SAME-HEIGHT accessible candidates, enclosed air cavities, and risks.
 *
 * WARNING: NONE of this is a Minecraft player movement simulation.
 * Does not prove ramps, steps, stairs, fall safety, doors or exits.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign} from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198c-geometry-critic-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error('B198C_'+s)};
const key=(x,y,z)=>x+','+y+','+z;
const deltas=[[1,0],[-1,0],[0,1],[0,-1]];
const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const round=v=>Math.round(v*10000)/10000;
export function auditInteriorTopology({design,compiled=compileDesign(design)}){
 validateDesign(design);
 if(compiled.sourceSha256!==sha(design))fail('UNVERIFIED_SOURCE');
 const vox=compiled.primitives;
 if(!Array.isArray(vox)||vox.length===0)fail('UNVERIFIED_VOXELS');
 const filled=new Set(vox.map(p=>key(p[0],p[1],p[2])));
 if(filled.size!==vox.length)fail('DUPLICATE_GEOMETRY');
 const standing=new Map();
 for(const [x,y,z] of vox){
  if(x+1>=design.bounds.width||z+1>=design.bounds.depth||y+2>=design.bounds.height)continue;
  let ok=true;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const a=x+dx,b=z+dz;
   if(!filled.has(key(a,y,b))||
      filled.has(key(a,y+1,b))||
      filled.has(key(a,y+2,b)))ok=false;
  }
  if(ok)standing.set(key(x,y+1,z),[x,y+1,z]);
 }
 const visited=new Set(),comps=[],levels=new Map();
 for(const [k,point] of standing){
  const y=point[1],arr=levels.get(y)||[];
  arr.push(k);levels.set(y,arr);
  if(visited.has(k))continue;
  const pending=[point];visited.add(k);
  let head=0,count=0,minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  while(head<pending.length){
   const [xx,yy,zz]=pending[head++];count++;
   minX=Math.min(minX,xx);maxX=Math.max(maxX,xx);
   minZ=Math.min(minZ,zz);maxZ=Math.max(maxZ,zz);
   for(const [dx,dz] of deltas){
    const s=key(xx+dx,yy,zz+dz);
    if(standing.has(s)&&!visited.has(s)){
     visited.add(s);pending.push(standing.get(s));
    }
   }
  }
  comps.push({standingY:y,stationCount:count,
   sameElevationHorizontalMovesAtLeast:count-1,
   sourceBounds:{minX,maxX,minZ,maxZ}});
 }
 comps.sort((a,b)=>b.stationCount-a.stationCount||
  a.standingY-b.standingY);
 let potentialStepNeighbors=0;
 for(const [x,y,z] of standing.values()){
  for(const [dx,dz] of deltas){
   for(const dy of [-1,1]){
    if(standing.has(key(x+dx,y+dy,z)))potentialStepNeighbors++;
   }
  }
 }
 // Exact 6-neighbor flood fill inside the tight occupied AABB padded by 1.
 // A trapped cavity is enclosed in this SOLID/AIR topology; this alone
 // cannot distinguish an intentional atrium from trapped unusable air.
 const {bounds}=compiled;
 const ox=Math.max(0,bounds.minX-1),oy=Math.max(0,bounds.minY-1),
  oz=Math.max(0,bounds.minZ-1);
 const ex=Math.min(design.bounds.width-1,bounds.maxX+1),
  ey=Math.min(design.bounds.height-1,bounds.maxY+1),
  ez=Math.min(design.bounds.depth-1,bounds.maxZ+1);
 const w=ex-ox+1,h=ey-oy+1,d=ez-oz+1,size=w*h*d;
 let cavities=[],exteriorAir=0,voidScanStatus='COMPLETE';
 if(size>625000){voidScanStatus='HOLD_VOXEL_GRID_TOO_LARGE';}
 else{
  const grid=new Uint8Array(size),queue=new Int32Array(size);
  const idx=(x,y,z)=>((y-oy)*d+(z-oz))*w+(x-ox);
  for(const [x,y,z] of vox)grid[idx(x,y,z)]=1;
  let start=0,end=0;
  const push=i=>{grid[i]=2;queue[end++]=i};
  for(let y=oy;y<=ey;y++)for(let z=oz;z<=ez;z++)for(let x=ox;x<=ex;x++){
   if(y!==oy&&y!==ey&&z!==oz&&z!==ez&&x!==ox&&x!==ex)continue;
   const i=idx(x,y,z);if(grid[i]===0)push(i);
  }
  const traverse=()=>{let count=0;
   while(start<end){
    const n=queue[start++];count++;
    const x=n%w,zz=Math.floor(n/w)%d,yy=Math.floor(n/(w*d));
    for(const [dx,dy,dz] of directions){
     const a=x+dx,b=yy+dy,c=zz+dz;
     if(a<0||a>=w||b<0||b>=h||c<0||c>=d)continue;
     const q=(b*d+c)*w+a;
     if(grid[q]===0)push(q);
    }
   }
   return count;
  };
  exteriorAir=traverse();
  for(let i=0;i<size;i++){
   if(grid[i]!==0)continue;
   start=0;end=0;push(i);
   const count=traverse();
   cavities.push(count);
  }
  cavities.sort((a,b)=>b-a);
 }
 const count=standing.size;
 const largest=comps[0]?.stationCount??0;
 // Per-elevation connectivity, deliberately separate from the LEGACY
 // global largestComponentShare metric. Roof surfaces and other storeys are
 // not disconnected fragments merely because they have different Y values.
 const elevationConnectivity=[...levels.entries()]
  .map(([standingY,points])=>{
   const atY=comps.filter(c=>c.standingY===standingY);
   const biggest=Math.max(0,...atY.map(c=>c.stationCount));
   return {standingY,totalStandingSquares:points.length,
    componentCount:atY.length,largestComponentSquares:biggest,
    largestComponentShare:round(biggest/points.length)};
  }).sort((a,b)=>a.standingY-b.standingY);
 const fragmentedElevations=elevationConnectivity.filter(x=>
  x.totalStandingSquares>=20&&x.componentCount>=2&&
  x.largestComponentShare<0.5);
 const summary={
  schema:SCHEMA,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  exactOccupiedCells:vox.length,
  verifiedTwoWideStandingSquares:count,
  standingLevelCount:levels.size,
  sameLevelComponentCount:comps.length,
  largestSameLevelConnectedSquareCount:largest,
  largestComponentShare:count?round(largest/count):0,
  legacyGlobalShareMustNotDetermineFragmentation:true,
  elevationConnectivity,
  fragmentedElevations,
  otherSameLevelComponents:comps.length?comps.length-1:0,
  largestComponents:comps.slice(0,12),
  potentialSingleStepAdjacencies:potentialStepNeighbors/2,
  caveatStepTransitionsAreNotCertified:true,
  exactVoidFloodStatus:voidScanStatus,
  enclosedAirComponentCount:cavities.length,
  largestEnclosedAirVolume:cavities[0]??0,
  enclosedAirVolumeTotal:cavities.reduce((a,b)=>a+b,0),
  exteriorAirWithinReviewedVolume:exteriorAir,
  cavityGeometryCanBeUnusable:true,
  actualInGameCirculationCertified:false,
  roofStabilityCertified:false,
  architecturalSemanticsCertified:false,
  humanVisualReviewStillRequired:true,
  sourceOnly:true,worldContacts:0,worldWrites:0
 };
 return summary;
}
export function critiqueArchitecture({design,compiled=compileDesign(design)}){
 const audit=auditInteriorTopology({design,compiled});
 const findings=[];
 const add=(id,severity,evidence,recommendation)=>{
  findings.push({id,severity,evidence,recommendation,
   deterministicSourceBased:true,
   notSemanticOrMinecraftPhysicsCertification:true});
 };
 if(audit.verifiedTwoWideStandingSquares<10)
  add('LACKS_USABLE_TWO_WIDE_SOURCE_FLOORS','HIGH',
   {sourceFootprintCount:audit.verifiedTwoWideStandingSquares},
   'Add broad independently supported public floor slabs with at least two empty headroom voxels; retain original supports');
 if(audit.fragmentedElevations.length>0)
  add('FRAGMENTED_PUBLIC_SOURCE_FLOORS','HIGH',
   {fragmentedElevations:audit.fragmentedElevations,
    legacyGlobalShareNotUsed:audit.largestComponentShare},
   'Link disconnected 2-wide footprints WITHIN each affected elevation. Different floors and roof surfaces are separate by design; verify vertical connections independently.');
 const maxHeight=compiled.bounds.maxY-compiled.bounds.minY+1;
 if(maxHeight>=16&&audit.standingLevelCount>=2&&
  audit.potentialSingleStepAdjacencies===0)
  add('NO_ONE_STEP_SOURCE_ELEVATION_LINKS','MEDIUM',
   {standingLevels:audit.standingLevelCount,height:maxHeight},
   'Consider short supported transition segments across elevations; stairs and in-game walking remain unverified');
 if(audit.exactVoidFloodStatus!=='COMPLETE')
  add('VOID_AUDIT_INCOMPLETE','MEDIUM',
   {reason:audit.exactVoidFloodStatus},'Split the model into smaller audit regions before certifying negative space');
 const types=new Set(design.elements.filter(e=>e.mode==='add').map(e=>e.shape));
 if(design.elements.length>=5&&types.size===1)
  add('SINGLE_PRIMITIVE_ARCHITECTURAL_RISK','LOW',
   {singleShape:[...types][0],elementCount:design.elements.length},
   'Assess if the exterior needs meaningful non-box components, while preserving function');
 return {schema:SCHEMA,sourceSha256:compiled.sourceSha256,
  objectiveAudit:audit,findings,
  highRiskCount:findings.filter(x=>x.severity==='HIGH').length,
  disclaimer:'Only source-voxel geometry is certified; model intent, beautiful architecture, actual player access and real world safety are NOT certified',
  qualityHumanReview:'REQUIRED',
  buildStatus:'NOT_PREPARED',worldWrites:0,
  constructionApproved:false};
}
