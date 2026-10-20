/**
 * R47 — strict schema proposal for a FUTURE authorized local Ollama trial.
 * Inert: does not enable inference, rewrite R25/R44/R46 originals,
 * contact Minecraft, or call a model. A prompt is not proof of quality.
 *
 * Local Ollama /api/chat supports format: <JSON Schema>.
 * The schema removes the documented R46 grammar failures, but physical
 * geometry and functional reachability still require B143/R3 validators.
 */
import {createHash} from 'node:crypto';
import {readR4PlannedProposal} from './b198zr4-planned-source.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198zr47-structured-output-proposal-v1';
export const PROFILE='R47_JSON_SCHEMA_OFFLINE_CANDIDATE_NOT_ENABLED';
const sha=s=>createHash('sha256').update(s).digest('hex');
const noExtra=(properties,required=Object.keys(properties))=>({
 type:'object',additionalProperties:false,properties,required});
const str=(minLength,maxLength)=>({type:'string',minLength,maxLength});
const bounded=(min,max)=>({type:'integer',minimum:min,maximum:max});
const triple=(min,max)=>({type:'array',items:bounded(min,max),minItems:3,maxItems:3});
const size=triple(1,128);
const position=triple(0,128);
const text=str(8,350);
const slug={type:'string',pattern:'^[a-z][a-z0-9-]{2,47}$'};
const elementId={type:'string',pattern:'^[a-zA-Z][a-zA-Z0-9_-]{0,39}$'};
const materials={type:'string',enum:['stone','concrete','metal','glass','wood','glow','accent']};
const offset={type:'array',items:bounded(-128,128),minItems:3,maxItems:3};
const repeat=noExtra({count:bounded(2,32),offset});
const atom={
 box:{origin:position,size},
 ellipsoid:{center:position,radii:triple(1,64)},
 cylinder:{origin:position,axis:{type:'string',enum:['x','y','z']},
  radius:bounded(1,64),length:bounded(1,128)},
 torus:{center:position,axis:{type:'string',enum:['x','y','z']},
  majorRadius:bounded(3,45),tubeRadius:bounded(1,9)},
 beam:{start:position,end:position,thickness:bounded(1,3)},
 staircase:{origin:position,axis:{type:'string',enum:['x','z']},
  direction:{type:'integer',enum:[-1,1]},width:bounded(2,12),
  steps:bounded(2,32),treadDepth:bounded(1,3)}
};
const shapeVariants=[];
for(const shape of Object.keys(atom)){
 for(const mode of shape==='staircase'?['add']:['add','cut']){
  // Different variants are exclusive by shape AND mode, so oneOf is sound.
  const properties={
   id:elementId,
   shape:{type:'string',const:shape},
   mode:{type:'string',const:mode},
   ...atom[shape]
  };
  if(mode==='add')properties.material=materials;
  if(['box','ellipsoid','cylinder','torus'].includes(shape))
   properties.shell=mode==='add'?bounded(0,4):{type:'integer',const:0};
  if(['beam','staircase'].includes(shape))
   properties.shell={type:'integer',const:0};
  properties.repeat=repeat;
  const required=['id','shape','mode',...Object.keys(atom[shape]),
   ...(mode==='add'?['material']:[])];
  shapeVariants.push(noExtra(properties,required));
 }
}
const voidSpec=noExtra({
 id:elementId,origin:position,size,maxOccupiedCells:bounded(0,500000)
});
const destination=noExtra({
 id:elementId,point:position,maximumPathSteps:bounded(1,500000)
});
const zone=noExtra({
 id:elementId,origin:position,size,
 minimumReachablePositions:bounded(1,500000),
 minimumReachablePercent:bounded(1,100)
});
const zoneArray=spec=>({type:'array',items:spec,maxItems:16});
const spatialPlan=noExtra({
 designIntent:text,massStrategy:text,circulationStrategy:text,
 entrance:position,headroom:{type:'integer',enum:[2,3]},
 protectedVoids:zoneArray(voidSpec),
 destinations:{type:'array',items:destination,minItems:1,maxItems:48},
 functionalZones:{type:'array',items:zone,minItems:1,maxItems:48}
});
const design=noExtra({
 schema:{type:'string',const:'minecraftaibuilder-b143-building-dsl-v1'},
 id:slug,title:str(1,100),brief:str(1,500),
 bounds:noExtra({width:bounded(8,128),height:bounded(8,96),
  depth:bounded(8,128)}),
 elements:{type:'array',items:{oneOf:shapeVariants},minItems:1,maxItems:160},
 designOnly:{type:'boolean',const:true}
});
export const R47_JSON_SCHEMA=noExtra({
 design,spatialPlan,
 explanation:{type:'string',maxLength:2000},
 assumptions:{type:'array',items:str(0,350),maxItems:20}
});
export const R47_JSON_SCHEMA_SHA256=sha(JSON.stringify(R47_JSON_SCHEMA));
export const R47_SCHEMA_UTF8_BYTES=Buffer.byteLength(JSON.stringify(R47_JSON_SCHEMA));

/**
 * Don't pretend a JSON Schema alone can check ordered geometry, overlaps,
 * bounding extents, connected destinations, originality or visual quality.
 * Always feed the unmodified original response to strict existing code.
 */
export function inspectR47SavedCandidate(raw){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR47_RAW_SIZE');
 const base={schema:SCHEMA,profile:PROFILE,
  rawSha256:sha(raw),rawUnmodified:true,
  schemaSha256:R47_JSON_SCHEMA_SHA256,
  schemaBytes:R47_SCHEMA_UTF8_BYTES,
  schemaEnforcementByActualOllamaUnverified:true,
  modelRequests:0,worldContacts:0,worldWrites:0,
  constructionApproved:false,modelQualityApproved:false,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}}};
 let candidate;
 try{
  candidate=readR4PlannedProposal(raw);
 }catch(e){
  return {...base,status:'HOLD_SOURCE_SYNTAX',
   errorCode:String(e?.message??'').match(/\b(?:B143|B198ZR4|B198A)_[A-Z0-9_]+/)?.[0]??'INVALID_UNTRUSTED_SOURCE'};
 }
 let compiled;
 try{
  compiled=compileDesign(candidate.design);
  if(!verifyCompiled(candidate.design,compiled))
   throw Error('B198ZR47_GEOMETRY_INTEGRITY');
 }catch(e){
  return {...base,status:'HOLD_B143_GEOMETRY',
   errorCode:String(e?.message??'').match(/\b(?:B143|B198ZR47)_[A-Z0-9_]+/)?.[0]??'INVALID_UNTRUSTED_GEOMETRY'};
 }
 return {...base,status:'STRICT_B143_GEOMETRY_ONLY_PASS_R3_AND_HUMAN_PENDING',
  compilerSourceSha256:compiled.sourceSha256,
  compilerGeometrySha256:compiled.geometrySha256,
  compilerVoxelCount:compiled.primitives.length,
  functionalReachabilityVerified:false,
  declaredPlanIsNotIndependent:true,visualOriginalityApproved:false};
}
