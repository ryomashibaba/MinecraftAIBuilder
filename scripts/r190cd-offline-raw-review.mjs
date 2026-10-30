/** R190-CD offline one-command, no provider or Minecraft connections.
 * Reads SAVED original author/model JSON (without repair), compiles BN if valid,
 * independently audits true B143 voxel result and explicitly keeps ART/MC HOLD.
 * Does NOT run Ollama or establish provider provenance. Uses new output only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190CDFromBN} from '../source/ai/r190cd-bn-adapter.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
function read(file,max){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>max)throw Error('R190CD_BAD_INPUT_FILE');
 return fs.readFileSync(file);
}
export function offlineRawReviewCD({briefFile,originalFile,out}={}){
 if([briefFile,originalFile,out].some(x=>typeof x!=='string'||!x)||
   fs.existsSync(out))throw Error('R190CD_FRESH_OUTPUT_REQUIRED');
 const brief=read(path.resolve(briefFile),20000),raw=read(path.resolve(originalFile),200000);
 if(!fs.existsSync(path.dirname(path.resolve(out))))throw Error('R190CD_PARENT_MISSING');
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'ORIGINAL_BRIEF.txt'),brief,{flag:'wx'});
 fs.writeFileSync(path.join(out,'UNALTERED_SOURCE.txt'),raw,{flag:'wx'});
 const a={schema:'minecraftaibuilder-r190cd-saved-raw-offline-assessment-v1',
  inputOrigin:'SAVED_SOURCE_UNVERIFIED_NOT_PROVEN_TO_BE_PROVIDER_ORIGINAL',
  briefSha256:H(brief),unalteredSourceSha256:H(raw),
  changesToInput:0,automaticRepair:false,
  actualNetworkRequests:0,modelCalls:0,worldContacts:0,worldWrites:0,
  officialArtAdoptions:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  realModelProvenance:'NOT_AUTHENTICATED',realMinecraftWalking:'NOT_TESTED',
  visualArt:'HUMAN_REVIEW_REQUIRED',status:'HOLD_INVALID_OR_UNVERIFIED_SOURCE'};
 try{
  const derived=compileR190BNAssembly(raw,{originalBrief:brief,
    authorship:'UNVERIFIED_AUTHOR'});
  const actual=auditR190CDFromBN({original:raw,originalBrief:brief,derived,
    origin:'OFFLINE_SAVED_AUTHOR_UNVERIFIED_NO_PROVIDER_CALL'});
  // Not a real model success, even if source and final voxel geometry are valid.
  a.status='HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE';
  a.geometrySha256=derived.geometrySha256;
  a.derivedSourceStatus=derived.status;
  a.spatialClaimsFromAuthorOnly=true;
  a.qualityScorecard='CD_SCORECARD.json';
  fs.writeFileSync(path.join(out,'CD_SCORECARD.json'),J(actual),{flag:'wx'});
  fs.writeFileSync(path.join(out,'DERIVED_VOXELS.json'),J({
   geometrySha256:derived.geometrySha256,
   rawVoxelOnlySha256:actual.primitiveVoxelSha256,
   originalRawSha256:H(raw),primitives:derived.compiled.primitives,
   designOnly:true,readiness:'NOT_PREPARED',worldWrites:0,
   BuildPlan:{operations:[]}}),{flag:'wx'});
 }catch(error){
  a.status='HOLD_INVALID_ORIGINAL_NO_DERIVED_3D';
  a.failure=String(error?.message??error).slice(0,350);
  a.derivedGeometryAbsent=true;
  a.unalteredOriginalRetained=true;
 }
 fs.writeFileSync(path.join(out,'ASSESSMENT.json'),J(a),{flag:'wx'});
 return a;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const p=process.argv;
  if(p.length!==8||p[2]!=='--brief'||p[4]!=='--original'||p[6]!=='--out')
   throw Error('R190CD_CLI_USAGE --brief FILE --original FILE --out NEW_DIR');
  const result=offlineRawReviewCD({briefFile:p[3],originalFile:p[5],out:p[7]});
  console.log(J(result));
  if(result.status!=='HOLD_PHYSICAL_ART_FIDELITY_AND_PROVIDER_PROVENANCE')
   process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
