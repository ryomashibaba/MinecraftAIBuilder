/** R190-BO: reuse ONE frozen local preflight (no re-prepare and no second model).
 * Explicit SHA+nonce authorization is mandatory for the only provider POST.
 * GitHub/MC writes are intentionally absent. Raw evidence remains local.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectBO,runBO} from './r190bo-spatial-local.mjs';
import {postLocalOllama} from './r190bo-local-http.mjs';
import {reviewR190CDBOCapture} from './r190cd-bo-capture-review.mjs';
import {renderR190CE} from './r190ce-offline-visual-evidence.mjs';

const fail=s=>{throw Error('R190BO_STAGED_'+s)};
const save=(dir,name,v)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});

export function inspectOneModel(prepared){
 const {p,attemptConsumed}=inspectBO(prepared);
 return {model:p.model,briefSha256:p.briefSha256,requestSha256:p.requestSha256,
  nonce:p.approvalNonce,sourcePinsVerified:true,think:p.think,schemaPrompt:p.schemaPrompt,
  maxTokens:JSON.parse(fs.readFileSync(path.join(prepared,'EXACT_REQUEST.json'),'utf8')).options.num_predict,
  attemptConsumed,approvalGranted:false,modelCalls:0,worldWrites:0,
  next:'SEPARATE_EXPLICIT_HUMAN_APPROVAL_REQUIRED'};
}

export async function runOneModel({prepared,approval,out},{transport=postLocalOllama}={}){
 const checked=inspectOneModel(prepared);
 if(checked.attemptConsumed)fail('ATTEMPT_ALREADY_CONSUMED');
 const {p}=inspectBO(prepared);
 if(typeof approval!=='string'||approval!==p.approvalPhrase)fail('NEW_EXACT_APPROVAL_REQUIRED');
 if(typeof out!=='string'||!out||fs.existsSync(out))fail('FRESH_OUTPUT_REQUIRED');
 const root=path.resolve(out);
 if(!fs.existsSync(path.dirname(root)))fail('OUTPUT_PARENT_MISSING');
 fs.mkdirSync(root);
 const capture=path.join(root,'capture'),cd=path.join(root,'cd'),visual=path.join(root,'visual');
 const report={schema:'minecraftaibuilder-r190bo-one-model-v1',
  source:'EXISTING_EXACT_PREFLIGHT_NOT_RECREATED',model:checked.model,
  briefSha256:checked.briefSha256,requestSha256:checked.requestSha256,
  thinking:checked.think,schemaPrompt:checked.schemaPrompt,maxTokens:checked.maxTokens,
  providerPostAttempts:0,automaticRetries:0,sourcePinsVerified:true,
  boStatus:'NOT_RUN',cdStatus:'NOT_RUN',ceStatus:'NOT_RUN',
  nextModel:'NOT_RUN_SEPARATE_DECISION_REQUIRED',
  originalResponseKeptLocal:true,gitHubUpload:false,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},art:'ART_HOLD',officialArtAdoptions:0};
 try{
  // BO verifies the exact immutable request again; consumes its nonce before POST.
  const result=await runBO({prepared,approval,out:capture},{transport});
  report.providerPostAttempts=result.requestCount??1;
  report.boStatus=result.status??'HOLD';
  if(fs.existsSync(path.join(capture,'CAPTURE.json'))){
   try{
    const reviewed=reviewR190CDBOCapture({capture,out:cd});
    report.cdStatus=reviewed.status;
    if(fs.existsSync(path.join(cd,'DERIVED_VOXELS.json'))&&
       fs.existsSync(path.join(cd,'CD_SCORECARD.json'))){
      try{
       const gallery=renderR190CE({reviewDir:cd,out:visual});
       report.ceStatus=gallery.images.length===8?'EIGHT_VIEWS_ART_HOLD':'HOLD_INCOMPLETE_VIEWS';
      }catch(error){
       report.ceStatus='HOLD_VISUAL_PROCESSING_ERROR';
       report.visualError=String(error.message);
      }
    }else report.ceStatus='NOT_RUN_NO_VERIFIED_VOXELS';
   }catch(error){
    report.cdStatus='HOLD_EVIDENCE_VALIDATION_ERROR';
    report.cdError=String(error.message);
   }
  }else{
   report.cdStatus='NOT_RUN_NO_BO_CAPTURE';
   report.ceStatus='NOT_RUN_NO_BO_CAPTURE';
  }
 }catch(error){
  report.boStatus='HOLD_EXECUTION_EXCEPTION';
  report.executionError=String(error.message);
  report.providerPostAttempts=fs.existsSync(path.join(prepared,'ATTEMPT_CONSUMED.json'))?1:0;
 }
 report.reviewable3D=report.ceStatus==='EIGHT_VIEWS_ART_HOLD';
 report.realModelArtSuccess='NOT_CERTIFIED';
 report.nextAction=report.reviewable3D?'HUMAN_ART_AND_FUNCTION_REVIEW_BEFORE_GEMMA':
  'INSPECT_QWEN_HOLD_AND_REDESIGN_BEFORE_GEMMA';
 save(root,'RESULT_SUMMARY.json',report);
 return report;
}

export async function cliStaged(argv){
 const [mode,...args]=argv;
 if(!['inspect','run'].includes(mode)||args.length%2)fail('CLI_USAGE');
 const options={};
 for(let i=0;i<args.length;i+=2){
  if(!['--prepared','--approval','--out'].includes(args[i])||
   Object.hasOwn(options,args[i])||!args[i+1])fail('CLI_FLAGS');
  options[args[i]]=args[i+1];
 }
 if(!options['--prepared'])fail('PREPARED_REQUIRED');
 if(mode==='inspect'){
  if(options['--approval']||options['--out'])fail('INSPECT_IS_READ_ONLY');
  return inspectOneModel(options['--prepared']);
 }
 if(!options['--approval']||!options['--out'])fail('EXACT_APPROVAL_AND_OUTPUT_REQUIRED');
 return runOneModel({prepared:options['--prepared'],approval:options['--approval'],out:options['--out']});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await cliStaged(process.argv.slice(2));console.log(JSON.stringify(r,null,2));}
 catch(error){console.error(String(error.message));process.exitCode=1;}
}
