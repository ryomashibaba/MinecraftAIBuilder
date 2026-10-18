/**
 * B198U — rectify a model-declared bounding box that is too SMALL for the
 * model's own shapes. This is not geometry generation or placement.
 *
 * IMPORTANT: only dimensions can GROW. Every original authored element,
 * coordinate, shape, material, mode and element ordering stays byte-for-byte
 * equivalent at the JSON array level. The candidate must still pass the
 * complete original B143 validator and compiler. Unsafe/negative domains,
 * excessive dimensions/volume and malformed input remain original HOLD.
 */
import {createHash} from 'node:crypto';
import {repairB198TMetadataOnly}
 from './b198t-metadata-only-repair.mjs';

export const SCHEMA='minecraftaibuilder-b198u-safe-declared-bounds-extension-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const trip=x=>Array.isArray(x)&&x.length===3&&x.every(n=>
 Number.isSafeInteger(n)&&n>=0&&n<=128);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const dims=['width','height','depth'];
const MAX=[128,96,128];
const MIN=[8,8,8];
const safe=()=>({worldWrites:0,worldContacts:0,
 readiness:'NOT_PREPARED',geometryEditsMade:0,
 humanArchitectureQualityCertified:false});
function geometryDomain(e){
 if(!obj(e)||!['add','cut'].includes(e.mode))return null;
 if(e.shape==='box'){
  if(!trip(e.origin)||!trip(e.size)||!e.size.every(v=>int(v,1,128)))
   return null;
  return [e.origin,e.origin.map((v,i)=>v+e.size[i]-1)];
 }
 if(e.shape==='ellipsoid'){
  if(!trip(e.center)||!trip(e.radii)||!e.radii.every(x=>int(x,1,64)))
   return null;
  return [e.center.map((v,i)=>v-e.radii[i]),
   e.center.map((v,i)=>v+e.radii[i])];
 }
 if(e.shape==='cylinder'){
  if(!trip(e.origin)||!['x','y','z'].includes(e.axis)||
   !int(e.radius,1,64)||!int(e.length,1,128))return null;
  const axis={x:0,y:1,z:2}[e.axis];
  return [e.origin.map((v,i)=>v-(i===axis?0:e.radius)),
   e.origin.map((v,i)=>v+(i===axis?e.length-1:e.radius))];
 }
 if(e.shape==='torus'){
  if(!trip(e.center)||!['x','y','z'].includes(e.axis)||
   !int(e.majorRadius,3,45)||!int(e.tubeRadius,1,9)||
   e.majorRadius<=e.tubeRadius+1)return null;
  const axis={x:0,y:1,z:2}[e.axis],span=e.majorRadius+e.tubeRadius;
  return [e.center.map((v,i)=>v-(i===axis?e.tubeRadius:span)),
   e.center.map((v,i)=>v+(i===axis?e.tubeRadius:span))];
 }
 if(e.shape==='beam'){
  if(!trip(e.start)||!trip(e.end)||!int(e.thickness,1,3))return null;
  return [e.start.map((v,i)=>Math.min(v,e.end[i])-e.thickness),
   e.start.map((v,i)=>Math.max(v,e.end[i])+e.thickness)];
 }
 return null;
}
const initial=raw=>({
 schema:SCHEMA,status:'UNMODIFIED',
 applied:false,originalModelResponseSha256:H(raw),
 transformedModelResponseSha256:H(raw),
 originalDeclaredBounds:null,correctedDeclaredBounds:null,
 untouchedElementsSha256:null,geometryEditsMade:0,
 reason:null,strictB143CompilerRequired:true,
 humanArchitecturalReviewRequired:true,safety:safe()
});
export function extendOnlyUndersizedB143Bounds(raw){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000)
  throw Error('B198U_INVALID_RAW_SOURCE_SIZE');
 const base=initial(raw);
 let parsed;
 try{parsed=JSON.parse(raw)}catch{
  return {content:raw,provenance:{...base,status:'NON_JSON_ORIGINAL_HOLD'}}
 }
 if(!obj(parsed)||!obj(parsed.design)||
    !Array.isArray(parsed.design.elements)||
    !obj(parsed.design.bounds)||parsed.design.elements.length>160||
    !dims.every(k=>own(parsed.design.bounds,k))) {
  return {content:raw,provenance:{...base,status:'INVALID_SOURCE_SHAPE_HOLD'}};
 }
 const d=parsed.design;
 if(!dims.every((k,i)=>int(d.bounds[k],MIN[i],MAX[i]))) {
  return {content:raw,provenance:{...base,status:'INVALID_DECLARED_BOUNDS_HOLD'}};
 }
 if(!d.elements.length)return {content:raw,provenance:{
  ...base,status:'NO_MODEL_AUTHORED_ELEMENTS_HOLD'
 }};
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const e of d.elements){
  const domain=geometryDomain(e);
  if(!domain) return {content:raw,provenance:{
   ...base,status:'UNSUPPORTED_OR_MALFORMED_MODEL_SHAPE_HOLD'
  }};
  for(let axis=0;axis<3;axis++){
   min[axis]=Math.min(min[axis],domain[0][axis]);
   max[axis]=Math.max(max[axis],domain[1][axis]);
  }
 }
 if(min.some(x=>x<0))return {content:raw,provenance:{
  ...base,status:'NEGATIVE_ELEMENT_DOMAIN_CANNOT_EXTEND_BOUNDS',
  reason:'Cannot fix a negative coordinate by increasing positive dimensions'
 }};
 const from=dims.map(x=>d.bounds[x]);
 const to=from.map((v,i)=>Math.max(v,max[i]+1));
 const hash=H(JSON.stringify(d.elements));
 const asObj=ar=>Object.fromEntries(dims.map((k,i)=>[k,ar[i]]));
 const fields={...base,originalDeclaredBounds:asObj(from),
  correctedDeclaredBounds:asObj(to),untouchedElementsSha256:hash};
 if(to.every((v,i)=>v===from[i]))return {content:raw,provenance:{
  ...fields,status:'ALREADY_CONTAINS_SHAPE_DOMAINS'
 }};
 if(to.some((v,i)=>v>MAX[i])||to.reduce((p,v)=>p*v,1)>500000)
  return {content:raw,provenance:{
   ...fields,status:'EXPANSION_OVER_B143_LIMIT_HOLD',
   reason:'Expanded extents would exceed axis or total-volume limit'
  }};
 const corrected={...d,
  bounds:{...d.bounds,...asObj(to)}};
 if(H(JSON.stringify(corrected.elements))!==hash)
  throw Error('B198U_GEOMETRY_MUTATION_REFUSED');
 const next=JSON.stringify({...parsed,design:corrected});
 if(H(JSON.stringify(JSON.parse(next).design.elements))!==hash)
  throw Error('B198U_ROUNDTRIP_GEOMETRY_MUTATION_REFUSED');
 return {content:next,provenance:{
  ...fields,status:'DECLARED_BOUNDS_ONLY_EXTENDED',applied:true,
  transformedModelResponseSha256:H(next),
  declaredBoundsOnlyChange:true,
  originalShapeDomainMin:min,originalShapeDomainMaxInclusive:max,
  geometryEditsMade:0,
  modelAuthoredElementsUnmodified:true,
  modelAuthoredPositionDataUnmodified:true,
  humanArchitectureQualityCertified:false
 }};
}
/** The same deterministic local repair can be re-run against saved ORIGINAL
 * model output by chat-side or offline reviewers: no model is involved. */
export function prepareCapturedModelSource(raw){
 const metadata=repairB198TMetadataOnly(raw);
 const bounds=extendOnlyUndersizedB143Bounds(metadata.content);
 return {
  content:bounds.content,metadataRepair:metadata.provenance,
  boundsRepair:bounds.provenance,
  rawModelResponseSha256:H(raw),
  finalCandidateSha256:H(bounds.content),
  modelCallsMade:0,worldWrites:0
 };
}
