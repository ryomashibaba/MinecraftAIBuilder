/** Offline only: analyses a saved original into a NEW JSON path; never
 * modifies the original, calls Ollama or contacts Minecraft. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectR21SavedOriginal}
 from '../source/ai/b198zr21-offline-forensics.mjs';
export function writeR21SavedOriginalForensics({
 rawPath,requestPath=null,expectedRawSha256=null,outPath
}={}){
 if(typeof rawPath!=='string'||typeof outPath!=='string'||
  !rawPath||!outPath)throw Error('B198ZR21_PATH_REQUIRED');
 const rawAbs=path.resolve(rawPath),outAbs=path.resolve(outPath);
 if(rawAbs===outAbs||fs.existsSync(outAbs))
  throw Error('B198ZR21_OUTPUT_MUST_BE_NEW');
 const raw=fs.readFileSync(rawAbs,'utf8');
 let prompt='';
 if(requestPath!==null){
  const request=JSON.parse(fs.readFileSync(path.resolve(requestPath),'utf8'));
  prompt=request.originalPrompt??'';
 }
 const report=inspectR21SavedOriginal(raw,{
  expectedRawSha256,requestPrompt:prompt,sourceLabel:'SAVED_QWEN_ORIGINAL'});
 // Refuse to overwrite or create a report inside the original ZIP.
 fs.writeFileSync(outAbs,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==8||argv[0]!=='--raw'||argv[2]!=='--request'||
    argv[4]!=='--sha256'||argv[6]!=='--out')
   throw Error('B198ZR21_EXPECTED_CLI_ARGS');
  const r=writeR21SavedOriginalForensics({
   rawPath:argv[1],requestPath:argv[3],
   expectedRawSha256:argv[5],outPath:argv[7]});
  console.log('R21_SOURCE_ONLY_REPORT_WRITTEN '+JSON.stringify({
   rawSha256:r.rawSha256,critical:r.staticCriticalCount,
   advisory:r.architecturalWarningCount,modelCalls:0,worldWrites:0}));
 }catch(e){
  console.error('R21_OFFLINE_HOLD '+String(e?.message??e).slice(0,150));
  process.exitCode=1;
 }
}
