/**
 * B191 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB191} from '../source/ai/b191-route-compare.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b191-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B191_PREVIEW_'+reason)};
export function buildB191Preview({dir=out}={}){
 const {parent,annex,manifest:multimodel,gateway,candidates,chosen,other,report}=buildB191();
 const compiled=parent.compiled,design=annex.design;
 const districts=multimodel.scenes.slice(1,4);
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
  .replace('B143 / UNIVERSAL AI DESIGN','B191 / TWO-ROUTE SOURCE COMPARISON')
  .replace('B143 AI Architecture Studio','B191 — TWO-ROUTE COMPARISON / 2棟の連絡橋候補を比較 3D Studio')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK + HORIZON DOCK ANNEX / 複数独立建築モデル')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '5シーンを切り替えて本館と別棟を確認。別棟の仮想配置と2幅の連絡橋は設計座標だけで検証。ワールド配置と実機歩行は未認証。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 // Only a review result: a verified geometry proposal is not a Minecraft
 // placement, walkability claim, world coordinate, or construction plan.
 const escapeAttr=n=>String(n);
 const routeSvg=(candidate)=>{
  // Actual source positions and blocked 2x2 standing squares in a top
  // projection, NOT fabricated screenshot or real-world map.
  const sx=x=>26+(x-100)*17,sz=z=>8+z*7;
  const blockers=candidate.mapBlockedNearPath.map(([x,z])=>
   '<rect x="'+sx(x)+'" y="'+sz(z)+'" width="9" height="5" fill="#fb7185" opacity=".48"/>').join('');
  const polyline=candidate.path.map(([x,z])=>sx(x)+','+sz(z)).join(' ');
  const a=candidate.path[0],b=candidate.path.at(-1);
  return '<svg aria-label="設計座標上のY'+candidate.standingY+'通路図" role="img"'+
   ' viewBox="0 0 760 360" style="display:block;width:100%;background:#101d30;border-radius:12px">'+
   '<rect x="'+sx(100)+'" y="3" width="'+(sx(124)-sx(100))+'" height="348" fill="#263e57" opacity=".48"/>'+
   '<rect x="'+sx(132)+'" y="3" width="'+(760-sx(132))+'" height="348" fill="#24574f" opacity=".48"/>'+
   '<text x="40" y="20" fill="#c2e7ff" font-size="13">NEBULA ARK｜本館</text>'+
   '<text x="'+sx(132)+'" y="20" fill="#bdfce9" font-size="12">HORIZON DOCK</text>'+
   blockers+
   '<polyline points="'+polyline+'" fill="none" stroke="#3ce6d0" stroke-width="5"'+
   ' stroke-linejoin="round" stroke-linecap="round"/>'+
   '<circle cx="'+sx(a[0])+'" cy="'+sz(a[1])+'" r="6" fill="#a9b9ff" stroke="#fff"/>'+
   '<circle cx="'+sx(b[0])+'" cy="'+sz(b[1])+'" r="6" fill="#f8d78b" stroke="#fff"/>'+
   '<text x="29" y="348" fill="#d4d9e5" font-size="12">水色＝幾何検証済み候補　赤＝周囲の障害物　これは実ワールド地図ではありません</text>'+
   '</svg>';
 };
 const comparison=candidates.map(c=>
  '<div id="b191-route-'+c.standingY+'" data-standing-y="'+c.standingY+'"'+
  ' style="'+(c.standingY===chosen.standingY?'':'display:none;')+'">'+
  '<p>設計上の高さ <strong>Y'+c.standingY+'</strong> ｜通路：'+c.metrics.sourceSteps+
  '移動 ｜曲がり角：'+c.metrics.turns+
  ' ｜追加床：'+c.newFloorCells+'セル ｜経路の近隣障害物：'+
  c.metrics.minimalSideClearanceBodyNeighbours+'件 ｜比較スコア：'+
  c.metrics.sourceScore+'</p>'+
  routeSvg(c)+'</div>').join('');
 const gatewayPanel='<section id="b191-gateway-proof" class="info">'+
  '<strong>B191 — 本館と別棟の2経路を独立比較</strong>'+
  '<p>配置基準：OFFLINE_REVIEW_COORDINATES｜元の2モデル重複0｜'+
  '従来候補Y73・Y61は経路なし・HOLD｜Y69・Y65は設計上の通路候補PASS</p>'+
  '<div class="controls" role="group" aria-label="比較する高さ">'+
  '<button id="b191-level-69" type="button" aria-pressed="'+(chosen.standingY===69)+'">Y69 の通路</button>'+
  '<button id="b191-level-65" type="button" aria-pressed="'+(chosen.standingY===65)+'">Y65 の通路</button></div>'+
  comparison+
  '<p>優先候補：<strong>Y'+chosen.standingY+
  '</strong>（設計上の移動数・曲がり角・追加床の比較スコアによる選定）</p>'+
  '<p><strong>未認証：</strong>実際のMinecraft Educationへの配置、橋の施工、衝突、落下安全性、プレイヤー移動。'+
  '個々の建築の16万ボクセル上限を維持し、接続案を実施工命令には変換していません。</p></section>';
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,gatewayPanel+insert);
 html=html.replace(insert,
  '<div class="info"><strong>B191 / 本館16＋独立新別棟1モジュール</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック。本館には16モジュール、別棟には'+annex.design.elements.length+'個の独立立体構造要素。'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。表示切替は、本館全景・北・中央・南の3区画と別棟の合計5シーン。本館12か所の境界と21地点・30接続を維持。新別棟5層の長い公共床を検証。本館と別棟の物理的接続は未認証。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b191-overview" type="button">巨大建築全景</button>'+
  '<button id="b191-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b191-low" type="button">大空洞と1階</button>'+
  '<button id="b191-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b191Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b191-overview","overview"],',
  ' ["b191-low","low"],["b191-upper","upper"],["b191-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b191Camera(mode));',
  'function b191SelectRoute(y){',
  ' for(const n of [69,65]){',
  '  document.getElementById("b191-route-"+n).style.display=n===y?"block":"none";',
  '  document.getElementById("b191-level-"+n).setAttribute("aria-pressed",String(n===y));',
  ' }',
  '}',
  'for(const level of [69,65]) el("b191-level-"+level).addEventListener("click",()=>b191SelectRoute(level));',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b191-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B191_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B191_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B191_SAFETY_GATED_SEVENTEEN_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b191-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:2,
  newConceptModelTotalOutsideHistoric36:38,
  moduleCount:17,annexOccupiedCells:report.annexCells,viewerSceneCount:5,
  gatewayStations:chosen.strictFootprints,
  gatewayReviewStatus:chosen.levelStatus,
  comparedStandingY:[69,65],preferredStandingY:chosen.standingY,
  primaryRouteSteps:report.primarySourceSteps,alternativeRouteSteps:report.otherSourceSteps,
  comparedRouteDataSha256:report.routeDataSha256,
  gatewayProposalOnly:true,
  real3dCells:compiled.primitives.length,annexReal3dCells:annex.compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:parent.report.totalAuthoredElements+annex.design.elements.length,
  htmlSha256:H(html),designFileSha256:H(fs.readFileSync(sourceFile)),
  mainModelCapUnchanged:160000,annexConnectedToMain:false,
  districtBoundaryProofCount:12,
  sourceReviewOnly:true,physicalBridgeCertified:false,
  structuralSafetyCertified:false,minecraftActualMovementCertified:false,
  worldWrites:0,constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const m=buildB191Preview();
  console.log('B191_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B191_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
