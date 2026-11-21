/**
 * Opt-in, genre-neutral PRIMARY MASSING research, not a furniture/facade patch.
 * The AUTHOR chooses a whole exterior corner and a substantive 7..10 x 7..10
 * open-to-sky footprint. HOST removes the FULL vertical corner volume (including
 * original roof), closes the two newly exposed interior facades, and cuts a
 * genuine 2-wide x 3-high entrance into that public void.
 *
 * Rejects rather than moving / repairing any authored selection. SOURCE only:
 * roof weatherproofing, structural design, architectural ART, real LLM identity
 * and Minecraft walking are explicitly NOT certified.
 * Frozen V4D, ranked V4E, sectioned V4E and Education are untouched.
 */
import {compileRankedExteriorIntent,proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R125_V4E_MASSING_'+s);};
const k=(x,y,z)=>x+','+y+','+z;
const exactly=(o,ks)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
function twoByTwoAccess(compiled,design,entry,interior,exterior){
 const occupied=new Set(compiled.primitives.map(p=>k(p[0],p[1],p[2])));
 const has=(x,y,z)=>occupied.has(k(x,y,z));
 const clear=(x,z)=>{
  if(x<0||z<0||x+1>=design.bounds.width||z+1>=design.bounds.depth)
   return false;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   if(!has(x+dx,1,z+dz)||has(x+dx,2,z+dz)||has(x+dx,3,z+dz))
    return false;
  }
  return true;
 };
 if(!clear(...entry)||!clear(...interior)||!clear(...exterior))
  fail('ENTRANCE_TO_VOID_TWO_BY_TWO_SUPPORT_AND_AIR');
 const stack=[entry],seen=new Set([entry.join(',')]);
 for(let i=0;i<stack.length;i++){
  const [x,z]=stack[i];
  for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){
   const next=[x+dx,z+dz],id=next.join(',');
   if(!seen.has(id)&&clear(...next)){seen.add(id);stack.push(next);}
  }
 }
 if(!seen.has(interior.join(','))||!seen.has(exterior.join(',')))
  fail('ENTRANCE_TO_VOID_NOT_CONNECTED');
 return {twoByTwoSourcePadsReached:seen.size,inside:interior,outside:exterior,
  width:2,headroom:2,supported:true,realMinecraftWalking:'NOT_TESTED'};
}
export function compileAuthoredPrimaryMassingVoid(originalAuthor,authoredVoid){
 const author=structuredClone(originalAuthor),v=structuredClone(authoredVoid);
 if(!(exactly(v,['spaceId','corner','cutWidth','cutDepth'])||
       exactly(v,['spaceId','corner','cutWidth','cutDepth','publicAccessSide']))||
  (v.publicAccessSide!==undefined&&!['X','Z'].includes(v.publicAccessSide))||
  typeof v.spaceId!=='string'||!['NW','NE','SW','SE'].includes(v.corner)||
  !Number.isSafeInteger(v.cutWidth)||!Number.isSafeInteger(v.cutDepth)||
  v.cutWidth<7||v.cutWidth>10||v.cutDepth<7||v.cutDepth>10)
  fail('AUTHOR_MASSING_CONTRACT');
 const base=compileRankedExteriorIntent(author);
 const node=base.plan.nodes.find(n=>n.id===v.spaceId);
 if(!node||node.kind!=='covered'||node.width<2*v.cutWidth+6||
  node.depth<2*v.cutDepth+6)
  fail('PRIMARY_VOLUME_TOO_SMALL');
 const west=v.corner.endsWith('W'),north=v.corner.startsWith('N');
 const left=west?node.x:node.x+node.width-v.cutWidth;
 const top=north?node.z:node.z+node.depth-v.cutDepth;
 const right=left+v.cutWidth-1,bottom=top+v.cutDepth-1;
 const sideX=west?'west':'east',sideZ=north?'north':'south';
 const opposite={east:'west',west:'east',north:'south',south:'north'};
 if(base.plan.links.some(l=>
  (l.from===node.id&&(l.side===sideX||l.side===sideZ))||
  (l.to===node.id&&(opposite[l.side]===sideX||opposite[l.side]===sideZ))))
  fail('MASSING_VOID_INTERSECTS_SHARED_WALL');
 const old=base.b143.compiled,oldMap=new Map(old.primitives.map(p=>
  [k(p[0],p[1],p[2]),p[3]]));
 const design0=base.b143.design;
 if(!Number.isSafeInteger(design0.bounds.height)||design0.bounds.height<node.roof.eaveY+8)
  fail('B143_HEIGHT_BOUND_UNVERIFIED');
 const xb=west?right+1:left-1,zb=north?bottom+1:top-1;
 const originalEntrance=design0.elements.find(e=>e.id==='exterior-entrance'&&
  e.mode==='cut'&&e.shape==='box');
 if(!originalEntrance)fail('ORIGINAL_REAL_ENTRANCE_MISSING');
 const entryLeft=originalEntrance.origin[0],entryTop=originalEntrance.origin[2];
 const entryRight=entryLeft+originalEntrance.size[0]-1;
 const entryBottom=entryTop+originalEntrance.size[2]-1;
 if(left<=entryRight&&right>=entryLeft&&top<=entryBottom&&bottom>=entryTop)
  fail('MASSING_COLLIDES_ORIGINAL_ENTRANCE');
 const portalZ=top+Math.floor((v.cutDepth-2)/2);
 const portalX=left+Math.floor((v.cutWidth-2)/2);
 // A short, model-authored circulation choice: the new public void can open
 // toward either genuine exposed facade. No HOST-selected fallback for an
 // invalid or blocked choice. Absent means backward-compatible X research.
 const publicPortalAxis=v.publicAccessSide??'X';
 const publicPortalAuthored=Object.hasOwn(v,'publicAccessSide');
 const elements=[...design0.elements.map(e=>structuredClone(e)),
  box('primary-void-all-heights','cut',[left,2,top],
   [v.cutWidth,design0.bounds.height-2,v.cutDepth]),
  // Stop each NEW internal facade one cell short of the ORIGINAL exterior
  // boundary. Extending it through the old north/south entry seam would
  // incorrectly fill an authored entrance even when the void misses it.
  box('primary-void-x-facade','add',[xb,2,top+(north?1:0)],
   [1,node.roof.eaveY-3,v.cutDepth-1],base.plan.materials.wall),
  box('primary-void-z-facade','add',[left+(west?1:0),2,zb],
   [v.cutWidth-1,node.roof.eaveY-3,1],base.plan.materials.wall),
  ...(publicPortalAxis==='X'?
   [box('primary-void-public-portal','cut',[xb,2,portalZ],[1,3,2])]:
   [box('primary-void-public-portal','cut',[portalX,2,zb],[2,3,1])])];
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...design0,elements};
 const final=compileDesign(design);
 if(!verifyCompiled(design,final)||final.geometrySha256===old.geometrySha256)
  fail('REAL_B143_MASSING_CHANGE_NOT_VERIFIED');
 const vox=new Map(final.primitives.map(p=>[k(p[0],p[1],p[2]),p[3]]));
 let roofRemoved=0,voidAirColumns=0,roofOutsidePreserved=0;
 for(let x=left;x<=right;x++)for(let z=top;z<=bottom;z++){
  if(!vox.has(k(x,1,z)))fail('VOID_WALKABLE_FLOOR_REMOVED');
  for(let y=2;y<design0.bounds.height;y++){
   if(vox.has(k(x,y,z)))fail('OPEN_SKY_VOLUME_NOT_EMPTY');
   if(y>=node.roof.eaveY-1&&oldMap.has(k(x,y,z)))roofRemoved++;
  }
  voidAirColumns++;
 }
 if(roofRemoved<20||voidAirColumns<49)fail('NOT_SUBSTANTIVE_ROOF_VOID');
 const wall=MATERIALS.indexOf(base.plan.materials.wall);
 let newFacades=0,protectedExteriorSeamCells=0;
 for(let z=top;z<=bottom;z++)for(let y=2;y<=node.roof.eaveY-2;y++){
  if(z===(north?top:bottom)){
   if(vox.get(k(xb,y,z))!==oldMap.get(k(xb,y,z)))
    fail('EXTERIOR_X_SEAM_CHANGED');
   protectedExteriorSeamCells++;
   continue;
  }
  const shouldBeAir=publicPortalAxis==='X'&&z>=portalZ&&z<portalZ+2&&y<=4;
  if(shouldBeAir){if(vox.has(k(xb,y,z)))fail('PORTAL_NOT_PHYSICAL');}
  else {if(vox.get(k(xb,y,z))!==wall)fail('INTERIOR_X_FACADE_INCOMPLETE');newFacades++;}
 }
 for(let x=left;x<=right;x++)for(let y=2;y<=node.roof.eaveY-2;y++){
  if(x===(west?left:right)){
   if(vox.get(k(x,y,zb))!==oldMap.get(k(x,y,zb)))
    fail('EXTERIOR_Z_SEAM_CHANGED');
   protectedExteriorSeamCells++;
   continue;
  }
  const shouldBeAir=publicPortalAxis==='Z'&&
   x>=portalX&&x<portalX+2&&y<=4;
  if(shouldBeAir){
   if(vox.has(k(x,y,zb)))fail('PUBLIC_Z_PORTAL_NOT_PHYSICAL');
  }else if(vox.get(k(x,y,zb))!==wall)
   fail('INTERIOR_Z_FACADE_INCOMPLETE');
  else newFacades++;
 }
 for(let x=node.x;x<node.x+node.width;x++)
  for(let z=node.z;z<node.z+node.depth;z++)
   for(let y=node.roof.eaveY-1;y<design0.bounds.height;y++){
    if(x>=left&&x<=right&&z>=top&&z<=bottom)continue;
    if(oldMap.has(k(x,y,z))){
     roofOutsidePreserved++;
     if(vox.get(k(x,y,z))!==oldMap.get(k(x,y,z)))
      fail('REMAINING_ROOF_DAMAGED');
    }
   }
 if(roofOutsidePreserved<20)fail('NO_REMAINING_ORIGINAL_ROOF_PROOF');
 let fixtureVoxels=0;
 const targets=base.plan.fixtures.map(f=>{
  const zone=base.plan.nodes.find(n=>n.id===f.nodeId);
  if(!zone)fail('FIXTURE_ZONE');
  const origin=[zone.x+f.offsetX,2,zone.z+f.offsetZ];
  for(let x=origin[0];x<origin[0]+f.width;x++)
   for(let z=origin[2];z<origin[2]+f.depth;z++)
    for(let y=2;y<2+f.height;y++){
     const id=k(x,y,z);
     if(!oldMap.has(id))continue;
     fixtureVoxels++;
     if(vox.get(id)!==oldMap.get(id))fail('FUNCTIONAL_FIXTURE_LOST');
    }
  return {id:f.id,zoneId:f.nodeId,origin,
   size:[f.width,f.height,f.depth]};
 });
 if(fixtureVoxels<1)fail('NO_ORIGINAL_FIXTURE_PROOF');
 let glazing;
 try{glazing=proveRankedExteriorPhysicalGlazing(
  {plan:base.plan,b143:{compiled:final}},base.chosenWindowFaces);
 }catch{fail('ORIGINAL_REAL_WINDOW_DAMAGED');}
 const entrance=design0.elements.find(e=>e.id==='exterior-entrance'&&e.mode==='cut');
 if(!entrance||entrance.shape!=='box'||entrance.size[0]<2)
  fail('ORIGINAL_REAL_ENTRANCE_MISSING');
 for(let x=entrance.origin[0];x<entrance.origin[0]+entrance.size[0];x++)
  for(let z=entrance.origin[2];z<entrance.origin[2]+entrance.size[2];z++)
   for(let y=2;y<Math.min(design0.bounds.height,entrance.origin[1]+entrance.size[1]);y++)
    if(vox.get(k(x,y,z))!==oldMap.get(k(x,y,z)))
     fail('ORIGINAL_ENTRANCE_CHANGED');
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled:final,program:base.b143.program,
  sourceSha256:final.sourceSha256,geometrySha256:final.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.some(f=>!f.reachableFromEntrance))
  fail('ORIGINAL_PROGRAM_ACCESS_LOST');
 const start=[entrance.origin[0],entrance.origin[2]+1];
 const inside=publicPortalAxis==='X'?
  [west?xb:xb-1,portalZ]:
  [portalX,north?zb:zb-1];
 const outside=publicPortalAxis==='X'?
  [west?xb-2:xb+1,portalZ]:
  [portalX,north?zb-2:zb+1];
 const access=twoByTwoAccess(final,design,start,inside,outside);
 if(base.readiness!=='NOT_PREPARED'||base.worldContacts!==0||
  base.worldWrites!==0||base.constructionApproved!==false||
  base.executionAllowed!==false||base.BuildPlan.operations.length!==0||
  base.gates.length!==9||base.gates.some(g=>g!=='BLOCKED'))
  fail('FROZEN_SAFETY_DRIFT');
 return {
  schema:'r125-v4e-author-primary-massing-sky-void-source-v1',
  authoredVoid:v,
  baselineGeometrySha256:old.geometrySha256,
  finalGeometrySha256:final.geometrySha256,
  b143Design:design,b143Compiled:final,sourceRoutes:routes,
  sourceMassingWitness:{
   removedOriginalRoofVoxels:roofRemoved,
   genuinelyOpenSkyFloorCells:voidAirColumns,
   newPhysicalFacadeVoxels:newFacades,
   protectedExteriorFacadeSeamCells:protectedExteriorSeamCells,
   retainedOriginalRoofVoxels:roofOutsidePreserved,
   protectedFixtureVoxels:fixtureVoxels,
   originalGlassAndBothAirLayers:glazing,
   originalEntranceToOpenSky:access,
   authorSelectedPublicPortalAxis:publicPortalAxis,
   publicPortalAuthored,
   physicallyVerifiedPublicPortalWallCells:6,
   principalVolumeContoured:true,
   roofEdgeWeatherproofing:'NOT_TESTED',
   structuralAdequacy:'NOT_TESTED',
   humanArt:'NOT_REVIEWED',
   authorIdentity:'SYNTHETIC_OR_UNATTESTED'
  },
  architectureQuality:'ART_HOLD',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
