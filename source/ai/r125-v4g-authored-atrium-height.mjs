/**
 * R125 V4G OPT-IN substantial inhabited height research: author chooses a
 * functional covered room, atrium floor footprint, 7..11 voxel lift, roof form.
 * Remove old roof over the FULL usable hall, then build real tall load-path
 * perimeter, glass clerestory with verified inner/outer AIR, and sloping roof.
 *
 * Compiled B143 proofs only, not engineering/weather/ART/Minecraft approval.
 * R125 / V4D / V4E / V4F default and Education are not modified.
 */
import {compileFloorplateAuthorIntent,FLOORPLATE_SCHEMA}
 from './r125-v4f-floorplate-author-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {auditB143ProjectedVisibility}
 from '../../scripts/r125-v4e-visibility-delta.mjs';
const fail=s=>{throw Error('R125_V4G_ATRIUM_'+s);};
const K=(x,y,z)=>x+','+y+','+z;
const exact=(o,ks)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===ks.slice().sort().join('|');
const box=(id,mode,origin,size,material)=>({id,shape:'box',mode,
 ...(mode==='add'?{material}:{}),origin,size});
const roofAt=(kind,offset,length,base)=>{
 const shed=kind.startsWith('shed');
 const percent=shed?offset/(length-1):
  1-Math.abs(2*offset/(length-1)-1);
 return base+Math.round(4*percent);
};
function verifiedTwoWideHallAccess(vox,bounds,entry,goal){
 const clear=(x,z)=>{
  if(x<0||z<0||x+1>=bounds.width||z+1>=bounds.depth)return false;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
   if(!vox.has(K(x+dx,1,z+dz))||
      vox.has(K(x+dx,2,z+dz))||vox.has(K(x+dx,3,z+dz)))return false;
  return true;
 };
 if(!clear(...entry)||!clear(...goal))fail('HALL_FLOOR_AIR_OR_ENTRY_PAD_MISSING');
 const queue=[entry],seen=new Set([entry.join(',')]);
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const p=[x+dx,z+dz],id=p.join(',');
   if(!seen.has(id)&&clear(...p)){seen.add(id);queue.push(p);}
  }
 }
 if(!seen.has(goal.join(',')))fail('REAL_ENTRANCE_TO_TALL_HALL_UNREACHABLE');
 return {width:2,realSupportedPadsReached:seen.size,
  support:'ACTUAL_B143_Y1',headroom:'ACTUAL_B143_Y2_Y3_AIR',
  minecraftWalking:'NOT_TESTED'};
}
export function compileAuthoredTallPublicHall(originalFloorplateAuthor,requestedAtrium){
 const raw=structuredClone(originalFloorplateAuthor),a=structuredClone(requestedAtrium);
 if(!exact(a,['spaceId','offsetX','offsetZ','width','depth','lift','roofForm'])||
  typeof a.spaceId!=='string'||
  !['ridgeX','ridgeZ','shedX','shedZ'].includes(a.roofForm)||
  !Number.isSafeInteger(a.offsetX)||a.offsetX<3||a.offsetX>7||
  !Number.isSafeInteger(a.offsetZ)||a.offsetZ<3||a.offsetZ>7||
  !Number.isSafeInteger(a.width)||a.width<10||a.width>16||
  !Number.isSafeInteger(a.depth)||a.depth<10||a.depth>16||
  !Number.isSafeInteger(a.lift)||a.lift<7||a.lift>11)
  fail('AUTHOR_HEIGHT_SECTION_CONTRACT');
 if(raw?.schema!==FLOORPLATE_SCHEMA)
  fail('WHOLE_BUILDING_AUTHOR_REQUIRED');
 const prior=compileFloorplateAuthorIntent(raw);
 const node=prior.plan.nodes.find(n=>n.id===a.spaceId);
 if(!node||node.kind!=='covered'||a.offsetX+a.width>node.width-3||
  a.offsetZ+a.depth>node.depth-3)
  fail('AUTHOR_HALL_NOT_INSIDE_REAL_COVERED_ROOM');
 const left=node.x+a.offsetX,top=node.z+a.offsetZ;
 const right=left+a.width-1,bottom=top+a.depth-1;
 const startY=node.roof.eaveY-1,
  baseRoof=node.roof.peakY+a.lift,glassLow=baseRoof-4;
 const axisX=a.roofForm.endsWith('X'),run=axisX?a.width:a.depth;
 const upperRoof=baseRoof+4,height=Math.max(prior.b143.design.bounds.height,upperRoof+5);
 if(height>96||glassLow<node.roof.peakY+2||height*a.width*a.depth>500000)
  fail('ATRIUM_ROOF_ENCLOSURE_OUT_OF_BOUNDS');
 const oldDesign=prior.b143.design,oldCompiled=prior.b143.compiled;
 const before=new Map(oldCompiled.primitives.map(v=>[K(v[0],v[1],v[2]),v[3]]));
 const roofMaterial=MATERIALS.indexOf(prior.plan.materials.roof),
  wallMaterial=MATERIALS.indexOf(prior.plan.materials.wall),
  glassMaterial=MATERIALS.indexOf('glass');
 const roofCutCells=new Set();
 let oldRoofVoxels=0,oldFloorVoxels=0;
 for(let x=left;x<=right;x++)for(let z=top;z<=bottom;z++){
  if(!before.has(K(x,1,z)))fail('ORIGINAL_REAL_ATRIUM_FLOOR_NOT_PRESENT');
  oldFloorVoxels++;
  let cellRoofCount=0;
  for(let y=startY;y<oldDesign.bounds.height;y++){
   const id=K(x,y,z);
   if(before.has(id)){
    if(before.get(id)!==roofMaterial)
     fail('ATRIUM_OLD_HIGH_VOXEL_NOT_ROOF_MATERIAL');
    oldRoofVoxels++;cellRoofCount++;
   }
   roofCutCells.add(id);
  }
  if(cellRoofCount<1)fail('HALL_INTERSECTS_OLD_OPEN_SKY_OR_SETBACK');
 }
 const elements=[...oldDesign.elements.map(e=>structuredClone(e)),
  box('atr-v4g-old-roof-cut','cut',[left,startY,top],
   [a.width,height-startY,a.depth])];
 const newCells=new Map();
 const put=(x,y,z,m)=>{
  const id=K(x,y,z);
  if(newCells.has(id)&&newCells.get(id)!==m)
   fail('GLASS_WALL_OR_ROOF_CONFLICT');
  if(y<startY||y>=height||x<left||x>right||z<top||z>bottom)
   fail('CROWN_OUTSIDE_AUTHORED_ROOF_SECTION');
  newCells.set(id,m);
 };
 const addSolidBox=(id,origin,size,m,repeatOffset=null)=>{
  const spec=box(id,'add',origin,size,m);
  if(repeatOffset)spec.repeat={count:2,offset:repeatOffset};
  elements.push(spec);
  for(let q=0;q<(repeatOffset?2:1);q++){
   const at=origin.map((v,i)=>v+q*(repeatOffset?.[i]??0));
   for(let x=at[0];x<at[0]+size[0];x++)
    for(let y=at[1];y<at[1]+size[1];y++)
     for(let z=at[2];z<at[2]+size[2];z++)
      put(x,y,z,MATERIALS.indexOf(m));
  }
 };
 const lowerHeight=glassLow-startY;
 if(lowerHeight<6)fail('TALL_ATRIUM_WALL_HEIGHT_INSUFFICIENT');
 // The ring is 1 cell thick, and every exterior glass cell has clear air
 // both outside and inside the NEW atrium superstructure.
 for(const [side,x,z,sx,sz] of [
  ['west',left,top,1,a.depth],
  ['east',right,top,1,a.depth],
  ['north',left+1,top,a.width-2,1],
  ['south',left+1,bottom,a.width-2,1]
 ]){
  addSolidBox('atr-v4g-ground-ring-'+side,[x,startY,z],[sx,lowerHeight,sz],
   prior.plan.materials.wall);
 }
 // Full-height corner mullions in the clerestory band.
 for(const [i,x,z] of [[0,left,top],[1,left,bottom],[2,right,top],[3,right,bottom]])
  addSolidBox('atr-v4g-corner-mullion-'+i,[x,glassLow,z],
   [1,3,1],prior.plan.materials.wall);
 const glassSegments=[
  ['west',left,top+1,1,a.depth-2],
  ['east',right,top+1,1,a.depth-2],
  ['north',left+1,top,a.width-2,1],
  ['south',left+1,bottom,a.width-2,1]
 ];
 for(const [side,x,z,sx,sz] of glassSegments)
  addSolidBox('atr-v4g-actual-clerestory-'+side,[x,glassLow,z],
   [sx,3,sz],'glass');
 // Continuous real superstructure above every glass panel up to each actual
 // slope segment; north/south or east/west receive authored stepped gables.
 const highBase=baseRoof-1;
 for(let j=0;j<run;){
  const roofY=roofAt(a.roofForm,j,run,baseRoof);
  let end=j+1;
  while(end<run&&roofAt(a.roofForm,end,run,baseRoof)===roofY)end++;
  const span=end-j,stepX=axisX?left+j:left,stepZ=axisX?top:top+j;
  const stepSize=axisX?[span,1,a.depth]:[a.width,1,span];
  addSolidBox('atr-v4g-roof-step-'+j,[stepX,roofY,stepZ],
   stepSize,prior.plan.materials.roof);
  const gableSize=axisX?[span,roofY-highBase,1]:[1,roofY-highBase,span];
  const opposite=axisX?[0,0,a.depth-1]:[a.width-1,0,0];
  addSolidBox('atr-v4g-gable-pair-'+j,[stepX,highBase,stepZ],
   gableSize,prior.plan.materials.wall,opposite);
  j=end;
 }
 // Short-end solid upper walls above the clerestory and beneath the slope.
 // Perimeter corners overlap identical wall material only.
 const endFaces=axisX?
  [[left,top,1,a.depth],[right,top,1,a.depth]]:
  [[left,top,a.width,1],[left,bottom,a.width,1]];
 for(const [i,[x,z,sx,sz]] of endFaces.entries()){
  const roofY=roofAt(a.roofForm,i===0?0:run-1,run,baseRoof);
  addSolidBox('atr-v4g-end-gable-'+i,[x,highBase,z],
   [sx,roofY-highBase,sz],prior.plan.materials.wall);
 }
 if(elements.length>160)fail('B143_ELEMENT_BUDGET');
 const design={...oldDesign,bounds:{...oldDesign.bounds,height},elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.geometrySha256===oldCompiled.geometrySha256)
  fail('TRUE_RAISED_B143_GEOMETRY_NOT_COMPILED');
 const after=new Map(compiled.primitives.map(v=>[K(v[0],v[1],v[2]),v[3]]));
 for(const [id,m] of before)if(!roofCutCells.has(id)&&after.get(id)!==m)
  fail('EXISTING_FUNCTION_OR_ARCHITECTURE_DAMAGED');
 for(const [id,m] of newCells)
  if(after.get(id)!==m)fail('AUTHOR_TALL_HALL_REAL_VOXEL_MISSING');
 for(const [id,m] of after)
  if(!before.has(id)&&newCells.get(id)!==m)
   fail('UNPLANNED_EXTRA_3D_VOXEL');
 for(const id of roofCutCells)
  if(!newCells.has(id)&&after.has(id))fail('OLD_ROOF_NOT_FULLY_REMOVED');
 // Prove the original hall has become DOUBLE-HEIGHT open air beneath the
 // actual raised roof, rather than a decorative cap over an old roof.
 const centerX=left+Math.floor(a.width/2),centerZ=top+Math.floor(a.depth/2);
 let newUsableHeight=0;
 for(let y=2;y<height;y++){
  if(after.has(K(centerX,y,centerZ)))break;
  newUsableHeight++;
 }
 if(newUsableHeight<node.roof.peakY+a.lift-4)
  fail('CENTRAL_FUNCTIONAL_DOUBLE_HEIGHT_NOT_REAL');
 let roofCells=0,glazedCells=0,glassAirPairs=0,roofConnectedCells=0;
 for(let x=left;x<=right;x++)for(let z=top;z<=bottom;z++){
  const offset=axisX?x-left:z-top,roofY=roofAt(a.roofForm,offset,run,baseRoof);
  if(after.get(K(x,roofY,z))!==roofMaterial)fail('REAL_SLOPED_ROOF_INCOMPLETE');
  roofCells++;
  if(x===left||x===right||z===top||z===bottom){
   if(after.get(K(x,roofY-1,z))!==wallMaterial)
    fail('PHYSICALLY_UNSUPPORTED_CROWN_PERIMETER');
   roofConnectedCells++;
  }
 }
 for(const [side,x,z,sx,sz] of glassSegments)
  for(let xx=x;xx<x+sx;xx++)for(let zz=z;zz<z+sz;zz++)
   for(let yy=glassLow;yy<glassLow+3;yy++){
    if(after.get(K(xx,yy,zz))!==glassMaterial)fail('GLAZING_NOT_REAL');
    const d=side==='west'?[-1,0]:side==='east'?[1,0]:
     side==='north'?[0,-1]:[0,1];
    if(after.has(K(xx+d[0],yy,zz+d[1]))||
       after.has(K(xx-d[0],yy,zz-d[1])))
      fail('CLERESTORY_DOUBLE_AIR_BLOCKED');
    glazedCells++;glassAirPairs+=2;
   }
 const existingWindows=proveRankedExteriorPhysicalGlazing(
  {plan:prior.plan,b143:{compiled}},prior.chosenWindowFaces);
 const features=prior.plan.fixtures.map(f=>{
  const n=prior.plan.nodes.find(q=>q.id===f.nodeId);
  if(!n)fail('ORIGINAL_FUNCTION_NODE_MISSING');
  return {id:f.id,zoneId:f.nodeId,
   origin:[n.x+f.offsetX,2,n.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:prior.b143.program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 },{featureTargets:features});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(q=>!q.reachedFromEntrance)||
  routes.featureAccess.some(q=>!q.reachableFromEntrance))
  fail('AUTHOR_HALL_FUNCTIONAL_ROUTE_BROKEN');
 const entrance=oldDesign.elements.find(e=>e.id==='exterior-entrance');
 if(!entrance)fail('OLD_REAL_MAIN_ENTRANCE_MISSING');
 const walk=verifiedTwoWideHallAccess(after,design.bounds,
  [entrance.origin[0],entrance.origin[2]+1],[centerX-1,centerZ-1]);
 const visibility=auditB143ProjectedVisibility(
  oldCompiled.primitives,compiled.primitives);
 if(visibility.views.find(q=>q.face==='roof').depthChangedCells<100)
  fail('NO_SUBSTANTIVE_ROOF_HEIGHT_DIFFERENCE');
 const oldMaxY=Math.max(...oldCompiled.primitives.map(p=>p[1]));
 const newMaxY=Math.max(...compiled.primitives.map(p=>p[1]));
 if(newMaxY-oldMaxY<5)fail('NO_SUBSTANTIVE_BUILDING_HIGHPOINT_DIFFERENCE');
 if(prior.worldContacts!==0||prior.worldWrites!==0||
  prior.readiness!=='NOT_PREPARED'||prior.constructionApproved!==false||
  prior.executionAllowed!==false||prior.BuildPlan.operations.length!==0||
  prior.gates.length!==9||prior.gates.some(q=>q!=='BLOCKED'))
  fail('FROZEN_WORLD_SAFETY_DRIFT');
 return {
  schema:'r125-v4g-author-tall-inhabited-hall-source-only-v1',
  authoredAtrium:a,originalFloorplateAuthor:raw,
  priorGeometrySha256:oldCompiled.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  b143Design:design,b143Compiled:compiled,sourceRoutes:routes,
  actualSourceWitness:{
   usableGroundLevelAtriumFloorColumns:oldFloorVoxels,
   actuallyRemovedOldRoofVoxels:oldRoofVoxels,
   physicallyPresentRaisedRoofCells:roofCells,
   physicallyConnectedRoofBoundaryCells:roofConnectedCells,
   tallNewRoofBaseY:baseRoof,highRoofY:upperRoof,
   oldBuildingMaximumY:oldMaxY,newBuildingMaximumY:newMaxY,
   actualGainAtHighestVoxel:newMaxY-oldMaxY,
   physicallyGlazedClerestoryCells:glazedCells,
   actualGlassInsideOutsideAIRCells:glassAirPairs,
   verifiedTallHallCenterVerticalAirCells:newUsableHeight,
   verifiedOriginalWindowCells:existingWindows.verifiedPanelGlassCells,
   realHallEntryTwoWideWalk:walk,
   actualVisibleFiveDirections:visibility,
   actualNonRectangularFloorplateRetained:true,
   structuralEngineering:'NOT_TESTED',roofWaterproofing:'NOT_TESTED',
   humanArt:'NOT_REVIEWED',realModelAuthorship:'NOT_TESTED',
   realMinecraftWalking:'NOT_TESTED'
  },
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
