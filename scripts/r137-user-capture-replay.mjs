/**
 * R137 source-only offline replay from 2026-10-25 user-provided
 * REAL qwen3:14b Ollama answers. These are saved original RAW replies;
 * absolutely NO new model calls or Minecraft world accesses.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {CASES} from './r136-local-evidence.mjs';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {parseR135FreshFurnishedReply} from './r135-furnished-program.mjs';
import {recoverR137Furnished} from './r137-bounded-recovery.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ARCHIVE='scripts/fixtures/r136-user-qwen14b-20261025.json.gz';
const fail=s=>{throw Error('R137_REPLAY_'+s);};
const sha=x=>createHash('sha256').update(x).digest('hex');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function readR137SavedRealQwenCapture(){
 const compressed=fs.readFileSync(path.join(ROOT,ARCHIVE));
 if(compressed.length>10000)fail('CAPTURE_TOO_LARGE');
 let content;
 try{content=JSON.parse(gunzipSync(compressed).toString('utf8'));}
 catch{fail('CAPTURE_NOT_READABLE');}
 if(!Array.isArray(content.cases)||content.cases.length!==3)
  fail('CAPTURE_CASE_COUNT');
 const expected=[
  '9950a46d78ba82d234c4ac55ddcd02c0bd64c6ac19ad1dfcf18003ff9221fd2d',
  'd535db0e502ab75d52bad2bd652fa72dd98beb7dc73b4622ee7c8ba0eaf38a8c',
  'cf8770d1eee143b0894f6f4851ad4bdbc3aecaf5ceba9b25593db9d398fbf7b5'
 ];
 for(let i=0;i<3;i++){
  const row=content.cases[i];
  if(row?.case!==CASES[i].id||typeof row.raw!=='string'||
   row.raw_sha256!==expected[i]||sha(row.raw)!==expected[i])
   fail('RAW_ORIGINAL_SHA_MISMATCH_'+i);
 }
 return content;
}
function page(records){
 const cards=records.map(x=>'<section><h2>'+escape(x.case)+'</h2>'+
  '<p>'+x.originalModelRoomCount+' model-proposed rooms, '+
  x.equipmentCount+' model-selected physical equipment</p>'+
  '<p>HOST corrections: '+x.hostRepairActions.length+
  ' / model original SHA '+x.originalModelRawSha256.slice(0,12)+'</p>'+
  '<div class="compare"><div>修復後の建物外殻'+
  '<iframe loading="lazy" src="'+x.case+'/shell.html" title="base"></iframe></div>'+
  '<div>設備まで含む実3D'+
  '<iframe loading="lazy" src="'+x.case+'/furnished.html" title="furnished"></iframe></div>'+
  '</div></section>').join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R137 real saved Ollama reply -> host-derived real B143 3D</title>'+
  '<style>body{font:14px/1.7 system-ui;background:#0a1726;color:#eff7ff;'+
  'margin:0;padding:20px}.cards{display:grid;gap:16px}.compare{display:grid;'+
  'grid-template-columns:repeat(2,minmax(250px,1fr));gap:12px}section{'+
  'padding:14px;background:#1d2d42;border:1px solid #37516c;border-radius:12px}'+
  'iframe{height:440px;width:100%;border:1px solid #58758a}'+
  '@media(max-width:700px){.compare{grid-template-columns:1fr}}</style>'+
  '<h1>R137｜ユーザー実Qwen14Bの3案を修正後に実体3D化</h1>'+
  '<p>再推論0回。モデル生回答はハッシュ固定で保存。屋根素材の明白な誤指定と'+
  '敷地内での最小限の間取り拡張だけをホスト側で修正した派生案。'+
  'モデルの元回答そのままでコンパイルできたという証拠ではありません。'+
  'Minecraft施工・実機歩行・美術品質は未認証。</p>'+
  '<main class="cards">'+cards+'</main>'+
  '<a style="color:#9cdfff" href="R137_EVIDENCE.json">'+
  'モデル由来とホスト補正を分離した証拠JSON</a></html>';
}
export function buildR137UserCaptureReplay(){
 const capture=readR137SavedRealQwenCapture();
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const pages=[],records=[];
 for(const [i,item] of capture.cases.entries()){
  const request=makeR134FreshRequest({brief:CASES[i].brief});
  const recovered=recoverR137Furnished({
   raw:item.raw,request,build:parseR135FreshFurnishedReply});
  const {base,featured}=recovered.result;
  const dir=CASES[i].id;
  pages.push({file:dir+'/shell.html',html:renderB143Html(
   compileB143Gallery([base.design]),template)});
  pages.push({file:dir+'/furnished.html',html:renderB143Html(
   compileB143Gallery([featured.design]),template)});
  pages.push({file:dir+'/MODEL_RAW_ORIGINAL.txt',html:item.raw});
  pages.push({file:dir+'/DERIVED_IR.json',
   html:JSON.stringify(recovered.derivedReply,null,2)+'\n'});
  pages.push({file:dir+'/RECOVERY_PROVENANCE.json',
   html:JSON.stringify(recovered.evidence,null,2)+'\n'});
  const record={
   case:dir,
   originalModel:'qwen3:14b',
   provenance:'USER_LOCAL_OLLAMA_QWEN3_14B_SAVED_RAW_PROVIDER_NOT_INDEPENDENTLY_AUTHENTICATED',
   originalModelRawSha256:item.raw_sha256,
   originalModelRoomCount:JSON.parse(item.raw).layout.spaces.length,
   originalSourceCompile:'HOLD_R134_MULTIZONE_PLAN_CONTRACT',
   hostRepairActions:recovered.evidence.repairActions,
   derivedPlanSha256:base.planSha256,
   originalProposedFootprint:JSON.parse(item.raw).footprint,
   derivedFootprint:recovered.derivedReply.footprint,
   originalProposedRoofMaterial:JSON.parse(item.raw).materials.roof,
   derivedRoofMaterial:recovered.derivedReply.materials.roof,
   equipmentCount:featured.placements.length,
   assembledSourceVoxelCount:featured.compiled.primitives.length,
   equipmentAddedVoxels:featured.addedVoxelCount,
   sourceSha256:featured.sourceSha256,
   geometrySha256:featured.geometrySha256,
   sourceRoutes:featured.sourceRouteAudit.status,
   modelCallsDuringReplay:0,worldWrites:0,artApproved:false
  };
  records.push(record);
 }
 pages.unshift({file:'index.html',html:page(records)});
 return {schema:'r137-captured-real-qwen14b-source-replay-v1',
  records,pages,
  modelCallsDuringReplay:0,actualModelCallsInOriginalUserRun:3,
  originalRawSourceSha256Verified:true,
  allGeometryHostDerived:true,
  noClaimOfUnmodifiedModelOutputCompiling:true,
  aestheticReview:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  modelScale:'QWEN3_14B_NOT_SMALL_2B_MAC_PROOF',
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0};
}
export function saveR137UserCaptureReplay(out){
 if(typeof out!=='string'||!out.trim())fail('OUTPUT_REQUIRED');
 const folder=path.resolve(out);
 if(fs.existsSync(folder))fail('NO_OVERWRITE');
 const data=buildR137UserCaptureReplay();
 fs.mkdirSync(folder,{recursive:false});
 for(const item of data.pages){
  const dest=path.join(folder,item.file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,item.html,{flag:'wx'});
 }
 fs.writeFileSync(path.join(folder,'R137_EVIDENCE.json'),
  JSON.stringify({...data,pages:data.pages.map(x=>x.file)},null,2)+'\n',
  {flag:'wx'});
 return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('CLI');
  const r=saveR137UserCaptureReplay(args[1]);
  console.log(JSON.stringify({status:'REAL_CAPTURE_BOUNDED_DERIVATIVES_BUILT',
   scenes:r.records.length*2,
   repairs:r.records.map(x=>x.hostRepairActions),
   rooms:r.records.map(x=>x.originalModelRoomCount),
   furniture:r.records.map(x=>x.equipmentCount),
   voxelCounts:r.records.map(x=>x.assembledSourceVoxelCount),
   modelCallsDuringReplay:r.modelCallsDuringReplay,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
