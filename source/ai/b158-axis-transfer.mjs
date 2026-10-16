/**
 * B158: prove that the same finish engine works on two DIFFERENT
 * axis-aligned architectural layouts. No game-world execution or approval.
 */
import {createHash} from 'node:crypto';
import {designFinishedBridge} from './b157-finished-bridge.mjs';
export const SCHEMA='minecraftaibuilder-b158-cross-axis-transfer-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const check=(v,r)=>{if(!v)throw Error('B158_'+r);};
export function reviewAxisTransfer(eastDesign,eastOptions,northDesign,northOptions){
 check(eastDesign?.id!==northDesign?.id&&eastDesign?.designOnly===true&&
  northDesign?.designOnly===true,'MUST_BE_INDEPENDENT_DESIGNS');
 const east=designFinishedBridge(eastDesign,eastOptions);
 const north=designFinishedBridge(northDesign,northOptions,{
  supportBaseY:6,finishId:'helios-freight-harbor-generated-finished'
 });
 const e=east.report,n=north.report;
 check(e.proposedBridgeAxis==='x'&&n.proposedBridgeAxis==='z'&&
  east.generated.report.originalStatus==='FOOTPRINT_UNREACHABLE'&&
  north.generated.report.originalStatus==='FOOTPRINT_UNREACHABLE'&&
  e.connectedFlatMoves===26&&n.connectedFlatMoves===38&&
  e.finishingElementCount===14&&n.finishingElementCount===14&&
  e.guardrailPieces===2&&n.guardrailPieces===2&&
  e.portalFrames===2&&n.portalFrames===2&&
  e.structuralStrengthCertified===false&&n.structuralStrengthCertified===false&&
  e.constructionApproved===false&&n.constructionApproved===false&&
  e.BuildPlan.operations.length===0&&n.BuildPlan.operations.length===0&&
  e.gates.every(g=>g==='BLOCKED')&&n.gates.every(g=>g==='BLOCKED'),
  'NOT_PROVEN_ON_BOTH_AXES');
 const proof={
  schema:SCHEMA,
  eastBuildingId:eastDesign.id,northBuildingId:northDesign.id,
  eastDesignSha256:east.compiled.sourceSha256,
  northDesignSha256:north.compiled.sourceSha256,
  eastFinishedProofSha256:e.sha256,northFinishedProofSha256:n.sha256,
  sourceIndependent:eastDesign.id!==northDesign.id,
  bridgeAxes:['x','z'],testedBuildingCount:2,
  pathLengths:[e.connectedFlatMoves,n.connectedFlatMoves],
  both2x2GeometryPass:true,headroomCells:2,
  finishesGenerated:[e.finishingElementCount,n.finishingElementCount],
  strengthCertified:false,railingCertified:false,
  playerCollisionCertified:false,constructionApproved:false,
  worldContacts:0,worldCoordinates:null,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  interpretation:'Same fixed-cell DSL finisher used across unrelated east-west and north-south terminal designs; two independent post-finish path reports. Game physics, loading, safe guardrails and construction remain unverified.'
 };
 return {east,north,report:{...proof,sha256:sha(proof)}};
}
export function verifyAxisTransfer(east,optsE,north,optsN,report){
 try{
  const expected=reviewAxisTransfer(east,optsE,north,optsN);
  return JSON.stringify(expected.report)===JSON.stringify(report)&&
   report.gates.length===9&&report.gates.every(v=>v==='BLOCKED')&&
   report.BuildPlan.operations.length===0&&report.constructionApproved===false;
 }catch{return false;}
}
