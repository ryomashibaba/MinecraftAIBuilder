/**
 * R186 — one strict opt-in two-level functional VERTICAL SLICE inside
 * the R185 ELEVATED CROSSING design.
 *
 * Source-only. The existing supported ground public entrance must remain
 * reachable, a real 2-wide B143 staircase must connect to an enclosed
 * upper gallery, and one real multipart work/display assembly must have
 * a physically connected 2-wide service pad.
 * NOT full-building completion, structural engineering, Minecraft walking
 * or fresh Qwen/Gemma model inference.
 */
import {createHash} from 'node:crypto';
import {compileR185PublicExperience,R185_SCHEMA}
 from './r185-public-experience.mjs';
import {SCHEMA as B143,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const R186_SCHEMA='minecraftaibuilder-r186-two-level-source-slice-v1';
const fail=s=>{throw Error('R186_VERTICAL_SLICE_'+s);};
const exact=(x,ks)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===ks.length&&ks.every(k=>Object.hasOwn(x,k));
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldWrites:0,worldContacts:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});

export const R186_INSTRUCTIONS=[
 'One JSON object, schema + base + slice only.',
 'schema minecraftaibuilder-r186-two-level-source-slice-v1.',
 'base is the ENTIRE verified R185 input IR; only elevated-crossing.',
 'slice EXACTLY {sourceHall,ascent,upperUseId,upperFloorY,serviceRole}.',
 'sourceHall=west-civic-hall; ascent=straight-stair;',
 'upperUseId=assembly from base program; upperFloorY=17;',
 'serviceRole=display-stand. The host bounded source translator',
 'installs one explicit staircase, upper enclosed gallery, 1 display.',
 'No model geometry details are silently inferred from prose;',
 'research dimensions are HOST-DEFINED and not model-authored.',
 'Two-level SOURCE route and 2-air headroom required; Minecraft',
 'physics, full 3-room functionality and structural integrity UNKNOWN.'
].join('\n');
function validate(raw){
 if(typeof raw!=='string'||raw.length<80||raw.length>18000)
  fail('RAW_BOUNDS');
 let q;try{q=JSON.parse(raw)}catch{fail('JSON')}
 if(!exact(q,['schema','base','slice'])||q.schema!==R186_SCHEMA||
  q.base?.schema!==R185_SCHEMA||
  !exact(q.slice,['sourceHall','ascent','upperUseId','upperFloorY','serviceRole']))
  fail('IR_SHAPE');
 const s=q.slice;
 if(s.sourceHall!=='west-civic-hall'||s.ascent!=='straight-stair'||
  s.upperUseId!=='assembly'||s.upperFloorY!==17||
  s.serviceRole!=='display-stand'||
  q.base?.base?.composition?.grammar!=='elevated-crossing'||
  q.base?.experience?.targetUseId!==s.upperUseId)
  fail('UNSUPPORTED_VERTICAL_PROGRAM');
 return q;
}
function compiledOccupancy(compiled){
 return new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
}
export function auditR186SourceSlice(design,compiled){
 if(!verifyCompiled(design,compiled))fail('SOURCE_NOT_VERIFIABLE');
 const seen=compiledOccupancy(compiled),has=(x,y,z)=>
  seen.has(key(x,y,z));
 const stair=design.elements.find(e=>e.id==='r186-supported-stair');
 if(stair?.shape!=='staircase'||stair.mode!=='add'||
  stair.axis!=='z'||stair.width!==3||
  stair.steps!==16||stair.treadDepth!==1||
  stair.direction!==1||stair.origin?.join(',')!=='11,1,14')
  fail('DECLARED_STAIR_NOT_PHYSICAL_SOURCE');
 // The source stair must have an actual increasing solid tread,
 // clear 2-wide headroom and preserved supports for 16 consecutive pads.
 const padTrail=[];
 for(let step=0;step<16;step++){
  const y=step+2,z=14+step;
  for(const x of [11,12]){
   if(!has(x,y-1,z)||!has(x+1,y-1,z)||
    has(x,y,z)||has(x+1,y,z)||
    has(x,y+1,z)||has(x+1,y+1,z))
    fail('STAIR_TWO_WIDE_VOXEL_WITNESS_'+step);
  }
  padTrail.push([11,y,z]);
 }
 // The upper floor really supports a 2-wide route from the top step
 // through the landing, across the elevated bridge and into the room.
 const upperLine=[];
 for(let z=30;z>=23;z--){
  for(const x of [22,23]){
   if(!has(x,16,z)||!has(x+1,16,z)||
    has(x,17,z)||has(x+1,17,z)||
    has(x,18,z)||has(x+1,18,z))
    fail('UPPER_GALLERY_TWO_WIDE_CLEARANCE_'+z);
  }
  upperLine.push([22,17,z]);
 }
 const room={id:'assembly-gallery',
  range:{x:[22,27],z:[22,27]}};
 const underpass={id:'ground-public-underpass',
  range:{x:[22,25],z:[34,38]}};
 const product={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  program:[{level:0,standingFloorY:2,zones:[underpass],
   partitionCount:0},{level:1,standingFloorY:17,zones:[room],
   partitionCount:1}]};
 const feature={id:'public-display',
  zoneId:room.id,origin:[27,17,23],size:[2,3,3]};
 const routes=auditR125SourceRoutes(product,{featureTargets:[feature]});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==2||
  !routes.zones.every(z=>z.reachedFromEntrance)||
  routes.featureAccess.length!==1||
  !routes.featureAccess[0].reachableFromEntrance||
  routes.zones[1].sourceWitness?.[1]!==17)
  fail('GROUND_STAIR_ROOM_SERVICE_GRAPH_DISCONNECTED');
 // Audit the source for one physically enclosed usable upper ROOM:
 // four facade lines, ceiling and a real 4-wide doorway. Windows
 // remain solid glass; passability and roof coverage are independent.
 // Clear-air sample excludes the explicitly requested display at x27..28.
 for(let x=22;x<=26;x++)for(let z=22;z<=27;z++){
  if(!has(x,16,z)||!has(x,21,z)||
   has(x,17,z)||has(x,18,z))
   fail('ROOM_AIR_FLOOR_OR_ROOF_INVALID');
 }
 for(const [x,z] of [[20,23],[30,23],[24,20],[28,20],
  [20,27],[30,27],[26,28]]){
  if(!has(x,18,z))fail('ROOM_ENVELOPE_WALL_GAP');
 }
 for(let x=22;x<=25;x++)
  for(let y=17;y<=19;y++)
   if(has(x,y,28))fail('UPPER_ENTRY_IS_BLOCKED');
 if(!has(20,18,24)||!has(30,18,24))
  fail('ENVELOPE_GLAZING_MISSING');
 for(const [x,y,z] of [[27,17,23],[28,19,25],[27,19,24]])
  if(!has(x,y,z))fail('MULTIPART_UPPER_DISPLAY_ABSENT');
 return {schema:'r186-two-level-B143-voxel-route-audit-v1',
  reachedAllRequestedZones:true,connectedTwoWideStairSteps:16,
  ascendingSupportedPads:padTrail,
  upperBridgeGroundedPads:upperLine,
  actualUpperRoomId:room.id,
  actualFurnishedServicePads:routes.featureAccess.length,
  roomEnvelopeRoofAndWallSourceChecked:true,
  groundPublicSpaceReached:true,
  sourceRouteStatus:routes.status,
  zoneWitnesses:routes.zones,
  featureWitness:routes.featureAccess[0],
  sourceOnly:true,gamePhysics:'NOT_TESTED',
  structuralLoadSafety:'NOT_TESTED',
  fullProgramRooms:'NOT_MODELED',...safe()};
}

