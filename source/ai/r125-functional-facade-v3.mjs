/**
 * MinecraftAIBuilder R125 V3 research: physically expressed room functions
 * and model-controlled facade openings, shared across all architectural genres.
 * Generic SOURCE-only grammar; NEVER claims real furnishing or ART approval.
 *
 * Input from author: one visible service feature and one exterior opening
 * per room, specifying function, position, size and material. No genre recipes.
 * HOST translates local wall-relative intent into B143 real geometry.
 *
 * Frozen v1 (Qwen spatial plan) and v2 (Qwen roof expression) are immutable.
 * Valid only when final 2-wide SOURCE circulation, per-feature 2-wide service
 * witnesses, facade boundaries and actual material additions all pass.
 */
import {createHash} from 'node:crypto';
import {compileSpatialComposition} from './r125-spatial-composition.mjs';
import {compileExpressiveEnvelopeV2} from './r125-expressive-envelope-v2.mjs';
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const FUNCTION_SCHEMA='minecraftaibuilder-r125-functional-facade-v3';
const fail=s=>{throw Error('R125_FUNCTIONAL_'+s)};
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const rec=(o,fields)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===fields.slice().sort().join('|');
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const endX=r=>r.x+r.width-1,endZ=r=>r.z+r.depth-1;
const K=(x,y,z)=>x+','+y+','+z;
const isNamed=s=>typeof s==='string'&&s.length>=3&&s.length<=100&&
 !/[\u0000-\u001f<>]/.test(s);
const dirs=['north','south','east','west'];
const types=['counter','worktable','bench','display','storage'];
export function validateFunctionalIntent(plan,intent){
 if(!rec(intent,['schema','planId','rooms'])||intent.schema!==FUNCTION_SCHEMA||
  intent.planId!==plan?.id||!Array.isArray(plan?.rooms)||
  !Array.isArray(intent.rooms)||intent.rooms.length!==plan.rooms.length)
  fail('TOP_LEVEL');
 const ids=new Set(plan.rooms.map(r=>r.id)),seen=new Set();
 for(const r of intent.rooms){
  if(!rec(r,['roomId','fixture','opening'])||!ids.has(r.roomId)||
   seen.has(r.roomId)||!rec(r.fixture,['kind','side','offset','material','purpose'])||
   (r.opening!==null&&!rec(r.opening,['side','offset','width','height'])))fail('ROOM_CONTRACT');
  seen.add(r.roomId);
  if(!types.includes(r.fixture.kind)||!dirs.includes(r.fixture.side)||
   !integer(r.fixture.offset,0,4)||!isNamed(r.fixture.purpose)||
   !['wood','stone','metal','accent'].includes(r.fixture.material)||
   (r.opening!==null&&(!dirs.includes(r.opening.side)||!integer(r.opening.offset,0,4)||
   !integer(r.opening.width,3,4)||!integer(r.opening.height,2,3))))
   fail('ROOM_INTENT');
 }
 return true;
}
const intersects=(a,b)=>a.origin.every((x,i)=>
 x<=b.origin[i]+b.size[i]-1&&b.origin[i]<=x+a.size[i]-1);
