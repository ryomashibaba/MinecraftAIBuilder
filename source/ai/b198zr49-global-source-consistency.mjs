/**
 * R49 — original-preserving cross-field geometry/program contradictions.
 * Designed from R48 actual source failures but contains NO R48 model output.
 * This is not B143 compilation, route simulation, source repair, inference,
 * or a certification of real Minecraft/avatar construction.
 */
import {createHash} from 'node:crypto';
import {inspectR45Original} from './b198zr45-original-grammar-and-program-audit.mjs';

export const SCHEMA='minecraftaibuilder-b198zr49-global-consistency-audit-v1';
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const bounded=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isSafeInteger(n));
const validBounds=b=>b&&bounded(b.width,8,128)&&
 bounded(b.height,8,96)&&bounded(b.depth,8,128);
const keys=['width','height','depth'];
const cmp=(min,max,dim)=>min.every((v,i)=>v>=0)&&max.every((v,i)=>v<dim[i]);
const basicSize=v=>vec(v)&&v.every(x=>x>=1);
export const localEnvelope=e=>{
 if(!e||typeof e!=='object')return null;
 const s=e.shape,origin=e.origin,axis=e.axis;
 let a,b;
 if(s==='box'&&vec(origin)&&basicSize(e.size)){
  a=origin.slice();b=a.map((v,i)=>v+e.size[i]-1);
 }else if(s==='staircase'&&vec(origin)&&['x','z'].includes(axis)&&
  [-1,1].includes(e.direction)&&bounded(e.steps,2,32)&&
  bounded(e.treadDepth,1,3)&&bounded(e.width,2,12)){
  const along=axis==='x'?0:2,across=along===0?2:0;
  a=origin.slice();b=origin.slice();
  const end=origin[along]+e.direction*(e.steps*e.treadDepth-1);
  a[along]=Math.min(origin[along],end);
  b[along]=Math.max(origin[along],end);
  b[1]=origin[1]+e.steps-1;
  b[across]=origin[across]+e.width-1;
 }else if(s==='ellipsoid'&&vec(e.center)&&basicSize(e.radii)){
  a=e.center.map((v,i)=>v-e.radii[i]);
  b=e.center.map((v,i)=>v+e.radii[i]);
 }else if(s==='cylinder'&&vec(origin)&&['x','y','z'].includes(axis)&&
  bounded(e.radius,1,64)&&bounded(e.length,1,128)){
  const t={x:0,y:1,z:2}[axis];
  a=origin.map((v,i)=>v-(i===t?0:e.radius));
  b=origin.map((v,i)=>v+(i===t?e.length-1:e.radius));
 }else if(s==='torus'&&vec(e.center)&&['x','y','z'].includes(axis)&&
  bounded(e.majorRadius,3,45)&&bounded(e.tubeRadius,1,9)){
  const t={x:0,y:1,z:2}[axis],rad=e.majorRadius+e.tubeRadius;
  a=e.center.map((v,i)=>v-(i===t?e.tubeRadius:rad));
  b=e.center.map((v,i)=>v+(i===t?e.tubeRadius:rad));
 }else if(s==='beam'&&vec(e.start)&&vec(e.end)&&bounded(e.thickness,1,3)){
  a=e.start.map((v,i)=>Math.min(v,e.end[i])-e.thickness);
  b=e.start.map((v,i)=>Math.max(v,e.end[i])+e.thickness);
 }else return null;
 if(e.repeat!==undefined){
  const {count,offset}=e.repeat??{};
  if(!bounded(count,2,32)||!vec(offset))return null;
  const shift=offset.map(n=>n*(count-1));
  a=a.map((n,i)=>n+Math.min(0,shift[i]));
  b=b.map((n,i)=>n+Math.max(0,shift[i]));
 }
 return {min:a,max:b};
};
const commonSafety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export function inspectR49GlobalConsistency(raw){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR49_INVALID_RAW_LENGTH');
 const base={schema:SCHEMA,originalRawSha256:digest(raw),
  unmodifiedOriginal:true,modelCalls:0,worldContacts:0,worldWrites:0,
  modelQualityCertified:false,compilerPassCertified:false,
  physicalWalkabilityCertified:false,safety:commonSafety()};
 let parsed;
 try{parsed=JSON.parse(raw)}catch{
  return {...base,status:'HOLD_MALFORMED_JSON',
   issues:[{kind:'UNPARSEABLE_JSON',count:1}]};
 }
 const b=parsed?.design?.bounds;
 const els=parsed?.design?.elements;
 const plan=parsed?.spatialPlan;
 if(!validBounds(b)||!Array.isArray(els)||els.length>160||
  !plan||typeof plan!=='object'||
  !['protectedVoids','destinations','functionalZones'].every(k=>
   Array.isArray(plan[k]))){
  return {...base,status:'HOLD_MISSING_SOURCE_OR_BOUNDS',
   issues:[{kind:'INVALID_SOURCE_ENVELOPE',count:1}]};
 }
 const dim=keys.map(k=>b[k]);
 const boundsIssues=[],unsupported=[];
 for(let i=0;i<els.length;i++){
  const el=els[i],box=localEnvelope(el);
  if(box===null){unsupported.push({id:el?.id??null,index:i,shape:el?.shape??null});continue;}
  if(!cmp(box.min,box.max,dim)){
   const outsideAxes=keys.map((k,j)=>
    box.min[j]<0||box.max[j]>=dim[j]?k:null).filter(Boolean);
   boundsIssues.push({id:el.id??null,index:i,shape:el.shape,
    min:box.min,max:box.max,outsideAxes});
  }
 }
 const positions=[];
 if(vec(plan.entrance))positions.push({kind:'entrance',id:'entrance',point:plan.entrance});
 for(const target of plan.destinations??[]){
  if(vec(target?.point))positions.push({kind:'destination',id:target.id,point:target.point});
 }
 const positionsOutside=positions.filter(x=>x.point.some((v,j)=>v<0||v>=dim[j]));
 const contradictoryPaths=[];
 if(vec(plan.entrance)){
  for(const t of plan.destinations??[]){
   if(!vec(t?.point)||!Number.isSafeInteger(t.maximumPathSteps))continue;
   const horizontal=Math.abs(t.point[0]-plan.entrance[0])+
    Math.abs(t.point[2]-plan.entrance[2]);
   const vertical=Math.abs(t.point[1]-plan.entrance[1]);
   // R3 can change y by one AND move in x/z in the same edge.
   // Therefore add(horizontal,vertical) would be an invalid lower bound.
   const minSteps=Math.max(horizontal,vertical);
   if(t.maximumPathSteps<minSteps)contradictoryPaths.push({
    id:t.id??null,target:t.point,
    horizontalLowerBound:horizontal,verticalLowerBound:vertical,
    safeStepLowerBound:minSteps,declaredMax:t.maximumPathSteps,
    deficit:minSteps-t.maximumPathSteps,
    basedOnObstacles:false,definitelyImpossibleUnderR3:true
   });
  }
 }
 const names=new Map();
 for(const kind of ['protectedVoids','destinations','functionalZones']){
  for(const item of plan[kind]??[]){
   if(typeof item?.id!=='string')continue;
   const prior=names.get(item.id)??[];
   prior.push(kind);names.set(item.id,prior);
  }
 }
 const duplicatedIds=[...names].filter(([,uses])=>uses.length>1)
  .map(([id,uses])=>({id,usedIn:uses}));
 // Preserve R45's read-only box intersection hints (NOT compiled voxels).
 let overlaps=[];
 try{
  const r45=inspectR45Original(raw);
  overlaps=r45.issues?.find(x=>x.kind==='LATER_ADD_OVERLAPS_DECLARED_VOID_BOX')
   ?.affected??[];
 }catch{}
 const shapes={};
 for(const e of els)shapes[e?.shape??'invalid']=(shapes[e?.shape??'invalid']??0)+1;
 const issues=[
  ...(boundsIssues.length?[{kind:'ELEMENT_OUTSIDE_LOCAL_BOUNDS',count:boundsIssues.length}]:[]),
  ...(positionsOutside.length?[{kind:'POINT_OUTSIDE_LOCAL_BOUNDS',count:positionsOutside.length}]:[]),
  ...(contradictoryPaths.length?[{kind:'DECLARED_PATH_STEPS_IMPOSSIBLE',count:contradictoryPaths.length}]:[]),
  ...(duplicatedIds.length?[{kind:'REUSED_R3_SPATIAL_ID',count:duplicatedIds.length}]:[]),
  ...(overlaps.length?[{kind:'POSSIBLE_PROTECTED_VOID_REFILL',count:overlaps.length}]:[]),
  ...(unsupported.length?[{kind:'UNSUPPORTED_SOURCE_ENVELOPE',count:unsupported.length}]:[])
 ];
 return {...base,status:issues.length?'HOLD_GLOBAL_COORDINATE_OR_PROGRAM_CONTRADICTIONS':
  'NO_OBVIOUS_CROSS_FIELD_CONTRADICTION_BUT_NOT_CERTIFIED',
  declaredDimensions:dim,elementCount:els.length,sourceShapeCounts:shapes,
  elementBoundsViolations:boundsIssues,
  uncheckedSourceEnvelopes:unsupported,
  declaredPointBoundsViolations:positionsOutside,
  impossiblePathDeclarations:contradictoryPaths,
  duplicatedR3Ids:duplicatedIds,
  possibleVoidRefillEvents:overlaps,
  issues,finalVoxelAnalysisPerformed:false,
  modelSelfDeclaredPlanIsNotIndependent:true,
  noSilentRangeClamping:true,noAutoGeometryRepair:true};
}
