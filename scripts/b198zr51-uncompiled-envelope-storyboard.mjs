/**
 * R51 — offline storyboard of authored shape BOUNDING ENVELOPES.
 *
 * Unlike R7, this still works if strict B143 compilation fails. All
 * silhouettes here are projections of shape envelopes, NOT the final
 * voxels, real room emptiness, real stairs, actual navigable routes, or
 * built structures. This never repairs/replaces the model original.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectR49GlobalConsistency,localEnvelope}
 from '../source/ai/b198zr49-global-source-consistency.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';

export const SCHEMA='minecraftaibuilder-b198zr51-uncompiled-envelope-storyboard-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR51_'+s)};
const vec=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isSafeInteger);
const safety=()=>({readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const template=new URL('../source/ai/b198zr51-uncompiled-storyboard-template.html',import.meta.url);

export function createR51EnvelopeStoryboard(raw,{caseId='c01'}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000)
  fail('RAW_REQUIRED_UP_TO_120KB');
 const frozen=CREATION_CASES.find(x=>x.id===caseId);
 if(!frozen)fail('FROZEN_CREATION_CASE_REQUIRED');
 const diagnostic=inspectR49GlobalConsistency(raw);
 let parsed;
 try{parsed=JSON.parse(raw)}catch{parsed=null}
 const design=parsed?.design??{};
 const b=design.bounds??{};
 const bounds=['width','height','depth'].map(x=>
  Number.isSafeInteger(b[x])&&b[x]>0&&b[x]<=128?b[x]:1);
 const violations=new Set(
  (diagnostic.elementBoundsViolations??[]).map(x=>x.index));
 const elements=(Array.isArray(design.elements)?design.elements:[])
  .slice(0,160).map((e,i)=>({
   index:i,id:String(e?.id??'unknown').slice(0,100),
   mode:e?.mode==='add'||e?.mode==='cut'?e.mode:'unknown',
   shape:String(e?.shape??'unknown').slice(0,50),
   envelope:localEnvelope(e),violated:violations.has(i)
  }));
 const plan=parsed?.spatialPlan??{};
 const voids=(Array.isArray(plan.protectedVoids)?plan.protectedVoids:[])
  .slice(0,24).map(x=>({
   id:String(x?.id??'?').slice(0,100),
   origin:vec(x?.origin)?x.origin:null,
   size:vec(x?.size)&&x.size.every(n=>n>0)?x.size:null
  }));
 const entrance=vec(plan.entrance)?plan.entrance:null;
 const points=[
  ...(entrance?[{kind:'entrance',id:'entrance',point:entrance}]:[]),
  ...(Array.isArray(plan.destinations)?plan.destinations:[])
   .slice(0,48).filter(x=>vec(x?.point)).map(x=>({
    kind:'destination',id:String(x.id??'?').slice(0,100),point:x.point
   }))
 ];
 const info={sha:sha(raw),bounds,elements,voids,entrance,points,
  brief:frozen.prompt,criteria:frozen.criteria.map(x=>({
   id:x.id,description:x.description
  })),diagnostic};
 const manifest={
  schema:SCHEMA,caseId,originalRawSha256:sha(raw),
  originalBytes:Buffer.byteLength(raw),
  storyboardKind:'2D_SHAPE_ENVELOPES_NOT_FINAL_VOXELS',
  elementEnvelopesCount:elements.filter(x=>x.envelope!==null).length,
  failedElementEnvelopesCount:elements.filter(x=>x.violated).length,
  diagnosticStatus:diagnostic.status,
  B143FinalVoxelEvidenceProvided:false,
  no3DModelCertification:true,noActualWalkabilityCertification:true,
  noArchitecturalAestheticScore:true,
  humanSemanticAndVisualReviewRequired:true,
  originalRawUnmodified:true,noAutoRepair:true,
  noModelRequests:true,noExternalNetwork:true,
  modelCalls:0,worldContacts:0,worldWrites:0,safety:safety()
 };
 // The original may contain malicious strings like </script><img>.
 // Escape HTML-breaking characters in embedded JSON; consume via
 // JS object literal only, never innerHTML. All labels use textContent.
 const serial=JSON.stringify(info).replaceAll('<','\\u003c')
  .replaceAll('>','\\u003e').replaceAll('&','\\u0026')
  .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const html=fs.readFileSync(template,'utf8')
  .replace('__R51_STORYBOARD_DATA__',serial);
 if(html.includes('__R51_STORYBOARD_DATA__')||
  html.includes('</script><img'))fail('UNSAFE_EMBEDDED_TEMPLATE');
 return {html,manifest};
}

/** Output must be a brand-new folder; source folder is never overwritten. */
export function writeR51EnvelopeStoryboard({raw,destination,caseId='c01'}={}){
 if(typeof destination!=='string'||!destination.trim())
  fail('OUTPUT_DIRECTORY_REQUIRED');
 const dir=path.resolve(destination),parent=path.dirname(dir);
 if(fs.existsSync(dir)||!fs.existsSync(parent)||
  !fs.statSync(parent).isDirectory())fail('OUTPUT_MUST_BE_NEW_DIRECTORY');
 const result=createR51EnvelopeStoryboard(raw,{caseId});
 fs.mkdirSync(dir,{recursive:false});
 fs.writeFileSync(path.join(dir,'R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),
  result.html,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'R51_SCHEMATIC_PROVENANCE.json'),
  JSON.stringify(result.manifest,null,2)+'\n',{flag:'wx'});
 return {status:'SOURCE_ENVELOPES_ONLY_NOT_B143_FINAL_GEOMETRY',
  outputFolder:dir,files:[
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html',
   'R51_SCHEMATIC_PROVENANCE.json'
  ],originalRawSha256:result.manifest.originalRawSha256,
  modelCalls:0,worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==4||a[0]!=='--raw-file'||a[2]!=='--out')
   fail('CLI_USAGE_RAW_FILE_AND_NEW_OUTPUT_DIR');
  const input=path.resolve(a[1]);
  if(!fs.existsSync(input))fail('INPUT_FILE_NOT_FOUND');
  const stat=fs.statSync(input);
  if(!stat.isFile()||stat.size<1||stat.size>120000)
   fail('RAW_FILE_SIZE_OR_TYPE');
  const result=writeR51EnvelopeStoryboard({
   raw:fs.readFileSync(input,'utf8'),destination:a[3]});
  console.log('R51_OFFLINE_ONLY',JSON.stringify(result));
 }catch(e){
  console.error('R51_HOLD',String(e?.message??e).slice(0,180));
  process.exitCode=1;
 }
}