function createRoomFixture(r,author,number){
 const {side,offset,kind,material}=author;
 const span=kind==='display'?2:kind==='storage'?2:3;
 const height=kind==='storage'||kind==='display'?2:1;
 let origin,size;
 if(side==='north'||side==='south'){
  const x=r.x+2+offset,z=side==='north'?r.z+1:endZ(r)-1;
  origin=[x,2,z];size=[span,height,1];
  if(x+span-1>endX(r)-1)fail('FIXTURE_TOO_WIDE_'+r.id);
 }else{
  const x=side==='west'?r.x+1:endX(r)-1,z=r.z+2+offset;
  origin=[x,2,z];size=[1,height,span];
  if(z+span-1>endZ(r)-1)fail('FIXTURE_TOO_LONG_'+r.id);
 }
 return {element:{id:'v3fixture-'+number,mode:'add',shape:'box',
  material,origin,size},target:{
  id:'service-'+number,zoneId:r.id,origin,size
 }};
}
function openingGeometry(r,author,number){
 const {side,offset,width,height}=author;
 const along=2+offset;
 let origin,size;
 if(side==='north'||side==='south'){
  const x=r.x+along,z=side==='north'?r.z:endZ(r);
  origin=[x,3,z];size=[width,height,1];
  if(x+width-1>endX(r)-1)fail('WINDOW_OUTSIDE_ROOM_'+r.id);
 }else{
  const z=r.z+along,x=side==='west'?r.x:endX(r);
  origin=[x,3,z];size=[1,height,width];
  if(z+width-1>endZ(r)-1)fail('WINDOW_OUTSIDE_ROOM_'+r.id);
 }
 if(3+height-1>=r.roofY)fail('WINDOW_INTERSECTS_ROOF_'+r.id);
 return {cut:{id:'v3glaze-cut-'+number,mode:'cut',shape:'box',origin,size},
  glass:{id:'v3glaze-fill-'+number,mode:'add',shape:'box',
   material:'glass',origin,size}};
}
function outsideWallIsReal(r,cut,rooms){
 // The chosen opening must lead to the OUTSIDE, not another function room.
 const [x,,z]=cut.origin,[sx,,sz]=cut.size;
 for(const other of rooms){
  if(other.id===r.id)continue;
  if(x>=other.x&&x+sx-1<=endX(other)&&
     z>=other.z&&z+sz-1<=endZ(other))
   fail('OPENING_TO_OTHER_ROOM_'+r.id);
  // Reject any facade seam intersecting a neighboring volume, even partly.
  if(x<=endX(other)&&x+sx-1>=other.x&&z<=endZ(other)&&z+sz-1>=other.z)
   fail('OPENING_PARTLY_SHARED_'+r.id);
 }
}

/**
 * Genre-free wall feasibility guidance for an actual Qwen author.
 * Offers RELATIVE choices only, never a model-selected design, coordinates,
 * a template, or a silent fallback. Both 3x2 and 4x2 glazing candidates
 * are strictly checked against the frozen roof, adjoining rooms and doors.
 * A compact six-block-wide room can use an authentic 3x2 opening.
 */
