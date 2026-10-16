/**
 * B157 — materialise a proposed skybridge into an architectural FINISH DESIGN,
 * keeping all source elements unchanged and rerouting the same entire 2x2
 * body after adding rails, lower trusses, piers and low-voltage-looking light.
 *
 * No building-code compliance, physical strength or Minecraft entity physics
 * is certified. Nothing may become a world/build instruction.
 */
import {createHash} from 'node:crypto';
import {validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildBridgeCandidate,verifyBridgeCandidate} from './b156-candidate-proof.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';

export const SCHEMA='minecraftaibuilder-b157-finished-bridge-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const valid=(condition,reason)=>{if(!condition)throw Error('B157_'+reason);};
const box=(id,origin,size,material)=>({id,shape:'box',mode:'add',material,origin,size});
const pt=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128);

export function designFinishedBridge(original,proposalParameters,{
 supportBaseY=8,finishId='aurora-interchange-generated-finished'
}={}){
 valid(Number.isSafeInteger(supportBaseY)&&supportBaseY>=0&&supportBaseY<=120&&
  /^[a-z][a-z0-9-]{2,47}$/.test(finishId)&&
  finishId!==original?.id,'PARAMETERS');
 const generated=buildBridgeCandidate(original,proposalParameters);
 valid(verifyBridgeCandidate(original,proposalParameters,generated.report)&&
  generated.report.constructionApproved===false&&
  generated.report.gates.every(x=>x==='BLOCKED'),'UNTRUSTED_PARENT');
 const proposal=generated.proposal.proposedFloor;
 valid(proposal?.mode==='add'&&proposal?.material==='concrete'&&
  pt(proposal.origin)&&pt(proposal.size)&&proposal.shape==='box',
  'INVALID_FLOOR');
 const [x,y,z]=proposal.origin,[w,h,d]=proposal.size;
 const alongX=w>d;
 const long=alongX?w:d,short=alongX?d:w;
 valid((alongX?w>=10:d>=10)&&short>=6&&
  y>=3&&supportBaseY<y&&
  (alongX?w:d)>=proposalParameters.footprintWidth+6,'TOO_NARROW_OR_LOW');
 const standingY=y+h;
 const H=(axisLength,pos)=>Math.max(1,Math.min(axisLength-2,pos));
 // Extend the guard TWO CELLS outside the floor. Route endpoints can enter
 // without crossing the guards. Their side coverage is a DESIGN feature only.
 const start=2,length=long-4;
 const guard=(side,id)=>alongX?
  box(id,[x+start,standingY,z+(side?d:-1)],[length,2,1],'glass'):
  box(id,[x+(side?w:-1),standingY,z+start],[1,2,length],'glass');
 const lowerBeam=(side,id)=>alongX?
  box(id,[x+start,y-1,z+(side?d-1:0)],[length,1,1],'metal'):
  box(id,[x+(side?w-1:0),y-1,z+start],[1,1,length],'metal');
 const middle=alongX?z+Math.floor(d/2)-1:x+Math.floor(w/2)-1;
 const pier=(offset,id)=>alongX?
  box(id,[x+H(w,offset),supportBaseY,middle],
   [2,y-supportBaseY,2],'metal'):
  box(id,[middle,supportBaseY,z+H(d,offset)],
   [2,y-supportBaseY,2],'metal');
 const light=(side,id)=>alongX?
  box(id,[x+start+2,standingY+2,z+(side?d:-1)],
   [Math.max(1,length-4),1,1],'glow'):
  box(id,[x+(side?w:-1),standingY+2,z+start+2],
   [1,1,Math.max(1,length-4)],'glow');
 const archPost=(atStart,side,id)=>alongX?
  box(id,[x+(atStart?start:start+length-1),standingY,z+(side?d:-1)],[1,7,1],'metal'):
  box(id,[x+(side?w:-1),standingY,z+(atStart?start:start+length-1)],[1,7,1],'metal');
 const arch=(atStart,id)=>alongX?
  box(id,[x+(atStart?start:start+length-1),standingY+6,z-1],[1,1,d+2],'accent'):
  box(id,[x-1,standingY+6,z+(atStart?start:start+length-1)],[w+2,1,1],'accent');
 const additional=[
  guard(false,'b157-left-glass-guard'),guard(true,'b157-right-glass-guard'),
  lowerBeam(false,'b157-left-undertruss'),lowerBeam(true,'b157-right-undertruss'),
  pier(Math.floor(long/3),'b157-support-pier-a'),
  pier(Math.floor(long*2/3),'b157-support-pier-b'),
  light(false,'b157-left-illumination'),light(true,'b157-right-illumination'),
  archPost(true,false,'b157-entry-post-left'),
  archPost(true,true,'b157-entry-post-right'),
  arch(true,'b157-entry-overhead-arch'),
  archPost(false,false,'b157-exit-post-left'),
  archPost(false,true,'b157-exit-post-right'),
  arch(false,'b157-exit-overhead-arch')
 ];
 const finished={
  ...structuredClone(generated.candidate),id:finishId,
  title:'オーロラ・インターチェンジ — 自動設計の双翼スカイブリッジ完成案',
  brief:'自動床案に左右ガラス柵・桁下トラス・支柱・発光ライン・立体門型構造を自動設計。経路幾何は検査済みだが、耐荷重・支柱基礎・Minecraft実機移動・施工は未承認。',
  elements:[...structuredClone(generated.candidate.elements),...additional]
 };
 validateDesign(finished);
 valid(JSON.stringify(finished.elements.slice(0,generated.candidate.elements.length))===
  JSON.stringify(generated.candidate.elements),'PARENT_DESIGN_MUTATED');
 const compiled=compileDesign(finished);
 valid(verifyCompiled(finished,compiled)&&
  compiled.geometrySha256!==generated.compiled.geometrySha256,
  'NO_REAL_FINISH_CHANGE');
 const routeArgs={start:proposalParameters.start,
  destinations:[{id:'target',at:proposalParameters.goal}],
  width:proposalParameters.footprintWidth??2,
  depth:proposalParameters.footprintDepth??2,headroom:2};
 const reroute=analyzeFootprint(compiled,routeArgs);
 valid(verifyFootprint(compiled,routeArgs,reroute)&&
  reroute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  reroute.targets[0].steps===generated.after.targets[0].steps&&
  reroute.targets[0].path.every(p=>p[1]===proposalParameters.start[1]),
  'FINISH_OBSTRUCTS_PATH');
 const footprint={...generated.report,
  finishingElementCount:additional.length,
  newDesignId:finished.id};
 valid(footprint.structuralReviewRequired===true&&
  footprint.railingReviewRequired===true,'CANNOT_CERTIFY_STRUCTURE');
 const report={
  schema:SCHEMA,parentCandidateSha256:generated.report.sha256,
  parentGeometrySha256:generated.compiled.geometrySha256,
  finishedSourceSha256:compiled.sourceSha256,
  finishedGeometrySha256:compiled.geometrySha256,
  afterRouteProofSha256:reroute.sha256,
  originalElementCount:generated.candidate.elements.length,
  finishingElementCount:additional.length,
  finishedElementCount:finished.elements.length,
  proposedBridgeAxis:alongX?'x':'z',guardrailPieces:2,
  foundationPiers:2,lightingStrips:2,portalFrames:2,
  connectedBodyWidth:routeArgs.width,connectedBodyDepth:routeArgs.depth,
  connectedFlatMoves:reroute.targets[0].steps,
  railStrengthCertified:false,pierFoundationCertified:false,
  fireSafetyCertified:false,structuralStrengthCertified:false,
  playerCollisionCertified:false,designOnly:true,
  worldContacts:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  interpretation:'Architectural preview of rails, columns, trusses, lights and arch portals. Full-cell local route was rerun; structural safety, human fall protection, actual block identity, loads and Minecraft movement remain unverified.'
 };
 return {generated,finished,compiled,reroute,
  report:{...report,sha256:sha(report)}};
}
export function verifyFinishedBridge(original,parameters,proof){
 try{
  const r=designFinishedBridge(original,parameters);
  return JSON.stringify(r.report)===JSON.stringify(proof)&&
   proof.constructionApproved===false&&proof.gates?.length===9&&
   proof.gates.every(x=>x==='BLOCKED')&&
   proof.BuildPlan.operations.length===0;
 }catch{return false;}
}
