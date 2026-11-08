/**
 * Compare FIVE preserved independent building genres from the SAME source
 * evidence. Offline only: no inference, re-prompt, MakeCode, or world contact.
 * A shared block scale for front/side/top projections reveals comparative
 * building massing, not aesthetic quality. Every pixel is an actual B143 voxel.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('R125_GENRE_COMPARE_'+s)};
const enc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function readFile(folder,name,limit=400000){
 const candidate=path.join(folder,name);
 const stat=fs.lstatSync(candidate);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size<1||stat.size>limit)
  fail('FILE_INTEGRITY_'+name);
 return fs.readFileSync(candidate,'utf8');
}
function safeFolder(base,name){
 const result=path.join(base,name);
 if(fs.lstatSync(result).isSymbolicLink())fail('SYMLINK_CASE_'+name);
 return result;
}
const colors=['#aab5bd','#d9e1e4','#728b9c','#44d3da','#bb9265','#e6cf7b','#c77aa4'];
/** Front looks down +Z, side down +X, top down -Y. Orthographic SOURCE projection. */
export function projectExactSourceVoxels(scene,view,extent){
 if(!['front','side','top'].includes(view)||!Array.isArray(scene?.primitives))
  fail('PROJECTION_INPUT');
 const selection=new Map();
 for(const [x,y,z,material] of scene.primitives){
  const a=view==='side'?z:x;
  const b=view==='top'?z:y;
  const depth=view==='front'?z:view==='side'?x:y;
  const key=a+','+b;
  const prior=selection.get(key);
  const nearer=prior===undefined||(view==='top'?depth>prior.depth:depth<prior.depth);
  if(nearer)selection.set(key,{a,b,material,depth});
 }
 const w=(view==='side'?extent.depth:extent.width)+2;
 const h=(view==='top'?extent.depth:extent.height)+2;
 const pitch=4;
 const cells=[...selection.values()].map(p=>{
  const py=view==='top'?p.b:extent.height-1-p.b;
  const x=(p.a+1)*pitch,y=(py+1)*pitch;
  return '<rect x="'+x+'" y="'+y+'" width="'+pitch+'" height="'+pitch+
   '" fill="'+(colors[p.material]??'#ffffff')+'"/>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(w*pitch)+
  ' '+(h*pitch)+'" role="img" aria-label="'+enc(view)+
  ' projection, exact B143 voxel surface, uniform block scale">'+
  '<rect width="100%" height="100%" fill="#111f2a"/>'+cells+'</svg>';
}
export function deriveCrossGenreLimits(cases){
 if(!Array.isArray(cases)||cases.length===0)fail('LIMIT_INPUT');
 const all=cases.map(c=>c.product);
 const roofs=all.every(p=>p.design.elements.filter(e=>e.id.endsWith('-roof')).length===
  p.plan.rooms.length&&p.design.elements.filter(e=>e.id.endsWith('-roof'))
   .every(e=>e.shape==='box'));
 const fixedSingleWindow=all.every(p=>p.layout.exteriorWindows<=p.plan.rooms.length);
 const noFixtures=all.every(p=>p.design.elements.every(e=>
  /^(space-[0-9]+-(floor|west|east|front|rear|roof)|exterior-entrance|joint-[0-9]+|glaze-[0-9]+-(void|glass))$/.test(e.id)));
 const reports=[
  {code:'ALL_ROOFS_ORTHOGONAL_BOX',observed:roofs,
   evidenceType:'SHARED_HOST_COMPILER_CONSTRAINT_NOT_ART_VERDICT',
   interpretation:'Each source roof is an independent horizontal B143 box, not model-authored roof morphology'},
  {code:'MAX_ONE_GLAZED_OPENING_PER_ROOM',observed:fixedSingleWindow,
   evidenceType:'SHARED_HOST_COMPILER_CONSTRAINT_NOT_ART_VERDICT',
   interpretation:'The compiler chooses at most one exterior glazed opening for each room'},
  {code:'NO_FUNCTIONAL_FIXTURE_GEOMETRY',observed:noFixtures,
   evidenceType:'SHARED_HOST_COMPILER_CONSTRAINT_NOT_ART_VERDICT',
   interpretation:'Functional room purpose is text only; the current shared geometry path adds no furniture or fixtures'}
 ];
 return reports;
}
export function inspectPreservedFiveGenreSources({studyDir,diagnosticReportFile}={}){
 if(!path.isAbsolute(studyDir??'')||!path.isAbsolute(diagnosticReportFile??''))
  fail('ABSOLUTE_INPUT_REQUIRED');
 if(fs.lstatSync(studyDir).isSymbolicLink())fail('STUDY_SYMLINK');
 const study=fs.realpathSync(studyDir);
 const diag=JSON.parse(readFile(path.dirname(diagnosticReportFile),
  path.basename(diagnosticReportFile),600000));
 const rawReport=readFile(study,'CROSS_GENRE_REPORT.json',600000);
 const original=JSON.parse(rawReport);
 if(diag.schema!=='r125-saved-cross-genre-offline-diagnostic-v1'||
    diag.originalReportSha256!==digest(rawReport)||
    diag.originalStudyPath?.toLowerCase()!==study.toLowerCase()||
    diag.reInferenceCalls!==0||
    original.schema!=='r125-local-cross-genre-study-v1'||
    original.testInjectionPresent!==false||
    original.modelCalls!==GENRES.length||
    original.cases?.length!==GENRES.length||
    diag.cases?.length!==GENRES.length)
  fail('SOURCE_REPORT_PROVENANCE');
 const results=[];
 for(const [index,genre] of GENRES.entries()){
  const old=original.cases[index],diagnosed=diag.cases[index];
  if(old?.id!==genre.id||old.genre!==genre.genre||
     diagnosed?.id!==genre.id||diagnosed.genre!==genre.genre||
     old.rawSha256!==diagnosed.originalRawSha256||
     old.status!==diagnosed.originalStatus)
   fail('CASE_PROVENANCE_'+genre.id);
  const folder=safeFolder(path.join(study,'cases'),genre.id);
  const caseReceipt=JSON.parse(readFile(folder,'CASE_REPORT.json',40000));
  if(caseReceipt.rawSha256!==old.rawSha256||
     caseReceipt.geometrySha256!==old.geometrySha256||
     caseReceipt.status!==old.status)
   fail('RECEIPT_'+genre.id);
  const modelRaw=readFile(folder,'MODEL_RESPONSE_ORIGINAL.txt',40000);
  if(digest(modelRaw)!==old.rawSha256||diagnosed.rawIntegrity!=='SHA256_MATCHED')
   fail('MODEL_ORIGINAL_SHA_'+genre.id);
  let plan;
  try{plan=JSON.parse(modelRaw)}catch{fail('MODEL_JSON_'+genre.id)}
  const product=compileSpatialComposition(plan);
  if(product.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES')
   fail('SOURCE_ROUTES_'+genre.id);
  if(product.geometrySha256!==diagnosed.replayedGeometrySha256)
   fail('DIAG_GEOMETRY_SHA_'+genre.id);
  if(old.geometrySha256){
   if(product.geometrySha256!==old.geometrySha256||
      product.sourceSha256!==old.sourceSha256||
      diagnosed.sourceReplay!=='MATCHED_SAVED_GEOMETRY')
    fail('FROZEN_4_SHAPE_DRIFT_'+genre.id);
  }else{
   const recovered=diag.recoveredSourceCandidates?.find(x=>x.id===genre.id);
   if(!recovered||recovered.geometrySha256!==product.geometrySha256||
      recovered.sourceSha256!==product.sourceSha256||
      recovered.sourceRoutes!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      recovered.originalFailureStillRecorded!==true||
      diagnosed.sourceReplay!=='OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY')
    fail('RECOVERED_SOURCE_CONTRACT_'+genre.id);
  }
  results.push({id:genre.id,genre:genre.genre,oldStatus:old.status,
   product,rawSha256:old.rawSha256,isRecovered:old.geometrySha256===null});
 }
 return {study,results,originalReportSha256:digest(rawReport),
  diagnosticSha256:digest(readFile(path.dirname(diagnosticReportFile),
   path.basename(diagnosticReportFile),600000))};
}
export function buildFiveGenreReview({studyDir,diagnosticReportFile,outDir}={}){
 if(!path.isAbsolute(outDir??'')||fs.existsSync(outDir))fail('OUTPUT_PATH');
 const evidence=inspectPreservedFiveGenreSources({studyDir,diagnosticReportFile});
 const dest=path.resolve(outDir);
 if(fs.realpathSync(path.dirname(dest))!==fs.realpathSync(path.dirname(evidence.study))||
    dest===evidence.study||dest.startsWith(evidence.study+path.sep))
  fail('PRIVATE_SIBLING_DESTINATION');
 const template=fs.readFileSync(
  path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const max={width:0,height:0,depth:0};
 for(const {product} of evidence.results)for(const key of Object.keys(max))
  max[key]=Math.max(max[key],product.design.bounds[key]);
 const sections=evidence.results.map(c=>{
  const p=c.product;
  return {...c,html:renderB143Html(compileB143Gallery([p.design]),template),
   projections:{
    front:projectExactSourceVoxels(p.compiled,'front',max),
    side:projectExactSourceVoxels(p.compiled,'side',max),
    top:projectExactSourceVoxels(p.compiled,'top',max)}
  };
 });
 const caps=deriveCrossGenreLimits(evidence.results);
 const report={schema:'r125-preserved-five-genre-visual-comparison-v1',
  status:'FIVE_SOURCE_REPLAYED_HUMAN_ART_HOLD',
  originalStudySha256:evidence.originalReportSha256,
  previousDiagnosticSha256:evidence.diagnosticSha256,
  sourceModels:5,retainedOriginalSuccessfulModels:4,
  offlineRecoveredModels:sections.filter(c=>c.isRecovered).length,
  modelInferenceCalls:0,worldContacts:0,worldWrites:0,
  reviewedArchitectureArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  noSyntheticGeometry:true,sourceProjection:'EXACT_B143_VOXELS_UNIFORM_BLOCK_SCALE',
  maxOriginalBounds:max,
  sharedCompilerConstraints:caps,
  cases:sections.map(({id,genre,oldStatus,rawSha256,product,isRecovered})=>({
   id,genre,originalStatus:oldStatus,
   recoveredFromHistoricalHold:isRecovered,
   modelRawSha256:rawSha256,
   geometrySha256:product.geometrySha256,sourceSha256:product.sourceSha256,
   sourceVoxelCount:product.compiled.primitives.length,
   roomCount:product.plan.rooms.length,roomProgram:product.plan.rooms.map(r=>({
    id:r.id,purpose:r.purpose,width:r.width,depth:r.depth,roofY:r.roofY})),
   roofHeights:[...new Set(product.plan.rooms.map(r=>r.roofY))].sort(),
   externalWindowGroups:product.layout.exteriorWindows,
   sourceZonesReachable:product.sourceRoutes.zones.filter(z=>z.reachedFromEntrance).length,
   sourceRoutes:product.sourceRoutes.status,
   viewerPath:'cases/'+id+'/index.html',
   humanArt:'NOT_REVIEWED',worldWrites:0
  })),
  readiness:'NOT_PREPARED',constructionApproved:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 const issues=caps.filter(x=>x.observed).map(x=>'<li><strong>'+
  enc(x.code)+'</strong> — '+enc(x.interpretation)+'</li>').join('');
 const cells=sections.map(c=>{
  const entry=report.cases.find(x=>x.id===c.id);
  return '<article><h2>'+enc(c.genre)+' <small>'+entry.roomCount+
   '室 / '+entry.sourceVoxelCount+'セル</small></h2>'+
   '<div class="views"><div><label>正面 (Z-)</label>'+c.projections.front+
   '</div><div><label>側面 (X-)</label>'+c.projections.side+
   '</div><div><label>俯瞰 (Y+)</label>'+c.projections.top+'</div></div>'+
   '<p>屋根高ブロック：'+entry.roofHeights.join(', ')+
   ' / 外壁窓グループ：'+entry.externalWindowGroups+
   ' / 各室SOURCE経路：'+entry.sourceZonesReachable+'/'+entry.roomCount+'</p>'+
   '<details><summary>用途と部屋構成（Qwen原文の意味）</summary><ul>'+
   entry.roomProgram.map(x=>'<li>'+enc(x.purpose)+' — '+x.width+'×'+x.depth+
    ' / roofY='+x.roofY+'</li>').join('')+'</ul></details>'+
   '<p><a href="'+entry.viewerPath+'">真正3Dビューを開く</a></p>'+
   (c.isRecovered?'<p>旧HOLDの原文を新共通ルールでSOURCE再生。旧HOLD履歴は保持。</p>':'')+
   '</article>';
 }).join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>MinecraftAIBuilder — 5ジャンル真正SOURCE横断比較</title>'+
 '<style>body{background:#091722;color:#e4edf3;font:15px system-ui;margin:0 auto;padding:25px;max-width:1580px;line-height:1.55}'+
 'h1{font-size:1.8em}h2{font-size:1.18em;margin:4px 0 12px}h2 small{font-size:.75em;color:#a9c0cd;font-weight:400}'+
 '.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,570px),1fr));gap:16px}'+
 'article{border:1px solid #385164;border-radius:13px;padding:18px;background:#102535;min-width:0}'+
 '.views{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}.views>div{min-width:0}'+
 'svg{width:100%;height:auto;max-height:250px;border:1px solid #264252;background:#111f2a;image-rendering:pixelated}'+
 'label{display:block;font-size:.83em;color:#8bd8df;margin-bottom:5px}p,li{color:#c5d5df}a{color:#78e0e8}'+
 'details{border-top:1px solid #29465c;padding-top:8px} .meta{margin:12px 0 20px}</style>'+
 '<h1>5ジャンル・真正B143横断比較</h1>'+
 '<p class="meta">各投影は実B143ボクセルから生成。全5棟で同じ1ブロック縮尺を使用。'+
 '建築美術・用途の適合・実機利用の審査ではありません。元Qwen回答は公開しません。</p>'+
 '<h2>同一共通生成器の能力制約（美術評価ではなくコード上の事実）</h2><ul>'+
 issues+'</ul><section class="board">'+cells+'</section>'+
 '<p>元4棟と回復した駅舎のSHA検査済み。自動修正・新モデル呼出・Minecraft書込なし。'+
 '次工程は5ジャンルに共通する設計自由度・用途表現の改善候補を人間が評価すること。</p></html>';
 // All original and diagnostic evidence fully validated before making a file.
 fs.mkdirSync(dest);
 fs.mkdirSync(path.join(dest,'cases'));
 for(const c of sections){
  const sub=path.join(dest,'cases',c.id);
  fs.mkdirSync(sub);
  save(sub,'index.html',c.html);
 }
 save(dest,'COMPARISON_REPORT.json',report);
 save(dest,'index.html',html);
 return {...report,outputFolder:dest};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--study'||a[2]!=='--diagnostic'||a[4]!=='--out')
   fail('CLI_ARGS');
  const report=buildFiveGenreReview({studyDir:path.resolve(a[1]),
   diagnosticReportFile:path.resolve(a[3]),outDir:path.resolve(a[5])});
  console.log(JSON.stringify({status:report.status,
   comparisonReport:report.outputFolder,
   sameScaleSourceImages:5,modelCalls:0,worldWrites:0,
   sharedConstraints:report.sharedCompilerConstraints.map(x=>x.code)},null,2));
 }catch(e){console.error('CROSS_GENRE_COMPARE_HOLD',String(e.message??e));process.exitCode=2}
}
