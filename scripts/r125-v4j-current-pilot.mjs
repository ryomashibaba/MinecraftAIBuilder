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
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runV7PrivateOnce} from './r125-v7-private-once.mjs';
import {runV3OneGenreStudy} from './r125-v4j-v3-one-local.mjs';
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=x=>{throw Error('V4J_STABLE_LOCAL_'+x);};
export function parseStableArgs(args){
 if(![4,5].includes(args.length)||(args.length===5&&args[4]!=='--v7-semantic')||
  args[0]!=='--model'||args[2]!=='--out'||
  !MODEL.test(args[1])||!args[3])fail('ARGS');
 return args.length===5?{model:args[1],outDir:args[3],v7Semantic:true}:
  {model:args[1],outDir:args[3]};
}
const PRIVATE_ENGINE_VAR='MAB_V7_PRIVATE_HOST_MODULE';
async function loadV7PrivateBindings(){
 const requested=process.env[PRIVATE_ENGINE_VAR];
 if(typeof requested!=='string'||!path.isAbsolute(requested))
  fail('PRIVATE_ENGINE_MODULE_REQUIRED');
 const actual=fs.realpathSync(requested);
 const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(actual===projectRoot||actual.startsWith(projectRoot+path.sep)||
  !fs.statSync(actual).isFile())fail('PRIVATE_ENGINE_MUST_BE_EXTERNAL');
 const module=await import(pathToFileURL(actual).href);
 if(typeof module.deriveIntegratedShell!=='function'||
  typeof module.checkResourceSafety!=='function')
  fail('PRIVATE_ENGINE_AND_RESOURCE_PROBE_REQUIRED');
 return {deriveIntegratedShell:module.deriveIntegratedShell,
  checkResourceSafety:module.checkResourceSafety};
}
export async function runStableLocalStudy(args,{
 runner=runV3OneGenreStudy,v7Runner=runV7PrivateOnce,
 v7BindingLoader=loadV7PrivateBindings
}={}){
 const a=parseStableArgs(args);
 if(a.v7Semantic){
  const bindings=await v7BindingLoader();
  const result=await v7Runner({model:a.model,outDir:a.outDir,
   headSha:process.env.MAB_HEAD,prompt:process.env.MAB_V7_BRIEF||undefined,
   ...bindings});
  if(result.schema!=='minecraftaibuilder-r125-v7-private-one-safe-v1'||
   typeof result.status!=='string'||!result.status.startsWith('HOLD_')||
   !Number.isSafeInteger(result.modelGenerationAttempts)||
   result.modelGenerationAttempts<0||result.modelGenerationAttempts>1||
   result.worldContacts!==0||result.worldWrites!==0||
   result.readiness!=='NOT_PREPARED'||
   result.constructionApproved!==false||result.executionAllowed!==false||
   !Array.isArray(result.BuildPlan?.operations)||result.BuildPlan.operations.length!==0||
   !Array.isArray(result.gates)||result.gates.length!==9||
   result.gates.some(x=>x!=='BLOCKED'))
   fail('V7_UNTRUSTED_SOURCE_RECEIPT');
  const dir=path.resolve(a.outDir);
  const actual=JSON.parse(fs.readFileSync(path.join(dir,'V7_SEMANTIC_SHAREABLE.json'),'utf8'));
  if(JSON.stringify(actual)!==JSON.stringify(result))
   fail('V7_PRIVATE_SAFE_FILE_MISMATCH');
  const target=path.join(dir,'V4J_CURRENT_SAFE_REPORT.json');
  fs.writeFileSync(target,JSON.stringify(actual,null,2)+'\n',{flag:'wx'});
  return {result,shareableFile:target};
 }
 const result=await runner({...a,genre:'housing',parentIndexV6:true});
 if(result.schema!=='minecraftaibuilder-v4j-v6-one-genre-safe-handoff-v1'||
  result.genre!=='housing'||
  result.promptProtocol!=='V4J_SINGLE_RESPONSE_AUTHOR_PARENT_INDEX_V6'||
  result.replayAdditionalModelCalls!==0||
  !Number.isSafeInteger(result.modelGenerationAttempts)||
  result.modelGenerationAttempts<0||result.modelGenerationAttempts>1||
  result.worldContacts!==0||result.worldWrites!==0||
  result.constructionApproved!==false||result.executionAllowed!==false||
  !Array.isArray(result.gates)||result.gates.length!==9||
  result.gates.some(g=>g!=='BLOCKED'))
  fail('UNTRUSTED_SOURCE_RECEIPT');
 const dir=path.resolve(a.outDir);
 const safeFile=path.join(dir,'V4J_V6_ONE_SHAREABLE.json');
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
   sourceCandidateVerified:r.result.sourceCandidateVerified===true,
   status:r.result.reportedStatus??r.result.status,worldWrites:0}));
  if(r.result.explicitlyInjectedTestResponse||
   !r.result.sourceCandidateVerified)process.exitCode=2;
 }catch{
  console.error('V4J_STABLE_LOCAL_HOLD_SHARE_ONLY_SAFE_OUTPUT');
  process.exitCode=2;
 }
}
