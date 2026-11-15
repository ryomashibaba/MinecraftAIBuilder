/**
 * R125 V11 bounded multi-brief author trial. ONE local model, 1..3 sequential
 * calls, one original response per brief, no retry or Minecraft world I/O.
 *
 * node scripts/r125-local-architecture-plan-batch.mjs --model qwen3:14b
 *   --briefs C:\\private\\three-briefs.json --out C:\\private\\NEW-result
 *
 * BRIEFS is a private JSON array of {"id":"home","prompt":"..."} objects.
 * Uses the existing owned local model lifecycle; never launches Ollama/LM
 * Studio. Report hashes are SOURCE evidence, not ART or in-game passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createR125ArchitecturePlanLocalAdapter,DEFAULT_LOCAL_ENDPOINT}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runR125LocalArchitecturePlan,ensurePrivateNewDirectory}
 from './r125-local-architecture-plan-run.mjs';

const fail=code=>{throw Error('R125_BATCH_'+code)};
const exactly=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));

export function parseR125BatchBriefs(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>32000)
  fail('BRIEFS_FILE_SIZE');
 let parsed;
 try{parsed=JSON.parse(raw)}catch{fail('BRIEFS_NOT_JSON')}
 if(!Array.isArray(parsed)||parsed.length<1||parsed.length>3)
  fail('BRIEF_COUNT_1_TO_3');
 const ids=new Set(),prompts=new Set();
 for(const v of parsed){
  if(!exactly(v,['id','prompt'])||
    typeof v.id!=='string'||!/^[a-z][a-z0-9-]{2,23}$/.test(v.id)||
    typeof v.prompt!=='string'||v.prompt.length<8||v.prompt.length>8000||
    !v.prompt.trim()||ids.has(v.id)||prompts.has(v.prompt.trim()))
   fail('INVALID_DUPLICATE_OR_REPEATED_BRIEF');
  ids.add(v.id);prompts.add(v.prompt.trim());
 }
 return parsed;
}
export function parseR125BatchArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==6&&argv.length!==8)fail('ARGS_REQUIRED');
 const o={},allowed=new Set(['--model','--briefs','--out','--endpoint']);
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!allowed.has(k)||Object.hasOwn(o,k)||typeof v!=='string'||
     !v.trim()||v.startsWith('--'))fail('ARGS_INVALID');
  o[k]=v;
 }
 if(!o['--model']||!o['--briefs']||!o['--out']||
   (argv.length===8&&!o['--endpoint']))fail('ARGS_MISSING');
 return {model:o['--model'],briefsFile:path.resolve(o['--briefs']),
  outDir:path.resolve(o['--out']),
  endpoint:o['--endpoint']??DEFAULT_LOCAL_ENDPOINT};
}

/**
 * Model-authored MASSING family, deliberately excluding ID, palette, title,
 * room purpose and footprint SIZE. A different SHA, materials or floor area
 * alone is NOT evidence of a different architectural form.
 */
export function authoredFormFamily(plan){
 const e=plan?.expression;
 return {levelAxes:plan.levels.map(l=>l.splitAxis),
  roofProfile:e?.roofProfile??'unexpressed-flat',
  roofAxis:e?.roofAxis??null,
  setbackSide:e?.setbackSide??'none',
  setbackDepth:e?.setbackDepth??0,
  rearCornerCut:e?.rearCornerCut?
   {side:e.rearCornerCut.side??'east',
    width:e.rearCornerCut.width,depth:e.rearCornerCut.depth}:null,
  facadeLanguage:e?.facadeLanguage??'plain'};
}
const formHash=plan=>createHash('sha256')
 .update(JSON.stringify(authoredFormFamily(plan))).digest('hex');

