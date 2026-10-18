/**
 * B198X OFFLINE: validated human review file + original B143 source and B198W
 * dossier -> one self-contained revision planning bundle. ZERO LLM calls.
 * Input folder can be an unpacked SourceProbe ZIP or offline review folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB198XRevisionBrief,renderB198XRevisionMarkdown}
 from '../source/ai/b198x-quality-revision-brief.mjs';

const ERR=s=>{throw Error('B198X_OFFLINE_'+s)};
const yes=(x,s)=>{if(!x)ERR(s)};
const exact=new Set(['--folder','--review','--out','--protect','--max-priorities']);
const readJson=(filepath,max)=>{
 yes(fs.existsSync(filepath)&&fs.statSync(filepath).isFile()&&
  fs.statSync(filepath).size>0&&fs.statSync(filepath).size<=max,
  'MISSING_OR_OVERSIZED_INPUT_'+path.basename(filepath));
 return JSON.parse(fs.readFileSync(filepath,'utf8'));
};
export function parseB198XArgs(args=[]){
 const values={};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  yes(exact.has(key)&&!Object.hasOwn(values,key),'UNKNOWN_OR_DUPLICATE_FLAG');
  const v=args[++i];
  yes(typeof v==='string'&&v.length>0&&!v.startsWith('--'),
   'MISSING_FLAG_VALUE');
  values[key]=v;
 }
 yes(values['--folder']&&values['--review']&&values['--out'],
  'FOLDER_REVIEW_OUTPUT_REQUIRED');
 const n=values['--max-priorities']??'2';
 yes(/^[1-4]$/.test(n),'MAX_PRIORITY_1_TO_4');
 const protection=values['--protect']===undefined?null:
  values['--protect'].split(',');
 return {sourceFolder:path.resolve(values['--folder']),
  reviewPath:path.resolve(values['--review']),
  outDir:path.resolve(values['--out']),
  protectedElementIds:protection,maxPriorities:Number(n)};
}
export function runB198XOfflineRevision({
 sourceFolder,reviewPath,outDir,protectedElementIds=null,maxPriorities=2
}={}){
 yes(typeof sourceFolder==='string'&&typeof reviewPath==='string'&&
  typeof outDir==='string','PATH_ARGS_REQUIRED');
 const source=path.resolve(sourceFolder),out=path.resolve(outDir);
 yes(fs.existsSync(source)&&fs.statSync(source).isDirectory(),
  'INPUT_SOURCE_FOLDER_MISSING');
 yes(!fs.existsSync(out)&&fs.existsSync(path.dirname(out)),
  'REFUSE_EXISTING_OUTPUT_OR_MISSING_PARENT');
 const find=names=>names.map(n=>path.join(source,n))
  .find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
 const designPath=find(['c01_source-design.json','source-design.json']);
 const evidencePath=find(['c01_B198W_SOURCE_QUALITY_EVIDENCE.json',
  'B198W_SOURCE_QUALITY_EVIDENCE.json']);
 yes(designPath!==undefined&&evidencePath!==undefined,
  'B143_DESIGN_AND_B198W_DOSSIER_BOTH_REQUIRED');
 const design=readJson(designPath,300000);
 const dossier=readJson(evidencePath,120000);
 const review=readJson(path.resolve(reviewPath),40000);
 const brief=createB198XRevisionBrief({
  design,dossier,review,protectedElementIds,maxPriorities
 });
 const md=renderB198XRevisionMarkdown(brief);
 // Source reading/validation completes BEFORE creating destination.
 fs.mkdirSync(out);
 const write=(name,content)=>fs.writeFileSync(path.join(out,name),
  content,{flag:'wx'});
 const json=x=>JSON.stringify(x,null,2)+'\n';
 write('B198X_REVIEWED_REVISION_BRIEF.json',json(brief));
 write('B198X_REVIEWED_REVISION_BRIEF.md',md);
 write('B198X_ORIGINAL_B143_SOURCE.json',json(design));
 write('B198X_INDEPENDENT_B198W_DOSSIER.json',json(dossier));
 write('B198X_HUMAN_RATING_SOURCE.json',json(review));
 const summary={
  schema:'minecraftaibuilder-b198x-offline-planning-summary-v1',
  status:brief.status,baseSourceSha256:brief.baseSourceSha256,
  capturedHumanRatingRatio:brief.humanRatingRatio,
  lowRatedPriorities:brief.topHumanRevisionPriorities.length,
  sourceGeometryRiskHints:brief.objectiveSourceRiskHints.length,
  humanProtectionSelectionRequired:brief.protectedOriginalAddElementIds.length===0,
  selectedProtectedParts:brief.protectedOriginalAddElementIds.length,
  protectionImportedFromOriginalHumanReview:brief.humanSourceProtectionSelectedFromSameRatingJSON,
  offlineBundleFileCount:5,
  realModelRequestsMade:0,modelRevisionNotAttempted:true,
  actualArchitectureQualityNotCertified:true,
  sourceOnly:true,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  gates:Array(9).fill('BLOCKED')
 };
 write('B198X_RUN_SUMMARY.json',json(summary));
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const output=runB198XOfflineRevision(parseB198XArgs(process.argv.slice(2)));
  console.log('B198X_OFFLINE_REVIEW_TO_REVISION_FINISHED',JSON.stringify(output));
 }catch(e){
  console.error('B198X_OFFLINE_REVISION_HOLD',
   String(e?.message??e).slice(0,300));process.exitCode=1;
 }
}
