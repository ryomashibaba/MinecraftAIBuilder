/**
 * R185: HUMAN SCALE ARRIVAL, independent ART-FIRST source pilot.
 *
 * Two R184 form directions receive redesigned REAL B143 ground entrances,
 * structural volumes and useful outdoor room-scale experiences. Checks
 * exact 2-wide supported clear source corridor + existing R125 source graph.
 *
 * This does NOT attest to furnished rooms, structural engineering or
 * Minecraft gameplay. It is intentionally limited to the public approach.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {R184_SCHEMA,validateR184Hypothesis,compileR184Hypothesis}
 from './r184-composition-grammar.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

export const R185_SCHEMA='minecraftaibuilder-r185-public-experience-ir-v1';
const fail=s=>{throw Error('R185_PUBLIC_EXPERIENCE_'+s)};
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const k=(x,y,z)=>x+','+y+','+z;
const sha=x=>createHash('sha256').update(x).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const permitted={
 'inhabited-rotunda':'central-court',
 'elevated-crossing':'underpass'
};
export const R185_MODEL_INSTRUCTIONS=[
 'Model response is one JSON object: {schema,base,experience}.',
 'schema=minecraftaibuilder-r185-public-experience-ir-v1.',
 'base must be original validated R184 composition research IR.',
 'Only inhabited-rotunda and elevated-crossing branches are supported.',
 'experience exactly {entranceAxis,entranceWidth,publicSpace,targetUseId}.',
 'entranceAxis=south-to-north, entranceWidth=4, targetUseId=assembly.',
 'publicSpace must be central-court or underpass as R184 base requires.',
 'The host generates a separate physical B143 massing, not Minecraft code.',
 'True grounded two-wide public route is checked by real voxel occupancy.',
 'Room access, furnishings, upper-floor traversal and world use are NOT',
 'proved here. Failure is ART_HOLD, not a construction permission.'
].join('\n');

function validate(raw){
 if(typeof raw!=='string'||raw.length<50||raw.length>16000)
  fail('RAW_REPLY_BOUNDS');
 let q;try{q=JSON.parse(raw)}catch{fail('JSON')}
 if(!exact(q,['schema','base','experience'])||q.schema!==R185_SCHEMA||
  !exact(q.experience,['entranceAxis','entranceWidth','publicSpace','targetUseId']))
  fail('RESEARCH_IR_FIELDS');
 let base;try{base=validateR184Hypothesis(JSON.stringify(q.base));}
 catch{fail('INVALID_R184_BASE')}
 const f=base.composition.grammar,e=q.experience;
 if(!Object.hasOwn(permitted,f)||
  e.publicSpace!==permitted[f]||
  e.publicSpace!==base.composition.publicSpace||
  e.entranceAxis!=='south-to-north'||e.entranceWidth!==4||
  e.targetUseId!==base.composition.dominantUse||
  !base.program.zones.some(z=>z.id===e.targetUseId&&z.role==='gathering'))
  fail('ARRIVAL_NOT_GROUNDED_IN_PROGRAM');
 return {q,base,f};
}
export function compileR185PublicExperience(raw){
 const {q,base,f}=validate(raw);
 const before=compileR184Hypothesis(JSON.stringify(base));
 if(!verifyCompiled(before.design,before.compiled))fail('UNVERIFIED_R184_BASIS');
 const elems=[];
 const box=(id,mode,origin,size,material)=>{
  elems.push({id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size});
 };
 const cylinder=(id,mode,origin,axis,radius,length,material)=>{
  elems.push({id,shape:'cylinder',mode,
   ...(mode==='add'?{material}:{}),origin,axis,radius,length});
 };
 const torus=(id,origin,axis,majorRadius,tubeRadius,material)=>{
  elems.push({id,shape:'torus',mode:'add',material,origin:undefined,
   center:origin,axis,majorRadius,tubeRadius});
 };
 const beam=(id,start,end,thickness,material)=>{
  elems.push({id,shape:'beam',mode:'add',start,end,thickness,material});
 };
 // Same 48×48 supported ground footprint as R184, but NOT the old shell.
 box('site-ground','add',[3,1,3],[42,1,42],'stone');
 let target={x:[22,25],z:[24,27]},continuousZ=[7,26];
 let probes;
 if(f==='inhabited-rotunda'){
  cylinder('main-curved-gallery','add',[24,2,24],'y',17,12,'concrete');
  cylinder('central-real-courtyard','cut',[24,2,24],'y',11,19);
  // The south entry is a genuine removed part of the former cylindrical
  // shell, wide enough for four blocks and taller than the visitor.
  box('south-grand-public-portal','cut',[21,2,5],[7,9,14]);
  // Open long side arcades instead of one uninterrupted cylinder wall.
  box('west-court-facing-arcade','cut',[5,2,19],[12,6,12]);
  box('east-court-facing-arcade','cut',[31,2,20],[14,7,9]);
  // A readable hierarchy of attached public + quiet program masses.
  box('west-inhabited-bar','add',[7,8,16],[10,5,19],'wood');
  box('east-gallery-wing','add',[32,8,19],[10,4,15],'concrete');
  // Limit new massing additions to the ring footprint: the side-arcade
  // edges are still visible as actual habitable-scale openings.
  box('west-sky-cut','cut',[9,9,20],[5,4,9]);
  box('east-sky-cut','cut',[35,9,22],[5,3,9]);
  box('west-courtyard-window','add',[15,5,23],[1,2,5],'glass');
  box('east-courtyard-window','add',[33,5,23],[1,2,5],'glass');
  torus('curved-public-terrace-crown',[24,13,24],'y',14,1,'metal');
  box('front-lintel-band','add',[19,11,7],[11,2,5],'wood');
  // Columns make the ground arcades tangible, while keeping entrances
  // and axial court walk clear of obstructions.
  for(const [label,x,z] of [['west-a',10,21],['west-b',10,29],
    ['east-a',38,20],['east-b',38,29]])
   box('arcade-column-'+label,'add',[x,2,z],[2,6,2],'metal');
  box('court-terrace-step','add',[17,2,31],[12,1,3],'wood');
  // Re-cut straight walk at the end of all mass additions.
  box('straight-axis-opening','cut',[22,2,7],[4,6,20]);
  target={x:[22,25],z:[23,26]};
  continuousZ=[7,26];
  probes={
   requiredSolid:[[24,1,24],[7,10,20],[35,10,20],[24,12,8]],
   requiredAir:[[23,3,11],[23,3,19],[24,7,24],[15,3,24]]
  };
 }else{
  // Replace the two solid blocks and thin uninhabited plate with
  // genuinely differentiated halls and a deep sky-level gallery.
  box('west-civic-hall','add',[6,2,9],[13,14,30],'concrete');
  box('west-ground-loggia','cut',[9,2,13],[7,7,20]);
  box('west-north-upper-recess','cut',[11,10,24],[6,5,12]);
  box('east-tower','add',[31,2,8],[12,20,34],'concrete');
  box('east-tall-court','cut',[34,3,14],[6,15,19]);
  box('east-ground-gallery','cut',[31,2,29],[7,8,8]);
  // The elevated occupied-looking span is ACTUAL 3D floor, enclosing
  // glass sidewalls and a solid roof — not a painted ground connection.
  box('crossing-deep-floor','add',[17,15,16],[16,2,17],'metal');
  box('crossing-long-south-glass','add',[18,17,16],[14,4,1],'glass');
  box('crossing-long-north-glass','add',[18,17,32],[14,4,1],'glass');
  box('crossing-visible-roof','add',[17,21,16],[16,2,17],'concrete');
  box('crossing-upper-spatial-band','add',[19,23,19],[12,2,10],'wood');
  // Two long structural ties visibly support the raised volume.
  beam('west-raking-structure',[11,9,16],[20,15,19],2,'metal');
  beam('east-raking-structure',[37,9,34],[30,15,31],2,'metal');
  box('east-roof-toplight','add',[34,22,17],[8,2,16],'glass');
  box('west-front-long-window','add',[9,7,9],[7,3,1],'glass');
  // Ground courtyard-underpass is OPEN for a 4-wide continuous
  // public approach; meaningful vertical separation to the skyway.
  box('south-ground-portal-frame-left','add',[17,2,6],[2,6,3],'wood');
  box('south-ground-portal-frame-right','add',[29,2,6],[2,6,3],'wood');
  box('south-ground-portal-header','add',[17,8,6],[14,2,3],'wood');
  target={x:[22,25],z:[34,38]};
  continuousZ=[7,38];
  probes={
   requiredSolid:[[24,1,24],[23,15,25],[23,21,25],
    [8,6,11],[33,18,10]],
   requiredAir:[[23,3,24],[23,4,18],[23,10,25],
    [23,19,25]]
  };
 }
 // R125 checks an actual geometry-backed doorway declaration. Origin
 // remains just outside the first target corridor cell (z+1 threshold).
 box('exterior-entrance','cut',[22,2,6],[4,5,1]);
 const design={schema:B143,id:'r185-'+base.id,title:base.title+' / public arrival',
  brief:base.brief,bounds:{...base.site},designOnly:true,elements:elems};
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||compiled.primitives.length<2000)
  fail('UNVERIFIED_B143_GEOMETRY');
 const filled=new Set(compiled.primitives.map(p=>k(p[0],p[1],p[2])));
 const has=(x,y,z)=>filled.has(k(x,y,z));
 if(probes.requiredSolid.some(p=>!has(...p))||
  probes.requiredAir.some(p=>has(...p)))
  fail('ARCHITECTURAL_VOXEL_PROBES');
 const lineWitness=[];
 // Not merely reachable by wandering round the back of the pavilion.
 // The direct PUBLIC APPROACH from the south must be wholly supported
 // on BOTH tracks, with at least two-block headroom, end to end.
 for(let z=continuousZ[0];z<=continuousZ[1];z++)
  for(const x of [22,23]){
   if(!has(x,1,z)||!has(x+1,1,z)||
    has(x,2,z)||has(x+1,2,z)||
    has(x,3,z)||has(x+1,3,z))
    fail('PHYSICAL_TWO_WIDE_STRAIGHT_PUBLIC_PATH_BLOCKED_'+z);
   lineWitness.push([x,2,z]);
  }
 const requiredZones=[{id:'public-'+q.experience.publicSpace,range:target}];
 const physical={schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:[{level:0,standingFloorY:2,
   zones:requiredZones,partitionCount:0}],
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256};
 const access=auditR125SourceRoutes(physical);
 if(access.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  access.zones.length!==1||!access.zones[0].reachedFromEntrance)
  fail('PUBLIC_SPACE_UNREACHABLE');
 const bmap=new Set(before.compiled.primitives.map(p=>p.slice(0,3).join(',')));
 const amap=new Set(compiled.primitives.map(p=>p.slice(0,3).join(',')));
 let intersection=0;for(const p of amap)if(bmap.has(p))intersection++;
 const shapeDelta=(amap.size+bmap.size-2*intersection)/
  (amap.size+bmap.size-intersection);
 if(shapeDelta<0.20)
  fail('COSMETIC_CHANGE_ONLY');
 return {schema:'r185-source-public-experience-study-v1',
  modelProvenance:'STATIC_SYNTHETIC_RESEARCH_ONLY',
  originalRawIR:raw,originalRawSha256:sha(raw),
  baselineSourceSha256:before.compiled.sourceSha256,
  baselineGeometrySha256:before.compiled.geometrySha256,
  design,compiled,sourceOnly:true,modelCalls:0,
  comparison:{sourceR184VoxelCount:before.compiled.primitives.length,
   currentR185VoxelCount:compiled.primitives.length,
   trueVoxelSymmetricDifferenceRatio:shapeDelta},
  publicExperience:{
   targetedConceptRoleId:q.experience.targetUseId,
   publicSpace:q.experience.publicSpace,
   walkSurface:'EXISTING_B143_STONE_GROUND',
   actualEntranceOpeningInSource:true,
   entry:[22,2,6],target,
   directTwoWideGroundedAirCells:lineWitness.length,
   actualSourceGraphStatus:access.status,
   actualSourceGraphWitness:access.zones[0].sourceWitness,
   genuinePhysicalProbeWitnesses:probes,
   upperFloorTraversal:'NOT_TESTED',
   furnishedRoomAccess:'NOT_TESTED',
   MinecraftPlayerPhysics:'NOT_TESTED'
  },
  artStatus:'ART_HOLD_HUMAN_REVIEW_REQUIRED',...safe()};
}
