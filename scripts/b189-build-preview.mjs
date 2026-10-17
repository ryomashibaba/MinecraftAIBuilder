/**
 * B189 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB189} from '../source/ai/b189-skyport-annex.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b189-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B189_PREVIEW_'+reason)};
export function buildB189Preview({dir=out}={}){
 const {parent,annex,manifest,report}=buildB189();
 const compiled=parent.compiled,design=annex.design;
 const districts=manifest.scenes.slice(1,4);
 const districtScenes=districts.map((d,i)=>{
  const ranges=[[0,42],[43,82],[83,123]],range=ranges[i];
  const sub=compiled.primitives.filter(p=>p[0]>=range[0]&&p[0]<=range[1]);
  check(sub.length===d.voxels,'DISTRICT_VOXEL_MISMATCH_'+d.id);
  const min=(axis)=>sub.reduce((a,p)=>Math.min(a,p[axis]),Infinity);
  const max=(axis)=>sub.reduce((a,p)=>Math.max(a,p[axis]),-Infinity);
  const counts=Object.fromEntries(MATERIALS.map((m,k)=>[m,
   sub.filter(p=>p[3]===k).length]));
  const bounds={minX:min(0),maxX:max(0),minY:min(1),maxY:max(1),
   minZ:min(2),maxZ:max(2)};
  const transformed={...compiled,
   id:'nebula-ark-district-'+d.id,
   title:'NEBULA ARK — '+({north:'北区画',central:'中央区画',south:'南区画'}[d.id])+'（独立表示）',
   brief:'本館のソース分割表示。隣の区画との接続は原本の12か所の境界検査で保護。単独施工の許可ではありません。',
   bounds,primitives:sub,
   sourceSha256:H(compiled.sourceSha256+'|district|'+d.id),
   geometrySha256:d.geometrySha256,
   stats:{...compiled.stats,voxels:sub.length,layerCounts:counts}};
  const {primitives,...rest}=transformed;
  const surf=surfaceOnly(transformed);
  check(surf.length>50,'DISTRICT_SURFACE_MISSING_'+d.id);
  return {...rest,surface:surf,stats:{...rest.stats,renderedSurfaceCells:surf.length}};
 });
 const annexSurf=surfaceOnly(annex.compiled);
 check(annexSurf.length>500,'ANNEX_SURFACE_MISSING');
 const {primitives:annexVoxels,...annexRest}=annex.compiled;
 const surface=surfaceOnly(compiled),{primitives,...rest}=compiled;
 check(surface.length>3000&&surface.length<=primitives.length,'NO_SURFACE_GEOMETRY');
 const payload={
  schema:'minecraftaibuilder-b143-gallery-v1',
  edition:'MINECRAFT_EDUCATION',
  sourceHashes:[compiled.sourceSha256,
   ...districtScenes.map(s=>s.sourceSha256),annex.compiled.sourceSha256],
  geometryHashes:[compiled.geometrySha256,
   ...districtScenes.map(s=>s.geometrySha256),annex.compiled.geometrySha256],
  scenes:[{...rest,surface,
   stats:{...compiled.stats,renderedSurfaceCells:surface.length}},
   ...districtScenes,
   {...annexRest,surface:annexSurf,
    title:'HORIZON DOCK ANNEX — 独立した新しい巨大港湾施設',
    brief:'別ローカル座標系の新規建築。NEBULA ARK本館との実施工・物理的接続は未認証。',
    stats:{...annex.compiled.stats,renderedSurfaceCells:annexSurf.length}}],
  safety:{constructionApproved:false,executionAllowed:false,
   readiness:'NOT_PREPARED',worldCoordinates:null,worldContacts:0,
   BuildPlan:{operations:[]},original15BuildingSafetyGates:'9 BLOCKED',
   minecraftWrites:0}
 };
 check(verifyB143Payload(payload),'GALLERY_PROVENANCE_FAIL');
 const template=fs.readFileSync(path.join(root,
  'source/ai/b143-viewer-template.html'),'utf8');
 let html=renderB143Html(payload,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B189 / MULTI MODEL · HORIZON DOCK')
  .replace('B143 AI Architecture Studio','B189 — MULTI MODEL / 本館3区画と巨大新別棟 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK + HORIZON DOCK ANNEX / 複数独立建築モデル')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '既存本館を3区画に分けて確認でき、別ローカル座標系に独立した巨大港湾型HORIZON DOCKを新設。実ワールド施工と本館連結は未認証。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,
  '<div class="info"><strong>B189 / 本館16＋独立新別棟1モジュール</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック。本館には16モジュール、別棟には'+report.annexAuthoredParts+'個の独立立体構造要素。'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。表示切替は、本館全景・北・中央・南の3区画と別棟の合計5シーン。本館12か所の境界と21地点・30接続を維持。新別棟5層の長い公共床を検証。本館と別棟の物理的接続は未認証。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b189-overview" type="button">巨大建築全景</button>'+
  '<button id="b189-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b189-low" type="button">大空洞と1階</button>'+
  '<button id="b189-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b189Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b189-overview","overview"],',
  ' ["b189-low","low"],["b189-upper","upper"],["b189-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b189Camera(mode));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b189-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B189_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B189_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B189_SAFETY_GATED_SEVENTEEN_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b189-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:2,
  newConceptModelTotalOutsideHistoric36:38,
  moduleCount:17,annexOccupiedCells:report.annexOccupiedCells,viewerSceneCount:5,
  real3dCells:compiled.primitives.length,annexReal3dCells:annex.compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:parent.report.totalAuthoredElements+annex.design.elements.length,
  htmlSha256:H(html),designFileSha256:H(fs.readFileSync(sourceFile)),
  mainModelCapUnchanged:160000,annexConnectedToMain:false,
  districtBoundaryProofCount:12,
  structuralSafetyCertified:false,minecraftActualMovementCertified:false,
  worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const m=buildB189Preview();
  console.log('B189_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B189_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
