/**
 * Re-audit the latest E2 REAL model response locally, exactly as saved.
 * Zero model calls, original file writes or Minecraft operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseE2AuthoredPlan} from '../source/ai/r190-e2-diagnose.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
const sha=b=>createHash('sha256').update(b).digest('hex');
export function findLatestE2QwenRun(outRoot=OUT){
 if(!fs.existsSync(outRoot))throw Error('E2_NO_OUTPUT_ROOT');
 const options=fs.readdirSync(outRoot,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&x.name.startsWith('E2-qwen-'))
  .map(x=>path.join(outRoot,x.name))
  .filter(x=>fs.existsSync(path.join(x,'E2_QWEN_REPORT.json'))&&
   fs.existsSync(path.join(x,'QWEN_E2_ORIGINAL.txt')))
  .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 if(!options.length)throw Error('E2_NO_SAVED_MODEL_ORIGINAL');
 return options[0];
}
export function diagnoseSavedE2Qwen({
 sourceDir=null,outRoot=OUT
}={}){
 const source=path.resolve(sourceDir??findLatestE2QwenRun(outRoot));
 const report=JSON.parse(fs.readFileSync(path.join(source,'E2_QWEN_REPORT.json'),'utf8'));
 if(report.schema!=='minecraftaibuilder-e2-first-local-qwen-study-v1'||
  report.rawModelOriginalPresent!==true||
  typeof report.modelOriginalSha256!=='string')
  throw Error('E2_DIAG_MISSING_ORIGINAL_PROVENANCE');
 const raw=fs.readFileSync(path.join(source,'QWEN_E2_ORIGINAL.txt'),'utf8');
 const hash=sha(raw);
 if(report.modelOriginalSha256!==hash)throw Error('E2_DIAG_ORIGINAL_SHA_MISMATCH');
 let diagnosis;
 try{diagnosis=diagnoseE2AuthoredPlan(JSON.parse(raw));}
 catch(e){diagnosis={schema:'e2-original-diagnosis-v1',
  issues:[{code:'JSON_PARSE_HOLD',path:'$',actual:String(e?.message??e).slice(0,220),
   expected:'one complete strict JSON object'}],
  sourceAudit:'SKIPPED_INVALID_JSON',modelRequests:0,worldWrites:0}};
 const summary={
  schema:'minecraftaibuilder-e2-saved-original-diagnostic-v1',
  originalRunDir:source,originalModelSha256:hash,originalModelShaVerified:true,
  originalSourceStatus:report.status,originalSourceReason:report.reason??null,
  provenance:report.provenance,model:report.model,originalModelRequests:report.modelRequests,
  diagnosis,canonicalSourceStatusUnchanged:true,
  newModelRequests:0,worldWrites:0,worldContacts:0,
  originalFilesUnchanged:true,constructionApproved:false,
  actualMinecraftBuild:'NOT_ATTEMPTED',art:'NOT_REVIEWED'
 };
 fs.mkdirSync(outRoot,{recursive:true});
 const dir=fs.mkdtempSync(path.join(path.resolve(outRoot),'E2-diagnosis-'));
 fs.writeFileSync(path.join(dir,'E2_ORIGINAL_DIAGNOSIS.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return {dir,...summary};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length>1)throw Error('USAGE: --latest or an E2-qwen-* folder');
  const choice=args.length===0||args[0]==='--latest'?null:args[0];
  const result=diagnoseSavedE2Qwen({sourceDir:choice});
  console.log('E2 original SHA verified: '+result.originalModelShaVerified);
  console.log('Original SOURCE status: '+result.originalSourceStatus+
   ' reason: '+String(result.originalSourceReason));
  for(const item of result.diagnosis.issues)
   console.log(item.code+' at '+item.path+'; actual='+JSON.stringify(item.actual)+
    '; expected='+JSON.stringify(item.expected));
  console.log('E2 saved diagnosis: '+path.join(result.dir,'E2_ORIGINAL_DIAGNOSIS.json'));
  console.log('No model calls, no original edits, no world writes.');
  const opened=openE1ResultFolder(path.join(result.dir,'E2_ORIGINAL_DIAGNOSIS.json'));
  if(opened.attempted)console.log('E2 result folder opening: '+opened.folder);
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
