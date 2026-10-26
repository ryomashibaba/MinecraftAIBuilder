/**
 * R190-F opt-in LOCAL research. No default network call; no world API.
 * Example: node scripts/r190-local-semantic-run.mjs --model qwen3:14b
 *   --prompt "..." --out ./NEW_DIR [--required multiple-levels,stairs]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createR190SemanticModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
export const USAGE='--model MODEL --prompt REQUEST --out NEW_DIR [--endpoint http://127.0.0.1:11434/v1/chat/completions] [--required capability1,capability2]';
export function parseR190Arguments(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 if(!args.length||args.length%2!==0)throw Error('R190_F_ARGUMENTS '+USAGE);
 const out={},allowed=new Set(['--model','--prompt','--out','--endpoint','--required']);
 for(let i=0;i<args.length;i+=2){
  const k=args[i],v=args[i+1];
  if(!allowed.has(k)||Object.hasOwn(out,k)||!v)throw Error('R190_F_FLAG_'+k);
  out[k]=v;
 }
 for(const key of ['--model','--prompt','--out'])
  if(!out[key])throw Error('R190_F_MISSING_'+key);
 return {model:out['--model'],prompt:out['--prompt'],out:out['--out'],
  endpoint:out['--endpoint'],
  requiredCapabilities:out['--required']?out['--required'].split(','):[]};
}
export async function runR190Local(options){
 if(options.help)return {help:USAGE};
 const target=path.resolve(options.out);
 if(fs.existsSync(target))throw Error('R190_F_REFUSE_EXISTING_OUTPUT');
 if(!fs.existsSync(path.dirname(target)))throw Error('R190_F_PARENT_MISSING');
 const run=createR190SemanticModelAdapter({
  model:options.model,...(options.endpoint?{endpoint:options.endpoint}:{})
 });
 // One actual HTTP request only if the user explicitly executes this script.
 const audit=await run({prompt:options.prompt,
  requiredCapabilities:options.requiredCapabilities});
 if(audit.worldWrites!==0||audit.worldContacts!==0||
  audit.gates.some(g=>g!=='BLOCKED')||audit.BuildPlan.operations.length)
  throw Error('R190_F_UNSAFE_AUDIT');
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(target,'R190_F_MODEL_INTENT_SOURCE_ONLY.json'),
  JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 const summary={status:audit.status,modelRequested:options.model,
  localProviderResponses:1,modelIdentityCryptographicallyVerified:false,
  realModelQualityNotCertified:true,
  sourceGenerated:audit.sourceGenerated,
  sourceSha256:audit.sourceResult?.sourceSha256??null,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0};
 fs.writeFileSync(path.join(target,'R190_F_RUN_RECEIPT.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190Local(parseR190Arguments(process.argv.slice(2)))
  .then(r=>console.log(JSON.stringify(r)))
  .catch(e=>{console.error('R190_F_FAIL_CLOSED',String(e?.message??e));process.exitCode=1;});
}
