/**
 * B185 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildCelestialPortico} from '../source/ai/b185-celestial-portico.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b185-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B185_PREVIEW_'+reason)};
export function buildB185Preview({dir=out}={}){
 const {compiled,design,report,parent}=buildCelestialPortico();
 const surface=surfaceOnly(compiled),{primitives,...rest}=compiled;
 check(surface.length>3000&&surface.length<=primitives.length,'NO_SURFACE_GEOMETRY');
 const payload={
  schema:'minecraftaibuilder-b143-gallery-v1',
  edition:'MINECRAFT_EDUCATION',
  sourceHashes:[compiled.sourceSha256],
  geometryHashes:[compiled.geometrySha256],
  scenes:[{...rest,surface,
   stats:{...compiled.stats,renderedSurfaceCells:surface.length}}],
  safety:{constructionApproved:false,executionAllowed:false,
   readiness:'NOT_PREPARED',worldCoordinates:null,worldContacts:0,
   BuildPlan:{operations:[]},original15BuildingSafetyGates:'9 BLOCKED',
   minecraftWrites:0}
 };
 check(verifyB143Payload(payload),'GALLERY_PROVENANCE_FAIL');
 const template=fs.readFileSync(path.join(root,
  'source/ai/b143-viewer-template.html'),'utf8');
 let html=renderB143Html(payload,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B185 / NEBULA ARK · CELESTIAL PORTICO')
  .replace('B143 AI Architecture Studio','B185 — CELESTIAL PORTICO / 屋上接続と超巨大浮遊王冠 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK · CELESTIAL PORTICO 巨大立体都市')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '三大ホールの最上階から天空公園への段差接続3系統、超巨大ガラス王冠と都市級の正面外殻を実立体造形。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,
  '<div class="info"><strong>B185 / 13モジュール統合</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック、'+report.totalElements+'個の立体構造要素、'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。3つのホールの最上階から屋上への2段ずつの通路を支持床・頭上空間で検証。Minecraft実機の段差上昇は未認証。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b185-overview" type="button">巨大建築全景</button>'+
  '<button id="b185-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b185-low" type="button">大空洞と1階</button>'+
  '<button id="b185-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b185Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b185-overview","overview"],',
  ' ["b185-low","low"],["b185-upper","upper"],["b185-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b185Camera(mode));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b185-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B185_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B185_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B185_SAFETY_GATED_THIRTEEN_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b185-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:1,
  newConceptModelTotalOutsideHistoric36:37,
  moduleCount:13,addedNewVoxels:report.addedNewVoxels,
  real3dCells:compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:report.totalElements,
  htmlSha256:H(html),designFileSha256:H(fs.readFileSync(sourceFile)),
  structuralSafetyCertified:false,minecraftActualMovementCertified:false,
  worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const m=buildB185Preview();
  console.log('B185_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B185_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
