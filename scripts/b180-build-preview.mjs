/**
 * B180 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildAtriumArrivals} from '../source/ai/b180-atrium-arrivals.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b180-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B180_PREVIEW_'+reason)};
export function buildB180Preview({dir=out}={}){
 const {compiled,design,report,parent}=buildAtriumArrivals();
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
  .replace('B143 / UNIVERSAL AI DESIGN','B180 / NEBULA ARK · QUAD TIER SKYBRIDGES')
  .replace('B143 AI Architecture Studio','B180 — FOUR TIER ATRIUM ARRIVALS / 四層の公共回廊 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK · FOUR TIER ATRIUM ARRIVALS 巨大立体都市')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '三大巨大ホール全体を四層の連続した公共回廊・巨大到着広場でつなぐ一体型都市建築。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,
  '<div class="info"><strong>B180 / 8モジュール統合</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック、'+report.totalParts+'個の立体構造要素、'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。各層の三大ホールと八本の空中橋を連続する幅2の実体床で接続。実機移動・階間動線の認証ではありません。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b180-overview" type="button">巨大建築全景</button>'+
  '<button id="b180-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b180-low" type="button">大空洞と1階</button>'+
  '<button id="b180-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b180Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b180-overview","overview"],',
  ' ["b180-low","low"],["b180-upper","upper"],["b180-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b180Camera(mode));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b180-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B180_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B180_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B180_SAFETY_GATED_EIGHT_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b180-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:1,
  newConceptModelTotalOutsideHistoric36:37,
  moduleCount:8,uniqueNewCells:report.uniqueNewCells,
  real3dCells:compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:report.totalParts,
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
  const m=buildB180Preview();
  console.log('B180_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B180_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
