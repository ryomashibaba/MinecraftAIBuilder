/**
 * B154: source-pinned, generic geometric repair proof. Compare a before/after
 * building revision using an unchanged 2x2 body and flat-only movement model.
 * This does not certify Minecraft entity physics or authorize world writes.
 */
import {createHash} from 'node:crypto';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
export const SCHEMA='minecraftaibuilder-b154-bypass-evidence-v1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const yes=(b,msg)=>{if(!b)throw Error('B154_'+msg);};
const k=p=>p.slice(0,3).join(',');
export function analyzeBypassIntervention(before,after,parameters){
 yes(before?.geometrySha256!==after?.geometrySha256&&
  before?.designOnly===true&&after?.designOnly===true&&
  before?.readiness==='NOT_PREPARED'&&after?.readiness==='NOT_PREPARED'&&
  before?.worldContacts===0&&after?.worldContacts===0&&
  before?.BuildPlan?.operations?.length===0&&after?.BuildPlan?.operations?.length===0&&
  Array.isArray(before?.primitives)&&Array.isArray(after?.primitives),'INVALID_REVISIONS');
 yes(parameters?.width>=2&&parameters?.depth>=2&&parameters?.headroom>=2,
  'EXPECTED_BODY_CLEARANCE');
 const oldReport=analyzeFootprint(before,parameters);
 const newReport=analyzeFootprint(after,parameters);
 yes(verifyFootprint(before,parameters,oldReport)&&
  verifyFootprint(after,parameters,newReport),'UNTRUSTED_ROUTE_REPORT');
 const prior=new Map(before.primitives.map(p=>[k(p),p])),
  next=new Map(after.primitives.map(p=>[k(p),p]));
 const additions=[],removals=[],materialChanges=[];
 for(const [cell,p] of next){
  if(!prior.has(cell))additions.push(cell);
  else if(prior.get(cell)[3]!==p[3])materialChanges.push(cell);
 }
 for(const cell of prior.keys())if(!next.has(cell))removals.push(cell);
 const targets=newReport.targets.map((route,i)=>{
  const initial=oldReport.targets[i];
  const improved=initial.status!=='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
   route.status==='PASS_FLAT_FOOTPRINT_GEOMETRY';
  const path=route.path;
  const turns=[];
  for(let j=2;j<path.length;j++){
   const a=path[j-2],b=path[j-1],c=path[j],
    former=[b[0]-a[0],b[2]-a[2]],latter=[c[0]-b[0],c[2]-b[2]];
   if(former[0]!==latter[0]||former[1]!==latter[1])turns.push(b);
  }
  return {id:route.id,before:initial.status,after:route.status,
   improvedByActualVoxels:improved,steps:route.steps,turnCount:turns.length,
   turnAnchors:turns,routeSourceVerified:true,
   motionCertified:false,stairsCertified:false};
 });
 const report={
  schema:SCHEMA,parentSourceSha256:before.sourceSha256,
  parentGeometrySha256:before.geometrySha256,
  childSourceSha256:after.sourceSha256,
  childGeometrySha256:after.geometrySha256,
  priorReportSha256:oldReport.sha256,afterReportSha256:newReport.sha256,
  changedVoxelCount:additions.length+removals.length+materialChanges.length,
  physicallyAddedVoxels:additions.length,physicallyRemovedVoxels:removals.length,
  changedMaterialVoxels:materialChanges.length,targets,
  categoryNeutral:true,geometryOnly:true,playerCollisionCertified:false,
  stairsCertified:false,constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),worldContacts:0,worldCoordinates:null,
  BuildPlan:{operations:[]},
  interpretation:'Newly connected 2x2 occupancy across physically authored supported local floor cells; all moves are same Y. Does not claim Education avatar hitbox, stairs, safe turning speed or world placement.'
 };
 return {...report,sha256:hash(report)};
}
export function verifyBypassIntervention(before,after,parameters,report){
 try{
  const expected=analyzeBypassIntervention(before,after,parameters);
  return JSON.stringify(expected)===JSON.stringify(report)&&
   report.constructionApproved===false&&report.gates?.length===9&&
   report.gates.every(g=>g==='BLOCKED')&&report.BuildPlan.operations.length===0;
 }catch{return false;}
}
