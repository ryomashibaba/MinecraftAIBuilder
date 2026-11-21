/** R119: true two-reading-bay architectural clearance study.
 * R118 + R117 proof: retreating seat 4476 reveals another first-hit
 * triangle 4535. Do not remove seat furniture or alter avatar rays.
 * Only alter adjacent architectural seat components if actually R93 seats.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {raiseR115LanternAndSupportedBookwall}
 from './b198zr115-integral-lantern-clerestory.mjs';
import {insetR118ActualConnectedSeat,SEAT}
 from './b198zr118-reading-seat-clearance.mjs';
import {deriveR110SourceLane}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead}
 from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';

export const SCHEMA='minecraftaibuilder-b198zr119-joined-two-reading-bay-clearance-v1';
export const SECOND_BAY_RATES=Object.freeze([.35,.55,.70,.82]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B198ZR119_'+s)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const summarizeFace=(f,i)=>({index:i,kind:f?.kind??'MISSING',
 vertices:f?[f.a,f.b,f.c]:null});
const proxy=(faces,r98)=>{
 const lane=deriveR110SourceLane(faces,r98,.035,{gap:.003});
 const attribution=lane.measured?identifyR111SourceOverhead(lane):null;
 return {lane,attribution};
};
export function studyR119TwoBaySeatClearance(r107){
 if(!r107||r107.originalR98Faces?.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256||
  !r107.report.originalR98Preserved)
  fail('SIGNED_R98_AND_R107_REAL_MESH_REQUIRED');
 const original=r107.faces,r98=r107.originalR98Faces,oldSha=sha(original);
 const elevated=raiseR115LanternAndSupportedBookwall(original,4474,{rise:.16});
 const first=insetR118ActualConnectedSeat(elevated.faces,4476,.55);
 const one=proxy(first.faces,r98);
 if(!one.lane.sourceCoverageComplete||!one.attribution?.allCaptured||
  one.lane.measured.witnessCounts.overhead!==7||
  one.attribution.sourceIndices.join(',')!=='4535')
  fail('R118_SECOND_SOURCE_TRIANGLE_PROOF_REQUIRED');
 const sourceFace=summarizeFace(original[4535],4535);
 const firstFace=summarizeFace(original[4476],4476);
 const secondSeatVerified=sourceFace.kind===SEAT;
 const baseline=auditR107AdjacentCorridor(original,extractR104ActiveR91Throat(r98));
 const trials=[];let chosen=null;
 if(secondSeatVerified){
  for(const rate of SECOND_BAY_RATES){
   try{
    const second=insetR118ActualConnectedSeat(first.faces,4535,rate);
    if(second.indices.some(i=>first.indices.includes(i)))
     fail('THE_TWO_BAYS_MUST_NOT_BE_DOUBLE_MOVED');
    const p=proxy(second.faces,r98);
    const adjacent=auditR107AdjacentCorridor(second.faces,
     extractR104ActiveR91Throat(r98));
    const preserved=adjacent.allFiniteSourceLanesScreened&&
     baseline.surrogateLanes.every((prev,i)=>{
      const now=adjacent.surrogateLanes[i];
      return now.floor<=prev.floor&&now.headroom<=prev.headroom&&now.lateral<=prev.lateral;
     });
    const hits=p.lane.measured?.witnessCounts;
    const acceptable=!!hits&&p.lane.sourceCoverageComplete&&
     p.lane.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&
     p.attribution.allCaptured&&hits.floor===0&&hits.lateral===0&&
     hits.overhead<7&&preserved&&
     second.sections.every(z=>z.preservedWidth>=.0085);
    const delta=[...new Set([...elevated.changedIndices,
     ...first.indices,...second.indices])].sort((a,b)=>a-b);
    if(delta.length>40||delta.some(i=>![
     'right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED',
     'right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY',SEAT
    ].includes(original[i]?.kind)))fail('CHANGED_UNRELATED_ARCHITECTURE');
    const record={secondSeatRate:rate,firstSeatRate:.55,
     secondSeatSourceIndices:second.indices,firstSeatSourceIndices:first.indices,
     changedOriginalFaceIndices:delta,minimumSecondSeatDepth:Math.min(...second.sections.map(s=>s.preservedWidth)),
     floor:hits?.floor??null,overhead:hits?.overhead??null,lateral:hits?.lateral??null,
     remainingFirstHitIndices:p.attribution?.sourceIndices??[],
     remainingFirstHitKinds:p.attribution?.sourceKinds??[],
     allExistingFiveCorridorsNonregressing:preserved,
     acceptedBySourceGeometry:acceptable,candidateMeshSha256:sha(second.faces)};
    trials.push(record);
    if(acceptable&&(!chosen||record.overhead<chosen.record.overhead||
      record.overhead===chosen.record.overhead&&rate<chosen.record.secondSeatRate))
     chosen={faces:second.faces,record};
   }catch(e){
    const m=String(e?.message??e);
    if(!/^B198ZR118_|^B198ZR119_/.test(m))throw e;
    trials.push({secondSeatRate:rate,acceptedBySourceGeometry:false,
     rejection:m});
   }
  }
 }
 if(sha(original)!==oldSha||secondSeatVerified&&trials.length!==SECOND_BAY_RATES.length)
  fail('SOURCE_OR_FOUR_VARIANT_INVARIANT_BROKEN');
 const active=chosen?.faces??original;
 return {faces:active,report:{schema:SCHEMA,
  originalR107Sha256:oldSha,originalR98Sha256:sha(r98),
  firstSeatSource:firstFace,secondInterferingSource:sourceFace,
  secondIsRealConnectedReadingSeat:secondSeatVerified,
  r118SingleSeatOverhead:one.lane.measured.witnessCounts.overhead,
  r118SingleSeatHitIndices:one.attribution.sourceIndices,
  secondBayCandidates:trials,chosen:chosen?.record??null,
  sourceGeometryChanged:!!chosen,currentMeshSha256:sha(active),
  decision:chosen?'TWO_READING_BAYS_SOURCE_CANDIDATE_ART_HOLD':
    'HOLD_NO_PROVEN_NONREGRESSING_TWO_BAY_SOLUTION',
  realHumanWalkwayCertified:false,realSeatOccupancyCertified:false,
  structuralContinuityCertified:false,artReview:'NOT_REVIEWED',
  originalSourceBuildingPreserved:true,originalModelAbilityUnchanged:true,
  safety:safety()}};
}
export function buildR119TwoBayStudy(nodes){
 return studyR119TwoBaySeatClearance(buildR107CompactReadingStudy(nodes));
}
