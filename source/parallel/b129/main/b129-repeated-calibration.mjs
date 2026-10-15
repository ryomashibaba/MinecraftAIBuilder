/**
 * B129 - repeatable, human-operated calibration packet and intake review.
 * Contains NO Minecraft world interaction, commands, production coordinates or
 * permission to build. B128 validates each untrusted manual observation.
 */
import {analyzeB128ReadbackReceipts} from '../../b128/main/b128-readback-receipts.mjs';
import {createHash} from 'node:crypto';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const B129_DIRECTIONS=Object.freeze(['EAST','NORTH','WEST','SOUTH']);
export const B129_REQUIRED_TRIALS=Object.freeze(
 [1,2].flatMap(round=>B129_DIRECTIONS.map(face=>Object.freeze({
  trialId:'LAB-R'+round+'-'+face,round,ascent:face,
  scope:'ISOLATED_NON_PRODUCTION',captureMode:'HUMAN_OBSERVED_READBACK',
  recommendedEvidence:['UNEDITED_GAME_SCREENSHOT','OBSERVED_STAIR_TOP_HALF',
   'UTC_OBSERVATION_TIME','EXACT_EDUCATION_VERSION'],
  willNotRunMinecraft:true
 }))));
const approvedShape=x=>x==='FORWARD_UPPER_HALF'||x==='REVERSE_UPPER_HALF';
export function createB129CalibrationPlan(sourceB127Integrity,sourceShape){
 if(typeof sourceB127Integrity!=='string'||!/^[a-f0-9]{64}$/.test(sourceB127Integrity)||
  !approvedShape(sourceShape))throw Error('B129_BAD_OR_UNPINNED_SOURCE');
 const base={
  schema:'minecraftaibuilder-b129-manual-stair-calibration-plan-v1',
  sourceB127Integrity,expectedSourceProxyShape:sourceShape,
  requiredTrials:B129_REQUIRED_TRIALS.map(t=>({...t,
   recommendedEvidence:[...t.recommendedEvidence]})),
  testArea:'ONLY_AN_INDEPENDENT_USER_APPROVED_ISOLATED_EDUCATION_WORLD',
  worldCoordinates:null,serverActions:[],gameCommands:[],
  certificationAllowed:false,constructionAllowed:false,
  noMinecraftContactByGenerator:true
 };
 return {...base,integritySha256:H(base)};
}
export function validateB129CalibrationPlan(x){
 try{
  const {integritySha256,...base}=x??{};
  return H(base)===integritySha256&&
   x.schema==='minecraftaibuilder-b129-manual-stair-calibration-plan-v1'&&
   /^[a-f0-9]{64}$/.test(x.sourceB127Integrity)&&
   approvedShape(x.expectedSourceProxyShape)&&
   x.requiredTrials.length===8&&
   x.requiredTrials.every((t,i)=>t.trialId===B129_REQUIRED_TRIALS[i].trialId&&
    t.round===B129_REQUIRED_TRIALS[i].round&&
    t.ascent===B129_REQUIRED_TRIALS[i].ascent&&t.willNotRunMinecraft===true)&&
   x.worldCoordinates===null&&x.serverActions.length===0&&
   x.gameCommands.length===0&&!x.certificationAllowed&&!x.constructionAllowed;
 }catch{return false;}
}
export function analyzeB129RepeatedCalibration({
 sourceB127Integrity,sourceShape,batch
}){
 const plan=createB129CalibrationPlan(sourceB127Integrity,sourceShape);
 if(!validateB129CalibrationPlan(plan)||!batch||!Array.isArray(batch.receipts)||
  batch.receipts.length>8)throw Error('B129_BAD_REPEAT_BATCH');
 // B128 is the source-of-truth gate. Its rejected inputs may never be "partly accepted".
 const b128=analyzeB128ReadbackReceipts({sourceB127Integrity,batch});
 const idset=new Set(),observed=new Map();
 for(const r of batch.receipts){
  if(!B129_REQUIRED_TRIALS.some(t=>t.trialId===r.receiptId)||
   idset.has(r.receiptId)||r.observations.length!==1||
   r.observations[0].observedAscent!==r.receiptId.split('-').at(-1))
   throw Error('B129_WRONG_ROUND_OR_MULTI_OBSERVATION');
  idset.add(r.receiptId);
  observed.set(r.receiptId,r);
 }
 const missing=B129_REQUIRED_TRIALS.filter(t=>!observed.has(t.trialId))
  .map(t=>t.trialId);
 const shapeMismatches=[],unknownShapes=[],spacingViolations=[];
 for(const t of B129_REQUIRED_TRIALS){
  const r=observed.get(t.trialId);if(!r)continue;
  const actual=r.observations[0].observedUpperHalfShape;
  if(actual==='UNOBSERVED')unknownShapes.push(t.trialId);
  else if(actual!==sourceShape)shapeMismatches.push({
   trialId:t.trialId,reportedShape:actual,sourceProxyShape:sourceShape});
 }
 for(const face of B129_DIRECTIONS){
  const first=observed.get('LAB-R1-'+face),second=observed.get('LAB-R2-'+face);
  if(!first||!second)continue;
  const diff=Date.parse(second.observedAt)-Date.parse(first.observedAt);
  if(diff<60000)spacingViolations.push({face,deltaSeconds:diff/1000,
   minimumSeconds:60});
 }
 const complete=missing.length===0;
 const noGeometryIssues=shapeMismatches.length===0&&unknownShapes.length===0;
 const allChecksReported=complete&&noGeometryIssues&&spacingViolations.length===0&&
  b128.allFourDirectionsReported&&
  b128.directionHypothesesNotContradictedByClaims===1;
 const status=shapeMismatches.length?'HOLD_REPORTED_SHAPE_DIFFERS_FROM_SOURCE':
  spacingViolations.length?'HOLD_REPEAT_TIME_OR_ORDER':
  unknownShapes.length?'HOLD_SHAPE_UNOBSERVED':
  complete?(allChecksReported?'READY_FOR_INDEPENDENT_MANUAL_EVIDENCE_REVIEW_NOT_CERTIFIED':
   'HOLD_INCOMPLETE_OR_INCONSISTENT_DIRECTION_EVIDENCE'):
  'MORE_ISOLATED_MANUAL_OBSERVATIONS_REQUIRED';
 return {
  status,sourceB127Integrity,sourceProxyShape:sourceShape,
  sourceB128ClaimDigest:b128.receiptBatchDigest,
  trialPlanDigest:plan.integritySha256,
  requiredTrials:B129_REQUIRED_TRIALS.length,
  humanClaimedTrials:batch.receipts.length,missingTrials:missing,
  sourceProxyShapeMismatchReports:shapeMismatches,
  reportedUnknownTreadShapes:unknownShapes,
  repeatTimestampSpacingViolations:spacingViolations,
  claimConsistentDirectionPermutations:b128.directionHypothesesNotContradictedByClaims,
  humanClaimedEducationVersion:b128.reportedEducationVersion,
  humanReportedTraversalClaims:b128.reportedTraversalClaims,
  selfReportedShapeAndDirectionChecklistComplete:allChecksReported,
  evidenceImageContentIndependentlyReviewed:false,
  independentLabSessionAuthenticityVerified:false,
  actualEducationBlockStateMappingCertified:false,
  actualPhysicalStairTraversalCertified:false,
  realWorldContacts:0,worldContacts:0,worldCoordinates:null,
  commands:[],operations:[],executionAllowed:false,constructionAllowed:false,
  claimedProtocolIsNotWorldProof:true
 };
}
