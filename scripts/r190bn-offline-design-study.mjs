/** R190-BN: offline capacity/fidelity study. NO provider or Minecraft imports. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SCHEMA as B143,compileDesign,MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {twoLevelReadingProbe,longConcourseProbe} from './fixtures/r190bn-spatial-assemblies.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {reviewR190BCOriginal,renderR190BCSectionSVG} from './r190bc-design-first-section.mjs';

const H=x=>createHash('sha256').update(x).digest('hex');
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p));
const box=(id,mode,origin,size,extra={})=>({id,shape:'box',mode,origin,size,
 ...(mode==='add'?{material:'concrete'}:{}),...extra});
const doc=(id,bounds,elements)=>({schema:B143,id,title:'SYNTHETIC capacity probe',
 brief:'Synthetic compiler capacity, not a model building or architectural design.',bounds,elements,designOnly:true});
function attempt(design){
 try{const c=compileDesign(design);return {status:'COMPILED_SOURCE_ONLY',voxels:c.primitives.length,
  physicalCellsSha256:H(JSON.stringify(c.primitives.map(p=>p.slice(0,4)))),scene:c};}
 catch(error){return {status:'HOLD',failure:String(error.message),voxels:null};}
}
export function studyR190BNCapacity(){
 const bounds={width:64,height:96,depth:32};
 const solid=box('solid','add',[0,0,0],[64,96,32]),
  cut=box('interior','cut',[1,1,1],[62,94,30]),
  shell=box('skin','add',[0,0,0],[64,96,32],{shell:1});
 const six=[box('bottom','add',[0,0,0],[64,1,32]),
  box('top','add',[0,95,0],[64,1,32]),
  box('west','add',[0,1,0],[1,94,32]),box('east','add',[63,1,0],[1,94,32]),
  box('south','add',[1,1,0],[62,94,1]),box('north','add',[1,1,31],[62,94,1])];
 const definitions=[
  ['solid-then-cut',doc('bn-cap-solid-cut',bounds,[solid,cut])],
  ['direct-shell',doc('bn-cap-shell',bounds,[shell])],
  ['explicit-six-surfaces',doc('bn-cap-surfaces',bounds,six)],
  ['shell-with-23-floors',doc('bn-cap-floors',bounds,[shell,
   box('intermediate-floors','add',[1,4,1],[62,1,30],{repeat:{count:22,offset:[0,4,0]}})])],
  ['wide-25-floors',doc('bn-cap-wide-25',{width:128,height:96,depth:40},[
   box('skin','add',[0,0,0],[128,96,40],{shell:1}),
   box('floors','add',[1,3,1],[126,1,38],{repeat:{count:24,offset:[0,3,0]}})])],
  ['wide-26-floors',doc('bn-cap-wide-26',{width:128,height:96,depth:40},[
   box('skin','add',[0,0,0],[128,96,40],{shell:1}),
   box('floors','add',[1,3,1],[126,1,38],{repeat:{count:25,offset:[0,3,0]}})])],
  ['height-128',doc('bn-cap-height',{width:32,height:128,depth:32},[
   box('skin','add',[0,0,0],[32,128,32],{shell:1})])]
 ];
 const results=definitions.map(([id,design])=>{
  const {scene,...result}=attempt(design);return {id,bounds:design.bounds,...result};});
 return {schema:'r190bn-capacity-study-v1',provenance:'SYNTHETIC_COMPILER_PROBES_NOT_MODEL_DESIGNS',
  unchangedLimits:{height:96,maxOccupiedCellsIncludingIntermediate:MAX_CELLS,
   boundsVolume:500000,elements:160,work:1750000,straightFlightSteps:32},
  results,exactShellVsSurfacesEqual:results[1].physicalCellsSha256===results[2].physicalCellsSha256,
  solidCutAlgebraicFinalCells:64*96*32-62*94*30,
  wide25AlgebraicCells:128*96*40-126*94*38+24*126*38,
  wide26AlgebraicCells:128*96*40-126*94*38+25*126*38,
  actualArchitecturalFloorsOrUsabilityCertified:false,newModelCalls:0,worldContacts:0,worldWrites:0};
}

export function writeR190BNStudy(outDir){
 const out=path.resolve(outDir);
 if(fs.existsSync(out)||!fs.statSync(path.dirname(out)).isDirectory())throw Error('Fresh output required');
 // Authenticate the official BM bytes BEFORE producing any new evidence.
 const bmInventory=JSON.parse(read('evidence/r190bm/INVENTORY.json'));
 for(const f of bmInventory.files)if(H(read('evidence/r190bm/'+f.file))!==f.sha256)
  throw Error('BM evidence changed: '+f.file);
 const originalBM=['A','B'].map(side=>{
  const raw=read('evidence/r190bm/'+side+'/model-original/R190_I_ORIGINAL_RESPONSE.txt');
  const p=JSON.parse(raw);let firstFailure;
  try{compileDesign(p.design);firstFailure=null}catch(error){firstFailure=String(error.message)}
  return {side,originalSha256:H(raw),firstFailure,originalUnmodified:true,
   repaired:false,source3DGenerated:false,declaredBounds:p.design.bounds};
 });
 const capacity=studyR190BNCapacity(),studies=[];
 const outputs=new Map();
 const template=read('source/ai/b143-viewer-template.html').toString('utf8');
 for(const [name,make] of [['synthetic-reading',twoLevelReadingProbe],['synthetic-concourse',longConcourseProbe]]){
  const q=make(),r=compileR190BNAssembly(q.original,{originalBrief:q.brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
  const {compiled,proposal,...receipt}=r;
  const legacySection=reviewR190BCOriginal(Buffer.from(JSON.stringify(proposal)));
  const section={...legacySection,inputAuthorship:'SYNTHETIC_TEST_FIXTURE',
   inputIsOriginalModelResponse:false,
   sectionEvidence:legacySection.sectionEvidence?{...legacySection.sectionEvidence,
    isModelOriginalFinalB143:false,isExactDerivedB143:true}:null};
  const gallery=compileB143Gallery([proposal.design]);
  if(gallery.geometryHashes[0]!==r.geometrySha256)throw Error('Gallery geometry changed');
  outputs.set(name+'/ORIGINAL_ASSEMBLY.json',q.original);
  outputs.set(name+'/ORIGINAL_BRIEF.txt',q.brief);
  outputs.set(name+'/DERIVED_B143_PROPOSAL.json',JSON.stringify(proposal,null,2)+'\n');
  outputs.set(name+'/DERIVATION_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n');
  outputs.set(name+'/SOURCE_3D.html',renderB143Html(gallery,template));
  for(const side of ['front','rear','west','east','roof'])
   outputs.set(name+'/'+side+'.svg',renderR164Elevation(compiled,proposal.design,side));
  outputs.set(name+'/SECTION.json',JSON.stringify(section,null,2)+'\n');
  outputs.set(name+'/SECTION.svg',renderR190BCSectionSVG(section));
  // Separate explicitly selected inspection slice, NOT a changed legacy BC audit.
  // The entrance-plane slice can be outside the building, so retain it and
  // provide this additional reviewer plane with truthful provenance.
  const occupiedAtPlane=compiled.primitives.filter(v=>v[2]===q.inspectionZ).map(v=>v.slice(0,2));
  outputs.set(name+'/INSPECTION_PLANE.json',JSON.stringify({
   source:'SYNTHETIC_FIXTURE_REVIEWER_SELECTED_PLANE',fixedZ:q.inspectionZ,
   geometrySha256:compiled.geometrySha256,occupiedCells:occupiedAtPlane,
   changesToDesign:0,newModelCalls:0},null,2)+'\n');
  const cell=12,w=proposal.design.bounds.width,h=proposal.design.bounds.height;
  outputs.set(name+'/INSPECTION_SECTION.svg',
   '<svg xmlns="http://www.w3.org/2000/svg" width="'+(w*cell+40)+'" height="'+(h*cell+80)+'">'+
   '<rect width="100%" height="100%" fill="#101c2c"/><text x="18" y="25" fill="white" font-size="13">SYNTHETIC BN - exact source section z='+q.inspectionZ+'</text>'+
   occupiedAtPlane.map(([x,y])=>'<rect x="'+(20+x*cell)+'" y="'+(60+(h-1-y)*cell)+'" width="11" height="11" fill="#93c5fd"/>').join('')+'</svg>');
  studies.push({name,authorship:r.authorship,status:r.status,originalInputSha256:r.originalInputSha256,
   sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,voxels:compiled.primitives.length,
   authoredLevels:r.levels,
   spaceEvidence:r.spaceEvidence,functionalReview:r.functionalReview,
   legacySectionStatus:section.status,
   legacySectionLimitation:'BC is a same-height two-wide proxy; upper levels are not re-labelled as flat-reachable.'});
 }
 const report={schema:'r190bn-offline-design-study-v1',newModelCalls:0,
  unchangedOfficialBM:originalBM,capacity,syntheticStudies:studies,
  bmArchitectureImprovement:'NOT_ESTABLISHED',newIRModelDesignQuality:'NOT_TESTED',
  sourceConversion:'AUTHOR_DIMENSIONS_AND_LEVELS_TO_DETERMINISTIC_SURFACES',
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
   art:'ART_HOLD',officialArtAdoptions:0}};
 outputs.set('R190BN_STUDY.json',JSON.stringify(report,null,2)+'\n');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 outputs.set('R190BN_COMPARE.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>R190-BN オフライン変換研究</title>'+
  '<style>body{font:16px/1.6 system-ui;background:#111b2b;color:#edf3f9;max-width:1200px;margin:24px auto;padding:16px}a{color:#92d6ff}article{border:1px solid #668;padding:18px;margin:16px 0}iframe{width:100%;height:540px;border:1px solid #668}td,th{padding:8px;text-align:left}table{border-collapse:collapse}th,td{border-bottom:1px solid #668}</style>'+
  '<h1>R190-BN｜設計先行の変換方式・オフライン研究</h1><p>ART HOLD／新規推論0／施工0／正式採用0</p>'+
  '<p>以下の2つの3Dは完全な合成検証データです。実Qwen/Gemma設計やBMの修正版ではありません。実モデルの美術改善は未実証です。</p>'+
  '<h2>正式なBM原文は無改変・不成立のまま</h2>'+originalBM.map(x=>'<p>'+x.side+': '+esc(x.firstFailure)+' / '+x.originalSha256+'</p>').join('')+
  '<h2>既存B143の容量</h2><table><tr><th>合成条件</th><th>結果</th><th>実ボクセル</th></tr>'+capacity.results.map(x=>'<tr><td>'+x.id+'</td><td>'+esc(x.failure??x.status)+'</td><td>'+esc(x.voxels??'未成立')+'</td></tr>').join('')+'</table>'+
  studies.map(s=>'<article><h2>'+esc(s.name)+' — SYNTHETIC</h2><p>'+esc(s.status)+'</p>'+
   '<p>作者の立脚高さ：'+s.authoredLevels.map(l=>esc(l.id)+' y='+l.standingY).join(' / ')+
   '。ビューアの高さ帯と、実際に宣言された階構成は別です。</p>'+
   '<p>作者の階・空間・開口・階段から決定論的変換。機能・美術の認証ではありません。BC平面限定判定：'+esc(s.legacySectionStatus)+'</p>'+
   '<iframe title="'+s.name+' synthetic source" src="'+s.name+'/SOURCE_3D.html"></iframe><p>'+['front','rear','west','east','roof'].map(side=>'<a href="'+s.name+'/'+side+'.svg">'+side+'</a>').join(' / ')+
   ' / <a href="'+s.name+'/INSPECTION_SECTION.svg">指定面の断面</a> / <a href="'+s.name+'/SECTION.json">既存BC判定（入口面）</a> / <a href="'+s.name+'/ORIGINAL_ASSEMBLY.json">作者入力</a> / <a href="'+s.name+'/DERIVATION_RECEIPT.json">出所・対応表</a></p></article>').join('')+
  '<p><a href="R190BN_STUDY.json">計測・失敗・限界の全記録</a></p></html>');
 fs.mkdirSync(out);
 const inventory=[];
 for(const [name,data] of outputs){
  const file=path.join(out,name);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,data,{flag:'wx'});const bytes=fs.readFileSync(file);
  inventory.push({file:name,bytes:bytes.length,sha256:H(bytes)});
 }
 fs.writeFileSync(path.join(out,'INVENTORY.json'),JSON.stringify({files:inventory,
  hashesCoverExactSavedBytes:true,newModelCalls:0},null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('Offline only: --out FRESH_DIR');
 const r=writeR190BNStudy(process.argv[3]);
 console.log(JSON.stringify({newModelCalls:0,capacity:r.capacity,
  studies:r.syntheticStudies.map(s=>({name:s.name,status:s.status,voxels:s.voxels}))},null,2));
}
