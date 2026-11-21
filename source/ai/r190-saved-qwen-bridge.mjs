/**
 * R190-E archived REAL Qwen semantic compatibility / provenance boundary.
 * Does not perform inference or invent R190 spatial coordinates. The archived
 * response has room purpose and some graph edges, but NO room dimension,
 * floor height, side placement or privacy declarations.
 * A separate, labelled HOST completion is required before B143 compilation.
 * This module never reaches a Minecraft world or loosens safety gates.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,validateR190SemanticPlan,exploreR190SemanticPlan}
 from './r190-semantic-massing.mjs';

export const R190_QWEN_BRIDGE_SCHEMA='minecraftaibuilder-r190-archived-qwen-bridge-v1';
const refuse=x=>{throw Error('R190_QWEN_BRIDGE_'+x);};
const yes=(p,x)=>{if(!p)refuse(x);};
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const slug=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(x);
const clone=x=>structuredClone(x);
const digest=x=>createHash('sha256').update(x).digest('hex');
const pairKey=(a,b)=>[a,b].sort().join('|');
const safety=()=>({readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldWrites:0,worldContacts:0});
function parseArchivedR146(raw){
 yes(typeof raw==='string'&&raw.length>=100&&raw.length<=25000,'RAW_SIZE');
 let p;try{p=JSON.parse(raw);}catch{refuse('RAW_JSON');}
 yes(exact(p,['id','title','footprint','materials','layout','form','objects','relations']),
  'MODEL_TOP_LEVEL_FIELDS');
 yes(slug(p.id)&&typeof p.title==='string'&&p.title.length>=3,'MODEL_ID');
 yes(exact(p.footprint,['width','depth'])&&
  Number.isSafeInteger(p.footprint.width)&&
  Number.isSafeInteger(p.footprint.depth),'MODEL_SITE');
 yes(exact(p.materials,['floor','wall','roof'])&&
  ['concrete','stone','wood','metal'].includes(p.materials.floor)&&
  ['concrete','stone','wood','metal'].includes(p.materials.wall)&&
  typeof p.materials.roof==='string','MODEL_PALETTE');
 yes(exact(p.layout,['axis','spaces'])&&['x','z'].includes(p.layout.axis)&&
  Array.isArray(p.layout.spaces)&&p.layout.spaces.length>=2&&
  p.layout.spaces.length<=6,'MODEL_SPACES');
 const ids=new Set();
 for(const s of p.layout.spaces){
  yes(exact(s,['id','purpose','weight'])&&slug(s.id)&&!ids.has(s.id)&&
   typeof s.purpose==='string'&&s.purpose.length>=3&&s.purpose.length<=150&&
   Number.isSafeInteger(s.weight)&&s.weight>=1&&s.weight<=100,
   'MODEL_SPACE');
  ids.add(s.id);
 }
 yes(exact(p.form,['roofProfile','facadeLanguage'])&&
  typeof p.form.roofProfile==='string'&&
  typeof p.form.facadeLanguage==='string','MODEL_FORM');
 yes(Array.isArray(p.objects)&&p.objects.length<=40,'MODEL_OBJECTS');
 for(const o of p.objects)
  yes(exact(o,['id','zoneId','role','corner'])&&slug(o.id)&&
   ids.has(o.zoneId)&&typeof o.role==='string'&&
   typeof o.corner==='string','MODEL_OBJECT');
 yes(exact(p.relations,['entryFacingZoneId','directAdjacencies'])&&
  ids.has(p.relations.entryFacingZoneId)&&
  Array.isArray(p.relations.directAdjacencies)&&
  p.relations.directAdjacencies.length<=8,'MODEL_RELATIONS');
 const used=new Set();
 for(const edge of p.relations.directAdjacencies){
  yes(Array.isArray(edge)&&edge.length===2&&
   ids.has(edge[0])&&ids.has(edge[1])&&edge[0]!==edge[1],
   'MODEL_DIRECT_EDGE');
  const key=pairKey(...edge);
  yes(!used.has(key),'MODEL_DUPLICATE_DIRECT_EDGE');
  used.add(key);
 }
 return p;
}
export function auditR190ArchivedQwenR146(raw){
 const model=parseArchivedR146(raw);
 // This report is not a rewrite or a prompt: faithfully stores old semantics
 // and precisely says what R190 cannot represent without host assumptions.
 return {schema:R190_QWEN_BRIDGE_SCHEMA,
  status:'HOLD_MISSING_INDEPENDENT_SPATIAL_DESIGN',
  rawSha256:digest(raw),rawUnmodified:true,
  originalModelProgram:clone(model),
  originalRoomCount:model.layout.spaces.length,
  directModelAdjacencyCount:model.relations.directAdjacencies.length,
  originalObjectCount:model.objects.length,
  modelCalls:0,worldSourceGenerated:false,
  missingFromArchivedModel:[
   'ROOM_EXACT_WIDTH_DEPTH_HEIGHT',
   'ROOTED_PARENTS_AND_CARDINAL_ROOM_SIDES',
   'ROOM_PRIVACY_CLASSIFICATION',
   'R190_COMPATIBLE_SITE_AND_ROOF_MATERIAL'
  ],
  preservedButNotRepresented:[
   {intent:'layout.axis',value:model.layout.axis},
   {intent:'materials.roof',value:model.materials.roof},
   {intent:'form.roofProfile',value:model.form.roofProfile},
   {intent:'form.facadeLanguage',value:model.form.facadeLanguage},
   {intent:'objects',count:model.objects.length}
  ],
  modelSpatialAutonomyVerified:false,
  minecraftWalking:'NOT_TESTED',humanArtReview:'ART_HOLD',...safety()};
}
export function compileR190ArchivedQwenWithHost(raw,host){
 const original=auditR190ArchivedQwenR146(raw),p=original.originalModelProgram;
 yes(exact(host,['site','rooms','roofMaterial','brief']),'HOST_FIELDS');
 yes(Array.isArray(host.rooms)&&host.rooms.length===p.layout.spaces.length,
  'HOST_ROOM_COUNT');
 yes(typeof host.brief==='string'&&host.brief.length>=3&&
  host.brief.length<=400,'HOST_BRIEF');
 yes(['wood','stone','concrete','metal'].includes(host.roofMaterial),
  'HOST_ROOF_MATERIAL');
 const byId=new Map();
 for(const r of host.rooms){
  yes(exact(r,['id','width','depth','height','parentId','side','privacy'])&&
   slug(r.id)&&!byId.has(r.id),'HOST_ROOM_FIELDS');
  byId.set(r.id,r);
 }
 yes(byId.size===p.layout.spaces.length,'HOST_ROOM_COUNT');
 const spaces=p.layout.spaces.map(s=>{
  const completion=byId.get(s.id);
  yes(completion!==undefined,'HOST_MISSING_MODEL_ROOM');
  return {id:s.id,purpose:s.purpose,
   width:completion.width,depth:completion.depth,height:completion.height,
   parentId:completion.parentId,side:completion.side,
   privacy:completion.privacy};
 });
 const plan={schema:R190_SCHEMA,id:p.id,title:p.title,brief:host.brief,
  site:clone(host.site),entrySpaceId:p.relations.entryFacingZoneId,
  spaces,materials:{floor:p.materials.floor,wall:p.materials.wall,
   roof:host.roofMaterial}};
 validateR190SemanticPlan(plan);
 const originalEdges=new Set(p.relations.directAdjacencies.map(e=>pairKey(...e)));
 const hostEdges=spaces.filter(s=>s.parentId!==null).map(s=>
  [s.parentId,s.id]);
 const completedEdges=new Set(hostEdges.map(e=>pairKey(...e)));
 for(const edge of originalEdges)
  yes(completedEdges.has(edge),'MODEL_DIRECT_ADJACENCY_NOT_REPRESENTABLE');
 const exploration=exploreR190SemanticPlan(plan);
 for(const c of exploration.candidates){
  for(const edge of originalEdges)
   yes(c.layout.portals.some(v=>pairKey(v.a,v.b)===edge),
    'MODEL_DIRECT_PORTAL_NOT_COMPILED');
  yes(c.audit.allProgramSpacesReachable===true&&
   c.audit.witnesses.length===p.layout.spaces.length,'MODEL_ROOM_ROUTE');
  yes(c.worldWrites===0&&c.worldContacts===0&&
   !c.constructionApproved&&!c.executionAllowed&&
   c.BuildPlan.operations.length===0&&c.gates.every(g=>g==='BLOCKED'),
   'SOURCE_SAFETY_REGRESSED');
 }
 const roomEvidence=p.layout.spaces.map(s=>({id:s.id,
  modelPurpose:s.purpose,modelRelativeWeight:s.weight,
  hostAddedDimensionsAndTopology:clone(byId.get(s.id))}));
 return {schema:'minecraftaibuilder-r190-host-supplemented-qwen-replay-v1',
  status:'HOST_SUPPLEMENTED_SOURCE_ONLY_NOT_MODEL_AUTONOMY',
  archivedOriginalSha256:original.rawSha256,
  preservedOriginalModelProgram:clone(p),
  originalArchivedDataModified:false,
  qwenAuthoredGeometryOrTopology:false,
  originalModelEntryPreserved:plan.entrySpaceId===p.relations.entryFacingZoneId,
  originalModelDirectEdgesVerified:originalEdges.size,
  hostAddedEdges:hostEdges.filter(e=>!originalEdges.has(pairKey(...e))),
  hostRoofMaterialChosen:host.roofMaterial,
  originalRoofAndFacadeStillNotRendered:true,
  originalEquipmentStillNotRendered:p.objects.length,
  originalAxisStillNotRendered:p.layout.axis,
  roomEvidence,
  hostCompletedR190IR:plan,
  modelCalls:0,
  candidates:exploration.candidates.map(c=>({
   strategy:c.layout.strategy,sourceSha256:c.compiled.sourceSha256,
   geometrySha256:c.compiled.geometrySha256,
   realB143Voxels:c.compiled.primitives.length,
   sourceRoutePads:c.audit.sourceWalkingPads,
   realDirectPortals:c.layout.portals.map(v=>[v.a,v.b]),
   sourceVerified:true,
   art:'ART_HOLD'
  })),
  humanArtReview:'ART_HOLD',modelUnknownUseAutonomy:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',...safety()};
}
/** R125's R190 limitations are structural. Do not flatten two floors into one. */
export function auditR190ArchivedR125Plan(p){
 yes(p!==null&&typeof p==='object'&&!Array.isArray(p)&&
  p.schema==='minecraftaibuilder-r125-architecture-plan-v1'&&
  Array.isArray(p.levels)&&[1,2].includes(p.levels.length)&&
  p.levels.every(l=>Array.isArray(l.spaces)&&l.spaces.length===2&&
   ['x','z'].includes(l.splitAxis)&&
   Number.isSafeInteger(l.splitPercent)),'R125_ARCHIVED_PLAN');
 const count=p.levels.reduce((n,l)=>n+l.spaces.length,0);
 return {schema:'minecraftaibuilder-r190-r125-archived-compatibility-v1',
  id:p.id,title:p.title,originalLevelCount:p.levels.length,
  originalModelRoomCount:count,
  modelChosenSplits:p.levels.map(l=>({
   axis:l.splitAxis,percent:l.splitPercent,
   roomIds:l.spaces.map(s=>s.id)})),
  status:'HOLD_UNTRANSLATED_R125_SPATIAL_PROGRAM',
  cannotSilentlyRepresent:['R125_SPLIT_PERCENTS','R125_LEVEL_HEIGHT_AND_STAIR_GRAPH',
   'R125_MODEL_EXPRESSION_AND_FACADE_INTENT'],
  modelCalls:0,sourceGenerated:false,modelSpatialAutonomyVerified:false,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',...safety()};
}
