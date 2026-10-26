/**
 * R178 independent courtyard-wing source research.
 * Unlike R168/R177, this starts with TWO physical wing envelopes, an
 * unroofed shared court and a bridging circulation passage. No rectangle
 * is cut out of a host 2x2 residential/shop/lab template.
 * Caller reply is unverified; CI fixtures are synthetic, never genuine LLM.
 * Source-only B143; Minecraft execution always blocked.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {SCHEMA as R134,validateR134MultiZonePlan}
 from './r134-multi-zone-plan.mjs';
import {validateR135SemanticObjects}
 from './r135-furnished-program.mjs';
import {auditR125SourceRoutes}
 from './r125-source-routes.mjs';
import {ASSEMBLED_SCHEMA,applyR125FeatureIntent}
 from './r125-functional-layer.mjs';

export const R178_SCHEMA='minecraftaibuilder-r178-wing-court-ir-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=s=>{throw Error('R178_WING_COURT_'+s);};
const exact=(x,ks)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const pair=(a,b)=>[a,b].sort().join('|');
const key=(x,y,z)=>x+','+y+','+z;
const safety=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
});
export const R178_MODEL_INSTRUCTIONS=[
 'R178 opt-in: return one JSON reply with id,title,footprint,materials,',
 'layout,form,objects,relations,architecture.',
 'architecture schema: minecraftaibuilder-r178-wing-court-ir-v1',
 'architecture keys exactly schema,westWing,eastWing,roofYs,bridge.',
 'westWing and eastWing each contain exactly two unique existing room IDs:',
 'first is the front room, second the rear room, all four IDs used once.',
 'roofYs has west and east roof heights (integers 8 to 13, difference >=2).',
 'bridge is front or rear, connecting the corresponding wing rooms.',
 'relations.directAdjacencies must describe real shared-wall connections',
 'inside each wing, NEVER call the across-courtyard bridge a direct door.',
 'entryFacingZoneId must be one of the two front rooms.',
 'The compiler validates accessible rooms and furniture, does not rewrite',
 'unsafe design choices, and never creates Minecraft build instructions.'
].join('\n');

export function validateR178WingReply(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('MISSING_OR_OVERSIZED_REPLY');
 let reply;try{reply=JSON.parse(raw);}catch{fail('INVALID_JSON');}
 if(!exact(reply,['id','title','footprint','materials','layout','form',
  'objects','relations','architecture']))fail('TOP_LEVEL_FIELDS');
 const plan={schema:R134,id:reply.id,title:reply.title,
  brief:request?.naturalLanguageBrief,footprint:reply.footprint,
  materials:reply.materials,layout:reply.layout,form:reply.form};
 validateR134MultiZonePlan(plan);
 if(plan.footprint.width<30||plan.footprint.depth<30||
  plan.footprint.width>32||plan.footprint.depth>32||
  plan.layout.spaces.length!==4)
  fail('FIRST_PILOT_NEEDS_30_TO_32_AND_FOUR_ACTUAL_ROOMS');
 const semantic=validateR135SemanticObjects(reply.objects,
  plan.layout.spaces.map(s=>s.id));
 const arch=reply.architecture;
 if(!exact(arch,['schema','westWing','eastWing','roofYs','bridge'])||
  arch.schema!==R178_SCHEMA||
  !Array.isArray(arch.westWing)||arch.westWing.length!==2||
  !Array.isArray(arch.eastWing)||arch.eastWing.length!==2||
  !exact(arch.roofYs,['west','east'])||
  !['front','rear'].includes(arch.bridge)||
  ![arch.roofYs.west,arch.roofYs.east].every(n=>
   Number.isSafeInteger(n)&&n>=8&&n<=13)||
  Math.abs(arch.roofYs.west-arch.roofYs.east)<2)
  fail('WING_COMPOSITION_IR');
 const zoneIds=plan.layout.spaces.map(s=>s.id);
 const chosen=[...arch.westWing,...arch.eastWing];
 if(chosen.some(x=>typeof x!=='string'||!zoneIds.includes(x))||
  new Set(chosen).size!==4)fail('WING_ROOM_ASSIGNMENT');
 const rel=reply.relations;
 if(!exact(rel,['entryFacingZoneId','directAdjacencies'])||
  ![arch.westWing[0],arch.eastWing[0]].includes(rel.entryFacingZoneId)||
  !Array.isArray(rel.directAdjacencies)||rel.directAdjacencies.length<1||
  rel.directAdjacencies.length>2)
  fail('ENTRY_OR_ADJACENCY');
 const allowed=new Set([pair(...arch.westWing),pair(...arch.eastWing)]);
 const requested=new Set();
 for(const p of rel.directAdjacencies){
  if(!Array.isArray(p)||p.length!==2||
   !p.every(id=>typeof id==='string')||p[0]===p[1]||
   !allowed.has(pair(...p))||requested.has(pair(...p)))
   fail('DIRECT_MODEL_PAIR_MUST_SHARE_REAL_WING_WALL');
  requested.add(pair(...p));
 }
 return {reply,plan,semantic};
}

function makeBareSource(plan,arch,rel){
 const {width:w,depth:d}=plan.footprint;
 const {floor,wall,roof}=plan.materials;
 const west={start:1,end:11,roofY:arch.roofYs.west},
  east={start:w-12,end:w-2,roofY:arch.roofYs.east};
 const gapX=west.end+1,gapLength=east.start-gapX;
 if(gapLength<6||d<30)fail('COURTYARD_NOT_SPACIOUS');
 const splitZ=Math.floor(d/2),bridgeZ=arch.bridge==='front'?5:d-10;
 const zones=[],elements=[];
 const add=(id,mode,origin,size,material)=>elements.push({
  id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size
 });
 for(const [side,wing,ids] of [
  ['west',west,arch.westWing],['east',east,arch.eastWing]]){
  const x=wing.start,width=wing.end-x+1,roofY=wing.roofY;
  add(side+'-floor','add',[x,1,1],[width,1,d-2],floor);
  add(side+'-wall-out','add',[side==='west'?x:wing.end,2,1],
   [1,roofY-2,d-2],wall);
  add(side+'-wall-in','add',[side==='west'?wing.end:x,2,1],
   [1,roofY-2,d-2],wall);
  add(side+'-wall-front','add',[x+1,2,1],
   [width-2,roofY-2,1],wall);
  add(side+'-wall-rear','add',[x+1,2,d-2],
   [width-2,roofY-2,1],wall);
  add(side+'-room-partition','add',[x+1,2,splitZ],
   [width-2,roofY-2,1],wall);
  add(side+'-real-direct-door','cut',[x+4,2,splitZ],[2,3,1]);
  add(side+'-real-roof','add',[x,roofY,1],[width,1,d-2],roof);
  // Honor the original model-selected roof family in ACTUAL solids.
  // Separate low/crest bands create a tangible ridge, not a label in QA.
  if(plan.form.roofProfile==='ridge'){
   add(side+'-ridge-slope','add',[x+2,roofY+1,1],
    [width-4,1,d-2],roof);
   add(side+'-ridge-crest','add',[x+4,roofY+2,1],
    [width-8,1,d-2],roof);
  }else if(plan.form.roofProfile==='sawtooth'){
   for(let z=3;z<d-3;z+=6){
    add(side+'-saw-'+z,'add',[x,roofY+1,z],
     [width,1,Math.min(3,d-2-z)],roof);
   }
  }
  for(const [n,id,z0,z1] of [
   [0,ids[0],2,splitZ-1],[1,ids[1],splitZ+1,d-3]]){
   zones.push({id,
    purpose:plan.layout.spaces.find(q=>q.id===id).purpose,
    range:{x:[x+1,wing.end-1],z:[z0,z1]},
    relativeWeight:plan.layout.spaces.find(q=>q.id===id).weight,
    physicalWing:side,physicalWingPosition:n===0?'front':'rear'});
  }
  // Real low windows in each room, never occupied by the front door.
  for(const [label,z] of [['front',1],['rear',d-2]]){
   add(side+'-'+label+'-window-cut','cut',[x+1,3,z],[2,2,1]);
   add(side+'-'+label+'-window-glass','add',[x+1,3,z],
    [2,2,1],'glass');
  }
  // Genuine upper glass on OUTER walls, one band in each wing.
  const outside=side==='west'?x:wing.end;
  const upperY=roofY-3;
  add(side+'-high-glass-cut','cut',[outside,upperY,9],[1,2,4]);
  add(side+'-high-glass-add','add',[outside,upperY,9],
   [1,2,4],'glass');
 }
 // A physical COVERED connector joining two separate wing envelopes.
 add('bridge-floor','add',[gapX,1,bridgeZ],
  [gapLength,1,4],floor);
 add('bridge-front','add',[gapX,2,bridgeZ],
  [gapLength,4,1],wall);
 add('bridge-rear','add',[gapX,2,bridgeZ+3],
  [gapLength,4,1],wall);
 add('bridge-roof','add',[gapX,6,bridgeZ],
  [gapLength,1,4],roof);
 const entranceSide=arch.westWing[0]===rel.entryFacingZoneId?
  'west':'east';
 const entryStart=entranceSide==='west'?west.start:east.start;
 add('exterior-entrance','cut',[entryStart+4,2,1],[2,3,1]);
 // Open the covered cross-wing passage at both actual interior walls.
 add('bridge-west-door','cut',[west.end,2,bridgeZ+1],[1,3,2]);
 add('bridge-east-door','cut',[east.start,2,bridgeZ+1],[1,3,2]);
 // An accessible OUTDOOR circulation strip from the gallery, unlike an
 // isolated schematic empty court with no ground-level walkable surface.
 const outdoorZ=arch.bridge==='front'?bridgeZ+4:3;
 const outdoorEnd=arch.bridge==='front'?d-4:bridgeZ-1;
 if(outdoorEnd-outdoorZ+1<8)fail('COURTYARD_OPEN_WALK_TOO_SHORT');
 const courtCenterX=gapX+Math.floor((gapLength-2)/2);
 add('outdoor-court-walk','add',[courtCenterX,1,outdoorZ],
  [2,1,outdoorEnd-outdoorZ+1],floor);
 add('bridge-court-door','cut',[courtCenterX,2,
  arch.bridge==='front'?bridgeZ+3:bridgeZ],[2,3,1]);
 const design={schema:B143,id:plan.id,title:plan.title,
  brief:plan.brief.slice(0,500),
  bounds:{width:w,height:16,depth:d},designOnly:true,elements};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('REAL_B143_COMPILE_INVALID');
 const filled=new Set(compiled.primitives.map(p=>key(...p.slice(0,3))));
 const no=(x,y,z)=>!filled.has(key(x,y,z));
 const courtZ=arch.bridge==='front'?bridgeZ+9:bridgeZ-5;
 const centerZ=Math.max(3,Math.min(d-4,courtZ));
 for(let y=2;y<=14;y++)if(!no(courtCenterX,y,centerZ))
  fail('COURTYARD_NOT_OPEN_TO_SKY');
 if(!filled.has(key(courtCenterX,1,centerZ)))
  fail('OUTDOOR_COURT_WALK_MISSING');
 // Actual model-requested shared-wall two-wide doors with supported floor.
 for(const [side,wing] of [['west',west],['east',east]]){
  for(let x=wing.start+4;x<=wing.start+5;x++){
   if(!filled.has(key(x,1,splitZ)))fail('DIRECT_DOOR_NO_FLOOR');
   for(let y=2;y<=4;y++)if(!no(x,y,splitZ))
    fail('DIRECT_DOOR_BLOCKED');
  }
 }
 for(const x of [west.end,east.start]){
  for(let z=bridgeZ+1;z<=bridgeZ+2;z++){
   if(!filled.has(key(x,1,z)))fail('BRIDGE_ENTRY_FLOOR_ABSENT');
   for(let y=2;y<=4;y++)if(!no(x,y,z))
    fail('BRIDGE_ACCESS_NOT_ACTUALLY_OPEN');
  }
 }
 const physical={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  spatialIRSchema:R178_SCHEMA,plan,design,compiled,
  program:[{level:0,splitAxis:'independent-wing-courtyard',
   standingFloorY:2,zones,partitionCount:2,
   partitionDoorModelled:true,doorAccessibleInMinecraft:'NOT_TESTED'}],
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  planSha256:sha({plan,arch,rel}),
  ...safety()};
 const sourceRoutes=auditR125SourceRoutes(physical);
 if(sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  sourceRoutes.zones.length!==4||
  !sourceRoutes.zones.every(q=>q.reachedFromEntrance&&q.reachedTwoWidePadCount>0))
  fail('TWO_WINGS_NOT_CONNECTED_FROM_REAL_ENTRANCE');
 return {...physical,sourceRouteAudit:sourceRoutes,
  r178Witness:{roofYs:{...arch.roofYs},
   bridgeEnd:arch.bridge,physicalDoorCount:2,
   courtyardUnroofed:true,courtWalkSourceSupported:true,
   coreCourtWitness:[courtCenterX,2,centerZ],
   modelDirectPairsVerifiedAgainstPhysicalWingWall:true,
   wingRoomAssignment:{west:[...arch.westWing],east:[...arch.eastWing]}}};
}

export function parseR178CourtyardReply(raw,request){
 const {reply,plan,semantic}=validateR178WingReply(raw,request);
 const originalRawSha256=sha(raw);
 const bare=makeBareSource(plan,reply.architecture,reply.relations);
 const featured=applyR125FeatureIntent({base:bare,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:bare.planSha256,
  objects:semantic.objects.map(x=>({...x,detail:'assembled'}))
 }});
 const result={...featured,...safety(),r178WingEvidence:{
  ...bare.r178Witness,
  originalRawSha256,
  incomingReplyAuthorship:'CALLER_PROVIDED_UNVERIFIED',
  geometryAuthorship:'HOST_COMPILED_FROM_EXPLICIT_WING_IR',
  legacyR168FourRoomGridUsed:false,
  originalR134StripUsed:false,
  originalRoomCount:4,actualFurnishedObjects:featured.placements.length,
  actualVoxelCount:featured.compiled.primitives.length,
  sourceRoomAndFurnitureRoutesVerified:
   featured.sourceRouteAudit.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   featured.sourceRouteAudit.featureAccess.every(x=>x.reachableFromEntrance),
  aestheticStatus:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  realLocalModelInvocations:0,worldWrites:0
 }};
 if(result.r178WingEvidence.actualFurnishedObjects!==reply.objects.length||
  !result.r178WingEvidence.sourceRoomAndFurnitureRoutesVerified||
  result.design.elements.length>160)
  fail('FURNISHING_OR_B143_BUDGET');
 return {originalRawSha256,rawSourceString:raw,
  parsedCallerInput:reply,modelAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  designOnlySource:result,sourceOnly:true,modelCalls:0,
  ...safety()};
}
