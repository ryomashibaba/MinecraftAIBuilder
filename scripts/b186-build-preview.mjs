/**
 * B186 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildCrownObservatory} from '../source/ai/b186-crown-observatory.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b186-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B186_PREVIEW_'+reason)};
export function buildB186Preview({dir=out}={}){
 const {compiled,design,report,parent}=buildCrownObservatory();
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
  .replace('B143 / UNIVERSAL AI DESIGN','B186 / NEBULA ARK · CROWN OBSERVATORY NETWORK')
  .replace('B143 AI Architecture Studio','B186 — CROWN OBSERVATORY NETWORK / 超高層の三大展望施設 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK · CROWN OBSERVATORY NETWORK 巨大立体都市')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '天空公園からさらに上の巨大展望施設3つを連続100ブロック級の公共回廊で接続し、背面の未来都市を壮大に増築。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,
  '<div class="info"><strong>B186 / 14モジュール統合</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック、'+report.totalElements+'個の立体構造要素、'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。旧4公共フロア・屋上・新天空展望階の18ノードを結合。3つの展望公園と新99移動天空回廊を支持床で検証。Minecraft実機歩行は未認証。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b186-overview" type="button">巨大建築全景</button>'+
  '<button id="b186-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b186-low" type="button">大空洞と1階</button>'+
  '<button id="b186-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b186Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b186-overview","overview"],',
  ' ["b186-low","low"],["b186-upper","upper"],["b186-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b186Camera(mode));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b186-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B186_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B186_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B186_SAFETY_GATED_FOURTEEN_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b186-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:1,
  newConceptModelTotalOutsideHistoric36:37,
  moduleCount:14,added3dCells:report.added3dCells,
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
  const m=buildB186Preview();
  console.log('B186_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B186_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
