/**
 * Permanent, versionable single-click entry for local V4J research.
 * Keep this filename stable for future experiment versions: the launcher
 * never needs to be re-downloaded when the vetted branch changes.
 *
 * Current study: ONE V4 housing author, no retries, 0 paid API/world calls.
 * Does not upload original PRIVATE responses or any shareable report.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runV3OneGenreStudy} from './r125-v4j-v3-one-local.mjs';
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=x=>{throw Error('V4J_STABLE_LOCAL_'+x);};
export function parseStableArgs(args){
 if(args.length!==4||args[0]!=='--model'||args[2]!=='--out'||
  !MODEL.test(args[1])||!args[3])fail('ARGS');
 return {model:args[1],outDir:args[3]};
}
export async function runStableLocalStudy(args,{
 runner=runV3OneGenreStudy
}={}){
 const a=parseStableArgs(args);
 const result=await runner({...a,genre:'housing',geometryEnvelopeV4:true});
 if(result.schema!=='minecraftaibuilder-v4j-v4-one-genre-safe-handoff-v1'||
  result.genre!=='housing'||
  result.promptProtocol!=='V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4'||
  result.replayAdditionalModelCalls!==0||
  !Number.isSafeInteger(result.modelGenerationAttempts)||
  result.modelGenerationAttempts<0||result.modelGenerationAttempts>1||
  result.worldContacts!==0||result.worldWrites!==0||
  result.constructionApproved!==false||result.executionAllowed!==false||
  !Array.isArray(result.gates)||result.gates.length!==9||
  result.gates.some(g=>g!=='BLOCKED'))
  fail('UNTRUSTED_SOURCE_RECEIPT');
 const dir=path.resolve(a.outDir);
 const safeFile=path.join(dir,'V4J_V4_ONE_SHAREABLE.json');
 const actual=JSON.parse(fs.readFileSync(safeFile,'utf8'));
 if(JSON.stringify(actual)!==JSON.stringify(result))
  fail('PRIVATE_SAFE_FILE_MISMATCH');
 // Copy only the ALREADY narrow allowlisted shareable JSON.
 // No original prompt, model bytes or raw reason text are included.
 const target=path.join(dir,'V4J_CURRENT_SAFE_REPORT.json');
 fs.writeFileSync(target,JSON.stringify(actual,null,2)+'\n',{flag:'wx'});
 return {result,shareableFile:target};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const r=await runStableLocalStudy(process.argv.slice(2));
  console.log(JSON.stringify({shareOnly:'V4J_CURRENT_SAFE_REPORT.json',
   sourceCandidateVerified:r.result.sourceCandidateVerified,
   status:r.result.reportedStatus,worldWrites:0}));
  if(r.result.explicitlyInjectedTestResponse||
   !r.result.sourceCandidateVerified)process.exitCode=2;
 }catch{
  console.error('V4J_STABLE_LOCAL_HOLD_SHARE_ONLY_SAFE_OUTPUT');
  process.exitCode=2;
 }
}
