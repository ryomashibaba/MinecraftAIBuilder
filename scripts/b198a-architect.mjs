/**
 * B198A CLI — real model-backed design generation/revision with strict B143
 * source checks and offline 3D studio export. NO Minecraft world I/O.
 *
 * node scripts/b198a-architect.mjs --prompt "..." --model MODEL --out DIR
 * node scripts/b198a-architect.mjs --prompt "..." --base FILE --model MODEL
 *
 * Explicit OPENAI_API_KEY is required from the environment for REAL model
 * requests. No hidden deterministic pseudo-AI fallback or API-key file.
 */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {proposeArchitecture,validateB198Review}
 from '../source/ai/b198-natural-language-design.mjs';
import {createB198OpenAIAdapter} from '../source/ai/b198-openai-provider.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from './build-b143-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('B198A_CLI_'+s)};
const H=s=>createHash('sha256').update(s).digest('hex');
function options(args){
 const opt={};
 for(let i=0;i<args.length;i++){
  const k=args[i];
  if(k==='--allow-removals'){opt.allowRemovals=true;continue}
  if(!['--prompt','--prompt-file','--model','--out','--base','--protect','--max-changes'].includes(k))
   fail('UNKNOWN_ARGUMENT_'+k);
  if(!args[i+1]||args[i+1].startsWith('--'))fail('MISSING_VALUE_'+k);
  opt[k.slice(2)]=args[++i];
 }
 if((opt.prompt===undefined)===(opt['prompt-file']===undefined))
  fail('SUPPLY_EXACTLY_ONE_OF_PROMPT_OR_PROMPT_FILE');
 if(!opt.model)fail('MODEL_NAME_MUST_BE_EXPLICIT');
 const prompt=opt['prompt-file']?
  fs.readFileSync(path.resolve(opt['prompt-file']),'utf8'):opt.prompt;
 if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>8000)
  fail('PROMPT_LENGTH');
 return {prompt,model:opt.model,base:opt.base?path.resolve(opt.base):null,
  out:path.resolve(opt.out??'b198a-review'),allowRemovals:opt.allowRemovals??false,
  protectedElementIds:opt.protect?.split(',').filter(Boolean)??[],
  maxChangedElements:opt['max-changes']?Number(opt['max-changes']):24};
}
export async function runB198Cli({args=process.argv.slice(2),
 adapter=null}={}){
 const o=options(args);
 if(fs.existsSync(o.out))fail('OUTPUT_DIRECTORY_ALREADY_EXISTS');
 const baseDesign=o.base===null?null:JSON.parse(fs.readFileSync(o.base,'utf8'));
 const model=adapter??createB198OpenAIAdapter({model:o.model});
 const produced=await proposeArchitecture({
  prompt:o.prompt,generator:model,
  baseDesign,expectedBaseSha256:baseDesign===null?null:compileDesign(baseDesign).sourceSha256,
  protectedElementIds:o.protectedElementIds,
  allowRemovals:o.allowRemovals,maxChangedElements:o.maxChangedElements});
 if(!validateB198Review(produced.review))fail('RELEASE_REVIEW_HOLD');
 const payload=compileB143Gallery([produced.design]);
 if(!verifyB143Payload(payload)||payload.sourceHashes[0]!==produced.review.sourceSha256)
  fail('REAL_3D_PROVENANCE');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(payload,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B198A / REAL MODEL DESIGN REVIEW')
  .replace('B143 AI Architecture Studio','B198A — Natural Language Architecture / SOURCE-ONLY')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   'AIモデルが提案した新規建築を厳格なDSLで再コンパイル。自然言語との意味的一致・Minecraftでの歩行・施工は未認証。');
 const meta={
  schema:'minecraftaibuilder-b198a-export-v1',
  liveInferenceVerified:adapter===null,
  modelConfigured:o.model,
  sourceOnly:true,humanReviewRequired:true,
  rawNaturalLanguagePromptSha256:H(o.prompt),
  originalSourceSha256:baseDesign?compileDesign(baseDesign).sourceSha256:null,
  outputSourceSha256:produced.review.sourceSha256,
  outputGeometrySha256:produced.review.geometrySha256,
  actualOccupiedVoxels:produced.review.voxels,
  actualRendererSurfaceCells:payload.scenes[0].surface.length,
  safety:produced.review.safety
 };
 const parent=path.dirname(o.out);fs.mkdirSync(parent,{recursive:true});
 const temp=fs.mkdtempSync(path.join(parent,'.b198a-export-'));
 try{
  for(const [file,value] of [
   ['source-design.json',JSON.stringify(produced.design,null,2)+'\n'],
   ['source-proof.json',JSON.stringify({review:produced.review,export:meta},null,2)+'\n'],
   ['index.html',html]]){
   fs.writeFileSync(path.join(temp,file),value,{flag:'wx'});
  }
  if(fs.existsSync(o.out))fail('OUTPUT_RACE_REFUSE_OVERWRITE');
  fs.renameSync(temp,o.out);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e}
 return {directory:o.out,...meta};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log('B198A_SOURCE_ONLY_DESIGN_READY',JSON.stringify(await runB198Cli()))}
 catch(e){console.error(String(e.message));process.exitCode=1}
}
