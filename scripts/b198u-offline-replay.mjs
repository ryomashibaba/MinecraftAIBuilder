/**
 * B198U OFFLINE REPLAY: re-check a captured original model response with zero
 * model requests, zero Minecraft world contact and a strict B143 compiler.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCapturedModelSource}
 from '../source/ai/b198u-bounds-only-repair.mjs';
import {readModelProposal}
 from '../source/ai/b198-natural-language-design.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';
import {critiqueArchitecture}
 from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SCHEMA='minecraftaibuilder-b198u-offline-replay-v1';
const guard=(x,c)=>{if(!x)throw Error('B198U_REPLAY_'+c)};
const safety=()=>({worldWrites:0,worldContacts:0,
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});

export function runB198UOfflineReplay({sourceFile,outDir}={}){
 guard(typeof sourceFile==='string'&&sourceFile.length>0,'SOURCE_REQUIRED');
 guard(typeof outDir==='string'&&outDir.length>0,'OUTPUT_REQUIRED');
 const source=path.resolve(sourceFile),dest=path.resolve(outDir);
 guard(fs.existsSync(source)&&fs.statSync(source).isFile()&&
  fs.statSync(source).size>0&&fs.statSync(source).size<120000,
  'SOURCE_MUST_BE_SAVED_MODEL_RESPONSE');
 guard(!fs.existsSync(dest)&&fs.existsSync(path.dirname(dest)),
  'REFUSE_OVERWRITE_OR_MISSING_PARENT');
 const raw=fs.readFileSync(source,'utf8');
 const prepared=prepareCapturedModelSource(raw);
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'B198U_ORIGINAL_RESPONSE.txt'),
  raw,{flag:'wx'});
 fs.writeFileSync(path.join(dest,'B198U_CORRECTED_CANDIDATE.txt'),
  prepared.content,{flag:'wx'});
 let evidence=null,error=null;
 try{
  const d=readModelProposal(prepared.content).design;
  const compiled=compileDesign(d);
  guard(verifyCompiled(d,compiled),'SHA_GUARD');
  const gallery=compileB143Gallery([d]);
  guard(verifyB143Payload(gallery),'UNSAFE_VIEWER');
  const template=fs.readFileSync(path.join(ROOT,
   'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(gallery,template);
  const tag=html.match(/<body\b[^>]*>/i)?.[0];
  guard(!!tag,'HTML_BODY_MISSING');
  const annotated=html.replace(tag,tag+
   '<div style="padding:12px 20px;background:#51371f;color:#fff;font-weight:700">'+
   'B198U OFFLINE REPLAY — 元のモデル出力をソース検証。モデル再推論なし、施工禁止、造形品質未承認。'+
   '</div>');
  fs.writeFileSync(path.join(dest,'c01_source-design.json'),
   JSON.stringify(d,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(dest,'c01_index.html'),
   annotated,{flag:'wx'});
  const audit=critiqueArchitecture({design:d,compiled});
  evidence={sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   occupiedVoxels:compiled.primitives.length,
   elementCount:d.elements.length,highRiskSourceFindings:audit.highRiskCount,
   semanticOrAestheticQualityCertified:false};
 }catch(e){error=String(e?.message??e).slice(0,300)}
 const result={
  schema:SCHEMA,status:evidence?
   'OFFLINE_COMPILED_HUMAN_REVIEW_REQUIRED':'HOLD_OFFLINE_VALIDATION',
  originalResponseSha256:prepared.rawModelResponseSha256,
  normalizedResponseSha256:prepared.finalCandidateSha256,
  metadataRepair:prepared.metadataRepair,
  declaredBoundsOnlyRepair:prepared.boundsRepair,
  modelCallsMade:0,originalModelWasNotReinvoked:true,
  providerIdentityFromCaptureNotAuthenticated:true,
  sourceOnly:true,compiledSource:evidence,error,
  humanAestheticReview:'NOT_REVIEWED',
  MinecraftWalking:'NOT_TESTED',safety:safety()
 };
 fs.writeFileSync(path.join(dest,'B198U_REPLAY_SUMMARY.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
export function parseB198UReplayArgs(args){
 const a={},allowed=new Set(['--source','--out']);
 for(let i=0;i<args.length;i++){
  const k=args[i];guard(allowed.has(k)&&a[k]===undefined,'INVALID_FLAG');
  const val=args[++i];guard(typeof val==='string'&&val.length>0&&
   !val.startsWith('--'),'MISSING_VALUE');
  a[k]=val;
 }
 guard(a['--source']&&a['--out'],'SOURCE_AND_OUTPUT_REQUIRED');
 return {sourceFile:a['--source'],outDir:a['--out']};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=runB198UOfflineReplay(
   parseB198UReplayArgs(process.argv.slice(2)));
  console.log('B198U_REPLAY_FINISHED',JSON.stringify({
   status:result.status,modelCallsMade:0,
   compiled:!!result.compiledSource,error:result.error,worldWrites:0}));
 }catch(e){
  console.error('B198U_REPLAY_FATAL',
   String(e?.message??e).slice(0,300));process.exitCode=1;
 }
}
