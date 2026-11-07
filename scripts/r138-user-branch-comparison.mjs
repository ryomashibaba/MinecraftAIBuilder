/**
 * R138 3 genuine-user-Qwen-derived 3D comparisons:
 * independently inspect strip vs branched alternatives. Host choice and
 * model intent remain separately labelled. No inference/world writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readR137SavedRealQwenCapture}
 from './r137-user-capture-replay.mjs';
import {recoverR137Furnished}
 from './r137-bounded-recovery.mjs';
import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {CASES} from './r136-local-evidence.mjs';
import {deriveR138BranchedTopology}
 from '../source/ai/r138-branching-topology.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function buildR138SavedQwenBranchComparison(){
 const captures=readR137SavedRealQwenCapture();
 const template=fs.readFileSync(path.join(ROOT,
  'source/ai/b143-viewer-template.html'),'utf8');
 const records=[],pages=[];
 for(const [i,capture] of captures.cases.entries()){
  const request=makeR134FreshRequest({brief:CASES[i].brief});
  const previous=recoverR137Furnished({
   raw:capture.raw,request,build:parseR135FreshFurnishedReply});
  const strip=previous.result.featured;
  const branch=deriveR138BranchedTopology(previous.result.base);
  const modelObjects=JSON.parse(capture.raw).objects;
  const alternate=applyR125FeatureIntent({base:branch,intent:{
   schema:ASSEMBLED_SCHEMA,basePlanSha256:branch.planSha256,
   objects:modelObjects.map(x=>({...x,detail:'assembled'}))
  }});
  const id=CASES[i].id;
  for(const [suffix,design] of [
   ['strip',strip.design],
   ['branched',alternate.design]]){
   pages.push({file:id+'/'+suffix+'.html',
    html:renderB143Html(compileB143Gallery([design]),template)});
  }
  records.push({
   id,modelSource:'USER_LOCAL_QWEN3_14B_RAW_SHA_PINNED',
   modelRawSha256:capture.raw_sha256,
   topologyChoice:'HOST_DERIVED_ALTERNATIVE_NOT_QWEN_MODEL_CHOICE',
   rooms:branch.program[0].zones.map(z=>({id:z.id,
    purpose:z.purpose,sector:z.physicalSector})),
   originalModelObjectsRetained:alternate.placements.length===modelObjects.length,
   equipmentCount:alternate.placements.length,
   sourceRouteStatus:alternate.sourceRouteAudit.status,
   sharedSpine:branch.program[0].centralSharedSpine,
   geometrySHA:{strip:strip.geometrySha256,branched:alternate.geometrySha256},
   voxelCount:{strip:strip.compiled.primitives.length,
    branched:alternate.compiled.primitives.length},
   modelCallsInThisReplay:0,worldWrites:0
  });
 }
 const cards=records.map(r=>'<section><h2>'+safe(r.id)+'</h2>'+
  '<p>'+r.rooms.length+'室、各構成に設備'+r.equipmentCount+
  '個。両方ともSource QA: '+safe(r.sourceRouteStatus)+'</p>'+
  '<div class="two"><div><b>R137 直列間取り</b><iframe title="strip" src="'+
  r.id+'/strip.html"></iframe></div><div><b>R138 分岐間取り</b>'+
  '<iframe title="branch" src="'+r.id+'/branched.html"></iframe></div></div>'+
  '<p>分岐構成はホストが生成した比較用派生案。モデル自身の空間発案とは区別。</p>'+
  '</section>').join('');
 pages.unshift({file:'index.html',html:
  '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<style>body{background:#0a1625;color:#f1f6ff;font:14px/1.65 system-ui;'+
  'padding:24px}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}'+
  'section{padding:16px;background:#1c2e41;margin-bottom:20px;border-radius:10px}'+
  'iframe{width:100%;height:440px;border:1px solid #56728c}'+
  '@media(max-width:900px){.two{grid-template-columns:1fr}}</style>'+
  '<h1>R138｜実Qwen回答から直列vs分岐の実3D比較</h1>'+
  '<p>原本保持／設備保持／新モデル推論0回／Minecraft世界操作0回。'+
  '人体動線と美術品質は未認証。</p>'+cards+'</html>'});
 return {schema:'r138-user-qwen-branching-comparison-v1',
  records,pages,
  actualNewSourceGeometry:true,modelCallsDuringReplay:0,
  humanArtApproved:false,minecraftWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,
  worldWrites:0,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
}
export function saveR138SavedQwenBranchComparison(out){
 if(typeof out!=='string'||!out.trim())throw Error('R138_OUTPUT');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R138_NO_OVERWRITE');
 const r=buildR138SavedQwenBranchComparison();
 fs.mkdirSync(dir,{recursive:false});
 for(const p of r.pages){
  const target=path.join(dir,p.file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,p.html,{flag:'wx'});
 }
 fs.writeFileSync(path.join(dir,'R138_SOURCE_COMPARISON_EVIDENCE.json'),
  JSON.stringify({...r,pages:r.pages.map(p=>p.file)},null,2)+'\n',
  {flag:'wx'});
 return r;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--out')throw Error('R138_CLI');
  const r=saveR138SavedQwenBranchComparison(argv[1]);
  console.log(JSON.stringify({status:'R138_NEW_BRANCHING_3D_READY',
   cases:r.records.length,scenes:r.pages.length-1,
   branchedVoxelCounts:r.records.map(x=>x.voxelCount.branched),
   retainedFurniture:r.records.map(x=>x.equipmentCount),
   modelCalls:0,worldWrites:0}));
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
