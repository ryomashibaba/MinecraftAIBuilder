/**
 * One-shot PUBLIC synthetic evidence for token budgeting. Read only:
 * no Ollama request, no local PRIVATE paths, no world or Minecraft operations.
 */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {V7_V4H_COMPACT_SYSTEM_PROMPT}
 from './r125-v7-private-once.mjs';
import {MEZZANINE_SCHEMA}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';
export function publicTokenEvidence(){
 const realV7=fs.readFileSync(
  fileURLToPath(new URL('./r125-v7-private-once.mjs',import.meta.url)),'utf8');
 const briefMatch=realV7.match(/const V4H_BRIEF='([^']+)';/g);
 const limitsMatch=realV7.match(/options:\{num_ctx:(\d+),num_predict:(\d+),temperature:0\.45\}/g);
 if(briefMatch?.length!==1||limitsMatch?.length!==1)
  throw Error('V7_MODEL_PAYLOAD_BINDING_MISMATCH_HOLD');
 const brief=briefMatch[0].match(/'([^']+)'/)[1];
 const limits=limitsMatch[0].match(/num_ctx:(\d+),num_predict:(\d+)/);
 if(!limits||limits[1]!=='2048'||limits[2]!=='1024')
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
  num_ctx:Number(limits[1]),num_predict:Number(limits[2]),
  samples,modelCalls:0,worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 process.stdout.write(JSON.stringify(publicTokenEvidence())+'\n');
