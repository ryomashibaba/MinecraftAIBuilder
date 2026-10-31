/**
 * E2 offline source artifact handoff. CALLER-SUPPLIED plan, NO model calls,
 * NO B143 edits, NO MakeCode export, NO Minecraft contact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileE2Architecture} from '../source/ai/r190-e2-architecture.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(path.dirname(root),'MinecraftAIBuilder-E1-Outputs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const write=(dir,name,body)=>fs.writeFileSync(path.join(dir,name),
 typeof body==='string'?body:JSON.stringify(body,null,2)+'\n',{flag:'wx'});
export function runE2SavedSource({
 planFile,outRoot=OUT,templateFile=path.join(root,'source/ai/b143-viewer-template.html')
}={}){
 if(typeof planFile!=='string'||!path.isAbsolute(planFile)||
  !fs.statSync(planFile).isFile())throw Error('E2_STUDY_ABSOLUTE_EXISTING_PLAN_REQUIRED');
 const original=fs.readFileSync(planFile,'utf8');
 if(original.length>150000)throw Error('E2_STUDY_PLAN_BYTES');
 let plan;
 try{plan=JSON.parse(original);}catch(e){throw Error('E2_STUDY_INVALID_JSON_'+String(e?.message??e).slice(0,150));}
 fs.mkdirSync(outRoot,{recursive:true});
 const dir=fs.mkdtempSync(path.join(path.resolve(outRoot),'E2-source-'));
 const report={schema:'minecraftaibuilder-e2-source-study-report-v1',
  inputFile:planFile,authorOriginalSha256:sha(original),
  provenance:'CALLER_SUPPLIED_UNVERIFIED_NOT_MODEL_PROVEN',
  status:'SOURCE_HOLD',sourceReady:false,worldWrites:0,worldContacts:0,
  constructionApproved:false,makecodeExported:false,modelRequests:0,
  humanArt:'NOT_REVIEWED',minecraftPlayerWalking:'NOT_TESTED'};
 write(dir,'MODEL_OR_CALLER_SOURCE_ORIGINAL.txt',original);
 try{
  const result=compileE2Architecture(plan);
  const gallery=compileB143Gallery([result.design]);
  const template=fs.readFileSync(templateFile,'utf8');
  const html=renderB143Html(gallery,template);
  if(result.sourceReady!==true||result.worldWrites!==0)
   throw Error('E2_STUDY_SOURCE_INVARIANT');
  write(dir,'E2_SOURCE_PLAN.json',result.plan);
  write(dir,'B143_SOURCE.json',result.design);
  write(dir,'B143_SCENE.json',result.scene);
  write(dir,'E2_SOURCE_AUDIT.json',result.audit);
  write(dir,'index.html',html);
  report.status='SOURCE_READY_ART_HOLD';
  report.sourceReady=true;
  report.geometrySha256=result.scene.geometrySha256;
  report.sourceSha256=result.scene.sourceSha256;
  report.sourceVoxelCount=result.scene.primitives.length;
  report.programSpaces=result.audit.spaces.length;
  report.glazedOpenings=result.audit.glazing.length;
 }catch(e){report.reason=String(e?.message??e).slice(0,500);}
 write(dir,'E2_SOURCE_REPORT.json',report);
 return {dir,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3){
  console.error('Usage: node scripts/r190-e2-offline-source.mjs C:\\ABSOLUTE\\MODEL_AUTHORED_E2_PLAN.json');
  process.exitCode=2;
 }else{
  try{
   const result=runE2SavedSource({planFile:path.resolve(process.argv[2])});
   console.log('E2 source report saved: '+path.join(result.dir,'E2_SOURCE_REPORT.json'));
   console.log('E2 status: '+result.status+'; model requests=0; world writes=0');
   const opened=openE1ResultFolder(path.join(result.dir,'E2_SOURCE_REPORT.json'));
   if(opened.attempted)console.log('E2 result folder opening: '+opened.folder);
   if(!result.sourceReady)process.exitCode=2;
  }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
 }
}
