/** B198C real model-optional CLI. Never writes or connects Minecraft. */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {proposeGuardedArchitecturalRepair}
 from '../source/ai/b198c-guarded-repair.mjs';
import {createB198OpenAIAdapter} from '../source/ai/b198-openai-provider.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('B198C_CLI_'+s)};
const parse=args=>{
 const obj={};
 for(let i=0;i<args.length;i++){
  const k=args[i];
  if(!['--base','--goal','--goal-file','--protect','--model','--out','--minimum-gain'].includes(k))
   fail('UNKNOWN_ARGUMENT_'+k);
  if(!args[i+1])fail('MISSING_VALUE_'+k);
  obj[k.slice(2)]=args[++i];
 }
 if(!obj.base||!obj.out||!obj.protect||!obj.model)fail('BASE_OUT_PROTECT_MODEL_REQUIRED');
 if((obj.goal===undefined)===(obj['goal-file']===undefined))fail('ONE_GOAL_REQUIRED');
 return obj;
};
export async function runB198CRepair({args=process.argv.slice(2),adapter=null}={}){
 const cfg=parse(args),output=path.resolve(cfg.out);
 if(fs.existsSync(output))fail('EXISTING_USER_OUTPUT_WONT_OVERWRITE');
 const base=JSON.parse(fs.readFileSync(path.resolve(cfg.base),'utf8'));
 const goal=cfg['goal-file']?
  fs.readFileSync(path.resolve(cfg['goal-file']),'utf8'):cfg.goal;
 const trustedAdapter=adapter??createB198OpenAIAdapter({model:cfg.model});
 const old=compileDesign(base);
 const result=await proposeGuardedArchitecturalRepair({
  userGoal:goal,generator:trustedAdapter,baseDesign:base,
  expectedBaseSha256:old.sourceSha256,
  protectedElementIds:cfg.protect.split(',').filter(Boolean),
  minimumLargestConnectedGain:Number(cfg['minimum-gain']??2)
 });
 const gallery=compileB143Gallery([base,result.design]);
 if(!verifyB143Payload(gallery))fail('TWO_SCENE_SOURCE_RENDER_HOLD');
 const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
 const baseHtml=renderB143Html(gallery,template);
 const label=adapter?'TEST DOUBLE ONLY / NOT ACTUAL LLM INFERENCE':
  'REAL MODEL PROPOSAL / HUMAN REVIEW STILL REQUIRED';
 const html=baseHtml.replace('<body>',
  '<body><div id="b198c-warning" style="padding:12px 16px;background:#53371f;color:#fff">'+
  'B198C '+label+' — 改善前・改善後の比較。 source-only NOT_PREPARED。'+
  'Minecraft実歩行・施工・自然言語への意味的一致は未認証。</div>');
 const parent=path.dirname(output);fs.mkdirSync(parent,{recursive:true});
 const temp=fs.mkdtempSync(path.join(parent,'.b198c-repair-review-'));
 try{
  for(const [name,data] of [
   ['original-design.json',JSON.stringify(base,null,2)+'\n'],
   ['repaired-design.json',JSON.stringify(result.design,null,2)+'\n'],
   ['source-critique.json',JSON.stringify(result.evidence,null,2)+'\n'],
   ['index.html',html]
  ])fs.writeFileSync(path.join(temp,name),data,{flag:'wx'});
  if(fs.existsSync(output))fail('OUTPUT_CONCURRENTLY_CREATED');
  fs.renameSync(temp,output);
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e}
 return {output,verifiedConnectedSourceSquareGain:
  result.evidence.verifiedLargest2WideConnectedSquareGain,
  sourceOnly:true,realInferencePerformed:adapter===null,
  minecraftWorldWrites:0,readiness:'NOT_PREPARED'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  console.log('B198C_SOURCE_REPAIR_PROPOSAL_NOT_REAL_BUILD',
   JSON.stringify(await runB198CRepair()));
 }catch(e){console.error(String(e.message));process.exitCode=1}
}
