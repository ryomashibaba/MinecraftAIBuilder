/**
 * V11 offline massing alternatives from ONE saved model answer.
 * Alternatives are HOST ART STUDIES, never attributed to the Qwen author.
 * Every candidate must pass the existing independent SOURCE functional gates.
 * No model POST, Minecraft world operations, original edits or public uploads.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveB143StaticReview} from './r125-static-art-review.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('V11_MASSING_ART_'+x);};
const cell=v=>v.slice(0,3).join(',');
const safeName=s=>/^[a-z][a-z0-9-]{2,39}$/.test(s);
const expr=(roof,side='none',depth=0,axis='x',facade='plain')=>({
 setbackSide:side,setbackDepth:depth,roofProfile:roof,roofAxis:axis,
 facadeLanguage:facade,...(roof==='flat'?{}:{roofVolume:'raised'})
});
/**
 * Only architectural alternatives: true volume changes or distinct pitched
 * roof families. Preserve rooms, access, equipment, materials and axes.
 */
export function proposeR125MassingForms(plan){
 if(!plan||!Array.isArray(plan.levels)||!plan.expression)
  fail('EXPLICIT_MODEL_EXPRESSION_REQUIRED');
 const two=plan.levels.length===2,w=plan.footprint.width,d=plan.footprint.depth;
 const choices=[];
 if(two&&w>=28)
  choices.push(['east-upper-retreat',expr('hip','east',6,'x')]);
 if(two&&d>=28)
  choices.push(['rear-upper-retreat',expr('sawtooth','rear',6,'x')]);
 if(two)
  choices.push(['street-upper-terrace',expr('hip','front',2,'z')]);
 if(plan.levels.at(-1).splitAxis==='x')
  choices.push(['raised-split-monitor',expr('split-monitor')]);
 choices.push(['hip-silhouette',expr('hip','none',0,'z')]);
 choices.push(['sawtooth-daylight-form',expr('sawtooth','none',0,'x')]);
 if(!two&&w>=24&&d>=24){
  choices.push(['open-air-u-court',{...expr('flat'),rearCourt:{
   width:6,depth:5,alignment:'center',entrySide:'west',access:'paved'}}]);
  choices.push(['front-l-court',{...expr('flat'),frontCornerCut:{
   width:5,depth:5,side:'west',access:'paved'}}]);
 }
 const duplicate=new Set();
 return choices.filter(([,e])=>{
  const key=JSON.stringify(e);
  if(duplicate.has(key)||key===JSON.stringify(plan.expression))return false;
  duplicate.add(key);return true;
 }).map(([name,expression])=>({name,expression}));
}
function compareVoxels(base,next,roofY){
 const before=new Map(base.primitives.map(v=>[cell(v),v[3]]));
 const after=new Map(next.primitives.map(v=>[cell(v),v[3]]));
 let changed=0,belowRoof=0,upperStory=0,added=0,removed=0;
 const keys=new Set([...before.keys(),...after.keys()]);
 for(const k of keys){
  const a=before.get(k),b=after.get(k);
  if(a===b)continue;
  changed++;
  if(a===undefined)added++;
  if(b===undefined)removed++;
  const y=Number(k.split(',')[1]);
  if(y<roofY)belowRoof++;
  if(y>=6&&y<roofY)upperStory++;
 }
 return {changedSolidOrMaterialCells:changed,belowRoofChangedCells:belowRoof,
  upperStoryChangedCells:upperStory,addedCells:added,removedCells:removed};
}
const sourceVerified=d=>d.sourceVerified===true&&
 d.worldWrites===0&&d.sourceDesign&&
 d.visitorCirculation&&!d.visitorCirculation.status.startsWith('HOLD_')&&
 d.explicitActivityProxy&&!d.explicitActivityProxy.status.startsWith('HOLD_')&&
 d.roomActivityProxy&&!d.roomActivityProxy.status.startsWith('HOLD_');
