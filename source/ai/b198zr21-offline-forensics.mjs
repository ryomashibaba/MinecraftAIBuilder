/**
 * B198Z-R21: evidence-only diagnostics for SAVED, unmodified four-key
 * architectural responses. No generation, rewriting, fallback shape,
 * imports of Minecraft, execution or world contact.
 *
 * Fast static checks are deliberately SEPARATE from authoritative B143,
 * R3 and independent human judgment. An advisory result never passes them.
 */
import {createHash} from 'node:crypto';
import {MATERIALS} from './b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198zr21-offline-source-forensics-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isSafeInteger);
const ints=v=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isSafeInteger(x)&&x>=0);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const box=e=>{
 if(!obj(e))return null;
 if(e.shape==='box'&&vec(e.origin)&&vec(e.size))
  return {min:e.origin,max:e.origin.map((v,i)=>v+e.size[i]-1)};
 if(e.shape==='staircase'&&vec(e.origin)&&
  ['x','z'].includes(e.axis)&&[1,-1].includes(e.direction)&&
  Number.isSafeInteger(e.steps)&&Number.isSafeInteger(e.treadDepth)&&
  Number.isSafeInteger(e.width)){
  const a=e.origin.slice(),b=e.origin.slice(),dir=e.axis==='x'?0:2,
   side=dir===0?2:0,end=e.origin[dir]+e.direction*(e.steps*e.treadDepth-1);
  a[dir]=Math.min(e.origin[dir],end);
  b[dir]=Math.max(e.origin[dir],end);
  b[1]=e.origin[1]+e.steps-1;b[side]=e.origin[side]+e.width-1;
  return {min:a,max:b};
 }
 if(e.shape==='cylinder'&&vec(e.origin)&&
  ['x','y','z'].includes(e.axis)&&Number.isSafeInteger(e.radius)&&
  Number.isSafeInteger(e.length)){
  const i={x:0,y:1,z:2}[e.axis];
  return {min:e.origin.map((v,k)=>v-(k===i?0:e.radius)),
   max:e.origin.map((v,k)=>v+(k===i?e.length-1:e.radius))};
 }
 if(e.shape==='ellipsoid'&&vec(e.center)&&vec(e.radii))
  return {min:e.center.map((v,i)=>v-e.radii[i]),
   max:e.center.map((v,i)=>v+e.radii[i])};
 if(e.shape==='torus'&&vec(e.center)&&['x','y','z'].includes(e.axis)&&
  Number.isSafeInteger(e.majorRadius)&&Number.isSafeInteger(e.tubeRadius)){
  const i={x:0,y:1,z:2}[e.axis],span=e.majorRadius+e.tubeRadius;
  return {min:e.center.map((v,j)=>v-(i===j?e.tubeRadius:span)),
   max:e.center.map((v,j)=>v+(i===j?e.tubeRadius:span))};
 }
 if(e.shape==='beam'&&vec(e.start)&&vec(e.end)&&Number.isSafeInteger(e.thickness))
  return {min:e.start.map((v,i)=>Math.min(v,e.end[i])-e.thickness),
   max:e.start.map((v,i)=>Math.max(v,e.end[i])+e.thickness)};
 return null;
};
const volume=(a,b)=>a&&b?a.min.reduce((n,v,i)=>
 n*Math.max(0,Math.min(a.max[i],b.max[i])-Math.max(v,b.min[i])+1),1):0;
const bounds=(d)=>ints([d?.bounds?.width,d?.bounds?.height,d?.bounds?.depth])?
 [d.bounds.width,d.bounds.height,d.bounds.depth]:null;
function issue(code,detail){return {code,...detail};}

/** Reports diagnostic findings; does NOT rewrite raw or validate walkability.
 * Only the *name* of the caller's previously saved source is accepted as a
 * tag. Never serialize local user file paths into reports.
 */
