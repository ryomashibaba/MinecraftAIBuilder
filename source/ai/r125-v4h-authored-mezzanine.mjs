/**
 * V4H opt-in authored *usable* public mezzanine SOURCE: a 2-wide physical
 * stair reaches a supported upper gallery WITH its own program/service point.
 * Not a decorative overhead platform and NOT Minecraft walking certification.
 *
 * Strict author choices are never silently moved. Existing V4G/R125 real
 * world source and the Education path remain unchanged.
 */
import {compileHeightAuthorIntent,HEIGHT_SCHEMA}
 from './r125-v4g-height-author-ir.mjs';
import {compileDesign,verifyCompiled,MATERIALS}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
import {proveRankedExteriorPhysicalGlazing}
 from './r125-v4e-ranked-exterior-ir.mjs';
import {auditB143ProjectedVisibility}
 from '../../scripts/r125-v4e-visibility-delta.mjs';
const fail=s=>{throw Error('R125_V4H_MEZZANINE_'+s);};
const key=(x,y,z)=>x+','+y+','+z;
const exact=(x,ks)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===ks.slice().sort().join('|');
const box=(id,origin,size,material)=>({
 id,shape:'box',mode:'add',origin,size,material
});
export function compileAuthoredPublicMezzanine(heightAuthor,mezzanine){
 const raw=structuredClone(heightAuthor),m=structuredClone(mezzanine);
 if(!exact(m,['side','stairLane','deckOffsetX','deckWidth','rise','purpose'])||
  !['west','east'].includes(m.stairLane)||
  !['north','south'].includes(m.side)||
  !Number.isSafeInteger(m.deckOffsetX)||m.deckOffsetX<1||m.deckOffsetX>3||
  !Number.isSafeInteger(m.deckWidth)||m.deckWidth<8||m.deckWidth>10||
  !Number.isSafeInteger(m.rise)||m.rise<6||m.rise>8||
  typeof m.purpose!=='string'||m.purpose.length<12||m.purpose.length>140||
  /[\u0000-\u001f<>]/.test(m.purpose))
  fail('EXPLICIT_AUTHOR_MEZZANINE_GRAMMAR');
 if(raw?.schema!==HEIGHT_SCHEMA)fail('WHOLE_HEIGHT_AUTHOR_REQUIRED');
 const base=compileHeightAuthorIntent(raw);
 const a=base.authoredAtrium;
 const room=base.plan.nodes.find(n=>n.id===a.spaceId);
 if(!room||room.kind!=='covered')fail('NO_ORIGINAL_COVERED_HALL');
 const x0=room.x+a.offsetX,z0=room.z+a.offsetZ;
 const x=x0+m.deckOffsetX,deckZ=m.side==='north'?z0+1:z0+a.depth-4;
 const deckEndX=x+m.deckWidth-1,deckEndZ=deckZ+2;
 const deckY=1+m.rise,standingY=deckY+1;
 const stairX=m.stairLane==='west'?x+1:deckEndX-2;
 const stairLowZ=m.side==='north'?deckEndZ+1:deckZ-1;
 const stairStartZ=m.side==='north'?stairLowZ+m.rise:stairLowZ-m.rise;
 const dir=m.side==='north'?-1:1;
 if(deckEndX>=x0+a.width-1||
  stairStartZ<z0||stairStartZ>z0+a.depth-1||
  deckY+5>=base.authoredTallHallSourceWitness.tallNewRoofBaseY)
  fail('UPPER_WORKING_GALLERY_DOES_NOT_FIT_AUTHOR_ROOM');
 const oldDesign=base.b143.design,oldCompiled=base.b143.compiled;
 const before=new Map(oldCompiled.primitives.map(v=>[key(v[0],v[1],v[2]),v[3]]));
 const floorMat=base.plan.materials.floor;
 const wallMat=base.plan.materials.wall;
 const serviceMaterial=base.plan.materials.public;
 const planNew=new Map(),elements=[];
 const stage=(id,origin,size,material,repeatOffset=null)=>{
  const spec=box(id,origin,size,material);
  if(repeatOffset)spec.repeat={count:2,offset:repeatOffset};
  elements.push(spec);
  const i=MATERIALS.indexOf(material);
  for(let q=0;q<(repeatOffset?2:1);q++){
   const at=origin.map((v,n)=>v+q*(repeatOffset?.[n]??0));
   for(let xx=at[0];xx<at[0]+size[0];xx++)
    for(let yy=at[1];yy<at[1]+size[1];yy++)
     for(let zz=at[2];zz<at[2]+size[2];zz++){
      const k=key(xx,yy,zz);
      if(planNew.has(k)&&planNew.get(k)!==i)
       fail('NEW_MEZZANINE_ELEMENTS_COLLIDE');
      planNew.set(k,i);
     }
  }
 };
 stage('mezz-public-gallery-floor',[x,deckY,deckZ],[m.deckWidth,1,3],floorMat);
 // Real load-bearing columns all the way down to the existing ground floor.
 for(const [i,zz] of [[0,deckZ],[1,deckEndZ]])
  stage('mezz-public-gallery-support-pair-'+i,
   [x,2,zz],[1,deckY-2,1],wallMat,[m.deckWidth-1,0,0]);
 const stair={id:'mezz-public-actual-two-wide-stair',shape:'staircase',
  mode:'add',material:floorMat,origin:[stairX,1,stairStartZ],
  axis:'z',direction:dir,width:2,steps:m.rise+1,treadDepth:1};
 elements.push(stair);
 const floorIndex=MATERIALS.indexOf(floorMat);
 for(let step=0;step<=m.rise;step++){
  const zz=stairStartZ+dir*step;
  for(let xx=stairX;xx<stairX+2;xx++)
   for(let yy=1;yy<=1+step;yy++){
    const k=key(xx,yy,zz);
    if(planNew.has(k)&&planNew.get(k)!==floorIndex)
     fail('STAIR_WOULD_CUT_PUBLIC_DECK_SUPPORT');
    planNew.set(k,floorIndex);
   }
 }
 // Guard only exposed edges and leave the entire TWO-WIDE stair-to-gallery
 // landing unblocked. No unverified "safe for actual player" certification.
 stage('mezz-upper-guard-pair',[x,deckY+1,deckZ],
  [1,2,3],wallMat,[m.deckWidth-1,0,0]);
 const rimZ=m.side==='north'?deckEndZ:deckZ;
 const gapStart=stairX,gapEnd=stairX+1;
 if(gapStart>x+1)
  stage('mezz-upper-rim-left',[x+1,deckY+1,rimZ],
   [gapStart-(x+1),2,1],wallMat);
 if(gapEnd<deckEndX-1)
  stage('mezz-upper-rim-right',[gapEnd+1,deckY+1,rimZ],
   [deckEndX-gapEnd-1,2,1],wallMat);
 // An author-named usable work point on the raised gallery, NOT only a
 // broad platform. It must have a physically connected adjacent service pad.
 const featureX=deckEndX-2,featureZ=deckZ+1;
 stage('mezz-authored-public-service-desk',
  [featureX,deckY+1,featureZ],[2,1,1],serviceMaterial);
 if(elements.length+oldDesign.elements.length>160)
  fail('B143_ELEMENT_BUDGET');
 // Never silently overwrite prior roof, windows, functional equipment,
 // building envelope, outside public paths or the existing floor material.
 let actuallyNew=0,stairsNew=0,guardNew=0;
 for(const [k,mat] of planNew){
  const beforeMat=before.get(k),y=+k.split(',')[1];
  if(beforeMat!==undefined&&beforeMat!==mat)
   fail('EXISTING_B143_VOXEL_MATERIAL_COLLISION');
  if(beforeMat!==undefined&&y>1)
   fail('EXISTING_FUNCTION_OR_WALKING_COLLISION');
  if(beforeMat===undefined){actuallyNew++;if(y>1)stairsNew++;}
 }
 const design={...oldDesign,elements:[
  ...oldDesign.elements.map(e=>structuredClone(e)),...elements]};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256===oldCompiled.geometrySha256)
  fail('B143_MEZZANINE_NOT_REAL');
 const after=new Map(compiled.primitives.map(v=>[key(v[0],v[1],v[2]),v[3]]));
 for(const [k,mat] of before)if(after.get(k)!==mat)
  fail('PREEXISTING_REAL_B143_INTEGRITY_LOST');
 for(const [k,mat] of planNew)if(after.get(k)!==mat)
  fail('ACTUAL_MEZZANINE_VOXEL_MISSING');
 for(const [k,mat] of after)
  if(!before.has(k)&&planNew.get(k)!==mat)
   fail('UNAUTHORIZED_B143_EXTRA_VOXEL');
 const loftId='upper-'+a.spaceId+'-public-gallery';
 const program=[...base.b143.program,
  {level:1,standingFloorY:standingY,zones:[{
   id:loftId,purpose:m.purpose,
   range:{x:[x,deckEndX],z:[deckZ,deckEndZ]}
  }]}];
 const featureTargets=base.plan.fixtures.map(f=>{
  const n=base.plan.nodes.find(node=>node.id===f.nodeId);
  return {id:f.id,zoneId:f.nodeId,
   origin:[n.x+f.offsetX,2,n.z+f.offsetZ],
   size:[f.width,f.height,f.depth]};
 });
 featureTargets.push({id:'upper-public-service',zoneId:loftId,
  origin:[featureX,standingY,featureZ],size:[2,1,1]});
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets});
 const upperZone=routes.zones.find(z=>z.id===loftId);
 const upperFeature=routes.featureAccess.find(f=>f.id==='upper-public-service');
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !upperZone?.reachedFromEntrance||!upperFeature?.reachableFromEntrance||
  upperZone.standingFloorY!==standingY||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.some(f=>!f.reachableFromEntrance))
  fail('TWO_WIDE_CONTINUOUS_MEZZANINE_ROUTE_OR_FUNCTION_MISSING');
 // Independently ensure EACH tread has actual 2-wide support at its
 // authored height and 2 blocks of AIR above, with the upper landing open.
 const has=(xx,yy,zz)=>after.has(key(xx,yy,zz));
 for(let step=0;step<=m.rise;step++){
  const zz=stairStartZ+dir*step,y=2+step;
  for(let xx=stairX;xx<stairX+2;xx++)
   if(!has(xx,y-1,zz)||has(xx,y,zz)||has(xx,y+1,zz))
    fail('ACTUAL_STAIRS_NOT_PASSABLE_AT_HEIGHT_'+step);
 }
 for(let xx=stairX;xx<stairX+2;xx++)
  for(let z=deckZ;z<=deckEndZ;z++)
   if(!has(xx,deckY,z)||has(xx,standingY,z)||
      has(xx,standingY+1,z))
    fail('UPPER_PLATFORM_LANDING_NOT_PASSABLE');
 // V4G true clerestory unchanged; do NOT replace an "already passed"
 // earlier window proof with a visual appearance assertion.
 const glazing=proveRankedExteriorPhysicalGlazing(
  {plan:base.plan,b143:{compiled}},base.chosenWindowFaces);
 const projection=auditB143ProjectedVisibility(
  oldCompiled.primitives,compiled.primitives);
 // Exterior orthographic views can legitimately occlude all interior work.
 // Only a true internal slice plus the 2-wide reachable program can prove it.
 if(base.worldContacts!==0||base.worldWrites!==0||
  base.readiness!=='NOT_PREPARED'||base.constructionApproved!==false||
  base.executionAllowed!==false||base.BuildPlan.operations.length!==0||
  base.gates.length!==9||base.gates.some(g=>g!=='BLOCKED'))
  fail('FROZEN_WORLD_SAFETY');
 return {
  schema:'r125-v4h-author-real-accessible-mezzanine-source-v1',
  originalHeightAuthor:raw,authoredMezzanine:m,
  originalGeometrySha256:oldCompiled.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  b143Design:design,b143Compiled:compiled,
  b143Program:program,sourceRoutes:routes,
  sourceWitness:{
   authoredProgramPurpose:m.purpose,
   floorY:deckY,upperStandingY:standingY,
   physicallySupportedUpperFloorCells:3*m.deckWidth,
   physical2WideStairTreads:m.rise+1,
   physicalSupportingColumns:4,
   actualGuardrailSegments:elements.filter(e=>e.id.startsWith('mezz-upper')).length,
   connectedUpperProgram:upperZone,
   connectedPublicService:upperFeature,
   addedNewB143Cells:actuallyNew,addedAboveGroundB143Cells:stairsNew,
   physicalGlazingPreserved:glazing,
   independentProjections:projection,
   externalViewsMayFullyOccludeInteriorWork:true,
   actualSectionPlaneX:stairX,
   authorChosenStairLane:m.stairLane,
   genuineMultiLevelCirculation:'SOURCE_TWO_WIDE_REACHES_UPPER_PROGRAM_AND_EQUIPMENT',
   actualMinecraftWalking:'NOT_TESTED',
   structuralEngineering:'NOT_TESTED',
   humanArt:'NOT_REVIEWED'
  },
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
}
