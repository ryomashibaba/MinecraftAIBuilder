/**
 * B156: turn an inert B155 floor suggestion into a separately compiled,
 * immutable DESIGN PREVIEW candidate. Never turn it into executable commands.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled,validateDesign} from './b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from './b152-footprint-review.mjs';
import {proposeSkybridge,verifySkybridgeProposal} from './b155-bridge-proposal.mjs';

export const SCHEMA='minecraftaibuilder-b156-candidate-proof-v1';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const yes=(condition,why)=>{if(!condition)throw Error('B156_'+why);};
const key=p=>p.slice(0,3).join(',');

export function buildBridgeCandidate(original,proposalParameters,
 {candidateId='aurora-interchange-generated-candidate'}={}){
 yes(original?.designOnly===true&&
  typeof candidateId==='string'&&
  /^[a-z][a-z0-9-]{2,47}$/.test(candidateId)&&
  candidateId!==original.id,'INPUTS');
 validateDesign(original);
 const baseline=compileDesign(original);
 yes(verifyCompiled(original,baseline)&&
  baseline.worldContacts===0&&baseline.readiness==='NOT_PREPARED'&&
  baseline.BuildPlan.operations.length===0,'SOURCE_INVALID');

 // Verify a fresh proposal; never trust user-authored "approved" flags or
 // permit arbitrary commands/materials to cross into the design DSL.
 const proposal=proposeSkybridge(baseline,proposalParameters);
 yes(verifySkybridgeProposal(baseline,proposalParameters,proposal)&&
  proposal.status==='GEOMETRIC_FLOOR_PROPOSAL_ONLY'&&
  proposal.proposedFloor?.mode==='add'&&
  proposal.proposedFloor?.material==='concrete'&&
  proposal.proposedFloor?.shape==='box'&&
  proposal.constructionApproved===false&&
  proposal.BuildPlan.operations.length===0,'NOT_A_SAFE_CANDIDATE');
 const proposalFloor=structuredClone(proposal.proposedFloor);
 const candidate={
  ...structuredClone(original),
  id:candidateId,
  title:'オーロラ・インターチェンジ — 自動橋案（要審査）',
  brief:'分断された高架交通施設に自動提案の床だけを追加した設計候補。ガラス欄干・橋梁構造・Minecraftの実際の通行性能は未認証。施工操作なし。',
  elements:[...structuredClone(original.elements),proposalFloor]
 };
 validateDesign(candidate);
 yes(JSON.stringify(candidate.elements.slice(0,original.elements.length))===
  JSON.stringify(original.elements)&&
  candidate.elements.length===original.elements.length+1,'PARENT_MUTATED');
 const compiled=compileDesign(candidate);
 yes(verifyCompiled(candidate,compiled)&&
  compiled.sourceSha256!==baseline.sourceSha256&&
  compiled.geometrySha256!==baseline.geometrySha256,'NOT_A_NEW_DESIGN');
 const routeArgs={start:proposalParameters.start,
  destinations:[{id:'target',at:proposalParameters.goal}],
  width:proposalParameters.footprintWidth??2,
  depth:proposalParameters.footprintDepth??2,headroom:2};
 const before=analyzeFootprint(baseline,routeArgs),
  after=analyzeFootprint(compiled,routeArgs);
 yes(verifyFootprint(baseline,routeArgs,before)&&
  verifyFootprint(compiled,routeArgs,after)&&
  before.targets[0].status==='FOOTPRINT_UNREACHABLE'&&
  after.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  after.targets[0].path.every(p=>p[1]===routeArgs.start[1]),
  'CANDIDATE_GEOMETRICALLY_INVALID');
 const prior=new Set(baseline.primitives.map(key));
 const newCells=compiled.primitives.filter(p=>!prior.has(key(p))).length;
 yes(newCells>0,'EMPTY_CANDIDATE_DELTA');
 const proof={
  schema:SCHEMA,
  parentSourceSha256:baseline.sourceSha256,
  parentGeometrySha256:baseline.geometrySha256,
  candidateSourceSha256:compiled.sourceSha256,
  candidateGeometrySha256:compiled.geometrySha256,
  proposalSha256:proposal.sha256,
  initialRouteSha256:before.sha256,
  candidateRouteSha256:after.sha256,
  originalElementCount:original.elements.length,
  candidateElementCount:candidate.elements.length,
  addedFloorCellCount:newCells,
  originalStatus:before.targets[0].status,
  candidateStatus:after.targets[0].status,
  candidateMoves:after.targets[0].steps,
  materialReviewRequired:true,railingReviewRequired:true,
  structuralReviewRequired:true,localVoxelGeometryOnly:true,
  playerCollisionCertified:false,constructionApproved:false,
  readiness:'NOT_PREPARED',worldContacts:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 const report={...proof,sha256:hash(proof)};
 return {candidate,compiled,baseline,proposal,before,after,report};
}
export function verifyBridgeCandidate(original,parameters,evidence){
 try{
  const expected=buildBridgeCandidate(original,parameters);
  return JSON.stringify(expected.report)===JSON.stringify(evidence)&&
   evidence.constructionApproved===false&&
   evidence.gates.length===9&&
   evidence.gates.every(x=>x==='BLOCKED')&&
   evidence.BuildPlan.operations.length===0;
 }catch{return false;}
}
