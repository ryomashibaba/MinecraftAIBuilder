/**
 * R190-Q: POST-HOC independent program QA of an unchanged R190-H/I direct
 * B143 model response. No provider calls, Minecraft I/O, repair, or re-design.
 * The reviewer writes a separate contract pinned to the already saved source.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const refuse=msg=>{throw Error('R190Q_'+msg);};
export function reviewSavedR190QDirect({rawFile,contractFile,out}={}){
 if(![rawFile,contractFile,out].every(x=>typeof x==='string'&&x.length>0))
  refuse('EXPLICIT_PATHS_REQUIRED');
 const target=path.resolve(out);
 if(fs.existsSync(target))refuse('REFUSE_EXISTING_OUTPUT');
 if(!fs.existsSync(path.dirname(target)))refuse('OUTPUT_PARENT_MISSING');
 const rawPath=path.resolve(rawFile),contractPath=path.resolve(contractFile);
 if(rawPath===contractPath||target===rawPath||target===contractPath)
  refuse('INPUT_OUTPUT_CONFLICT');
 const readBounded=(p,limit)=>{
  const stat=fs.statSync(p);
  if(!stat.isFile()||stat.size<1||stat.size>limit)refuse('INPUT_FILE_SIZE');
  return fs.readFileSync(p,'utf8');
 };
 const raw=readBounded(rawPath,120000);
 const contractBytes=readBounded(contractPath,50000);
 const base={schema:'minecraftaibuilder-r190q-offline-independent-review-v1',
  provenance:'SAVED_SUPPLIED_TEXT_ORIGINAL_UNMODIFIED_PROVIDER_UNVERIFIED',
  independentReviewerContract:'CLAIMED_INDEPENDENT_REVIEW_DRAFT_UNVERIFIED',
  originalRawSha256:digest(raw),independentContractSha256:digest(contractBytes),
  actualLocalModelCalls:0,sourceOnly:true,
  hostDesignedOrRepairedGeometry:false,humanArtReview:'ART_HOLD',
  realMinecraftWalking:'NOT_TESTED',...safety()};
 let result;
 let previewFiles=[];
 try{
  const contract=JSON.parse(contractBytes);
  if(contract?.authorship!=='INDEPENDENT_REVIEW_DRAFT')
   refuse('INDEPENDENT_CONTRACT_REQUIRED');
  const review=reviewR4PlannedProposal(raw,{independentContract:contract});
  // Preview is the model-declared ORIGINAL B143, even when a functional
  // constraint fails. A valid source is not an approved building.
  const gallery=compileB143Gallery([review.design]);
  if(gallery.sourceHashes[0]!==review.compiled.sourceSha256||
     gallery.geometryHashes[0]!==review.compiled.geometrySha256)
   refuse('PREVIEW_SOURCE_MISMATCH');
  const template=fs.readFileSync(path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../source/ai/b143-viewer-template.html'),'utf8');
  previewFiles=[
   ['R190Q_ORIGINAL_DIRECT_B143_3D.html',renderB143Html(gallery,template)],
   ['R190Q_ORIGINAL_DIRECT_B143.json',JSON.stringify(review.design,null,2)+'\n'],
   ...['front','rear','west','east','roof'].map(side=>[
    'R190Q_ORIGINAL_DIRECT_'+side.toUpperCase()+'.svg',
    renderR164Elevation(review.compiled,review.design,side)])
  ];
  result={...base,status:review.status,
   originalModelAuthoredB143Preview:true,
   previewMeansArtApproval:false,
   previewSourceSha256:review.compiled.sourceSha256,
   originalModelDeclaredReview:review.declaredPlanReview,
   independentReview:review.independentReview,
   b143SourceSha256:review.compiled.sourceSha256,
   b143GeometrySha256:review.compiled.geometrySha256,
   modeledProgramAuthorship:'MODEL_DECLARED_UNVERIFIED',
   independentNaturalLanguageCoverageCertified:false,
   noClaimOfAestheticAcceptance:true};
 }catch(e){
  // Preserve a failed provider response's original bytes in place. Nothing
  // is auto-normalized, re-sampled, or used to manufacture a passing model.
  result={...base,originalModelAuthoredB143Preview:false,
   status:'HOLD_ORIGINAL_OR_INDEPENDENT_REVIEW_INVALID',
   failureReason:String(e?.message??e).slice(0,240),
   independentNaturalLanguageCoverageCertified:false,
   noClaimOfAestheticAcceptance:true};
 }
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(target,'R190Q_OFFLINE_INDEPENDENT_REVIEW.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 for(const [name,contents] of previewFiles)
  fs.writeFileSync(path.join(target,name),contents,{flag:'wx'});
 if(digest(fs.readFileSync(rawPath,'utf8'))!==base.originalRawSha256)
  refuse('ORIGINAL_CHANGED_DURING_REVIEW');
 return {outputDirectory:target,...result};
}
function parse(args){
 if(args.length!==6)refuse('USAGE_--raw_FILE_--contract_FILE_--out_DIR');
 const options={};
 for(let i=0;i<args.length;i+=2){
  const key={'--raw':'rawFile','--contract':'contractFile','--out':'out'}[args[i]];
  if(!key||Object.hasOwn(options,key))refuse('UNKNOWN_OR_DUPLICATE_FLAG');
  options[key]=args[i+1];
 }
 return options;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const result=reviewSavedR190QDirect(parse(process.argv.slice(2)));
  console.log(JSON.stringify({status:result.status,outputDirectory:result.outputDirectory}));
  if(result.status!=='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS')
   process.exitCode=1;
 }catch(e){console.error('R190Q_HOLD',String(e?.message??e));process.exitCode=1;}
}