export async function runR125ArchitecturePlanBatch({
 model,briefsRaw,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT
},{fetcher=fetch,timeoutMs=180000}={}){
 const briefs=parseR125BatchBriefs(briefsRaw);
 if(typeof outDir!=='string'||!outDir)fail('OUT_REQUIRED');
 const dest=path.resolve(outDir);
 ensurePrivateNewDirectory(dest);
 // Reuse the one-shot adapter preflight before allocating ANY output paths.
 // Construction validates loopback URL, model, timeout; it does not POST.
 createR125ArchitecturePlanLocalAdapter({
  model,endpoint,fetcher,timeoutMs,onRawModelResponse:()=>{}
 });
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'BRIEFS_ORIGINAL.json'),briefsRaw,{flag:'wx'});
 const report={schema:'r125-local-plan-batch-v1',
  model,endpoint,planned:briefs.length,attempted:0,automaticRetries:0,
  requestsParallel:false,allSourceVerified:false,
  geometryHashesDistinct:null,modelAuthoredFormFamiliesDistinct:null,
  visualDiversity:'NOT_REVIEWED',
  inGameWalking:'NOT_TESTED',worldWrites:0,
  completed:[],stopReason:null};
 const save=()=>fs.writeFileSync(path.join(dest,'BATCH_REPORT.json'),
  JSON.stringify(report,null,2)+'\n');
 save();
 for(const item of briefs){
  const one=await runR125LocalArchitecturePlan({
   model,prompt:item.prompt,endpoint,outDir:path.join(dest,item.id)
  },{fetcher,timeoutMs});
  let modelAuthoredFormFamilySha256=null;
  if(one.report.sourceVerified){
   // Read the exact ORIGINAL response (not repaired SOURCE design) so a
   // HOST-derived difference is never attributed to the local model.
   const original=JSON.parse(fs.readFileSync(path.join(dest,item.id,
    'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'));
   modelAuthoredFormFamilySha256=formHash(original);
  }
  const row={id:item.id,requestSha256:one.report.requestSha256,
   modelAuthoredFormFamilySha256,
   status:one.report.status,modelResponsesCaptured:one.report.modelResponsesCaptured,
   sourceVerified:one.report.sourceVerified,
   originalSha256:one.report.originalSha256,
   sourceSha256:one.report.sourceSha256??null,
   geometrySha256:one.report.geometrySha256??null,
   review3d:one.report.review3d??'NOT_GENERATED'};
  report.completed.push(row);report.attempted++;
  const success=row.status==='B143_SOURCE_CANDIDATE_ART_HOLD'&&
    row.sourceVerified===true;
  const geometry=report.completed.map(x=>x.geometrySha256).filter(Boolean);
  report.geometryHashesDistinct=geometry.length<2?null:
   new Set(geometry).size===geometry.length;
  const families=report.completed.map(x=>x.modelAuthoredFormFamilySha256)
   .filter(Boolean);
  report.modelAuthoredFormFamiliesDistinct=families.length<2?null:
   new Set(families).size===families.length;
  if(!success){
   report.stopReason='STOP_ON_FIRST_NON_SOURCE_RESULT';
   save();break;
  }
  if(report.geometryHashesDistinct===false){
   report.stopReason='HOLD_IDENTICAL_GEOMETRY';
   save();break;
  }
  save();
 }
 report.allSourceVerified=report.attempted===report.planned&&
  report.completed.every(x=>x.sourceVerified)&&
  report.geometryHashesDistinct!==false;
 if(!report.allSourceVerified&&!report.stopReason)
  report.stopReason='INCOMPLETE_BATCH';
 save();
 return {report,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseR125BatchArgs(process.argv.slice(2));
  if(a.help){
   console.log('R125 batch: --model LOCAL_ID --briefs PRIVATE_JSON_ARRAY --out NEW_PRIVATE_DIRECTORY [--endpoint http://127.0.0.1:PORT/v1/chat/completions]');
  }else{
   const raw=fs.readFileSync(a.briefsFile,'utf8');
   const {report}=await runR125ArchitecturePlanBatch({
    model:a.model,briefsRaw:raw,outDir:a.outDir,endpoint:a.endpoint});
   console.log('R125_LOCAL_BATCH',JSON.stringify(report));
   if(!report.allSourceVerified)process.exitCode=2;
  }
 }catch(error){
  console.error('R125_BATCH_HOLD',String(error?.message??error));
  process.exitCode=2;
 }
}
