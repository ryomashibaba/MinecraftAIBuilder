/**
 * R190-O: diagnose the original saved model reply without querying a model,
 * touching Minecraft, modifying original evidence, or claiming design success.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190OOriginal,exploreR190OCounterfactual,
 R190O_SCHEMA} from '../source/ai/r190o-saved-model-forensics.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
export const R190O_ROOT=path.resolve(scriptDir,'../r190n-local-evidence');
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex');
const fail=x=>{throw Error('R190O_'+x);};
export function parseR190OArgs(argv){
 const opt={raw:null,out:null};
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length%2!==0)fail('ARGUMENTS');
 for(let i=0;i<argv.length;i+=2){
  if(argv[i]==='--raw'&&opt.raw===null&&argv[i+1])opt.raw=argv[i+1];
  else if(argv[i]==='--out'&&opt.out===null&&argv[i+1])opt.out=argv[i+1];
  else fail('UNKNOWN_FLAG_'+argv[i]);
 }
 return opt;
}
export function findR190OSavedOriginal(root=R190O_ROOT){
 if(!fs.existsSync(root))fail('NO_SAVED_R190N_EVIDENCE');
 const dirs=fs.readdirSync(root,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&/^r190n-\d+-\d+$/.test(x.name))
  .map(x=>x.name).sort().reverse();
 for(const dirName of dirs){
  const dir=path.resolve(root,dirName),raw=path.join(dir,
   'R190_M_UNMODIFIED_MODEL_RESPONSE.txt'),
   receipt=path.join(dir,'R190_M_EVIDENCE_RECEIPT.json');
  try{
   const doc=JSON.parse(fs.readFileSync(receipt,'utf8'));
   const contents=fs.readFileSync(raw,'utf8');
   if(doc.schema==='minecraftaibuilder-r190-m-semantic-evidence-v1'&&
    doc.originalRawSha256===hash(contents)&&
    doc.readiness==='NOT_PREPARED'&&doc.worldWrites===0&&
    doc.worldContacts===0)return raw;
  }catch{continue;}
 }
 fail('NO_CRYPTographically_MATCHED_ORIGINAL');
}
export function runR190OOffline(options={},{
 evidenceRoot=R190O_ROOT,timestamp=()=>Date.now()
}={}){
 if(options.help)return {help:
  'node scripts/r190o-offline-review.mjs [--raw <original-R190-M.txt>] [--out <NEW_DIR>] (zero model calls)'};
 const rawPath=options.raw?path.resolve(options.raw):
  findR190OSavedOriginal(evidenceRoot);
 if(!fs.statSync(rawPath).isFile())fail('RAW_NOT_FILE');
 const raw=fs.readFileSync(rawPath,'utf8'),
  analyzed=exploreR190OCounterfactual(raw);
 const out=options.out?path.resolve(options.out):
  path.resolve(evidenceRoot,'r190o-review-'+String(timestamp())+'-'+String(process.pid));
 if(fs.existsSync(out))fail('NO_OVERWRITE');
 if(!fs.existsSync(path.dirname(out)))fail('OUTPUT_PARENT_MISSING');
 const safeOriginal=inspectR190OOriginal(raw);
 if(analyzed.original.rawSha256!==safeOriginal.rawSha256)
  fail('ORIGINAL_SHA_MISMATCH');
 // Do not embed the original model JSON in the written diagnostic; the
 // original remains read-only at its original location with an exact hash.
 const stripped={...analyzed.original};
 delete stripped.parsedResponse;
 const comparison={
  schema:R190O_SCHEMA,
  status:analyzed.original.status==='HOLD_ORIGINAL'?
   'ORIGINAL_HOLD_WITH_SEPARATE_EXPLORATION':'ORIGINAL_REVIEWED',
  originalRawSha256:analyzed.original.rawSha256,
  originalPath:rawPath,originalWasModified:false,
  modelIdentityCryptographicallyVerified:false,
  originalAcceptedByR190:false,
  originalProblems:stripped.issues,
  originalStrictFailure:stripped.strictOriginalResult,
  unchangedModelIntent:stripped.extractedSemanticIntent,
  shadowStatus:analyzed.counterfactualStatus,
  shadowChanges:analyzed.changes,
  shadowIR:analyzed.shadowPlan??null,
  shadowFailure:analyzed.counterfactualFailure??null,
  shadowLayoutResults:analyzed.outcomes,
  originalAndShadowAreNotEquivalent:analyzed.changes.some(x=>
   x.architecturalInformationLost||x.kind==='HOST_CHANGED_MODEL_ROOM_HEIGHT'),
  originalRealB143Produced:false,
  modelAuthoredB143:false,art:'ART_HOLD',
  minecraftPlayerWalking:'NOT_TESTED',
  actualModelCalls:0,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 const files=new Map([
  ['R190O_DIAGNOSTICS.json',JSON.stringify(comparison,null,2)+'\n']
 ]);
 if(analyzed.previews.length){
  const template=fs.readFileSync(path.resolve(scriptDir,
   '../source/ai/b143-viewer-template.html'),'utf8');
  for(const candidate of analyzed.previews){
   const name=candidate.strategy.toUpperCase().replaceAll('-','_');
   const gallery=compileB143Gallery([candidate.design]);
   if(gallery.sourceHashes[0]!==candidate.compiled.sourceSha256||
    gallery.geometryHashes[0]!==candidate.compiled.geometrySha256)
    fail('SHADOW_REAL_SOURCE_HASH_MISMATCH');
   files.set('R190O_HOST_SHADOW_'+name+'_3D.html',
    renderB143Html(gallery,template));
   files.set('R190O_HOST_SHADOW_'+name+'_B143.json',
    JSON.stringify(candidate.design,null,2)+'\n');
   for(const direction of ['front','rear','west','east','roof'])
    files.set('R190O_HOST_SHADOW_'+name+'_'+direction+'.svg',
     renderR164Elevation(candidate.compiled,candidate.design,direction));
  }
 }
 fs.mkdirSync(out);
 for(const [name,contents] of files)
  fs.writeFileSync(path.join(out,name),contents,{flag:'wx'});
 if(hash(fs.readFileSync(rawPath,'utf8'))!==comparison.originalRawSha256)
  fail('ORIGINAL_CHANGED_DURING_REVIEW');
 return {outputDirectory:out,original:rawPath,originalRawSha256:
  comparison.originalRawSha256,issues:comparison.originalProblems.length,
  issuesByCode:Object.fromEntries([...new Set(comparison.originalProblems.map(x=>x.code))]
   .map(code=>[code,comparison.originalProblems.filter(x=>x.code===code).length])),
  originalStrictFailure:comparison.originalStrictFailure,
  shadowStatus:comparison.shadowStatus,
  shadowGeometryVariants:analyzed.previews.length,
  shadowLayoutResults:comparison.shadowLayoutResults,
  lostModelArchitecturalInformation:comparison.originalAndShadowAreNotEquivalent,
  newModelCalls:0,worldWrites:0,art:'ART_HOLD'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=runR190OOffline(parseR190OArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error('R190O_HOLD',String(e?.message??e));process.exitCode=1;}
}
