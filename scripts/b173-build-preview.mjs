/**
 * B173 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildNebulaArkB173} from '../source/ai/b173-nebula-ark.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b173-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B173_PREVIEW_'+reason)};
export function buildB173Preview({dir=out}={}){
 const {compiled,design,report}=buildNebulaArkB173();
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
  .replace('B143 / UNIVERSAL AI DESIGN','B173 / NEBULA ARK · ATRIUM CASCADE')
  .replace('B143 AI Architecture Studio','B173 — 三大アトリウム・空中展望回廊 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK · 三大アトリウムと天空回廊')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    'B172を拡張した新しい内部立体空間。三大吹き抜け、二組の12段階の造形、追加54立体要素、天空環、空中デッキ。実ボクセルによる構造です。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,
  '<div class="info"><strong>独立新作 · B173</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック、'+report.totalElements+'個の立体構造要素、'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。三大アトリウム・24段の階段状造形・天空テラスを追加。ただし階間移動とMinecraft実機移動は未認証です。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b173-overview" type="button">巨大建築全景</button>'+
  '<button id="b173-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b173-low" type="button">大空洞と1階</button>'+
  '<button id="b173-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b173Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b173-overview","overview"],',
  ' ["b173-low","low"],["b173-upper","upper"],["b173-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b173Camera(mode));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b173-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B173_DESIGN_SOURCE.json'),
  manifestFile=path.join(dir,'B173_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify(design,null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b173-3d-preview-v1',
  modelId:design.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:1,
  newConceptModelTotalOutsideHistoric36:37,
  real3dCells:compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:design.elements.length,
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
  const m=buildB173Preview();
  console.log('B173_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B173_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
