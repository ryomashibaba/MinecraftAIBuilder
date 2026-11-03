/**
 * V4E OPT-IN covered-floorplate setback. AUTHOR chooses one real covered
 * functional volume and an exterior corner. Cut the entire 3-D wedge,
 * INCLUDING its footprint floor and roof, then build connected inner external
 * facades up to the first existing roof voxel at each position.
 *
 * Not an exterior decorative wing, not a hollow roof, not a world operation.
 * This is an intentionally limited single-storey L-footprint research step.
 * SOURCE is fail-closed; weather, structure, ART, true LLM and Minecraft
 * walking all remain explicitly unverified.
 */
import {compileWingAuthorIntent,WING_SCHEMA} from './r125-v4e-wing-author-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {auditB143ProjectedVisibility}
 from '../../scripts/r125-v4e-visibility-delta.mjs';

const fail=s=>{throw Error('R125_V4E_FLOORPLATE_'+s);};
const key=(x,y,z)=>x+','+y+','+z;
const exact=(v,fields)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===fields.slice().sort().join('|');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
});
const reverse={north:'south',south:'north',east:'west',west:'east'};

export function compileAuthoredCoveredFloorplateSetback(originalWingAuthor,authoredSetback){
 const raw=structuredClone(originalWingAuthor),cut=structuredClone(authoredSetback);
 if(!exact(cut,['spaceId','corner','width','depth'])||
  typeof cut.spaceId!=='string'||!['NW','NE','SW','SE'].includes(cut.corner)||
  !Number.isSafeInteger(cut.width)||cut.width<6||cut.width>8||
  !Number.isSafeInteger(cut.depth)||cut.depth<6||cut.depth>8)
  fail('AUTHOR_CORNER_CONTRACT');
 if(raw?.schema!==WING_SCHEMA)fail('NOT_AN_AUTHORED_WHOLE_BUILDING');
 const base=compileWingAuthorIntent(raw);
 const node=base.plan.nodes.find(n=>n.id===cut.spaceId);
 if(!node||node.kind!=='covered'||
  node.width<2*cut.width+6||node.depth<2*cut.depth+6)
  fail('COVERED_FUNCTIONAL_VOLUME_TOO_SMALL');
 const north=cut.corner[0]==='N',west=cut.corner[1]==='W';
 const sideX=west?'west':'east',sideZ=north?'north':'south';
 if(base.plan.links.some(l=>
  l.from===node.id&&(l.side===sideX||l.side===sideZ)||
  l.to===node.id&&(reverse[l.side]===sideX||reverse[l.side]===sideZ)))
  fail('AUTHOR_SETBACK_INTERSECTS_REAL_SHARED_BOUNDARY');
 const left=west?node.x:node.x+node.width-cut.width;
 const top=north?node.z:node.z+node.depth-cut.depth;
 const right=left+cut.width-1,bottom=top+cut.depth-1;
 const bx=west?right+1:left-1,bz=north?bottom+1:top-1;
 const oldDesign=base.b143.design,oldCompiled=base.b143.compiled;
 const old=new Map(oldCompiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const height=oldDesign.bounds.height,roofBottom=node.roof.eaveY-1;
 if(height<node.roof.peakY+4)fail('UNVERIFIED_ROOF_HEIGHT_BOUND');
 const requiredRemoved=new Set();
 let roofCut=0,originalFloorCut=0;
 for(let x=left;x<=right;x++)for(let z=top;z<=bottom;z++){
  if(!old.has(key(x,1,z)))fail('ORIGINAL_COVERED_FLOOR_NOT_PRESENT');
  originalFloorCut++;
  let roofHere=0;
  for(let y=1;y<height;y++){
   const id=key(x,y,z);
   requiredRemoved.add(id);
   if(y>=roofBottom&&old.has(id)){roofCut++;roofHere++;}
  }
  // Do not re-cut the already open-sky public void or a different author wing.
  if(!roofHere)fail('AUTHOR_SETBACK_OVERLAPS_PREVIOUS_SKY_VOID');
 }
 const protectedOuterEdge=(x,z)=>
  (west?x===left:x===right)||(north?z===top:z===bottom);
 // The two L-shaped new exposed walls sit one step inside the removed footprint.
 // Outer-edge original walls are retained and cannot be silently overwritten.
 const positions=[];
 for(let z=top;z<=bottom;z++)
  if(z!==(north?top:bottom))positions.push([bx,z]);
 for(let x=left;x<=right;x++)
  if(x!==(west?left:right))positions.push([x,bz]);
 positions.push([bx,bz]); // seal the single-cell diagonal seam
 const wallMaterial=MATERIALS.indexOf(base.plan.materials.wall);
 const expectedWall=new Map(),walls=[];
 for(const [i,[x,z]] of positions.entries()){
  let roofY=null;
  for(let y=roofBottom;y<height;y++)
   if(old.has(key(x,y,z))){roofY=y;break;}
  if(roofY===null||roofY<5)fail('NEW_EXPOSED_WALL_HAS_NO_ADJACENT_ROOF');
  const wallHeight=roofY-2;
  if(wallHeight<3)fail('EXPOSED_WALL_TOO_LOW');
  for(let y=2;y<roofY;y++){
   const id=key(x,y,z);
   if(requiredRemoved.has(id))fail('NEW_WALL_OVERLAPS_AUTHORED_CUT');
   if(old.has(id))fail('NEW_WALL_WOULD_OVERWRITE_ORIGINAL_FUNCTION');
   if(expectedWall.has(id))fail('DUPLICATE_NEW_WALL_CELL');
   expectedWall.set(id,wallMaterial);
  }
  walls.push(box('floorplate-inner-wall-'+i,'add',
   [x,2,z],[1,wallHeight,1],base.plan.materials.wall));
 }
 const elements=[...oldDesign.elements.map(v=>structuredClone(v)),
  box('floorplate-whole-corner-cut','cut',[left,1,top],
   [cut.width,height-1,cut.depth]),...walls];
 if(elements.length>160)fail('B143_ELEMENTS_OVER_BUDGET');
 const design={...oldDesign,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.geometrySha256===oldCompiled.geometrySha256)
  fail('NO_REAL_B143_CHANGE');
 const vox=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 for(const id of requiredRemoved)if(vox.has(id))
  fail('RECESSED_WHOLE_COLUMN_NOT_EMPTY');
 for(const [id,material] of expectedWall)
  if(vox.get(id)!==material)fail('NEW_PHYSICAL_EXTERIOR_WALL_MISSING');
 // Nothing except the specified roof-to-floor cut and the new walls may change.
 for(const [id,m] of old)
  if(!requiredRemoved.has(id)&&vox.get(id)!==m)
   fail('PREVIOUS_REAL_PROGRAM_VOXEL_CHANGED');
 for(const [id,m] of vox)
  if(!old.has(id)&&expectedWall.get(id)!==m)
   fail('UNAUTHORIZED_EXTRA_VOXEL');
 const glazing=proveRankedExteriorPhysicalGlazing(
  {plan:base.plan,b143:{compiled}},base.chosenWindowFaces);
 const featureTargets=base.plan.fixtures.map(f=>{
  const n=base.plan.nodes.find(n=>n.id===f.nodeId);
  if(!n)fail('MISSING_FUNCTIONAL_NODE');
  return {id:f.id,zoneId:f.nodeId,
   origin:[n.x+f.offsetX,2,n.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 for(const f of featureTargets){
  let actual=0;
  for(let x=f.origin[0];x<f.origin[0]+f.size[0];x++)
   for(let y=f.origin[1];y<f.origin[1]+f.size[1];y++)
    for(let z=f.origin[2];z<f.origin[2]+f.size[2];z++){
     const id=key(x,y,z);
     if(old.has(id)){actual++;if(vox.get(id)!==old.get(id))
      fail('MODEL_AUTHORED_FUNCTIONAL_EQUIPMENT_LOST');}
    }
  if(!actual)fail('ORIGINAL_FUNCTIONAL_EQUIPMENT_NOT_PHYSICAL');
 }
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.b143.program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 },{featureTargets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(x=>!x.reachedFromEntrance)||
  routes.featureAccess.some(x=>!x.reachableFromEntrance))
  fail('FUNCTIONAL_TWO_WIDE_ACCESS_DAMAGED');
 const visibility=auditB143ProjectedVisibility(
  oldCompiled.primitives,compiled.primitives);
 const roofView=visibility.views.find(v=>v.face==='roof');
 if(roofView.silhouetteChangedCells<cut.width*cut.depth)
  fail('MAIN_COVERED_FOOTPRINT_NOT_VISIBLY_NONRECTANGULAR');
 if(base.worldWrites!==0||base.worldContacts!==0||
  base.readiness!=='NOT_PREPARED'||base.constructionApproved!==false||
  base.executionAllowed!==false||
  base.BuildPlan.operations.length!==0||base.gates.length!==9||
  base.gates.some(g=>g!=='BLOCKED'))
  fail('FROZEN_WORLD0_INVARIANTS_CHANGED');
 return {
  schema:'r125-v4e-author-covered-3d-footprint-setback-source-v1',
  authoredSetback:cut,originalWingAuthor:raw,
  unmodifiedPriorGeometrySha256:oldCompiled.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  b143Design:design,b143Compiled:compiled,sourceRoutes:routes,
  actualSourceWitness:{
   coveredRoomId:cut.spaceId,
   originalWalkableFloorColumnsRemoved:originalFloorCut,
   roofVoxelsRemoved:roofCut,
   entire3dRemovedColumns:cut.width*cut.depth,
   physicallyVerifiedNewExternalFacadeCells:expectedWall.size,
   actualNewExternalWallSegments:walls.length,
   everyUnchangedVoxelPreserved:true,
   originalGlassAndBothAirLayers:glazing,
   sourceCirculation:routes.status,
   roofSilhouetteComparison:visibility,
   rootMainRoomModified:cut.spaceId===base.plan.nodes[0].id,
   otherOriginalCoveredRoomModified:cut.spaceId!==base.plan.nodes[0].id,
   newGeometryBeyondGenreSpecificTemplates:true,
   architecturalDesignQuality:'NOT_REVIEWED',
   engineeringWeatherSafety:'NOT_TESTED',
   realMinecraftWalking:'NOT_TESTED',
   trueModelAuthorship:'NOT_TESTED'
  },
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
}
