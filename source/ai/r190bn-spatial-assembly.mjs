/** R190-BN: author-owned levels and occupiable spaces -> exact B143 surfaces.
 * Pure SOURCE research. No solver, type templates, repair, provider, or world I/O.
 * This is a NEW source format, never a repaired/relabelled BM model response.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,MATERIALS,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {reviewR4PlannedProposal} from './b198zr4-planned-source.mjs';

export const R190BN_SCHEMA='minecraftaibuilder-r190bn-spatial-assembly-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BN_'+x)};
const yes=(v,x)=>{if(!v)fail(x)};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
const id=(v,max=24)=>typeof v==='string'&&new RegExp('^[a-z][a-z0-9-]{2,'+(max-1)+'}$').test(v);
const text=(v,min,max)=>typeof v==='string'&&v.length>=min&&v.length<=max&&!/[\u0000-\u001f<>]/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});

export function compileR190BNAssembly(original,{originalBrief,authorship='UNVERIFIED_AUTHOR'}={}){
 yes(original instanceof Uint8Array&&original.length>=2&&original.length<=200000,'ORIGINAL_BYTES');
 yes(originalBrief instanceof Uint8Array&&originalBrief.length>=8&&originalBrief.length<=20000,'BRIEF_BYTES');
 yes(['UNVERIFIED_AUTHOR','SYNTHETIC_TEST_FIXTURE','MODEL_ORIGINAL_UNVERIFIED'].includes(authorship),'AUTHORSHIP');
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original))}catch{fail('JSON')}
 yes(exact(p,['schema','id','title','brief','originalBriefSha256','bounds','intent',
  'levels','spaces','operations','entrance','headroom','destinations','protectedVoids','assumptions'])&&
  p.schema===R190BN_SCHEMA,'FORMAT');
 yes(sha(p.originalBriefSha256)&&p.originalBriefSha256===H(originalBrief),'BRIEF_BINDING');
 yes(id(p.id,48)&&text(p.title,1,100)&&text(p.brief,1,500),'IDENTITY');
 yes(exact(p.bounds,['width','height','depth'])&&integer(p.bounds.width,8,128)&&
  integer(p.bounds.height,8,96)&&integer(p.bounds.depth,8,128)&&
  p.bounds.width*p.bounds.height*p.bounds.depth<=500000,'B143_TARGET_BOUNDS');
 yes(exact(p.intent,['use','experience','massing','circulation'])&&
  Object.values(p.intent).every(v=>text(v,8,350)),'INTENT');
 yes(integer(p.headroom,2,3),'HEADROOM');
 yes(Array.isArray(p.levels)&&p.levels.length>=1&&p.levels.length<=32,'LEVELS');
 const levels=new Map();
 for(const level of p.levels){
  yes(exact(level,['id','standingY'])&&id(level.id)&&!levels.has(level.id)&&
   integer(level.standingY,1,p.bounds.height-p.headroom),'LEVEL');
  levels.set(level.id,level.standingY);
 }
 yes(new Set(levels.values()).size===levels.size,'DUPLICATE_LEVEL_HEIGHT');
 yes(Array.isArray(p.spaces)&&p.spaces.length>=1&&p.spaces.length<=24,'SPACES');
 const spaces=new Map();
 for(const s of p.spaces){
  yes(exact(s,['id','levelId','purpose','origin','size','clearHeight',
   'minimumReachablePositions','minimumReachablePercent'])&&id(s.id)&&!spaces.has(s.id)&&
   levels.has(s.levelId)&&text(s.purpose,3,250)&&Array.isArray(s.origin)&&s.origin.length===2&&
   Array.isArray(s.size)&&s.size.length===2&&
   s.origin.every(n=>integer(n,0,127))&&s.size.every(n=>integer(n,2,128))&&
   s.origin[0]+s.size[0]<=p.bounds.width&&s.origin[1]+s.size[1]<=p.bounds.depth&&
   integer(s.clearHeight,p.headroom,p.bounds.height-levels.get(s.levelId))&&
   integer(s.minimumReachablePositions,1,s.size[0]*s.size[1])&&
   integer(s.minimumReachablePercent,1,100),'SPACE');
  spaces.set(s.id,s);
 }
 // A level is an authored elevation reference, never a floor invented by the host.
 yes([...levels.keys()].every(level=>p.spaces.some(s=>s.levelId===level)),'UNUSED_LEVEL');
 yes(Array.isArray(p.operations)&&p.operations.length>=1&&p.operations.length<=160,'OPERATIONS');
 const elements=[],mapping=[],seen=new Set(),enclosed=new Set();
 const append=(e,owner,spaceId=null)=>{
  yes(!seen.has(e.id),'ELEMENT_ID_COLLISION');seen.add(e.id);
  elements.push(e);mapping.push({elementId:e.id,operationId:owner,spaceId});
 };
 for(const op of p.operations){
  if(op.kind==='primitive'){
   yes(exact(op,['kind','element']),'PRIMITIVE_FIELDS');
   // All six B143 shapes, materials, modes and explicit repeats remain available.
   // No missing property (including stair material/axis/landing) is repaired.
   append(structuredClone(op.element),op.element?.id);
  }else if(op.kind==='flight'){
   yes(exact(op,['kind','id','fromLevelId','toLevelId','start','end','width','treadDepth','material'])&&
    id(op.id)&&levels.has(op.fromLevelId)&&levels.has(op.toLevelId)&&
    Array.isArray(op.start)&&op.start.length===2&&op.start.every(n=>integer(n,0,127))&&
    Array.isArray(op.end)&&op.end.length===2&&op.end.every(n=>integer(n,0,127))&&
    integer(op.width,2,12)&&integer(op.treadDepth,1,3)&&MATERIALS.includes(op.material),'FLIGHT');
   const lower=levels.get(op.fromLevelId),upper=levels.get(op.toLevelId),steps=upper-lower+1;
   yes(steps>=2&&steps<=32,'FLIGHT_RISE_EXCEEDS_B143');
   const changed=[0,1].filter(i=>op.start[i]!==op.end[i]);
   yes(changed.length===1,'FLIGHT_HORIZONTAL_ALIGNMENT');
   const along=changed[0],run=op.end[along]-op.start[along];
   yes(Math.abs(run)===steps*op.treadDepth-1,'FLIGHT_ENDPOINT_LEVEL_MISMATCH');
   // Endpoints and connected elevations are AUTHOR decisions. Only arithmetic
   // is derived; no flight splitting, landing creation or alternate axis/run.
   append({id:op.id,shape:'staircase',mode:'add',material:op.material,
    origin:[op.start[0],lower-1,op.start[1]],axis:along===0?'x':'z',
    direction:Math.sign(run),width:op.width,steps,treadDepth:op.treadDepth},op.id);
  }else{
   yes(op.kind==='enclosure'&&exact(op,['kind','id','spaceId','thickness','materials'])&&
    id(op.id)&&spaces.has(op.spaceId)&&!enclosed.has(op.spaceId)&&
    integer(op.thickness,1,4)&&exact(op.materials,['floor','wall','roof'])&&
    Object.values(op.materials).every(m=>MATERIALS.includes(m)),'ENCLOSURE');
   enclosed.add(op.spaceId);
   const s=spaces.get(op.spaceId),t=op.thickness,y=levels.get(s.levelId),
    origin=[s.origin[0]-t,y-t,s.origin[1]-t],
    size=[s.size[0]+2*t,s.clearHeight+2*t,s.size[1]+2*t];
   // Direct skin, not a large filled ADD followed by an expensive internal CUT.
   // Interior dimensions and all materials/thicknesses come from the author.
   append({id:op.id+'-skin',shape:'box',mode:'add',material:op.materials.wall,
    origin,size,shell:t},op.id,s.id);
   for(const [face,yy] of [['floor',y-t],['roof',y+s.clearHeight]]){
    if(op.materials[face]===op.materials.wall)continue;
    append({id:op.id+'-'+face,shape:'box',mode:'add',material:op.materials[face],
     origin:[origin[0],yy,origin[2]],size:[size[0],t,size[2]]},op.id,s.id);
   }
  }
 }
 const design={schema:B143,id:p.id,title:p.title,brief:p.brief,bounds:structuredClone(p.bounds),
  elements,designOnly:true};
 // B143 limits (including INTERMEDIATE occupancy, work and element caps) unchanged.
 const compiled=compileDesign(design);
 yes(verifyCompiled(design,compiled),'COMPILER_INTEGRITY');
 const spatialPlan={designIntent:p.intent.use+' '+p.intent.experience,
  massStrategy:p.intent.massing,circulationStrategy:p.intent.circulation,
  entrance:structuredClone(p.entrance),headroom:p.headroom,
  protectedVoids:structuredClone(p.protectedVoids),destinations:structuredClone(p.destinations),
  functionalZones:p.spaces.map(s=>({id:s.id,
   origin:[s.origin[0],levels.get(s.levelId),s.origin[1]],size:[s.size[0],1,s.size[1]],
   minimumReachablePositions:s.minimumReachablePositions,
   minimumReachablePercent:s.minimumReachablePercent}))};
 // Existing R4 metadata has an explicit 350 character cap. Do not silently truncate.
 yes(text(spatialPlan.designIntent,8,350),'COMBINED_INTENT_TOO_LONG');
 const proposal={design,explanation:p.intent.experience,
  assumptions:structuredClone(p.assumptions),spatialPlan};
 let functionalReview;
 try{const r=reviewR4PlannedProposal(proposal);
  functionalReview={status:r.status,evidence:r.declaredPlanReview};
 }catch(error){functionalReview={status:'HOLD_INVALID_FUNCTIONAL_DECLARATION',error:String(error.message)}}
 // Independently observe the FULL authored clear volume, not just its name.
 const occupied=new Set(compiled.primitives.map(v=>v.slice(0,3).join(',')));
 const spaceEvidence=p.spaces.map(s=>{
  const y=levels.get(s.levelId);let obstructedAirCells=0,unsupportedFloorCells=0;
  for(let z=s.origin[1];z<s.origin[1]+s.size[1];z++)
   for(let x=s.origin[0];x<s.origin[0]+s.size[0];x++){
    if(!occupied.has([x,y-1,z].join(',')))unsupportedFloorCells++;
    for(let yy=y;yy<y+s.clearHeight;yy++)if(occupied.has([x,yy,z].join(',')))obstructedAirCells++;
   }
  return {id:s.id,purpose:s.purpose,levelId:s.levelId,standingY:y,
   clearHeight:s.clearHeight,obstructedAirCells,unsupportedFloorCells,
   declaredArea:s.size[0]*s.size[1],
   status:obstructedAirCells||unsupportedFloorCells?'HOLD_AUTHORED_SPACE_CONFLICT':'SOURCE_FLOOR_AND_CLEAR_VOLUME_PRESENT'};
 });
 return {schema:'minecraftaibuilder-r190bn-derived-source-study-v1',
  status:spaceEvidence.every(s=>s.status==='SOURCE_FLOOR_AND_CLEAR_VOLUME_PRESENT')&&
   functionalReview.status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS'?
   'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD':'HOLD_DERIVED_SOURCE_FUNCTION',
  authorship,originalInputSha256:H(original),originalBriefSha256:H(originalBrief),
  originalSourceUnmodified:true,sourceFormat:R190BN_SCHEMA,
  outputAuthorship:'DETERMINISTIC_B143_FROM_AUTHOR_SPATIAL_ASSEMBLY',
  outputIsOriginalModelAuthoredB143:false,hostInventedGeometry:false,
  hostChoseLayoutOrLevels:false,hostRepairedSource:false,
  levels:structuredClone(p.levels),programSpaces:structuredClone(p.spaces),
  elementMapping:mapping,proposal,compiled,spaceEvidence,functionalReview,
  derivedProposalSha256:H(JSON.stringify(proposal)),sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,architecturalQuality:'NOT_CERTIFIED',
  structuralEngineering:'NOT_CERTIFIED',minecraftWalking:'NOT_TESTED',
  routeScope:'Existing R4 supported single-cell standing graph; no two-wide/real avatar guarantee',
  ...safe()};
}
