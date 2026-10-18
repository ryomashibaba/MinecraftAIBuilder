/**
 * Explicit one-shot local model architecture authoring. Offline B143 source
 * outputs only; never starts Minecraft, never contacts paid/remote APIs.
 *
 * Example (AFTER user starts a compatible localhost model themselves):
 * node scripts/b198g-local-design.mjs --model MODEL_ID --prompt "..." --out ./my-review
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB198GLocalModelAdapter}
  from '../source/ai/b198g-local-model-adapter.mjs';
import {generateArchitectureWithFeedback}
  from '../source/ai/b198g-autonomous-quality.mjs';

const USAGE='B198G source-only local model draft: --model MODEL_ID --prompt JAPANESE_REQUEST --out NEW_DIRECTORY [--endpoint http://127.0.0.1:PORT/v1/chat/completions] [--rounds 0..3]';
export function parseArguments(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length===0||argv.length%2!==0)
  throw Error('B198G_ARGUMENTS_REQUIRED '+USAGE);
 const permitted=new Set(['--model','--prompt','--out','--endpoint','--rounds']);
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  const flag=argv[i],value=argv[i+1];
  if(!permitted.has(flag)||opts[flag]!==undefined||
    typeof value!=='string'||value.length===0)
    throw Error('B198G_INVALID_ARGUMENT_'+flag);
  opts[flag]=value;
 }
 for(const flag of ['--model','--prompt','--out']){
  if(!opts[flag])throw Error('B198G_MISSING_'+flag);
 }
 if(opts['--rounds']!==undefined&&
   !/^[0-3]$/.test(opts['--rounds']))
  throw Error('B198G_INVALID_ROUNDS');
 return {model:opts['--model'],prompt:opts['--prompt'],out:opts['--out'],
  endpoint:opts['--endpoint'],
  maxRepairRounds:opts['--rounds']===undefined?2:Number(opts['--rounds'])};
}
export async function runLocalSourceDesign(options){
 if(options.help)return {help:USAGE};
 // Check all local outputs BEFORE sending any request to a model.
 const dest=path.resolve(options.out);
 if(fs.existsSync(dest))throw Error('B198G_REFUSE_EXISTING_DESTINATION');
 if(!fs.existsSync(path.dirname(dest)))throw Error('B198G_OUTPUT_PARENT_MISSING');
 const generator=createB198GLocalModelAdapter({
  model:options.model,...(options.endpoint?{endpoint:options.endpoint}:{})
 });
 const result=await generateArchitectureWithFeedback({
  prompt:options.prompt,generator,maxRepairRounds:options.maxRepairRounds
 });
 // Source must always be deterministic, unapproved and free of execution plan.
 if(result.report.world.worldWrites!==0||
   result.report.world.gates.some(x=>x!=='BLOCKED')||
   result.report.world.BuildPlan.operations.length!==0)
   throw Error('B198G_WORLD_SAFETY_BROKEN');
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'DESIGN_SOURCE_REVIEW_ONLY.json'),
  JSON.stringify(result.design,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(dest,'SOURCE_QUALITY_REPORT.json'),
  JSON.stringify(result.report,null,2)+'\n',{flag:'wx'});
 return {destination:dest,status:result.report.status,
  sourceSha256:result.report.sourceSha256,
  actualProviderCalls:result.report.modelInvocationCount,
  humanReview:'UNREVIEWED',worldWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===
  fileURLToPath(import.meta.url)){
 runLocalSourceDesign(parseArguments(process.argv.slice(2)))
 .then(result=>console.log('B198G_SOURCE_REVIEW_OUTPUT',JSON.stringify(result)))
 .catch(error=>{console.error('B198G_FAILED_CLOSED',String(error?.message??error));process.exitCode=1;});
}
