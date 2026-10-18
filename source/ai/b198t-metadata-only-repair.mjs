/**
 * B198T: transparent, bounded repair of NON-GEOMETRIC metadata only.
 * Read the actual model-authored JSON, preserve ALL elements/coordinates/
 * materials/modes, and shorten ONLY overlong title/brief string fields to the
 * exact B143 contract. Never infer geometry, inject a template or approve it.
 *
 * The original response SHA and per-field length changes are retained as
 * independent evidence. Never "repair" invalid JSON, unsafe characters,
 * absent fields, unknown outer keys or structural source errors.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b198t-metadata-only-provenance-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const bad=/[\u0000-\u001f<>]/;
const fields=Object.freeze({title:100,brief:500});
const sameKeys=(x,keys)=>object(x)&&Object.keys(x).length===keys.length&&
 keys.every(k=>Object.hasOwn(x,k));
const report=(status,raw)=>({
 schema:SCHEMA,status,applied:false,
 originalResponseSha256:sha(raw),
 repairedResponseSha256:sha(raw),
 sourceBeforeSha256:null,sourceAfterSha256:null,
 unchangedElementArraySha256:null,
 geometryFieldsUnchanged:false,
 fields:[],worldWrites:0,
 sourceIntegrityMustStillPassB143:true,
 humanArchitecturalReviewRequired:true
});
function cutValidString(text,max){
 if(typeof text!=='string'||!text.length||text.length>10000||bad.test(text))
  return null;
 if(text.length<=max)return text;
 let result=text.slice(0,max);
 // Never manufacture a broken UTF-16 surrogate pair at the truncation edge.
 if(/[\uD800-\uDBFF]$/.test(result))result=result.slice(0,-1);
 return result.length>0?result:null;
}
/**
 * raw is a model output string, untrusted, maximum 60000 bytes.
 * {content,provenance} returned; if not strictly safe, leave raw unchanged
 * so pre-existing B198A + B143 validation rejects it as before.
 */
export function repairB198TMetadataOnly(raw){
 if(typeof raw!=='string'||raw.length>60000||raw.length===0)
  throw Error('B198T_INVALID_MODEL_OUTPUT_SIZE');
 const base=report('NO_METADATA_REPAIR',raw);
 let obj;
 try{obj=JSON.parse(raw)}catch{
  return {content:raw,provenance:{...base,status:'NON_JSON_UNCHANGED'}};
 }
 if(!sameKeys(obj,['design','explanation','assumptions'])||
    !object(obj.design)||!Array.isArray(obj.design.elements)){
  return {content:raw,provenance:{...base,status:'UNEXPECTED_SOURCE_SHAPE_UNCHANGED'}};
 }
 const design=obj.design;
 const sourceBefore=sha(JSON.stringify(design));
 const elementsBefore=sha(JSON.stringify(design.elements));
 const provenance={...base,
  sourceBeforeSha256:sourceBefore,
  sourceAfterSha256:sourceBefore,
  unchangedElementArraySha256:elementsBefore,
  geometryFieldsUnchanged:true
 };
 const changed={};
 for(const [field,max] of Object.entries(fields)){
  const original=design[field];
  const candidate=cutValidString(original,max);
  if(candidate===null){
   return {content:raw,provenance:{
    ...provenance,status:'INVALID_'+field.toUpperCase()+'_UNMODIFIED',
    fields:[] // no partial repair was applied or returned
   }};
  }
  if(candidate!==original){
   changed[field]=candidate;
   provenance.fields.push({
    field,maxAllowedCodeUnits:max,originalCodeUnits:original.length,
    repairedCodeUnits:candidate.length,
    originalTextSha256:sha(original),
    repairedTextSha256:sha(candidate),
    operation:'TRUNCATE_EXCESS_ONLY',
    requiresHumanTextReview:true
   });
  }
 }
 if(!provenance.fields.length)return {content:raw,provenance};
 const repairedDesign={...design,...changed};
 // Source geometry is never regenerated or replaced.
 const elementsAfter=sha(JSON.stringify(repairedDesign.elements));
 if(elementsBefore!==elementsAfter)
  throw Error('B198T_INTERNAL_GEOMETRY_MUTATION_REFUSED');
 const repaired={...obj,design:repairedDesign};
 const content=JSON.stringify(repaired);
 const back=JSON.parse(content);
 if(sha(JSON.stringify(back.design.elements))!==elementsBefore)
  throw Error('B198T_ROUNDTRIP_GEOMETRY_MUTATION_REFUSED');
 return {content,provenance:{
  ...provenance,status:'BOUNDED_METADATA_ONLY_REPAIRED',applied:true,
  repairedResponseSha256:sha(content),
  sourceAfterSha256:sha(JSON.stringify(repairedDesign)),
  geometryFieldsUnchanged:true,
  automaticAestheticOrSemanticQualityCertified:false,
  note:'Only overlong title/brief truncated; all coordinates/materials/elements preserved.'
 }};
}
