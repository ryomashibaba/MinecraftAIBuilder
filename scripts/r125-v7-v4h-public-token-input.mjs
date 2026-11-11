/**
 * One-shot PUBLIC synthetic evidence for token budgeting. Read only:
 * no Ollama request, no local PRIVATE paths, no world or Minecraft operations.
 */
import {fileURLToPath} from 'node:url';
import {V7_V4H_COMPACT_SYSTEM_PROMPT,V4H_BRIEF,v7RequestOptions}
 from './r125-v7-private-once.mjs';
import {MEZZANINE_SCHEMA}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';
export function publicTokenEvidence(){
 // Use the same settings function as the actual native request. Changes in
 // source formatting or the separate V6 branch cannot falsify V4H capacity.
 // The transport test independently asserts the emitted V4H request body.
 const limits=v7RequestOptions('v4h-mezzanine'),brief=V4H_BRIEF;
 if(limits.num_ctx!==2048||limits.num_predict!==1024||limits.temperature!==0.45)
  throw Error('V7_PROTECTED_CONTEXT_OR_OUTPUT_SETTING_CHANGED');
 const samples=syntheticFiveAuthorMezzanineCases().map(x=>({
  genre:x.genre,json:JSON.stringify({
   ...structuredClone(x.heightAuthor),schema:MEZZANINE_SCHEMA,
   mezzanine:structuredClone(x.mezzanine)
  })
 }));
 if(samples.length!==5||samples.some(x=>x.json.length<1200))
  throw Error('PUBLIC_FIVE_AUTHOR_FIXTURES_NOT_VERIFIED');
 return {schema:'r125-v7-v4h-public-token-input-v1',provenance:'PUBLIC_SYNTHETIC_NOT_REAL_QWEN',
  prompt:V7_V4H_COMPACT_SYSTEM_PROMPT,brief,
  num_ctx:limits.num_ctx,num_predict:limits.num_predict,
  samples,modelCalls:0,worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 process.stdout.write(JSON.stringify(publicTokenEvidence())+'\n');