/** Nothing is saved or called until a plan and request are supplied. */
export function studyR125MassingFromOriginal(raw,{requestedBrief,maxVariants=3}={}){
 if(typeof raw!=='string'||raw.length>60000||raw.length<10||
    typeof requestedBrief!=='string'||requestedBrief.length<8||
    requestedBrief.length>8000||
    !Number.isInteger(maxVariants)||maxVariants<1||maxVariants>4)
  fail('ORIGINAL_BRIEF_OR_BUDGET');
 let original;try{original=JSON.parse(raw);}catch{fail('ORIGINAL_JSON');}
 if(!original?.expression||!Array.isArray(original?.levels))
  fail('MODEL_ARCHITECTURE_PLAN_REQUIRED');
 const untouched=JSON.stringify(original),originalSha256=hash(raw);
 const baseline=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief});
 if(!sourceVerified(baseline))fail('BASELINE_SOURCE_HOLD_'+baseline.status);
 const base=compileDesign(baseline.sourceDesign);
 if(!verifyCompiled(baseline.sourceDesign,base)||
    base.sourceSha256!==baseline.sourceSha256||
    base.geometrySha256!==baseline.geometrySha256)
  fail('BASELINE_B143_DRIFT');
 const roofY=1+5*original.levels.length;
 const candidateReports=[],eligible=[];
 for(const proposal of proposeR125MassingForms(original)){
  const alternative=structuredClone(original);
  alternative.expression=structuredClone(proposal.expression);
  // Check that no authored room/fixture/privacy decisions changed.
  if(JSON.stringify(alternative.levels)!==JSON.stringify(original.levels)||
     JSON.stringify(alternative.materials)!==JSON.stringify(original.materials)||
     alternative.entryZone!==original.entryZone)
   fail('AUTHOR_PROGRAM_DRIFT');
  const derived=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(alternative),
   {requestedBrief});
  if(!sourceVerified(derived)){
   candidateReports.push({name:proposal.name,status:'SOURCE_REJECTED',
    reason:derived.compilerReason??derived.status});continue;
  }
  const compiled=compileDesign(derived.sourceDesign);
  if(!verifyCompiled(derived.sourceDesign,compiled)||
     compiled.sourceSha256!==derived.sourceSha256||
     compiled.geometrySha256!==derived.geometrySha256||
     compiled.BuildPlan.operations.length!==0)
   fail('CANDIDATE_B143_DRIFT');
  const difference=compareVoxels(base,compiled,roofY);
  if(derived.geometrySha256===baseline.geometrySha256||
     difference.changedSolidOrMaterialCells<30){
   candidateReports.push({name:proposal.name,status:'NO_MEANINGFUL_GEOMETRY_DELTA',
    difference});continue;
  }
  eligible.push({name:proposal.name,diagnosis:derived,difference,
   expression:alternative.expression});
 }
 // Rank actual volume changes first; don't show three merely recolored roofs.
 eligible.sort((a,b)=>b.difference.belowRoofChangedCells-
   a.difference.belowRoofChangedCells||
   b.difference.changedSolidOrMaterialCells-
   a.difference.changedSolidOrMaterialCells);
 const selected=[],seen=new Set([baseline.geometrySha256]);
 for(const item of eligible){
  if(seen.has(item.diagnosis.geometrySha256))continue;
  seen.add(item.diagnosis.geometrySha256);
  if(selected.length<maxVariants)selected.push(item);
 }
 if(JSON.stringify(original)!==untouched||hash(raw)!==originalSha256)
  fail('ORIGINAL_MUTATED');
 return {schema:'mab-v11-derived-massing-art-study-v1',
  baseline:{name:'model-original-with-existing-stair-composition',
   status:baseline.status,sourceSha256:baseline.sourceSha256,
   geometrySha256:baseline.geometrySha256,
   authoredPlanSha256:baseline.authoredPlanSha256,
   structuralComposition:baseline.structuralComposition},
  selected,baselineDesign:baseline.sourceDesign,
  rejected:candidateReports,
  provenance:{originalSha256,originalEdited:false,
   alternativesOwner:'HOST_RESEARCH_NOT_QWEN',
   changedPlanKeys:['expression'],roomsAndFixturesPreserved:true,
   modelCalls:0,worldWrites:0,minecraftWalking:'NOT_TESTED',
   humanArt:'NOT_REVIEWED',sourcePassNotArtPass:true}};
}
const escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function saveR125MassingArtStudy({rawFile,briefFile,outDir,maxVariants=3}={}){
 if(!rawFile||!briefFile||!outDir)fail('REQUIRE_RAW_BRIEF_OUT');
 const input=path.resolve(rawFile),brief=path.resolve(briefFile),out=path.resolve(outDir);
 const parent=path.dirname(out);
 if(!fs.existsSync(input)||!fs.existsSync(brief)||!fs.existsSync(parent)||
    fs.existsSync(out)||!fs.statSync(input).isFile()||
    fs.statSync(input).size>60000||fs.statSync(brief).size>8000)
  fail('INPUT_OR_OUTPUT');
 const real=fs.realpathSync(parent);
 if(out===repo||out.startsWith(repo+path.sep)||
    real===repo||real.startsWith(repo+path.sep))
  fail('PUBLIC_REPOSITORY_OUTPUT_FORBIDDEN');
 const raw=fs.readFileSync(input,'utf8');
 const requestedBrief=fs.readFileSync(brief,'utf8').trim();
 const results=studyR125MassingFromOriginal(raw,{requestedBrief,maxVariants});
 const template=fs.readFileSync(path.join(repo,'source/ai/b143-viewer-template.html'),'utf8');
 const entries=[{name:'MODEL_BASELINE',
  design:results.baselineDesign,diagnosis:results.baseline},
  ...results.selected.map((x,i)=>({name:'HOST_'+(i+1)+'_'+x.name,
   design:x.diagnosis.sourceDesign,diagnosis:x.diagnosis,
   difference:x.difference,expression:x.expression}))];
 fs.mkdirSync(out);
 const rows=[];
 for(const entry of entries){
  if(!safeName(entry.name.toLowerCase().replace(/_/g,'-')))
   fail('UNSAFE_VARIANT_NAME');
  const folder=path.join(out,entry.name);
  fs.mkdirSync(folder);
  const source=path.join(folder,'B143_SOURCE_REVIEW_ONLY.json');
  fs.writeFileSync(source,JSON.stringify(entry.design,null,2)+'\n',{flag:'wx'});
  const rendered=saveB143StaticReview({sourcePath:source,
   outDir:path.join(folder,'ART_4_VIEWS')});
  const gallery=compileB143Gallery([entry.design]);
  if(gallery.sourceHashes[0]!==entry.diagnosis.sourceSha256||
     gallery.geometryHashes[0]!==entry.diagnosis.geometrySha256||
     rendered.sourceSha256!==entry.diagnosis.sourceSha256||
     rendered.geometrySha256!==entry.diagnosis.geometrySha256)
   fail('RENDER_HASH_OR_SOURCE_DRIFT');
  fs.writeFileSync(path.join(folder,'B143_INTERACTIVE_3D.html'),
   renderB143Html(gallery,template),{flag:'wx'});
  rows.push({name:entry.name,author:entry.name==='MODEL_BASELINE'?
   'GENUINE_QWEN_ORIGINAL_WITH_DECLARED_HOST_STAIR_COMPOSITION':
   'HOST_RESEARCH_ALTERNATIVE_NOT_QWEN',
   sourceVerified:true,sourceSha256:entry.diagnosis.sourceSha256,
   geometrySha256:entry.diagnosis.geometrySha256,
   ...(entry.difference?{difference:entry.difference}:{}),
   ...(entry.expression?{expression:entry.expression}:{}),
   image:entry.name+'/ART_4_VIEWS/CONTACT_4_VIEWS.png',
   viewer:entry.name+'/B143_INTERACTIVE_3D.html'});
 }
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>V11 SOURCE 建築立体比較</title><style>'+
  'body{margin:20px;background:#0d1623;color:#e7f4ff;font:16px system-ui}'+
  'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}'+
  'section{padding:14px;border:1px solid #38526b;border-radius:8px}'+
  'img{width:100%;height:auto}a{color:#9ed6ff}</style><h1>V11 建築形状の実体比較</h1>'+
  '<p>元Qwen設計と、HOSTが派生させた実験案を区別しています。'+
  '全画像はSOURCEのB143レンダーで、Minecraft実歩行とART採用は未検証です。</p><main>'+
  rows.map(r=>'<section><h2>'+escapeHtml(r.name)+'</h2><p>'+
   escapeHtml(r.author)+'</p><img src="'+escapeHtml(r.image)+
   '" alt="B143 four view"><p>実際の変更ボクセル数: '+
   escapeHtml(r.difference?.changedSolidOrMaterialCells??'基準')+
   '</p><a href="'+escapeHtml(r.viewer)+'">3Dで確認</a></section>').join('')+
  '</main></html>';
 fs.writeFileSync(path.join(out,'ART_COMPARE.html'),html,{flag:'wx'});
 const report={schema:results.schema,baseline:results.baseline,
  variants:rows,rejected:results.rejected,provenance:results.provenance,
  requestedBriefSha256:hash(requestedBrief),inputSourceReadOnly:true,
  generatedAt:'OFFLINE_NO_REMOTE_TIME_AUTHORITY'};
 fs.writeFileSync(path.join(out,'ART_STUDY.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(hash(fs.readFileSync(input,'utf8'))!==results.provenance.originalSha256)
  fail('ORIGINAL_FILE_CHANGED');
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==6||argv[0]!=='--raw'||argv[2]!=='--brief-file'||
     argv[4]!=='--out')fail('CLI_RAW_BRIEF_FILE_OUT');
  const r=saveR125MassingArtStudy({rawFile:argv[1],
   briefFile:argv[3],outDir:argv[5]});
  console.log('V11_MASSING_ART_SOURCE_ONLY',JSON.stringify({
   baseline:r.baseline.status,alternatives:r.variants.length-1,
   rejected:r.rejected.length,output:path.resolve(argv[5]),
   modelCalls:0,worldWrites:0,art:'NOT_REVIEWED'}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
