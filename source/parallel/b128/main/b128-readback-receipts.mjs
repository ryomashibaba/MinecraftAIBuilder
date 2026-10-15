/**
 * B128: read-only offline intake for *human-reported* isolated Education stair tests.
 * A receipt is NOT proof that Minecraft was contacted, a state exists, or movement works.
 * This module never talks to Minecraft, produces build commands or promotes readiness.
 */
import {DIRECTION_HYPOTHESES} from '../../b127/main/b127-halfstep-orientation.mjs';
import {createHash} from 'node:crypto';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const ALLOWED_FACES=['EAST','NORTH','WEST','SOUTH'];
const SHAPES=['FORWARD_UPPER_HALF','REVERSE_UPPER_HALF','UNOBSERVED'];
const OBS_KEYS=['stateValue','observedAscent','observedUpperHalfShape','readbackClaimed','evidenceSha256','traversalClaim'];
const RECEIPT_KEYS=['receiptId','sourceB127Integrity','edition','version','specimenScope','observedAt','observations'];
const BATCH_KEYS=['schema','sourceB127Integrity','receipts'];
const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(o,k));
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const err=x=>{throw Error('B128_'+x);};
const iso=x=>typeof x==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(x)&&
 !Number.isNaN(Date.parse(x))&&new Date(x).toISOString().replace('.000Z','Z')===x;
export const B128_BATCH_SCHEMA='minecraftaibuilder-b128-isolated-stair-readback-receipts-v1';
export function emptyB128ReceiptBatch(sourceB127Integrity){
 if(!hex(sourceB127Integrity))err('BAD_PARENT_DIGEST');
 return {schema:B128_BATCH_SCHEMA,sourceB127Integrity,receipts:[]};
}
export function analyzeB128ReadbackReceipts({sourceB127Integrity,batch}){
 if(!hex(sourceB127Integrity)||!exact(batch,BATCH_KEYS)||
 batch.schema!==B128_BATCH_SCHEMA||batch.sourceB127Integrity!==sourceB127Integrity||
 !Array.isArray(batch.receipts)||batch.receipts.length>16)
 err('BAD_BATCH_OR_UNPINNED_SOURCE');
 const observationMap=new Map(),receipts=new Set(),versions=new Set(),evidenceHashes=new Set();
 let reportedObservations=0,reportedTraversalClaims=0;
 for(const r of batch.receipts){
  if(!exact(r,RECEIPT_KEYS)||!/^LAB-[A-Z0-9-]{3,48}$/.test(r.receiptId)||
   receipts.has(r.receiptId)||r.sourceB127Integrity!==sourceB127Integrity||
   r.edition!=='Minecraft Education'||!/^1\.\d{1,3}\.\d{1,5}(\.\d+)?$/.test(r.version)||
   r.specimenScope!=='ISOLATED_NON_PRODUCTION'||!iso(r.observedAt)||
   !Array.isArray(r.observations)||r.observations.length<1||r.observations.length>4)
   err('BAD_RECEIPT_OR_VERSION_OR_SCOPE');
  receipts.add(r.receiptId);versions.add(r.version);
  const localValues=new Set(),localDirections=new Set();
  for(const o of r.observations){
   if(!exact(o,OBS_KEYS)||!Number.isSafeInteger(o.stateValue)||
    o.stateValue<0||o.stateValue>3||!ALLOWED_FACES.includes(o.observedAscent)||
    !SHAPES.includes(o.observedUpperHalfShape)||o.readbackClaimed!==true||
    !hex(o.evidenceSha256)||evidenceHashes.has(o.evidenceSha256)||
    !['NOT_TESTED','HUMAN_REPORTED_UNVERIFIED'].includes(o.traversalClaim)||
    localValues.has(o.stateValue)||localDirections.has(o.observedAscent))
    err('BAD_OR_DUPLICATED_OBSERVATION');
   localValues.add(o.stateValue);localDirections.add(o.observedAscent);
   evidenceHashes.add(o.evidenceSha256);
   const existing=observationMap.get(o.stateValue);
   if(existing&&existing!==o.observedAscent)err('CONTRADICTORY_STATE_TO_FACING');
   for(const [s,d] of observationMap)if(d===o.observedAscent&&s!==o.stateValue)
    err('CONTRADICTORY_FACING_TO_STATE');
   observationMap.set(o.stateValue,o.observedAscent);
   reportedObservations++;
   if(o.traversalClaim==='HUMAN_REPORTED_UNVERIFIED')reportedTraversalClaims++;
  }
 }
 if(versions.size>1)err('MIXED_EDUCATION_VERSIONS');
 const remaining=DIRECTION_HYPOTHESES.filter(perm=>
  [...observationMap].every(([state,face])=>perm[ALLOWED_FACES.indexOf(face)]===state));
 if(remaining.length===0)err('NO_PERMUTATIONS_CONSISTENT_WITH_CLAIMS');
 const observedFacingClaims=Object.fromEntries([...observationMap].sort((a,b)=>a[0]-b[0]));
 const record={
  status:batch.receipts.length?'UNTRUSTED_HUMAN_READBACK_CLAIMS_REVIEW_ONLY':
   'NO_REAL_EDUCATION_CALIBRATION_RECEIPTS',
  receiptBatchDigest:H(batch),sourceB127Integrity,
  submittedReceiptCount:batch.receipts.length,
  reportedObservationCount:reportedObservations,
  reportedTraversalClaims,
  reportedEducationVersion:versions.values().next().value??null,
  reportedStateToFacingClaims:observedFacingClaims,
  directionHypothesesNotContradictedByClaims:remaining.length,
  allFourDirectionsReported:observationMap.size===4,
  // Manual/readback claims only narrow an *internal list*, never certify any mapping.
  remainingHypothesisValuesByDirection:remaining.map(p=>[...p]),
  provenanceAuthenticityVerified:false,
  suppliedImageDigestPixelsInspected:false,
  actualEducationBlockStateMappingCertified:false,
  physicalTraversalCertified:false,
  structuralSupportCertified:false,
  realWorldContactsByThisTool:0,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  constructionAllowed:false,executionAllowed:false,operations:[],
  warnings:[
   'DIGEST_AND_SCHEMA_VALIDITY_DOES_NOT_VERIFY_A_HUMAN_REPORT_OR_SCREENSHOT',
   'RECORDED_OBSERVATIONS_ARE_CLAIMS_NOT_GAME_API_READBACK',
   'NO_ACTUAL_EDUCATION_WORLD_CONTACT_OR_CONSTRUCTION_AUTHORIZATION',
   'VERSION_SPECIFIC_ORIENTATION_AND_PHYSICS_STILL_UNCERTIFIED'
  ]
 };
 return record;
}