export function surveyFunctionalFacadeOpenings({originalPlan,envelopeIntent}={}){
 const baseline=compileSpatialComposition(originalPlan);
 const roof=compileExpressiveEnvelopeV2({originalPlan,intent:envelopeIntent});
 const rooms=baseline.layout.rooms;
 const doors=roof.design.elements.filter(e=>e.mode==='cut'&&
  /^(exterior-entrance|joint-\d+)$/.test(e.id));
 const occupied=new Map(roof.compiled.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 const glass=MATERIALS.indexOf('glass');
 return rooms.map(r=>{
  const choices=[];
  for(const width of [4,3])for(const side of dirs)for(let offset=0;offset<=4;offset++){
   try{
    const candidate=openingGeometry(r,{side,offset,width,height:2},0);
    outsideWallIsReal(r,candidate.cut,rooms);
    if(doors.some(d=>intersects(d,candidate.cut)))continue;
    const [x,y,z]=candidate.cut.origin,[sx,sy,sz]=candidate.cut.size;
    let existingSolid=0,newGlazedCells=0;
    for(let xx=x;xx<x+sx;xx++)for(let yy=y;yy<y+sy;yy++)
     for(let zz=z;zz<z+sz;zz++){
      const key=K(xx,yy,zz);
      if(occupied.has(key))existingSolid++;
      if(occupied.has(key)&&occupied.get(key)!==glass)newGlazedCells++;
     }
    // No pre-existing voids, partial wall openings or all-glass "new" glazing.
    if(existingSolid!==sx*sy*sz||newGlazedCells<1)continue;
    choices.push({side,offset,width,height:2});
   }catch(error){
    if(!/^R125_FUNCTIONAL_(WINDOW_|OPENING_)/.test(String(error?.message)))
     throw error;
   }
  }
  return {roomId:r.id,purpose:r.purpose,
   availableLargeExteriorOpenings:choices,
   authorMustChooseFromOptions:true};
 });
}

/**
 * Feasible physical fixture choices for a model to AUTHOR, not a HOST plan.
 * Each choice is a local wall-relative class whose true B143 voxel placement
 * has been compiled and audited AFTER insertion for reachable 2-wide service.
 * Two geometry groups suffice: 3x1 counter/worktable/bench, and 2x2
 * storage/display. All materials in the IR are solid, so they share occupancy.
 * No building/genre-specific branch, retry or Minecraft world contact.
 */
export function surveyFunctionalFixturePlacements({originalPlan,envelopeIntent}={}){
 const spatial=compileSpatialComposition(originalPlan);
 const roof=compileExpressiveEnvelopeV2({originalPlan,intent:envelopeIntent});
 const rooms=spatial.layout.rooms;
 const occupied=new Set(roof.compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const classes=[
  {probeKind:'counter',kinds:['counter','worktable','bench']},
  {probeKind:'storage',kinds:['storage','display']}
 ];
 const output=[];
 for(const [i,room] of rooms.entries()){
  const choices=[];
  for(const side of dirs)for(let offset=0;offset<=4;offset++)
   for(const group of classes){
    let fixture;
    try{
     fixture=createRoomFixture(room,{
      side,offset,kind:group.probeKind,
      material:'wood',purpose:'GENERIC_VOXEL_CLEARANCE_PROBE'},i);
    }catch(e){
     if(/^R125_FUNCTIONAL_FIXTURE_TOO_/.test(String(e?.message)))continue;
     throw e;
    }
    const [x,y,z]=fixture.element.origin;
    const [sx,sy,sz]=fixture.element.size;
    let clear=true;
    for(let xx=x;xx<x+sx;xx++)for(let yy=y;yy<y+sy;yy++)
     for(let zz=z;zz<z+sz;zz++){
      // Real air and a supported ground-level footprint, not drawn geometry.
      if(occupied.has(K(xx,yy,zz))||(yy===y&&!occupied.has(K(xx,y-1,zz))))
       clear=false;
     }
    if(!clear)continue;
    const design={...roof.design,elements:[...roof.design.elements,fixture.element]};
    const compiled=compileDesign(design);
    const product={...spatial,design,compiled,
     sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
    const routes=auditR125SourceRoutes(product,{
     featureTargets:[fixture.target]});
    if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
       routes.zones.some(x=>!x.reachedFromEntrance)||
       routes.featureAccess.length!==1||
       !routes.featureAccess[0].reachableFromEntrance||
       !routes.featureAccess[0].supportedTwoWideServiceWitness)continue;
    choices.push({side,offset,kinds:group.kinds,
     evidence:'ACTUAL_B143_POST_PLACEMENT_TWO_WIDE_SERVICE'});
   }
  output.push({roomId:room.id,purpose:room.purpose,
   availableFunctionalFixturePlacements:choices,
   authorMustChooseKindSideOffsetFromOptions:true});
 }
 return output;
}

export function compileFunctionalFacadeV3({originalPlan,envelopeIntent,functionalIntent}={}){
 validateFunctionalIntent(originalPlan,functionalIntent);
 const spatial=compileSpatialComposition(originalPlan);
 const roof=compileExpressiveEnvelopeV2({originalPlan,intent:envelopeIntent});
 if(roof.originalGeometrySha256!==spatial.geometrySha256)
  fail('FROZEN_SPATIAL_DRIFT');
 const rooms=spatial.layout.rooms;
 const byId=new Map(functionalIntent.rooms.map(r=>[r.roomId,r]));
 const windows=[],fixtures=[],targets=[],manifest=[];
 const doorwayCuts=roof.design.elements.filter(e=>e.mode==='cut'&&
  /^(exterior-entrance|joint-\d+)$/.test(e.id));
 for(const [i,r] of rooms.entries()){
  const original=byId.get(r.id);
  const feature=createRoomFixture(r,original.fixture,i);
  let window=null;
  if(original.opening!==null){
   window=openingGeometry(r,original.opening,i);
   outsideWallIsReal(r,window.cut,rooms);
   if(doorwayCuts.some(c=>intersects(window.cut,c)))
    fail('WINDOW_BLOCKS_DOOR_'+r.id);
   if(intersects(feature.element,window.cut))
    fail('FURNITURE_WINDOW_INTERSECT_'+r.id);
   windows.push({...window,roomIndex:i});
  }
  fixtures.push(feature.element);targets.push(feature.target);
  manifest.push({roomId:r.id,authoredPurpose:original.fixture.purpose,
   authoredKind:original.fixture.kind,
   authoredFixtureSide:original.fixture.side,
   authoredOpeningSide:original.opening?.side??null,
   fixtureOrigin:feature.element.origin,fixtureSize:feature.element.size,
   openingOrigin:window?.cut.origin??null,openingSize:window?.cut.size??null,
   genreTemplateUsed:false});
 }
 // The author only chooses semantic function/relative placement. HOST
 // executes cuts, then glazing, then physical fixtures. No silent repairs.
 const elements=[...roof.design.elements,
  ...windows.map(w=>w.cut),...windows.map(w=>w.glass),...fixtures];
 if(elements.length>160)fail('B143_ELEMENT_LIMIT');
 const design={...roof.design,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('SOURCE_MISMATCH');
 const finalProduct={...spatial,design,compiled,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256};
 const routes=auditR125SourceRoutes(finalProduct,{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==rooms.length||
  routes.zones.some(z=>!z.reachedFromEntrance)||
  routes.featureAccess.length!==rooms.length||
  routes.featureAccess.some(z=>!z.reachableFromEntrance||
   !z.supportedTwoWideServiceWitness))
   fail('REAL_SOURCE_FUNCTION_ACCESS_HOLD');
 const before=new Map(roof.compiled.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 const after=new Map(compiled.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 const glass=MATERIALS.indexOf('glass');
 const perRoomWindow=rooms.map(r=>({roomId:r.id,
  newGlassCells:0,finalGlassCells:0,preexistingFacadeCells:0,
  authoredExteriorOpening:false}));
 for(const window of windows){
  const i=window.roomIndex;
  const [x,y,z]=window.cut.origin,[sx,sy,sz]=window.cut.size;
  let newGlass=0,realGlass=0,originalFacadeCells=0;
  for(let xx=x;xx<x+sx;xx++)for(let yy=y;yy<y+sy;yy++)
   for(let zz=z;zz<z+sz;zz++){
    const k=K(xx,yy,zz);
    if(after.get(k)!==glass)fail('INCOMPLETE_WINDOW_GLAZING_'+rooms[i].id);
    realGlass++;
    if(before.get(k)!==glass)newGlass++;
    if(before.has(k))originalFacadeCells++;
   }
  if(newGlass<1||originalFacadeCells<4)
   fail('NOT_NEW_REAL_FACADE_GLAZING_'+rooms[i].id);
  perRoomWindow[i]={roomId:rooms[i].id,authoredExteriorOpening:true,
   newGlassCells:newGlass,finalGlassCells:realGlass,
   preexistingFacadeCells:originalFacadeCells};
 }
 const perRoomFixtures=[];
 for(const [i,feature] of fixtures.entries()){
  const [x,y,z]=feature.origin,[sx,sy,sz]=feature.size;
  const expected=MATERIALS.indexOf(feature.material);
  let verified=0,added=0;
  for(let xx=x;xx<x+sx;xx++)for(let yy=y;yy<y+sy;yy++)
   for(let zz=z;zz<z+sz;zz++){
    const k=K(xx,yy,zz);
    if(after.get(k)!==expected)
     fail('FIXTURE_MATERIAL_OR_VOLUME_MISSING_'+rooms[i].id);
    verified++;
    if(before.get(k)!==expected)added++;
   }
  if(added!==verified)fail('NO_NEW_PHYSICAL_FIXTURE_'+rooms[i].id);
  perRoomFixtures.push({roomId:rooms[i].id,
   newFixtureCells:added,verifiedMaterialCells:verified,
   material:feature.material});
 }
 const newGlass=perRoomWindow.reduce((n,r)=>n+r.newGlassCells,0);
 if(newGlass===0)fail('NO_NEW_REAL_FACADE_GLAZING_BUILDING');
 const fixtureCells=perRoomFixtures.reduce((n,r)=>n+r.newFixtureCells,0);
 if(compiled.geometrySha256===roof.geometrySha256)
  fail('NO_GEOMETRY_CHANGE');
 return {schema:'r125-function-and-facade-research-v3',
  originalPlanSha256:hash(originalPlan),
  envelopeIntentSha256:hash(envelopeIntent),
  functionalIntentSha256:hash(functionalIntent),
  baseSpatialGeometrySha256:spatial.geometrySha256,
  originalEnvelopeGeometrySha256:roof.geometrySha256,
  finalGeometrySha256:compiled.geometrySha256,
  finalSourceSha256:compiled.sourceSha256,
  originalPlan,functionalIntent,design,compiled,sourceRoutes:routes,
  physicalProgram:{features:manifest,
   actualFeatureServiceWitnesses:routes.featureAccess,
   independentlyAddedGlassCells:newGlass,
   physicallyVerifiedFixtureCells:fixtureCells,
   perRoomOpeningEvidence:perRoomWindow,
   perRoomFixtureEvidence:perRoomFixtures,
   roomPurposesNotCertifiedByShape:true},
  architectureAuthorship:'CALLER_SUPPLIED_NOT_MODEL_VERIFIED',
  architecturalArt:'NOT_REVIEWED',
  minecraftExecution:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
}