export function inspectR21SavedOriginal(raw,{
 expectedRawSha256=null,requestPrompt='',sourceLabel='SAVED_ORIGINAL'
}={}){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR21_INVALID_ORIGINAL_SIZE');
 const rawSha256=hash(raw);
 if(expectedRawSha256!==null&&
  (!/^[0-9a-f]{64}$/.test(expectedRawSha256)||
   expectedRawSha256!==rawSha256))
  throw Error('B198ZR21_SAVED_ORIGINAL_HASH_MISMATCH');
 if(typeof requestPrompt!=='string'||requestPrompt.length>8000)
  throw Error('B198ZR21_REQUEST_PROMPT_BOUNDS');
 if(!/^[A-Z0-9_]{3,60}$/.test(sourceLabel))
  throw Error('B198ZR21_SOURCE_LABEL');
 let source=null;
 try{source=JSON.parse(raw)}catch{}
 const fourKeys=obj(source)&&Object.keys(source).length===4&&
  ['design','spatialPlan','explanation','assumptions']
   .every(k=>Object.hasOwn(source,k));
 const d=source?.design,p=source?.spatialPlan,els=Array.isArray(d?.elements)?d.elements:[];
 const dims=bounds(d),critical=[],advisory=[];
 if(!fourKeys)
  critical.push(issue('FOUR_KEY_ENVELOPE_INVALID',{}));
 els.forEach((e,index)=>{
  if(!obj(e))return;
  const id=typeof e.id==='string'&&e.id.length<=48?e.id:'UNNAMED';
  if(e.mode==='add'&&!MATERIALS.includes(e.material))
   critical.push(issue('ADD_MATERIAL_MISSING_OR_INVALID',{index,elementId:id,
    materialPresent:Object.hasOwn(e,'material')}));
  if(e.mode==='cut'&&Object.hasOwn(e,'material'))
   critical.push(issue('CUT_MUST_OMIT_MATERIAL',{index,elementId:id}));
  const domain=box(e);
  if(domain&&dims){
   // Account for translated copies exactly as the B143 bounding-envelope
   // check does, but NOT for actual occupied voxels or final walkability.
   if(obj(e.repeat)&&Number.isSafeInteger(e.repeat.count)&&
      vec(e.repeat.offset)){
    const drift=e.repeat.offset.map(n=>n*(e.repeat.count-1));
    domain.min=domain.min.map((v,i)=>v+Math.min(0,drift[i]));
    domain.max=domain.max.map((v,i)=>v+Math.max(0,drift[i]));
   }
   const axes=[0,1,2].filter(i=>domain.min[i]<0||domain.max[i]>=dims[i]);
   if(axes.length)
    critical.push(issue('SOURCE_ENVELOPE_OUTSIDE_BOUNDS',{
     index,elementId:id,axes,minimum:domain.min,maximum:domain.max}));
  }
 });
 if(obj(p)&&Array.isArray(p.protectedVoids)){
  for(const v of p.protectedVoids){
   if(!vec(v?.origin)||!vec(v?.size))continue;
   const voidBox={min:v.origin,max:v.origin.map((a,i)=>a+v.size[i]-1)};
   const lastCut=els.reduce((i,e,j)=>e?.mode==='cut'&&
    e?.shape==='box'&&volume(box(e),voidBox)>0?j:i,-1);
   // Strong negative signal only: an ADD box occurs AFTER all overlapping
   // BOX cuts. Later other shapes may alter it; this is not a voxel proof.
   els.forEach((e,index)=>{
    if(e?.mode!=='add'||e?.shape!=='box'||index<=lastCut)return;
    const count=volume(box(e),voidBox);
    if(count>0)advisory.push(issue('LATE_BOX_ADD_OVERLAPS_DECLARED_VOID',{
     index,elementId:e.id??'UNNAMED',voidId:v.id??'UNNAMED',
     intersectingBoundingBoxCells:count,
     finalOccupiedVoxelCountVerified:false}));
   });
  }
 }
 if(vec(p?.entrance)&&p.entrance[1]===0)
  advisory.push(issue('ENTRANCE_BOTTOM_BOUNDARY_NO_LOCAL_SUPPORT',
   {entrance:p.entrance,externalGroundUnknown:true}));
 const curved=/(曲線|曲面|曲がった|curv(?:ed|e|ature)|湾曲)/i.test(requestPrompt);
 if(curved&&!els.some(e=>['ellipsoid','torus','beam'].includes(e?.shape)))
  advisory.push(issue('CURVED_SILHOUETTE_NOT_DEMONSTRATED_BY_MACRO_FORMS',
   {semanticShapeJudgmentRequiresHuman:true}));
 return {
  schema:SCHEMA,sourceLabel,rawSha256,rawUtf8Bytes:Buffer.byteLength(raw),
  exactFourKeyJsonParseable:!!fourKeys,
  sourceElementCount:els.length,
  staircaseElements:els.filter(e=>e?.shape==='staircase').length,
  authoredRepeatElements:els.filter(e=>e?.repeat!==undefined).length,
  criticalSourceFindings:critical,advisoryArchitecturalFindings:advisory,
  staticCriticalCount:critical.length,architecturalWarningCount:advisory.length,
  staticCriticalFindingsAreNotCompleteB143Validation:true,
  conservativeWarningCountsAreNotFinalVoxelMeasurements:true,
  independentB143AndR3ReviewStillRequired:true,
  modelCallsByThisAnalysis:0,sourceOriginalPreserved:true,
  qualityCertified:false,constructionAuthorized:false,
  safety:safety()
 };
}
