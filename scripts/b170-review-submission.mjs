/**
 * Offline review of voluntarily supplied observations. No network, runtime
 * Minecraft client access, world-file mutation or block placement.
 *
 * node scripts/b170-review-submission.mjs PACKET.json OBSERVATIONS.json [OUTPUT.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewProbeSubmission,verifyObservationReview,verifyProbePacket}
 from '../source/ai/b170-readonly-probe-packet.mjs';
export function reviewFiles(packetFile,observationsFile,outputFile=null){
 const packet=JSON.parse(fs.readFileSync(packetFile,'utf8'));
 if(!verifyProbePacket(packet))throw Error('B170_INPUT_PACKET_MISMATCH');
 const data=JSON.parse(fs.readFileSync(observationsFile,'utf8'));
 const result=reviewProbeSubmission(packet,data);
 if(!verifyObservationReview(packet,data,result)||
  result.worldWrites!==0||result.constructionApproved!==false||
  result.gates.some(x=>x!=='BLOCKED')||
  result.BuildPlan.operations.length!==0)throw Error('B170_REVIEW_HOLD');
 if(outputFile){
  if(path.resolve(outputFile)===path.resolve(packetFile)||
    path.resolve(outputFile)===path.resolve(observationsFile))
   throw Error('B170_INPUT_OVERWRITE_FORBIDDEN');
  fs.writeFileSync(outputFile,JSON.stringify(result,null,2)+'\n',
   {flag:'wx'});
 }
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const packet=process.argv[2],obs=process.argv[3],output=process.argv[4]||null;
  if(!packet||!obs)throw Error('Usage: node scripts/b170-review-submission.mjs PACKET.json OBSERVATIONS.json [OUTPUT.json]');
  const result=reviewFiles(packet,obs,output);
  console.log('B170_OBSERVATION_REVIEW',JSON.stringify({
   stage:result.stage,readings:result.reviewedCount,
   missing:result.missingCheckpointIds.length,
   clientRuntimeVerified:false,constructionApproved:false,
   worldWrites:0,readiness:'NOT_PREPARED',
   reportSha256:result.sha256
  }));
 }catch(e){console.error('B170_HOLD',e.message);process.exitCode=1;}
}