export function compileR186VerticalSlice(raw){
 const q=validate(raw);
 let previous;
 try{previous=compileR185PublicExperience(JSON.stringify(q.base));}
 catch{fail('UNVERIFIED_R185_BASE')}
 if(!verifyCompiled(previous.design,previous.compiled)||
  previous.publicExperience?.actualSourceGraphStatus!==
   'SOURCE_ROUTES_REACH_ALL_ZONES')
  fail('UNVERIFIED_BASE_GRAPH');
 const design=structuredClone(previous.design),
  el=design.elements;
 const box=(id,mode,origin,size,material)=>{
  el.push({id,shape:'box',mode,...(mode==='add'?{material}:{}),
   origin,size});
 };
 // A real ground-level opening through the concrete WEST wall. The
 // original 2-wide public underpass and R185 portal are unmodified.
 box('r186-west-side-public-entry','cut',[14,2,14],[8,5,3]);
 // Erode an ACTUAL stairwell from the previous solid west civic hall;
 // source solids at y>=2 have to be removed before the stair is added.
 box('r186-stairwell-excavate','cut',[11,2,14],[3,21,17]);
 el.push({id:'r186-supported-stair',shape:'staircase',mode:'add',
  material:'wood',origin:[11,1,14],axis:'z',
  direction:1,width:3,steps:16,treadDepth:1});
 // A real supported landing spanning the old west hall -> upper bridge.
 box('r186-upper-continuous-landing','add',[11,16,30],[8,1,3],'metal');
 // Enclose just ONE upper gathering room, with 4-wide entry from the
 // landing. This is a bounded functional vertical slice, NOT 3 rooms.
 box('r186-room-west-wall','add',[20,17,20],[1,4,9],'concrete');
 box('r186-room-east-wall','add',[30,17,20],[1,4,9],'concrete');
 box('r186-room-front-wall','add',[21,17,20],[9,4,1],'concrete');
 box('r186-room-rear-wall','add',[21,17,28],[9,4,1],'concrete');
 box('r186-room-service-entry','cut',[22,17,28],[4,3,1]);
 // Window cut+glass remains a PHYSICAL wall panel; do not falsely
 // count it as a door or walkable opening.
 box('r186-west-window-cut','cut',[20,18,23],[1,2,3]);
 box('r186-west-window-glazing','add',[20,18,23],[1,2,3],'glass');
 box('r186-east-window-cut','cut',[30,18,23],[1,2,3]);
 box('r186-east-window-glazing','add',[30,18,23],[1,2,3],'glass');
 // One bounded multipart counter/display; real spatial placement and
 // service-side pad are separately checked against voxel graph.
 box('r186-display-low-plinth','add',[27,17,23],[2,1,3],'wood');
 box('r186-display-upper-case','add',[27,18,23],[2,2,1],'glass');
 box('r186-display-information','add',[27,19,25],[2,1,1],'glass');
 if(el.length>160)fail('B143_ELEMENT_LIMIT');
 const compiled=compileDesign(design);
 const audits=auditR186SourceSlice(design,compiled);
 // Public R185 approach must remain physically unchanged at every cell
 // below height 4 on the 4-wide axial pedestrian route.
 const prev=compiledOccupancy(previous.compiled),
  now=compiledOccupancy(compiled);
 for(let z=7;z<=38;z++)
  for(let x=22;x<=25;x++)
   for(let y=1;y<=3;y++)
    if(prev.get(key(x,y,z))!==now.get(key(x,y,z)))
     fail('ORIGINAL_GROUND_PUBLIC_APPROACH_CHANGED');
 const oldV=previous.compiled.primitives.length,newV=compiled.primitives.length;
 if(compiled.geometrySha256===previous.compiled.geometrySha256)
  fail('NO_ACTUAL_SOURCE_GEOMETRY_CHANGE');
 return {schema:'r186-verifiable-functional-vertical-slice-v1',
  originalRawSha256:sha(raw),rawSyntheticIR:raw,
  modelProvenance:'STATIC_SYNTHETIC_NOT_QWEN_GEMMA',
  previousGeometrySha256:previous.compiled.geometrySha256,
  previousVoxelCount:oldV,newVoxelCount:newV,
  design,compiled,sourceOnly:true,modelCalls:0,
  verticalSourceAudit:audits,
  artDecision:'ART_HOLD_UNTIL_REAL_3D_CRITIQUE',...safe()};
}
