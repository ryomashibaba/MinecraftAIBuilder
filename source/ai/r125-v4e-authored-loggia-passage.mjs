/**
 * Opt-in, model-neutral architectural functionality research.
 * A previously authored REAL B143 nonrectangular loggia receives a 2-wide,
 * 3-high physically open interior portal. Reject if a connected supported
 * two-wide SOURCE walk from the genuine entrance to the sheltered loggia
 * cannot be witnessed. No Minecraft/world I/O; neither ART nor roof
 * weatherproofing nor physical game walking is certified.
 *
 * Does not change the frozen V4D, ranked V4E or original one-section contract.
 */
import {compileAuthoredPublicLoggia}
 from './r125-v4e-authored-public-loggia.mjs';
import {compileRankedExteriorIntent,proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R125_V4E_LOGGIA_PASSAGE_'+s);};
const key=(x,y,z)=>x+','+y+','+z;
const addCut=(i,x,z)=>({id:'slog-portal-'+i,shape:'box',mode:'cut',
 origin:[x,2,z],size:[1,3,1]});
function twoWideReachable(compiled,design,start,outside,inside){
 const vox=new Set(compiled.primitives.map(p=>key(p[0],p[1],p[2])));
 const has=(x,y,z)=>vox.has(key(x,y,z));
 const pad=(x,z)=>x>=0&&x+1<design.bounds.width&&
  z>=0&&z<design.bounds.depth&&
  has(x,1,z)&&has(x+1,1,z)&&
  !has(x,2,z)&&!has(x+1,2,z)&&
  !has(x,3,z)&&!has(x+1,3,z);
 if(!pad(start[0],start[1])||!pad(outside[0],outside[1])||
    !pad(inside[0],inside[1]))
  fail('TWO_WIDE_ENTRANCE_PORTAL_AND_LOGGIA_CLEARANCE');
 const q=[start],seen=new Set([key(start[0],2,start[1])]);
 const steps=[[0,1],[1,0],[0,-1],[-1,0]];
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i];
  for(const [dx,dz] of steps){
   const nx=x+dx,nz=z+dz,k=key(nx,2,nz);
   if(!seen.has(k)&&pad(nx,nz)){seen.add(k);q.push([nx,nz]);}
  }
 }
 if(!seen.has(key(inside[0],2,inside[1]))||
    !seen.has(key(outside[0],2,outside[1])))
  fail('TWO_WIDE_PORTAL_SOURCE_NOT_CONNECTED_TO_ENTRANCE');
 return {sourcePadsReached:seen.size,interiorSupportedWitness:inside,
  loggiaSupportedWitness:outside,
  clearance:'TWO_WIDE_FLOOR_WITH_TWO_AIR_HEADROOM',
  twoWideInteriorToLoggiaConnected:true,
  externalTerrainProven:false,gameWalkingCertified:false};
}
export function compileAuthoredLoggiaPassage(originalAuthor,section){
 const original=structuredClone(originalAuthor);
 const request=structuredClone(section);
 const old=compileAuthoredPublicLoggia(original,request);
 const base=compileRankedExteriorIntent(original);
 const n=base.plan.nodes.find(v=>v.id===request.spaceId);
 if(!n||request.recessDepth<5||request.recessDepth>6)
  fail('AUTHORED_LOGGIA_PRECONDITION');
 const north=request.corner[0]==='N',west=request.corner[1]==='W';
 const r=request.recessDepth,j=Math.floor(r/2)-1;
 const cuts=[];
 for(const i of [j,j+1]){
  const x=west?n.x+i:n.x+n.width-1-i;
  const z=north?n.z+r-i-1:n.z+n.depth-1-(r-i-1);
  cuts.push({x,z});
 }
 const oldVox=new Map(old.sectionedCompiled.primitives.map(p=>
  [key(p[0],p[1],p[2]),p[3]]));
 const oldWall=MATERIALS.indexOf(base.plan.materials.wall);
 for(const {x,z} of cuts)for(let y=2;y<=4;y++)
  if(oldVox.get(key(x,y,z))!==oldWall)
   fail('ORIGINAL_DIAGONAL_WALL_NOT_PRESENT');
 const design={...old.sectionedB143Design,
  elements:[...old.sectionedB143Design.elements,
   ...cuts.map((p,i)=>addCut(i,p.x,p.z))]};
 if(design.elements.length>160)fail('B143_ELEMENT_BUDGET');
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('NEW_B143_SOURCE_DRIFT');
 if(compiled.geometrySha256===old.finalGeometrySha256)
  fail('NO_TRUE_PASSAGE_GEOMETRY_CHANGE');
 const vox=new Map(compiled.primitives.map(p=>
  [key(p[0],p[1],p[2]),p[3]]));
 for(const {x,z} of cuts)for(let y=2;y<=4;y++)
  if(vox.has(key(x,y,z)))fail('PORTAL_OPENING_NOT_PHYSICAL');
 // Neither original authored equipment nor any ranked glazing may be erased.
 let fixtureCells=0;
 const targets=base.plan.fixtures.map(f=>{
  const zone=base.plan.nodes.find(v=>v.id===f.nodeId);
  if(!zone)fail('FIXTURE_ZONE');
  for(let x=zone.x+f.offsetX;x<zone.x+f.offsetX+f.width;x++)
   for(let z=zone.z+f.offsetZ;z<zone.z+f.offsetZ+f.depth;z++)
    for(let y=2;y<2+f.height;y++){
     const k=key(x,y,z);
     if(!oldVox.has(k))continue;
     fixtureCells++;
     if(vox.get(k)!==oldVox.get(k))fail('FUNCTIONAL_FIXTURE_DAMAGED');
    }
  return {id:f.id,zoneId:f.nodeId,
   origin:[zone.x+f.offsetX,2,zone.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 if(fixtureCells<1)fail('NO_FUNCTIONAL_FIXTURE_WITNESS');
 let glazing;
 try{
  glazing=proveRankedExteriorPhysicalGlazing(
   {plan:base.plan,b143:{compiled}},base.chosenWindowFaces);
 }catch{fail('FINAL_GLAZING_DAMAGED');}
 // Re-run the pre-existing strict entrance-to-program and fixture reachability.
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.b143.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
    routes.zones.some(v=>!v.reachedFromEntrance)||
    routes.featureAccess.some(v=>!v.reachableFromEntrance))
  fail('AUTHOR_PROGRAM_ROUTES_LOST');
 const x0=Math.min(cuts[0].x,cuts[1].x);
 const zOut=north?n.z+1:n.z+n.depth-2;
 const zIn=north?n.z+r-j:n.z+n.depth-1-(r-j);
 const entrance=design.elements.find(e=>e.id==='exterior-entrance'&&
  e.mode==='cut'&&e.shape==='box');
 if(!entrance||entrance.size[0]<2||entrance.size[1]<2)
  fail('AUTHOR_ORIGINAL_ENTRANCE_MISSING');
 const walk=twoWideReachable(compiled,design,
  [entrance.origin[0],entrance.origin[2]+1],
  [x0,zOut],[x0,zIn]);
 if(base.worldWrites!==0||old.worldWrites!==0||base.gates.length!==9||
    old.gates.length!==9||old.gates.some(v=>v!=='BLOCKED'))
  fail('FROZEN_SAFETY_DRIFT');
 return {
  schema:'r125-v4e-authored-loggia-walkable-source-portal-v1',
  originalSection:request,
  initialLoggiaGeometrySha256:old.finalGeometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  sectionedB143Design:design,sectionedCompiled:compiled,
  sectionedRoutes:routes,
  sourcePassageWitness:{...walk,
   physicallyOpenedDiagonalWallCells:cuts.length*3,
   originalFunctionalVoxelsPreserved:fixtureCells,
   finalGlazing:glazing,
   roofRetainedByCutHeight:true,publicTerrainAndWeather:'NOT_TESTED'},
  authorProvenance:'EXPLICIT_SECTION_FROM_SYNTHETIC_OR_UNATTESTED_AUTHOR',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
