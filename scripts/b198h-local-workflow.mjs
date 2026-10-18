/**
 * B198H native source-only integration for B198D Studio and B198B frozen
 * 12+4 Japanese architecture benchmark. NO paid provider fallback, world
 * connection, or automatic approvals. Optional real local model is explicit.
 *
 * node scripts/b198h-local-workflow.mjs studio --project DIR --design B143.json --local-model MODEL_ID
 * node scripts/b198h-local-workflow.mjs benchmark --out NEW_DIR --local-model MODEL_ID
 *   [--cases 1..12] [--no-revisions] [--endpoint http://127.0.0.1:PORT/v1/chat/completions]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startB198DLocalStudio}
  from '../source/ai/b198d-local-review-server.mjs';
import {createB198GLocalModelAdapter}
  from '../source/ai/b198g-local-model-adapter.mjs';
import {runB198HBenchmark}
  from '../source/ai/b198h-model-benchmark.mjs';
import {generateArchitectureWithFeedback}
  from '../source/ai/b198g-autonomous-quality.mjs';

const fail=why=>{throw Error('B198H_WORKFLOW_'+why)};
export const GUIDE=[
 'studio --project DIRECTORY [--design EXISTING_B143_SOURCE.json | --prompt JAPANESE_REQUEST --local-model MODEL_ID] [--port 0..65535]',
 'benchmark --out NEW_DIRECTORY --local-model MODEL_ID [--cases 1..12] [--no-revisions]',
 'Both modes optionally accept --endpoint http://127.0.0.1:PORT/v1/chat/completions',
 'Studio with no --local-model is intentionally read-only: no fake generation.',
 'No remote or paid API, no automatic approval, no Minecraft world writes.'
].join('\n');

export function parseB198HArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const mode=argv[0];
 if(!['studio','benchmark'].includes(mode))fail('MODE_REQUIRED');
 const allowed=new Set(['--project','--design','--prompt','--local-model','--port',
  '--endpoint','--out','--cases','--no-revisions']);
 const values={};
 for(let i=1;i<argv.length;i++){
  const key=argv[i];
  if(!allowed.has(key)||values[key]!==undefined)fail('INVALID_OR_REPEATED_'+key);
  if(key==='--no-revisions'){values[key]=true;continue;}
  const val=argv[++i];
  if(!val||val.startsWith('--'))fail('MISSING_VALUE_'+key);
  values[key]=val;
 }
 if(mode==='studio'){
  if(!values['--project'])fail('STUDIO_PROJECT_REQUIRED');
  if(values['--out']||values['--cases']||values['--no-revisions'])
   fail('STUDIO_BENCHMARK_OPTION');
  if(values['--endpoint']&&!values['--local-model'])
   fail('ENDPOINT_WITHOUT_MODEL');
  if(values['--prompt']&&values['--design'])
   fail('PROMPT_AND_EXISTING_DESIGN_MUTUALLY_EXCLUSIVE');
  if(values['--prompt']&&!values['--local-model'])
   fail('PROMPT_REQUIRES_EXPLICIT_MODEL');
  if(values['--prompt']&&(values['--prompt'].trim().length<8||
   values['--prompt'].length>6100))fail('PROMPT_LENGTH');
  const port=values['--port']===undefined?0:Number(values['--port']);
  if(!/^(?:0|[1-9][0-9]{0,4})$/.test(values['--port']??'0')||
   !Number.isSafeInteger(port)||port>65535)fail('INVALID_STUDIO_PORT');
  return {mode,projectDirectory:path.resolve(values['--project']),
   designFile:values['--design']?path.resolve(values['--design']):null,
   prompt:values['--prompt']??null,
   model:values['--local-model']??null,endpoint:values['--endpoint']??null,
   port};
 }
 if(!values['--local-model']||!values['--out'])
  fail('BENCHMARK_EXPLICIT_MODEL_AND_OUTPUT_REQUIRED');
 if(values['--project']||values['--design']||values['--prompt']||values['--port'])
  fail('BENCHMARK_STUDIO_OPTION');
 const creationCount=values['--cases']===undefined?12:Number(values['--cases']);
 if(!/^(?:[1-9]|1[0-2])$/.test(values['--cases']??'12'))
  fail('BENCHMARK_CREATION_COUNT');
 return {mode,model:values['--local-model'],
  endpoint:values['--endpoint']??null,
  outDir:path.resolve(values['--out']),creationCount,
  includeRevisions:!values['--no-revisions']};
}
export async function executeB198H(options,{generator=null}={}){
 if(options.help)return {help:GUIDE};
 const provider=generator??(options.model===null?null:
   createB198GLocalModelAdapter({
    model:options.model,
    ...(options.endpoint?{endpoint:options.endpoint}:{})
   }));
 if(options.mode==='studio'){
  let initialDesign=options.designFile===null?null:
   JSON.parse(fs.readFileSync(options.designFile,'utf8'));
  let initialSourceReport=null;
  if(options.prompt!==null){
   if(provider===null)fail('PROMPT_WITHOUT_REAL_GENERATOR');
   const project=options.projectDirectory;
   // A prompt can initialize only a new or empty project: never replace
   // approved designs, pending drafts, or existing source history.
   if(fs.existsSync(project)&&fs.readdirSync(project).length!==0)
    fail('PROMPT_REQUIRES_NEW_EMPTY_PROJECT');
   const created=await generateArchitectureWithFeedback({
    prompt:options.prompt,generator:provider,maxRepairRounds:2
   });
   initialDesign=created.design;
   initialSourceReport=created.report;
  }
  const app=await startB198DLocalStudio({
    projectDirectory:options.projectDirectory,
    initialDesign,generator:provider,port:options.port
  });
  if(initialSourceReport!==null){
   fs.writeFileSync(path.join(options.projectDirectory,
    'B198H_INITIAL_MODEL_SOURCE_REVIEW.json'),
    JSON.stringify(initialSourceReport,null,2)+'\n',{flag:'wx'});
  }
  return {mode:'studio',app,url:app.url,
   initialSourceReport,
   modelConnected:provider!==null,
   providerClassification:generator!==null?'INJECTED_TEST_DOUBLE':
    provider===null?'NONE':'EXPLICIT_LOCAL_LOOPBACK',
   worldWrites:0,sourceOnly:true};
 }
 if(options.mode==='benchmark'){
  if(provider===null)fail('BENCHMARK_GENERATOR_MISSING');
  const performed=await runB198HBenchmark({
   provider,modelId:options.model,
   providerOrigin:generator===null?
    'EXPLICIT_LOCAL_LOOPBACK':'INJECTED_TEST_DOUBLE',
   outDir:options.outDir,creationCount:options.creationCount,
   includeRevisions:options.includeRevisions
  });
  return {mode:'benchmark',output:options.outDir,
   report:performed.report,sourceOnly:true,worldWrites:0};
 }
 fail('INVALID_EXECUTION_MODE');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opt=parseB198HArgs(process.argv.slice(2));
  const result=await executeB198H(opt);
  if(result.help)console.log(result.help);
  else if(result.mode==='studio'){
   console.log('B198H_LOCAL_SOURCE_REVIEW_STUDIO',result.url);
   console.log('MODEL_CONNECTION',result.providerClassification);
   if(result.initialSourceReport)console.log('INITIAL_SOURCE_REVIEW',
    result.initialSourceReport.status);
   console.log('Approvals affect B143 design history only, never Minecraft blocks.');
  }else{
   console.log('B198H_FROZEN_BENCHMARK_SOURCE_ONLY',JSON.stringify({
    output:result.output,modelId:opt.model,
    modelInvocations:result.report.modelGeneratorInvocations,
    compiledSources:result.report.successfullyCompiledCaseCount,
    status:result.report.finalStatus,
    humanScores:0,worldWrites:0
   }));
  }
 }catch(e){console.error('B198H_HOLD',String(e?.message??e));process.exitCode=1;}
}
