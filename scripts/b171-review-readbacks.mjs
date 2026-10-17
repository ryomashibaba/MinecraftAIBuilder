/**
 * B171 local-only readback evidence importer.
 *
 * --init [DIR] creates source-pinned EMPTY files + an honest 18-position
 * no-readback report without any game network or world access.
 * --review PACKET SUBMISSION ARCHIVE OUTPUT analyses user-provided JSON
 * without modifying any input and refuses output path overwrite.
 *
 * B134/B135 diagnostic must be wrapped as:
 * {"checkpointId":"north-tread-1","source":"B135","diagnostic":{...}}
 * under B171_READBACK_ARCHIVE.json.receipts[].
 *
 * Observations are never promoted to authoritative world coordinates,
 * Minecraft Education block-facing maps, collisions or construction rights.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeProbePacket,verifyProbePacket}
 from '../source/ai/b170-readonly-probe-packet.mjs';
import {
 makeEmptyB171Receipts,reconcileB171,verifyB171Review
} from '../source/ai/b171-readback-reconciler.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const parse=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function writeExclusive(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
}
export function initializeB171(dir=path.join(ROOT,'b171-readback-output')){
 const packet=makeProbePacket(),submission={
  packetSha256:packet.sha256,observations:[]};
 const archive=makeEmptyB171Receipts(packet),
  report=reconcileB171(packet,submission,archive);
 if(!verifyProbePacket(packet)||!verifyB171Review(packet,submission,archive,report)||
  report.noReadbacks!==18||report.constructionApproved!==false)
  throw Error('B171_INITIALIZATION_UNSAFE');
 // Preflight to prevent a partial overwrite of existing imported evidence.
 const outputs=[
  ['B171_PINNED_PROBE_PACKET.json',packet],
  ['B171_EMPTY_SUBMISSION.json',submission],
  ['B171_READBACK_ARCHIVE.json',archive],
  ['B171_EMPTY_RECONCILIATION.json',report]
 ];
 for(const [filename] of outputs)
  if(fs.existsSync(path.join(dir,filename)))
   throw Error('B171_EXISTING_FILES_REFUSE_REPLACE');
 for(const [filename,obj] of outputs)writeExclusive(path.join(dir,filename),obj);
 return {dir,packetSha256:packet.sha256,missing:18,actualGameAttestations:0,
  outputFiles:outputs.map(x=>x[0]),constructionApproved:false};
}
export function analyzeB171Files(packetFile,submissionFile,archiveFile,outputFile){
 const files=[packetFile,submissionFile,archiveFile,outputFile].map(file=>path.resolve(file));
 if(new Set(files).size!==4||fs.existsSync(files[3]))
  throw Error('B171_OUTPUT_INPUT_OVERWRITE_REFUSED');
 const packet=parse(files[0]),submission=parse(files[1]),archive=parse(files[2]);
 const report=reconcileB171(packet,submission,archive);
 if(!verifyB171Review(packet,submission,archive,report)||
  report.actualEducationReadbacksAuthenticated!==0||
  report.constructionApproved!==false||report.worldContacts!==0||
  report.worldWrites!==0||report.gates.some(x=>x!=='BLOCKED')||
  report.BuildPlan.operations.length!==0)
  throw Error('B171_REVIEW_SAFETY_HOLD');
 writeExclusive(files[3],report);
 return {stage:'OFFLINE_RECONCILIATION_UNAUTHENTICATED',
  parsedDiagnostics:report.diagnosticCount,
  conflicts:report.conflicts,repeatedConsistent:report.repeatedConsistent,
  missing:report.noReadbacks,reportSha256:report.sha256,
  gameClientCertified:false,worldWrites:0,constructionApproved:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),command=args.shift();
  if(command==='--init'){
   if(args.length>1)throw Error('B171_INIT_USAGE');
   console.log('B171_EMPTY_EVIDENCE',JSON.stringify(initializeB171(args[0])));
  }else if(command==='--review'){
   if(args.length!==4)throw Error('B171_REVIEW_USAGE: --review PACKET SUBMISSION ARCHIVE OUTPUT');
   console.log('B171_READBACK_RESULT',JSON.stringify(analyzeB171Files(...args)));
  }else throw Error('B171_USAGE: --init [DIR] | --review PACKET SUBMISSION ARCHIVE OUTPUT');
 }catch(e){console.error('B171_HOLD',String(e.message));process.exitCode=1;}
}
