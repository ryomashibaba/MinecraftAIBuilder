/**
 * V4J opt-in physically accessible three-bay public approach arcade.
 * The AUTHOR chooses an exterior ROOFLINE / materials / function; the host
 * ONLY executes and verifies exact geometry against real prior V4H B143.
 * NO genre fixed styling, host repair, world construction or ART grading.
 */
import {compileMezzanineAuthorIntent,MEZZANINE_SCHEMA}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
import {auditB143ProjectedVisibility}
 from '../scripts/r125-v4e-visibility-delta.mjs';
import {packV4JWithoutAnyGeometryChanges}
 from './r125-v4j-lossless-b143-pack.mjs';
const fail=x=>{throw Error('R125_V4J_PUBLIC_ARCADE_'+x);};
const K=(x,y,z)=>x+','+y+','+z;
const exact=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===fields.slice().sort().join('|');
const box=(id,origin,size,material)=>({id,shape:'box',mode:'add',origin,size,material});
function continuousTwoWideWalk(occupied,bounds,entrance,covered){
 const clear=(x,z)=>{
  if(x<0||z<0||x+1>=bounds.width||z+1>=bounds.depth)return false;
  for(let xx=x;xx<x+2;xx++)for(let zz=z;zz<z+2;zz++)
   if(!occupied.has(K(xx,1,zz))||
      occupied.has(K(xx,2,zz))||occupied.has(K(xx,3,zz)))return false;
  return true;
 };
 if(!clear(...entrance)||!clear(...covered))
  fail('EXISTING_MAIN_ENTRANCE_OR_CIVIC_ROUTE_AIR_BLOCKED');
 const seen=new Set([entrance.join(',')]),todo=[entrance];
 for(let i=0;i<todo.length;i++){
  const [x,z]=todo[i];
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   // Use consistent pair IDs: forbid a hidden diagonal shortcut.
   const pair=[x+dx,z+dz],p=pair.join(',');
   if(!seen.has(p)&&clear(...pair)){seen.add(p);todo.push(pair);}
  }
 }
 if(!seen.has(covered.join(',')))
  fail('TWO_WIDE_ENTRY_TO_AUTHORED_ARCADE_UNREACHABLE');
 return {supportedAirClearTwoWidePads:seen.size,
  entrance,publicRoofZone:covered,width:2,
  actualMinecraftWalking:'NOT_TESTED'};
}
export function compileAuthoredCivicApproachArcade(originalMezzanineAuthor,authorArcade){
 const raw=structuredClone(originalMezzanineAuthor),
  a=structuredClone(authorArcade);
 if(!exact(a,['width','depth','setback','roofline','postMaterial',
  'roofMaterial','serviceMaterial','purpose'])||
  ![12,15].includes(a.width)||
  !Number.isSafeInteger(a.depth)||a.depth<3||a.depth>5||
  !Number.isSafeInteger(a.setback)||a.setback<0||a.setback>1||
  !Array.isArray(a.roofline)||a.roofline.length!==3||
  !a.roofline.every(v=>Number.isSafeInteger(v)&&v>=8&&v<=12)||
  a.roofline[0]===a.roofline[1]&&a.roofline[1]===a.roofline[2]||
  !['stone','wood','concrete','metal','accent'].includes(a.postMaterial)||
  !['stone','wood','concrete','metal'].includes(a.roofMaterial)||
  !['stone','wood','concrete','metal','accent'].includes(a.serviceMaterial)||
  typeof a.purpose!=='string'||a.purpose.length<12||a.purpose.length>160||
  /[\u0000-\u001f<>]/.test(a.purpose))
  fail('AUTHOR_3_BAY_FUNCTIONAL_FACADE_CONTRACT');
 if(raw?.schema!==MEZZANINE_SCHEMA)
  fail('EXPLICIT_WHOLE_BUILDING_AUTHOR_REQUIRED');
 const base=compileMezzanineAuthorIntent(raw),design0=base.b143.design,
  old=base.b143.compiled;
 const root=base.plan.nodes[0],entry=base.plan.entry;
 if(!root||root.kind!=='covered'||!entry||entry.nodeId!==root.id)
  fail('AUTHOR_MAIN_ENTRY_NOT_COVERED');
 const actualEntry=design0.elements.find(e=>e.id==='exterior-entrance');
 const oldCanopy=design0.elements.find(e=>e.id==='public-entry-canopy');
 const plaza=design0.elements.find(e=>e.id==='outside-public-approach');
 if(!actualEntry||!oldCanopy||!plaza||actualEntry.mode!=='cut'||
  plaza.material!==base.plan.materials.public)
  fail('ORIGINAL_ENTRY_CANOPY_AND_PUBLIC_PLAZA_MISSING');
 const centerX=actualEntry.origin[0],left=centerX-Math.floor(a.width/2)+1,
  right=left+a.width-1;
 const front=plaza.origin[2]+a.setback,end=front+a.depth-1,
  originalCanopyFront=oldCanopy.origin[2];
 if(left<plaza.origin[0]||right>=plaza.origin[0]+plaza.size[0]||
  front<plaza.origin[2]||end>=plaza.origin[2]+plaza.size[2]||
  // Author's NEW truly exterior portico must NOT be a second roof stacked
  // above/below the EXISTING entry canopy: preserve real covered passage.
  end>=originalCanopyFront-1||front<0||right>=design0.bounds.width)
  fail('AUTHOR_OUTDOOR_ARCADE_NOT_DISTINCT_FROM_OLD_CANOPY');
 const before=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 const planned=new Map(),extra=[];
 const stage=(id,origin,size,mat,repeat=null)=>{
  const obj=box(id,origin,size,mat);
  if(repeat)obj.repeat={count:2,offset:repeat};
  extra.push(obj);
  const im=MATERIALS.indexOf(mat);
  for(let i=0;i<(repeat?2:1);i++){
   const v=origin.map((x,j)=>x+i*(repeat?.[j]??0));
   for(let x=v[0];x<v[0]+size[0];x++)
    for(let y=v[1];y<v[1]+size[1];y++)
     for(let z=v[2];z<v[2]+size[2];z++){
      if(x<0||x>=design0.bounds.width||y<2||
         y>=design0.bounds.height||z<0||z>=design0.bounds.depth)
       fail('PUBLIC_ARCADE_DESIGN_OUT_OF_B143_BOUNDS');
      const id=K(x,y,z);
      if(planned.has(id)&&planned.get(id)!==im)
       fail('POST_ROOFLINE_NEW_MATERIAL_CONFLICT');
      planned.set(id,im);
     }
  }
 };
 const step=a.width/3;
 for(let i=0;i<3;i++)
  stage('facade-civic-bay-roof-'+i,
   [left+i*step,a.roofline[i],front],
   [step,1,a.depth],a.roofMaterial);
 // True risers connect the three authored roof elevations physically, so
 // changing their height is not a disconnected ornament in the air.
 let riserCells=0;
 for(let i=0;i<2;i++){
  const low=Math.min(a.roofline[i],a.roofline[i+1]),
   high=Math.max(a.roofline[i],a.roofline[i+1]);
  if(low===high)continue;
  const x=a.roofline[i]>a.roofline[i+1]?
   left+(i+1)*step-1:left+(i+1)*step;
  stage('facade-civic-roof-riser-'+i,[x,low,front],
   [1,high-low,a.depth],a.postMaterial);
  riserCells+=(high-low)*a.depth;
 }
 // Four structural frame lines front/back. Central 2-wide passage does
 // NOT cross any of these. Every roof bay gets a real pair of support lines.
 const positions=[left,left+step,left+2*step,right];
 for(let i=0;i<4;i++){
  const roofY=a.roofline[Math.min(i,2)];
  stage('facade-civic-paired-support-'+i,[positions[i],2,front],
   [1,roofY-2,1],a.postMaterial,[0,0,a.depth-1]);
 }
 // Genuine public service surfaces under the roof, on BOTH sides of
 // the continuous entrance-to-forecourt two-wide central walking lane.
 const zService=front+a.depth-2,
  serviceX=[left+1,right-2];
 for(const [i,x] of serviceX.entries()){
  stage('facade-civic-function-workpoint-'+i,
   [x,2,zService],[2,1,1],a.serviceMaterial);
 }
 const requiredSaved=Math.max(0,design0.elements.length+extra.length-160);
 const packing=packV4JWithoutAnyGeometryChanges(design0,old,requiredSaved);
 for(const [id,mat] of planned){
  if(before.has(id))
   fail('NEW_FUNCTION_OVERWRITES_ANY_PROTECTED_OLD_VOXEL');
 }
 const design={...packing.design,elements:[
  ...packing.design.elements.map(e=>structuredClone(e)),...extra]};
 if(design.elements.length>160)fail('B143_LIMIT_NOT_RELAXED');
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256===old.geometrySha256)
  fail('AUTHORED_ARCADE_NOT_GENUINE_B143');
 const after=new Map(compiled.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 for(const [id,mat] of before)if(after.get(id)!==mat)
  fail('V4H_ORIGINAL_WINDOW_ROOF_STAIRS_OR_FUNCTION_DAMAGED');
 for(const [id,mat] of planned)if(after.get(id)!==mat)
  fail('TRUE_NEW_AUTHOR_VOXEL_MISSING');
 for(const [id,mat] of after)
  if(!before.has(id)&&planned.get(id)!==mat)
   fail('UNAUTHORISED_REAL_NEW_VOXEL');
 // Forbid copying a decorative canopy with no usable public floor.
 let roofCells=0,pairedPosts=0,workCells=0;
 for(let i=0;i<3;i++){
  for(let x=left+i*step;x<left+(i+1)*step;x++)
   for(let z=front;z<=end;z++){
    if(after.get(K(x,a.roofline[i],z))!==MATERIALS.indexOf(a.roofMaterial))
     fail('TRUE_AUTHORED_PUBLIC_ROOFLINE_MISSING');
    if(!after.has(K(x,1,z)))fail('COVERED_PUBLIC_FLOOR_MISSING');
    roofCells++;
   }
 }
 for(let i=0;i<4;i++)for(const z of [front,end])
  for(let y=2;y<a.roofline[Math.min(i,2)];y++){
   if(after.get(K(positions[i],y,z))!==MATERIALS.indexOf(a.postMaterial))
    fail('REAL_2_ROW_STRUCTURAL_FRAMES_MISSING');
   pairedPosts++;
  }
 for(const x of serviceX){
  for(let xx=x;xx<x+2;xx++){
   if(after.get(K(xx,2,zService))!==MATERIALS.indexOf(a.serviceMaterial))
    fail('PUBLIC_WORKSTATION_NOT_ACTUALLY_BUILT');
   workCells++;
  }
 }
 const walking=continuousTwoWideWalk(after,design.bounds,
  [centerX,actualEntry.origin[2]+1],[centerX,front]);
 // Add a FUNCTIONAL exterior source zone with service targets, plus every
 // original interior & upper workpoint; neither may silently disappear.
 const outerId='author-public-forecourt-arcade';
 const program=[...base.b143.program,
  {level:0,standingFloorY:2,zones:[{id:outerId,purpose:a.purpose,
   range:{x:[left,right],z:[front,end]}}]}];
 const oldFeatureTargets=base.plan.fixtures.map(f=>{
  const n=base.plan.nodes.find(q=>q.id===f.nodeId);
  return {id:f.id,zoneId:f.nodeId,
   origin:[n.x+f.offsetX,2,n.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 const upperZone=base.b143.program.flatMap(x=>x.zones??[])
  .find(x=>x.id.startsWith('upper-'));
 const upstairsDesk=design0.elements.find(e=>
  e.id==='mezz-authored-public-service-desk');
 if(!upperZone||!upstairsDesk)fail('REAL_EXISTING_UPPER_FUNCTION_MISSING');
 oldFeatureTargets.push({id:'upper-public-service',zoneId:upperZone.id,
  origin:upstairsDesk.origin,size:upstairsDesk.size});
 for(const [i,x] of serviceX.entries())oldFeatureTargets.push({
  id:'public-forecourt-workpoint-'+i,zoneId:outerId,
  origin:[x,2,zService],size:[2,1,1]});
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:oldFeatureTargets});
 const newZone=routes.zones.find(z=>z.id===outerId),
  upstairs=routes.zones.find(z=>z.id===upperZone.id);
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.some(f=>!f.reachableFromEntrance)||
  !newZone?.reachedFromEntrance||!upstairs?.reachedFromEntrance||
  routes.featureAccess.filter(x=>x.zoneId===outerId&&x.reachableFromEntrance).length!==2)
  fail('PUBLIC_AND_UPPER_PROGRAM_CONNECTION_NOT_PROVEN');
 const visibility=auditB143ProjectedVisibility(old.primitives,compiled.primitives);
 const roof=visibility.views.find(v=>v.face==='roof'),
  north=visibility.views.find(v=>v.face==='north');
 if(roof.depthChangedCells<a.width*a.depth||
  north.depthChangedCells<6)
  fail('ACTUAL_EXTERIOR_VISIBLE_ARCHITECTURAL_CHANGE_INSUFFICIENT');
 if(base.worldWrites!==0||base.worldContacts!==0||
  base.readiness!=='NOT_PREPARED'||base.constructionApproved!==false||
  base.executionAllowed!==false||base.gates.length!==9||
  base.gates.some(g=>g!=='BLOCKED')||base.BuildPlan.operations.length!==0)
  fail('FROZEN_PROTECTED_WORLD_GATES_DRIFT');
 return {
  schema:'r125-v4j-authored-functional-forecourt-architecture-source-v1',
  originalMezzanineAuthor:raw,originalArcadeAuthor:a,
  priorGeometrySha256:old.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  b143Design:design,b143Compiled:compiled,b143Program:program,
  sourceRoutes:routes,
  sourceWitness:{
   purpose:a.purpose,authorBayRoofline:a.roofline,
   trueDistinctExteriorRoofCells:roofCells,
   actualConnectedRoofRiserCells:riserCells,
   actualEightPhysicalSupportColumns:8,
   actualSupportColumnCells:pairedPosts,
   actualTwoWorkstationCells:workCells,
   realPublicFloorContinuity:walking,
   entranceToNewPublicZone:newZone,
   preservedRealUpperPublicZone:upstairs,
   allFunctionsReachable:true,
   physicallyNewB143VoxelCount:planned.size,
   genuineVisibleFiveViewDelta:visibility,
   losslessOriginalB143Packing:packing.proof,
   skylineAndForecourtAreOutsidePriorCanopy:true,
   realHumanArt:'NOT_REVIEWED',originalModel:'NOT_TESTED',
   trueMinecraftWalking:'NOT_TESTED',physicalStructuralSafety:'NOT_TESTED'
  },
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
