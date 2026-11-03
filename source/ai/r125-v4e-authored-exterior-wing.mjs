/**
 * Opt-in AUTHOR-owned exterior public wing that actually EXPANDS the overall
 * roof/footprint silhouette. Physical floor, two posts, canopy, 2-wide portal.
 * SOURCE only; no model, Minecraft, or human ART certification.
 */
import {compileRankedExteriorIntent,proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {compileAuthoredPrimaryMassingVoid}
 from './r125-v4e-authored-primary-massing-void.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {auditB143ProjectedVisibility}
 from '../../scripts/r125-v4e-visibility-delta.mjs';
const fail=s=>{throw Error('R125_V4E_WING_'+s);};
const K=(x,y,z)=>x+','+y+','+z;
const exact=(o,a)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===a.slice().sort().join('|');
const box=(id,mode,origin,size,material)=>({id,shape:'box',mode,
 ...(mode==='add'?{material}:{}),origin,size});
function twoWideRoute(compiled,design,entry,goal){
 const occupied=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const has=(x,y,z)=>occupied.has(K(x,y,z));
 const clear=(x,z)=>{
  if(x<0||z<0||x+1>=design.bounds.width||z+1>=design.bounds.depth)return false;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
   if(!has(x+dx,1,z+dz)||has(x+dx,2,z+dz)||has(x+dx,3,z+dz))
    return false;
  return true;
 };
 if(!clear(...entry)||!clear(...goal))fail('SOURCE_WING_ENDPOINT_BLOCKED');
 const queue=[entry],visited=new Set([entry.join(',')]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p=[x+dx,z+dz],id=p.join(',');
   if(!visited.has(id)&&clear(...p)){visited.add(id);queue.push(p);}
  }
 }
 if(!visited.has(goal.join(',')))fail('SOURCE_TWO_WIDE_WING_NOT_CONNECTED');
 return {status:'SOURCE_TWO_WIDE_ENTRANCE_TO_WING_REACHABLE',
  reachedPads:visited.size,minecraftWalk:'NOT_TESTED'};
}
export function compileAuthoredExteriorWing(originalAuthor,authoredMassing,authoredWing){
 const wing=structuredClone(authoredWing),author=structuredClone(originalAuthor);
 if(!exact(wing,['spaceId','side','start','span','reach','roofY','purpose'])||
  typeof wing.spaceId!=='string'||
  !['north','south','east','west'].includes(wing.side)||
  !Number.isSafeInteger(wing.start)||wing.start<3||wing.start>12||
  !Number.isSafeInteger(wing.span)||wing.span<10||wing.span>18||
  !Number.isSafeInteger(wing.reach)||wing.reach<6||wing.reach>9||
  !Number.isSafeInteger(wing.roofY)||wing.roofY<8||wing.roofY>9||
  typeof wing.purpose!=='string'||wing.purpose.length<3||wing.purpose.length>150||
  /[\u0000-\u001f<>]/.test(wing.purpose))fail('AUTHOR_WING_CONTRACT');
 const base=compileRankedExteriorIntent(author);
 const mass=compileAuthoredPrimaryMassingVoid(author,authoredMassing);
 const node=base.plan.nodes.find(n=>n.id===wing.spaceId);
 const xAxis=['east','west'].includes(wing.side);
 if(!node||node.kind!=='covered'||wing.roofY>=node.roof.eaveY||
  wing.start+wing.span>(xAxis?node.depth:node.width)-3)
  fail('WING_ROOM_DIMENSION_OR_EAVE');
 const reverse={east:'west',west:'east',north:'south',south:'north'};
 if(base.plan.links.some(l=>l.from===node.id&&l.side===wing.side||
  l.to===node.id&&reverse[l.side]===wing.side)||
  // Keep shared-wall and true entrance prohibitions. A same-face window is
  // allowed ONLY because the actual unchanged glass and BOTH AIR layers are
  // verified on final B143 below, after physically cutting the lower doorway.

  (node.id===base.plan.nodes[0].id&&wing.side==='north'))
  fail('WING_COLLIDES_LINK_OR_ENTRANCE');
 const far=wing.side==='east'||wing.side==='south';
 const wx=xAxis?(far?node.x+node.width:node.x-wing.reach):node.x+wing.start;
 const wz=xAxis?node.z+wing.start:(far?node.z+node.depth:node.z-wing.reach);
 const sx=xAxis?wing.reach:wing.span,sz=xAxis?wing.span:wing.reach;
 const wall=xAxis?(far?node.x+node.width-1:node.x):
  (far?node.z+node.depth-1:node.z);
 const portalAlong=(xAxis?wz:wx)+Math.floor((wing.span-2)/2);
 const portal=xAxis?[wall,2,portalAlong]:[portalAlong,2,wall];
 const portalSize=xAxis?[1,3,2]:[2,3,1];
 const design0=mass.b143Design,prior=mass.b143Compiled;
 const width=Math.max(design0.bounds.width,wx+sx+3);
 const depth=Math.max(design0.bounds.depth,wz+sz+3);
 if(wx<1||wz<1||width>128||depth>128)
  fail('WING_OUTSIDE_B143_LOCAL_SITE');
 const old=new Map(prior.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 // No host-chosen rerouting: the authored wing must occupy unbuilt local land.
 for(let x=wx;x<wx+sx;x++)for(let z=wz;z<wz+sz;z++)
  for(let y=1;y<design0.bounds.height;y++)
   if(old.has(K(x,y,z)))fail('WING_SITE_OCCUPIED');
 const wallMat=MATERIALS.indexOf(base.plan.materials.wall);
 const removed=new Set();
 for(let x=portal[0];x<portal[0]+portalSize[0];x++)
  for(let z=portal[2];z<portal[2]+portalSize[2];z++)
   for(let y=2;y<=4;y++){
    const k=K(x,y,z);if(old.get(k)!==wallMat)fail('WING_DOOR_REQUIRES_REAL_WALL');
    removed.add(k);
   }
 const farX=xAxis?(far?wx+sx-2:wx+1):null;
 const farZ=xAxis?null:(far?wz+sz-2:wz+1);
 const posts=xAxis?[[farX,wz+1],[farX,wz+sz-2]]:
  [[wx+1,farZ],[wx+sx-2,farZ]];
 const elements=[...design0.elements.map(e=>structuredClone(e)),
  box('wing-real-public-floor','add',[wx,1,wz],[sx,1,sz],base.plan.materials.public),
  box('wing-real-cover-roof','add',[wx,wing.roofY,wz],[sx,1,sz],base.plan.materials.roof),
  ...posts.map(([x,z],i)=>box('wing-physical-post-'+i,'add',
   [x,2,z],[1,wing.roofY-2,1],base.plan.materials.wall)),
  box('wing-authored-two-wide-door','cut',portal,portalSize)];
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...design0,bounds:{...design0.bounds,width,depth},elements};
 const compiled=compileDesign(design),current=new Map(compiled.primitives.map(p=>
  [K(p[0],p[1],p[2]),p[3]]));
 if(!verifyCompiled(design,compiled)||compiled.geometrySha256===prior.geometrySha256)
  fail('WING_REAL_B143_COMPILE_FAILURE');
 const floorMat=MATERIALS.indexOf(base.plan.materials.public);
 const roofMat=MATERIALS.indexOf(base.plan.materials.roof);
 let floorCells=0,roofCells=0,postCells=0;
 for(let x=wx;x<wx+sx;x++)for(let z=wz;z<wz+sz;z++){
  if(current.get(K(x,1,z))!==floorMat||
   current.get(K(x,wing.roofY,z))!==roofMat)fail('REAL_WING_SUPPORT_OR_SHADE_MISSING');
  floorCells++;roofCells++;
 }
 for(const [x,z] of posts)for(let y=2;y<wing.roofY;y++){
  if(current.get(K(x,y,z))!==wallMat)fail('WING_PHYSICAL_POST_MISSING');
  postCells++;
 }
 for(const k of removed)if(current.has(k))fail('WING_AUTHOR_PORTAL_BLOCKED');
 for(const [k,m] of old)if(!removed.has(k)&&current.get(k)!==m)
  fail('EXISTING_MASSING_OR_PROGRAM_CHANGED');
 const glazing=proveRankedExteriorPhysicalGlazing(
  {plan:base.plan,b143:{compiled}},base.chosenWindowFaces);
 const entrance=design0.elements.find(e=>e.id==='exterior-entrance');
 if(!entrance)fail('ORIGINAL_ENTRANCE_NOT_PRESENT');
 const targets=base.plan.fixtures.map(f=>{
  const node=base.plan.nodes.find(n=>n.id===f.nodeId);
  return {id:f.id,zoneId:f.nodeId,
   origin:[node.x+f.offsetX,2,node.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.b143.program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.some(z=>!z.reachableFromEntrance))
  fail('EXISTING_ZONE_OR_FUNCTION_ROUTE_DAMAGED');
 const from=[entrance.origin[0],entrance.origin[2]+1];
 const to=[wx+Math.floor((sx-2)/2),wz+Math.floor((sz-2)/2)];
 const walk=twoWideRoute(compiled,design,from,to);
 const silhouette=auditB143ProjectedVisibility(prior.primitives,compiled.primitives);
 if(silhouette.views.find(v=>v.face==='roof').silhouetteChangedCells<floorCells)
  fail('AUTHORED_EXTENSION_NOT_VISIBLE_IN_TRUE_ROOF_SILHOUETTE');
 if(base.worldWrites!==0||mass.worldWrites!==0||
  mass.gates.length!==9||mass.gates.some(x=>x!=='BLOCKED'))
  fail('FROZEN_WORLD_SAFETY_DRIFT');
 return {
  schema:'r125-v4e-author-exterior-public-wing-source-v1',
  authoredWing:wing,authoredMassing:structuredClone(authoredMassing),
  previousMassingGeometrySha256:prior.geometrySha256,
  newGeometrySha256:compiled.geometrySha256,
  b143Design:design,b143Compiled:compiled,sourceRoutes:routes,
  sourceWingWitness:{
   actualSupportedWingFloorCells:floorCells,actualCoverRoofCells:roofCells,
   actualConnectedPostCells:postCells,realPortalCellsRemoved:removed.size,
   twoWideUserRoute:walk,originalGlazingUnchanged:glazing,
   independentRoofSilhouette: silhouette,
   fullyOutsideOldBuiltFootprint:true,authorPurpose:wing.purpose,
   structuralAdequacy:'NOT_TESTED',waterproofing:'NOT_TESTED',
   realMinecraftWalking:'NOT_TESTED',humanArt:'NOT_REVIEWED'
  },
  humanArt:'NOT_REVIEWED',architectureQuality:'ART_HOLD',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
