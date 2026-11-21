/** Replay a preserved semantic-space model response using the CURRENT host.
 * Distinct from original model-time result. Offline only, no Ollama/Minecraft.
 * Never edits model output, original receipts, prior studies or legacy source.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190ABSemanticReply,R190AB_SEMANTIC_FORMAT_SHA256}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

const H=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=reason=>{throw Error('R190AB_REPLAY_'+reason)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
function readFile(dir,name){
 const p=path.join(dir,name),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>200000)fail('UNSAFE_STUDY_FILE_'+name);
 return fs.readFileSync(p,'utf8');
}
const writeNew=(p,s)=>fs.writeFileSync(p,s,{flag:'wx'});
const jsonNew=(p,v)=>writeNew(p,JSON.stringify(v,null,2)+'\n');
export function parseSavedSemanticReplayArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const o={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!['--study','--out','--expected-sha'].includes(k)||!v||Object.hasOwn(o,k))
   fail('ARGS');
  o[k]=v;
 }
 if(!path.isAbsolute(o['--study']??'')||
    !path.isAbsolute(o['--out']??'')||
    !/^[0-9a-f]{64}$/.test(o['--expected-sha']??''))
   fail('ARGS');
 return {studyDir:o['--study'],outDir:o['--out'],
  expectedSha256:o['--expected-sha']};
}
/** Read the original once; never repair, rename, or write its three files. */
export function replaySavedSemanticStudy({studyDir,outDir,expectedSha256}){
 if(!path.isAbsolute(studyDir)||!path.isAbsolute(outDir)||
   !/^[0-9a-f]{64}$/.test(expectedSha256??''))fail('ARGS');
 const input=path.resolve(studyDir),output=path.resolve(outDir);
 if(!fs.lstatSync(input).isDirectory()||fs.lstatSync(input).isSymbolicLink())
  fail('UNSAFE_STUDY_DIR');
 const realInput=fs.realpathSync(input);
 const realParent=fs.realpathSync(path.dirname(output));
 if(realParent===realInput||realParent.startsWith(realInput+path.sep)||
    output===input||output.startsWith(input+path.sep)||
    fs.existsSync(output))fail('OUTPUT_NOT_ISOLATED_OR_EXISTS');
 const raw=readFile(input,'MODEL_RESPONSE_ORIGINAL.txt');
 const resultText=readFile(input,'R190AB_RESULT.json');
 const attemptText=readFile(input,'R190AB_ATTEMPT.json');
 const originalHashes={
  rawSha256:H(raw),resultSha256:H(resultText),attemptSha256:H(attemptText)
 };
 let result,attempt;
 try{
  result=JSON.parse(resultText);attempt=JSON.parse(attemptText);
 }catch{fail('INVALID_ORIGINAL_RECEIPT')}
 const r=result.response??{};
 if(originalHashes.rawSha256!==expectedSha256||
    r.originalRawSha256!==expectedSha256||
    r.bytes!==Buffer.byteLength(raw,'utf8')||
    r.formatSchemaSha256!==R190AB_SEMANTIC_FORMAT_SHA256||
    result.schema!=='minecraftaibuilder-r190ab-semantic-study-v1'||
    result.contract!=='semantic-space'||attempt.contract!=='semantic-space'||
    result.sourceTask!=='tidal-workshop'||attempt.sourceTask!=='tidal-workshop'||
    result.modelClaimed!==attempt.modelRequested||
    result.originalPromptSha256!==attempt.promptSha256||
    result.schemaSha256!==R190AB_SEMANTIC_FORMAT_SHA256||
    result.schemaSha256!==attempt.schemaSha256||
    result.providerDoneReason!=='stop'||
    result.providerCallsAttempted!==1||attempt.providerCallsAttempted!==1||
    result.noAutomaticRetry!==true||result.noHostGeometryRepair!==true||
    result.b143Authorship!=='HOST_DERIVED_FROM_MODEL_SEMANTIC_IR'||
    result.worldWrites!==0||result.worldContacts!==0||
    result.executionAllowed!==false||result.constructionApproved!==false||
    !Array.isArray(result.gates)||result.gates.length!==9||
    result.gates.some(x=>x!=='BLOCKED')||
    result.BuildPlan?.operations?.length!==0||
    r.status!=='HOLD_INVALID_SEMANTIC_PROGRAM'||r.real3D!==false||
    r.error!=='R190_SEMANTIC_NO_FEASIBLE_SPATIAL_LAYOUT')
  fail('ORIGINAL_PROVENANCE_OR_BOUNDARY');
 // A changed CURRENT compiler may succeed; the ORIGINAL study stays failed.
 const replay=inspectR190ABSemanticReply(raw,result.providerDoneReason);
 const v=replay.report;
 const success=v.real3D===true&&v.hostSourceDerived===true&&
   !!replay.design&&!!replay.compiled&&
   verifyCompiled(replay.design,replay.compiled);
 const report={
  schema:'minecraftaibuilder-r190ab-preserved-semantic-replay-v1',
  status:success?'CURRENT_HOST_DERIVED_3D_ART_HOLD':'CURRENT_HOST_REPLAY_HOLD',
  mode:'ARCHIVED_MODEL_RAW_CURRENT_HOST_REPLAY',sourceTask:result.sourceTask,
  study:result.study,originalModelClaimed:result.modelClaimed,
  oldRecordedStatus:r.status,oldRecordedError:r.error,
  originalModelResponseRetrospectivelyReclassified:false,
  historicalResultsModified:false,originalHashes,
  currentHostStatus:v.status,currentHostError:v.error,
  sourceGeometryPresent:success,modelAuthoredB143:false,
  hostDerivedFromOriginalModelIR:success,
  hostSourceSha256:success?v.hostDerivedSourceSha256:null,
  hostGeometrySha256:success?v.hostDerivedGeometrySha256:null,
  currentHostSourceRouteAudit:success?v.sourceRouteAudit:null,
  modelCallsByReplay:0,modelCallCountInOriginalStudy:1,
  rawOriginalUnmodified:true,noAutomaticRetry:true,
  independentJapaneseRequirements:'NOT_CERTIFIED',
  weatherAndTidalPerformance:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',humanArtReview:'ART_HOLD',
  originalDataNotWrittenByReplay:true,...safe()
 };
 // Build artifacts before creating the destination, so failed formatting
 // cannot leave a misleading or half-complete published replay.
 const contents=[];
 if(success){
  const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
  const html=renderB143Html(compileB143Gallery([replay.design]),template);
  contents.push(['HOST_DERIVED_B143_SOURCE.json',
   JSON.stringify(replay.design,null,2)+'\n']);
  contents.push(['HOST_DERIVED_SOURCE_TRUE_3D.html',html]);
  for(const side of ['front','rear','west','east','roof'])
   contents.push(['HOST_DERIVED_'+side+'.svg',
    renderR164Elevation(replay.compiled,replay.design,side)]);
 }
 // Preserve read-time evidence: no other writer may silently change input.
 if(H(readFile(input,'MODEL_RESPONSE_ORIGINAL.txt'))!==originalHashes.rawSha256||
    H(readFile(input,'R190AB_RESULT.json'))!==originalHashes.resultSha256||
    H(readFile(input,'R190AB_ATTEMPT.json'))!==originalHashes.attemptSha256)
  fail('ORIGINAL_CHANGED_DURING_REPLAY');
 fs.mkdirSync(output);
 try{
  for(const [name,content] of contents)writeNew(path.join(output,name),content);
  jsonNew(path.join(output,'REPLAY_RESULT.json'),report);
 }catch(e){
  // Preserve any incomplete output for forensic inspection; no deletion,
  // and never pretend partial output is a completed replay.
  throw e;
 }
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=parseSavedSemanticReplayArgs(process.argv.slice(2));
  console.log(JSON.stringify(opts.help?{help:
   'OFFLINE: --study ABSOLUTE --out ABSOLUTE_NEW --expected-sha 64_HEX'}:
   replaySavedSemanticStudy(opts),null,2));
 }catch(e){
  console.error('R190AB_REPLAY_HOLD',String(e?.message??e));
  process.exitCode=2;
 }
}
