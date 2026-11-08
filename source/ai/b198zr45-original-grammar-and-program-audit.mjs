/**
 * R45 — raw-first failures observed in the single saved R44 evidence.
 * This is a READ-ONLY diagnostic of authored claims, NOT a compiler, an
 * automatic model-output repair or an approved inference profile.
 * All spatial intersections are BBOX intent hints, NOT final voxel proof.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b198zr45-original-grammar-and-program-audit-v1';
export const PROFILE='R45_CORRECTIVE_ADVICE_NOT_ENABLED';
const sha=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R45_CORRECTIVE_GUIDE=[
 'Design an ORIGINAL architectural composition specifically for the Japanese brief; do not choose a generic template, fixed plan, or copied coordinates.',
 'B143 source element fields are FLAT. Write {"id":"floor","shape":"box","mode":"add","material":"concrete","origin":[0,0,0],"size":[10,1,10]}; NEVER write {"shape":{"origin":...}}. shape MUST be a string, never an object.',
 'Valid shape strings: "box","ellipsoid","cylinder","torus","beam","staircase". For staircase, use shape:"staircase" with origin,axis,direction,width,steps,treadDepth at the SAME level as shape. For ellipsoid put center and radii at that level.',
 'spatialPlan.entrance MUST be one coordinate array [x,y,z] of a standable EMPTY cell, NOT a box or object. spatialPlan.headroom MUST be the integer 2 or 3, NOT an object.',
 'Every ADD must include a valid material, and every CUT must OMIT material. All element extents including every repeat instance must remain inside local bounds.',
 'Empty real rooms, atria and doorways must survive the FINAL operation order. Do not put a CUT over a complete bookshelf/functional mass and then claim the mass still exists. Never add a later glow strip that blocks the entrance air cell.',
 'If a central protectedVoid claims maxOccupiedCells:0, place any required lounge floors, roofs, bridges, furniture and light OUTSIDE that exact claimed empty volume, or instead truthfully define narrower separate voids around them. Do NOT weaken thresholds to conceal blockage.',
 'Make supported floors and 2-3 blocks of clear headspace; connect the entrance to each declared destination including matching staircase top elevations and landings. Declared routes are unverified until an independent voxel checker runs.',
 'Return EXACT top-level keys design, spatialPlan, explanation, assumptions in ONE complete valid minified JSON object. Output designOnly:true; avoid commentary, claims of verification, construction or artistic approval. Preserve substantial silhouette and coherent functional program before ornament.'
].join('\n');
export const R45_CORRECTIVE_GUIDE_SHA256=sha(R45_CORRECTIVE_GUIDE);
const triple=v=>Array.isArray(v)&&v.length===3&&
 v.every(x=>Number.isSafeInteger(x));
const asBox=e=>{
 if(!e||typeof e!=='object')return null;
 const s=(e.shape&&typeof e.shape==='object'&&!Array.isArray(e.shape))?
  e.shape:e;
 if(!triple(s?.origin)||!triple(s?.size)||!s.size.every(x=>x>=1))return null;
 const start=s.origin,end=start.map((x,i)=>x+s.size[i]);
 if(end.some(x=>!Number.isSafeInteger(x)))return null;
 return {start,end,volume:s.size.reduce((a,b)=>a*b,1)};
};
const overlap=(a,b)=>!a||!b?0:a.start.reduce((n,v,i)=>
 n*Math.max(0,Math.min(a.end[i],b.end[i])-Math.max(v,b.start[i])),1);
const encloses=(a,b)=>a&&b&&a.start.every((v,i)=>
 v<=b.start[i]&&a.end[i]>=b.end[i]);
export function inspectR45Original(raw){
 if(typeof raw!=='string'||!raw.length||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR45_RAW_SIZE');
 const common={schema:SCHEMA,profile:PROFILE,originalRawSha256:sha(raw),
  originalBytes:Buffer.byteLength(raw),
  originalUnmodified:true,noAutoRepair:true,modelCalls:0,
  worldContacts:0,worldWrites:0,safety:safety(),
  originalQwenPerformanceImprovementProven:false,
  plannedGuideNotActivated:true};
 let data;
 try{data=JSON.parse(raw)}catch{
  return {...common,status:'HOLD_INVALID_JSON',issues:[{
   kind:'INCOMPLETE_OR_INVALID_JSON',count:1}],evidenceFromFinalVoxelCompiler:false};
 }
 const design=data?.design,spatial=data?.spatialPlan;
 const es=Array.isArray(design?.elements)&&design.elements.length<=160?
  design.elements:null;
 if(!es)return {...common,status:'HOLD_DESIGN_ELEMENT_ENVELOPE',
  issues:[{kind:'NO_VALID_ELEMENTS',count:1}],evidenceFromFinalVoxelCompiler:false};
 const nested=es.flatMap((e,i)=>e?.shape!==null&&typeof e?.shape==='object'&&
  !Array.isArray(e.shape)?[{index:i,id:e.id??null}]:[]);
 const badShape=es.flatMap((e,i)=>typeof e?.shape!=='string'?
  [{index:i,id:e?.id??null}]:[]);
 const badEntr=!(triple(spatial?.entrance));
 const badHead=!([2,3].includes(spatial?.headroom));
 const cutMaterial=es.flatMap((e,i)=>e?.mode==='cut'&&
  Object.hasOwn(e,'material')?[{index:i,id:e.id??null}]:[]);
 const wiped=[];
 for(let i=0;i<es.length;i++){
  const a=es[i];
  if(a?.mode!=='add'||!asBox(a))continue;
  for(let j=i+1;j<es.length;j++){
   const cut=es[j];
   if(cut?.mode!=='cut'||!encloses(asBox(cut),asBox(a)))continue;
   const resurrected=es.slice(j+1).some(x=>x?.mode==='add'&&
    x.material===a.material&&overlap(asBox(x),asBox(a))>0);
   if(!resurrected){
    wiped.push({sourceElementId:a.id??null,laterCutId:cut.id??null,
     sourceMaterial:a.material??null,
     authoredBoxVolume:asBox(a).volume,
     conclusion:'AUTHORED_BOX_ERASED_IN_INTENDED_ORDER',
     evidenceLevel:'BOX_INTERSECTION_ONLY_NOT_COMPILER_VOXELS'});
   }
   break;
  }
 }
 const voidOverlaps=[];
 if(Array.isArray(spatial?.protectedVoids)){
  for(const v of spatial.protectedVoids.slice(0,16)){
   const vBox=asBox(v);if(!vBox)continue;
   const lastCut=es.reduce((n,e,i)=>
    e?.mode==='cut'&&overlap(vBox,asBox(e))>0?i:n,-1);
   for(let i=lastCut+1;i<es.length;i++){
    if(es[i]?.mode!=='add')continue;
    const count=overlap(vBox,asBox(es[i]));
    if(count)voidOverlaps.push({
     protectedVoidId:v.id??null,addId:es[i].id??null,
     bboxIntersectionCells:count,
     evidenceLevel:'POTENTIAL_FINAL_OVERLAP_NOT_COMPILED',
     lastCutIndex:lastCut});
   }
  }
 }
 const issues=[];
 if(badShape.length)issues.push({kind:'SHAPE_MUST_BE_STRING',
  count:badShape.length,indices:badShape.slice(0,8)});
 if(badEntr)issues.push({kind:'ENTRANCE_POINT_MUST_BE_TRIPLE',count:1});
 if(badHead)issues.push({kind:'HEADROOM_MUST_BE_2_OR_3',count:1});
 if(cutMaterial.length)issues.push({kind:'CUT_MATERIAL_FORBIDDEN',
  count:cutMaterial.length,indices:cutMaterial.slice(0,8)});
 if(wiped.length)issues.push({kind:'COMPLETE_AUTHORED_BOX_REMOVAL_IN_INTENDED_ORDER',
  count:wiped.length,affected:wiped.slice(0,16)});
 if(voidOverlaps.length)issues.push({kind:'LATER_ADD_OVERLAPS_DECLARED_VOID_BOX',
  count:voidOverlaps.length,affected:voidOverlaps.slice(0,16)});
 return {...common,status:issues.length?
  'HOLD_AUTHORED_GRAMMAR_OR_PROGRAM_MISTAKES':
  'ADVISORY_NO_OBVIOUS_SOURCE_PATTERNS_FOUND_NOT_CERTIFIED',
  elementCount:es.length,invalidShapeTypeCount:badShape.length,
  nestedShapeObjectCount:nested.length,
  entrancePointSyntaxValid:!badEntr,headroomSyntaxValid:!badHead,
  illegalCutMaterialCount:cutMaterial.length,
  boxElementsErasedByLaterCuts:wiped.length,
  laterAddDeclaredVoidBoxIntersections:voidOverlaps.length,
  issues,
  inspectionOnlyNoReconstruction:true,
  finalVoxelGeometryCertified:false,
  evidenceFromFinalVoxelCompiler:false,
  actualUsableRoutesCertified:false,
  humanAestheticQualityCertified:false};
}
