/**
 * B194 standalone offline 3D city-scale architectural viewer.
 * Based on the existing B143 orbitable 2D-canvas projection renderer.
 * No need for the cancelled inherited B167/B169 full Pages source chain:
 * source-deterministic single-model page in one CI artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB194} from '../source/ai/b194-junction-inspector.mjs';
import {MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {surfaceOnly,verifyB143Payload,renderB143Html}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'b194-evidence');
const H=x=>createHash('sha256').update(x).digest('hex');
const check=(x,reason)=>{if(!x)throw Error('B194_PREVIEW_'+reason)};
export function buildB194Preview({dir=out}={}){
 const {b192,models,readOnlyScene,report,junctions}=buildB194();
 const {parent,annex,manifest:multimodel,gateway,candidates,chosen,other,bridge}=b192;
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
 const bridgeSurf=surfaceOnly(bridge.compiled);
 check(bridgeSurf.length>100,'SKYBRIDGE_SURFACE_MISSING');
 const {primitives:bridgeVoxels,...bridgeRest}=bridge.compiled;
 const annexSurf=surfaceOnly(annex.compiled);
 check(annexSurf.length>500,'ANNEX_SURFACE_MISSING');
 const {primitives:annexVoxels,...annexRest}=annex.compiled;
 // Seven views represent THREE independently authored B143 models.
 // Virtual city scene is VIEW-ONLY, with per-source partition tags.
 const groups=[{model:models[0],surface:surfaceOnly(parent.compiled)},
  {model:models[1],surface:annexSurf},
  {model:models[2],surface:bridgeSurf}];
 let cursor=0;
 const reviewGroups=groups.map(({model,surface})=>{
  const start=cursor;cursor+=surface.length;
  return {id:model.id,start,end:cursor,xOffset:model.offset.x,
   sourceVoxelCount:model.sourceVoxelCount};
 });
 const virtualSurface=groups.flatMap(({model,surface})=>
  surface.map(([x,y,z,m,level])=>[x+model.offset.x,y+model.offset.y,z+model.offset.z,m,level]));
 check(virtualSurface.length===cursor&&virtualSurface.length>125000,'VIRTUAL_RENDER_SOURCE_MISSING');
 const {primitives:ignoredVirtualFullCells,...virtualMeta}=readOnlyScene;
 const cityScene={...virtualMeta,surface:virtualSurface,reviewGroups,
  stats:{...virtualMeta.stats,renderedSurfaceCells:virtualSurface.length}};
 const surface=surfaceOnly(compiled),{primitives,...rest}=compiled;
 check(surface.length>3000&&surface.length<=primitives.length,'NO_SURFACE_GEOMETRY');
 const payload={
  schema:'minecraftaibuilder-b143-gallery-v1',
  edition:'MINECRAFT_EDUCATION',
  sourceHashes:[compiled.sourceSha256,
   ...districtScenes.map(s=>s.sourceSha256),annex.compiled.sourceSha256,bridge.compiled.sourceSha256,readOnlyScene.sourceSha256],
  geometryHashes:[compiled.geometrySha256,
   ...districtScenes.map(s=>s.geometrySha256),annex.compiled.geometrySha256,bridge.compiled.geometrySha256,readOnlyScene.geometrySha256],
  scenes:[{...rest,surface,
   stats:{...compiled.stats,renderedSurfaceCells:surface.length}},
   ...districtScenes,
   {...annexRest,surface:annexSurf,
    title:'HORIZON DOCK ANNEX — 独立した新しい巨大港湾施設',
    brief:'別ローカル座標系の新規建築。NEBULA ARK本館との実施工・物理的接続は未認証。',
    stats:{...annex.compiled.stats,renderedSurfaceCells:annexSurf.length}},
   {...bridgeRest,surface:bridgeSurf,
    title:'CELESTIAL SKYBRIDGE — 立体発光連絡橋（設計上の独立施設）',
    brief:'Y69の実ソース経路を基礎にした独立B143設計。大きな光る軌道環、ガラス壁、吊り下げ梁、トラス。実際のMinecraftへの接続・配置・歩行安全性は未認証。',
    stats:{...bridge.compiled.stats,renderedSurfaceCells:bridgeSurf.length}},
   cityScene],
  safety:{constructionApproved:false,executionAllowed:false,
   readiness:'NOT_PREPARED',worldCoordinates:null,worldContacts:0,
   BuildPlan:{operations:[]},original15BuildingSafetyGates:'9 BLOCKED',
   minecraftWrites:0}
 };
 check(verifyB143Payload(payload),'GALLERY_PROVENANCE_FAIL');
 const template=fs.readFileSync(path.join(root,
  'source/ai/b143-viewer-template.html'),'utf8');
 let html=renderB143Html(payload,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B194 / JUNCTION COLOR INSPECTOR')
  .replace('B143 AI Architecture Studio','B194 — CITYSCAPE JUNCTION / 3棟の色分けと橋の両端検証')
  .replace('ChatGPTが設計した新規建築','NEBULA ARK + HORIZON DOCK ANNEX / 複数独立建築モデル')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '7シーンで本館・別棟・連絡橋と3棟の仮想都市全景を切り替え。別棟の仮想配置と2幅の連絡橋は設計座標だけで検証。ワールド配置と実機歩行は未認証。')
  .replace('既存15棟の設計レビュー →','既存15棟の概念レビュー →');
 // Add read-only part visibility to just the seventh virtual-view scene.
 // Color tags derived from the already-verified 3 original voxel source groups.
 // A WeakMap holds references to existing pixel cells; never mutate material
 // indices or arrays, preserve all seven original source material filters.
 const entry='let index=0,yaw=.72,pitch=.58,zoom=1,pressed=false,last=[0,0],queued=false;';
 check(html.includes(entry),'B194_VIEWER_STATE_HOOK');
 html=html.replace(entry,entry+
  '\nlet b194Target=null;'+
  '\nconst b194Owner=new WeakMap();'+
  '\nconst b194Colors={"nebula-ark-main":"#69c8ff","horizon-dock-annex":"#ffbe73","celestial-skybridge":"#d498ff"};'+
  '\nfor(const g of names[6].reviewGroups)for(let i=g.start;i<g.end;i++)b194Owner.set(names[6].surface[i],g.id);');
 const colorHook='const color=palette[m]||"#aabbcc",height=1;';
 check(html.includes(colorHook),'B194_VOXEL_MATERIAL_HOOK');
 html=html.replace(colorHook,
  'const color=(s.virtualReviewOnly&&el("b194-color-by-model").checked?b194Colors[b194Owner.get(p)]:null)||palette[m]||"#aabbcc",height=1;');
 const cameraHook='const c=[(s.bounds.minX+s.bounds.maxX+1)/2,(s.bounds.minY+s.bounds.maxY+1)/2,(s.bounds.minZ+s.bounds.maxZ+1)/2];';
 check(html.includes(cameraHook),'B194_SOURCE_CAMERA_HOOK');
 html=html.replace(cameraHook,
  'const c=(s.virtualReviewOnly&&b194Target)?b194Target:['+
  '(s.bounds.minX+s.bounds.maxX+1)/2,(s.bounds.minY+s.bounds.maxY+1)/2,(s.bounds.minZ+s.bounds.maxZ+1)/2];');
 const markersHook='ctx.globalAlpha=1;\n el("meta").textContent=';
 check(html.includes(markersHook),'B194_CANVAS_SOURCE_MARKER_HOOK');
 const marks=JSON.stringify(junctions.terminalRegions.map(r=>({
  x:r.x,y:r.y,z:r.z,id:r.id,label:r.label})));
 html=html.replace(markersHook,
  'ctx.globalAlpha=1;\n'+
  'if(s.virtualReviewOnly&&el("b194-show-terminals").checked){'+
  'const marks='+marks+';'+
  'for(const mark of marks){'+
  'const p=project(mark.x+.5,mark.y+.7,mark.z+.5);'+
  'ctx.beginPath();ctx.arc(p[0],p[1],6,0,Math.PI*2);'+
  'ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#081e30";ctx.lineWidth=2;ctx.stroke();'+
  'ctx.font="bold 13px sans-serif";ctx.textAlign="left";'+
  'ctx.lineWidth=4;ctx.strokeStyle="#061626";ctx.strokeText(mark.label,p[0]+9,p[1]-10);'+
  'ctx.fillStyle="#e7fcff";ctx.fillText(mark.label,p[0]+9,p[1]-10);'+
  '}'+
  '}\n el("meta").textContent=');
 const sourceFilter='active=s.surface.filter(p=>p[4]<=limit&&visibleMaterials.has(s.layerNames[p[3]]));';
 check(html.includes(sourceFilter),'ORIGINAL_CANVAS_DRAW_HOOK');
 html=html.replace(sourceFilter,
  'active=s.surface.filter((p,i)=>p[4]<=limit&&visibleMaterials.has(s.layerNames[p[3]])&&'+
  '(!s.virtualReviewOnly||!s.reviewGroups||s.reviewGroups.some(g=>'+
  'i>=g.start&&i<g.end&&document.getElementById("b194-show-"+g.id)?.checked!==false)));');
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
  '<div id="b194-route-'+c.standingY+'" data-standing-y="'+c.standingY+'"'+
  ' style="'+(c.standingY===chosen.standingY?'':'display:none;')+'">'+
  '<p>設計上の高さ <strong>Y'+c.standingY+'</strong> ｜通路：'+c.metrics.sourceSteps+
  '移動 ｜曲がり角：'+c.metrics.turns+
  ' ｜追加床：'+c.newFloorCells+'セル ｜経路の近隣障害物：'+
  c.metrics.minimalSideClearanceBodyNeighbours+'件 ｜比較スコア：'+
  c.metrics.sourceScore+'</p>'+
  routeSvg(c)+'</div>').join('');
 const gatewayPanel='<section id="b194-gateway-proof" class="info">'+
  '<strong>B194 — Y69連絡橋の実立体設計と2経路比較</strong>'+
  '<p>配置基準：OFFLINE_REVIEW_COORDINATES｜元の2モデル重複0｜'+
  '従来候補Y73・Y61は経路なし・HOLD｜Y69・Y65は設計上の通路候補PASS</p>'+
  '<div class="controls" role="group" aria-label="比較する高さ">'+
  '<button id="b194-level-69" type="button" aria-pressed="'+(chosen.standingY===69)+'">Y69 の通路</button>'+
  '<button id="b194-level-65" type="button" aria-pressed="'+(chosen.standingY===65)+'">Y65 の通路</button></div>'+
  comparison+
  '<p>優先候補：<strong>Y'+chosen.standingY+
  '</strong>（設計上の移動数・曲がり角・追加床の比較スコアによる選定）</p>'+
  '<p><strong>追加した橋：</strong>別の厳格なB143建築として'+bridge.compiled.primitives.length+
  '個の実際の3Dボクセルを独立生成。源流2モデルとの干渉0、Y69幅2・頭上2の通路31地点を再検証。</p>'+
  '<p><strong>未認証：</strong>実際のMinecraft Educationへの配置、橋の施工、衝突、落下安全性、プレイヤー移動。'+
  '個々の建築の16万ボクセル上限を維持し、接続案を実施工命令には変換していません。</p></section>';
 const cityscapePanel='<section id="b194-cityscape-panel" class="info">'+
  '<strong>B194 — 3棟を見渡す都市全景</strong>'+
  '<p>OFFLINE_REVIEW_COORDINATES（実ワールド座標ではありません）。'+
  '本館142,773＋別棟19,152＋橋891＝合計162,816ボクセル。'+
  'それぞれ独立した3モデルです。ひとつの160,000セル制限を超える建築としてコンパイルしていません。</p>'+
  '<p>設計上の全体の横幅：'+report.horizontalTotalReviewSpan+
  'ブロック｜本館と別棟のX方向の外装間隔：'+report.buildingEnvelopeEmptyXGap+
  'ブロック｜3モデル同士の重複：'+report.originalSourceVoxelIntersectionCount+
  'セル｜連絡橋の幅2経路：31地点</p>'+
  '<p>7番目の「3棟都市全景」シーンだけに次の表示設定が適用されます。</p>'+
  '<label class="toggle"><input id="b194-show-nebula-ark-main" type="checkbox" checked>NEBULA ARK本館</label>'+
  '<label class="toggle"><input id="b194-show-horizon-dock-annex" type="checkbox" checked>HORIZON DOCK別棟</label>'+
  '<label class="toggle"><input id="b194-show-celestial-skybridge" type="checkbox" checked>CELESTIAL SKYBRIDGE</label>'+
  '<div class="controls"><button type="button" id="b194-cityscape-focus">都市全景にフォーカス</button>'+
  '<button type="button" id="b194-bridge-focus">連絡橋にフォーカス</button></div>'+
  '<p><strong>施工禁止：</strong>地形、Minecraft Education内の実移動・安全性・施工座標は未認証。'+
  'NOT_PREPARED / 9ゲートすべてBLOCKED。</p></section>';
 const junctionRows=junctions.terminalRegions.map(r=>
  '<div class="stats"><span>'+r.label+'</span><strong>'+
  r.sourceVoxelCountsByModel.join(' / ')+'セル</strong></div>').join('');
 const inspectorPanel='<section id="b194-junction-inspector" class="info">'+
  '<strong>B194 — 都市全景カラー・連絡橋の両端レビュー</strong>'+
  '<p>色分けは描画だけです。建築の材質や設計ボクセルを変更しません。</p>'+
  '<label class="toggle"><input id="b194-color-by-model" type="checkbox" checked>都市全景を建物ごとに色分け</label>'+
  '<p>水色：本館／橙色：HORIZON DOCK／紫色：CELESTIAL SKYBRIDGE</p>'+
  '<label class="toggle"><input id="b194-show-terminals" type="checkbox" checked>接続点3か所のラベルを立体表示</label>'+
  '<div class="controls"><button id="b194-focus-main" type="button">本館側の接続部</button>'+
  '<button id="b194-focus-annex" type="button">別棟側の接続部</button></div>'+
  '<button id="b194-focus-whole" type="button">都市全景に戻す</button>'+
  '<p>幅2床・頭上2セルの検証：<strong>Y69の31地点でPASS</strong>。'+
  '接続両端の支持床はそれぞれ元の建物ソースだけで4/4 PASS。</p>'+
  '<p>各点の周辺3D占有セル数（本館／別棟／独立橋）：</p>'+junctionRows+
  '<p><strong>注意：</strong>OFFLINE_REVIEW_COORDINATES での設計上の接続点です。'+
  'Minecraft Educationでの実施工・地形・プレイヤー衝突・落下安全性は未認証。'+
  'NOT_PREPARED / 9ゲートBLOCKEDを維持。</p></section>';
 const insert='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(insert),'CONTROL_HOOK');
 html=html.replace(insert,gatewayPanel+cityscapePanel+inspectorPanel+insert);
 html=html.replace(insert,
  '<div class="info"><strong>B194 / 本館16＋独立新別棟1＋独立スカイブリッジ1モジュール</strong><p>高さ約'+
  (compiled.bounds.maxY-compiled.bounds.minY+1)+
  'ブロック。本館には16モジュール、別棟には'+annex.design.elements.length+'個の独立立体構造要素。'+
  compiled.primitives.length.toLocaleString('ja-JP')+
  'ボクセル。新しいモデルはGitHubで実際に生成されています。</p>'+
  '<p>下層102移動・上層98移動の2×2平面通路は保持。表示切替は、本館全景・3区画・別棟・独立橋・3棟全景の合計7シーン。本館12か所の境界と21地点・30接続を維持。新別棟5層の長い公共床を検証。本館と別棟の物理的接続は未認証。</p></div>'+
  '<h2 style="margin-top:20px">フォーカス表示</h2>'+
  '<div class="controls"><button id="b194-overview" type="button">巨大建築全景</button>'+
  '<button id="b194-upper" type="button">中層から内部</button></div>'+
  '<div class="controls"><button id="b194-low" type="button">大空洞と1階</button>'+
  '<button id="b194-ring" type="button">巨大軌道環</button></div>'+
  insert);
 const starter='\nsetScene();\n</script>';
 check(html.includes(starter),'SETUP_HOOK');
 html=html.replace(starter,[
  '',
  'function b194Camera(mode){',
  ' if(mode==="low"){yaw=.43;pitch=.37;zoom=1.5;all.checked=false;floor.value="4";}',
  ' else if(mode==="upper"){yaw=.71;pitch=.53;zoom=1.25;all.checked=false;floor.value="9";}',
  ' else if(mode==="ring"){yaw=1.1;pitch=.20;zoom=1.15;all.checked=true;}',
  ' else{yaw=.72;pitch=.58;zoom=1;all.checked=true;}',
  ' updateFloor();drawSoon();',
  '}',
  'for(const [id,mode] of [["b194-overview","overview"],',
  ' ["b194-low","low"],["b194-upper","upper"],["b194-ring","ring"]])',
  ' el(id).addEventListener("click",()=>b194Camera(mode));',
  'function b194SelectRoute(y){',
  ' for(const n of [69,65]){',
  '  document.getElementById("b194-route-"+n).style.display=n===y?"block":"none";',
  '  document.getElementById("b194-level-"+n).setAttribute("aria-pressed",String(n===y));',
  ' }',
  '}',
  'for(const level of [69,65]) el("b194-level-"+level).addEventListener("click",()=>b194SelectRoute(level));',
  'for(const k of ["nebula-ark-main","horizon-dock-annex","celestial-skybridge"]){',
  ' el("b194-show-"+k).addEventListener("change",drawSoon);',
  '}',
  'el("b194-cityscape-focus").addEventListener("click",()=>{',
  ' index=6;select.value="6";setScene();yaw=.70;pitch=.48;zoom=1.15;drawSoon();',
  '});',
  'el("b194-bridge-focus").addEventListener("click",()=>{',
  ' index=6;select.value="6";setScene();yaw=.74;pitch=.42;zoom=2.4;drawSoon();',
  '});',
    'for(const id of ["b194-color-by-model","b194-show-terminals"])', 
  ' el(id).addEventListener("change",drawSoon);',
  'function b194Focus(x,y,z,scale){',
  ' index=6;select.value="6";setScene();b194Target=[x,y,z];',
  ' yaw=.8;pitch=.55;zoom=scale;drawSoon();',
  '}',
  'el("b194-focus-main").addEventListener("click",()=>b194Focus(108,69,29,3));',
  'el("b194-focus-annex").addEventListener("click",()=>b194Focus(136,69,31,3));',
  'el("b194-focus-whole").addEventListener("click",()=>{',
  ' index=6;select.value="6";b194Target=null;setScene();zoom=1.12;drawSoon();',
  '});',
  'setScene();',
  '</script>'
 ].join('\n'));
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__')&&
  html.includes('id="b194-ring"')&&
  html.includes('NOT_PREPARED'),'EXTERNAL_OR_SECURITY_HOLD');
 fs.mkdirSync(dir,{recursive:true});
 const htmlFile=path.join(dir,'index.html'),
  sourceFile=path.join(dir,'B194_DESIGN_MODULES.json'),
  manifestFile=path.join(dir,'B194_3D_PREVIEW_MANIFEST.json');
 fs.writeFileSync(htmlFile,html);
 fs.writeFileSync(sourceFile,JSON.stringify({schema:'B194_SAFETY_GATED_EIGHTEEN_MODULE_COMPOSITION',modules:[parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.previous.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.parent.design,parent.parent.parent.parent.parent.design,parent.parent.parent.parent.design,parent.parent.parent.design,parent.parent.design,parent.design,design,bridge.design],policy:'parent-wins-overlap'},null,2)+'\n');
 const manifest={
  schema:'minecraftaibuilder-b194-3d-preview-v1',
  modelId:compiled.id,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  numberOfActualNew3dScenes:3,
  newConceptModelTotalOutsideHistoric36:39,
  moduleCount:18,annexOccupiedCells:report.originalAnnexCells,bridge3dCells:report.originalBridgeCells,viewerSceneCount:7,
  terminalInspectorStations:junctions.sourceRouteStations,terminalInspectorSourceDigest:junctions.terminalProofSha256,
  gatewayStations:chosen.strictFootprints,
  gatewayReviewStatus:chosen.levelStatus,
  comparedStandingY:[69,65],preferredStandingY:chosen.standingY,bridgeSource2WideStations:report.originalY69Route2WideStations,bridgeDesignOnly:true,
  primaryRouteSteps:chosen.metrics.sourceSteps,alternativeRouteSteps:other.metrics.sourceSteps,
  comparedRouteDataSha256:H(chosen.sourcePathSha256+other.sourcePathSha256),
  gatewayProposalOnly:true,
  real3dCells:compiled.primitives.length,annexReal3dCells:annex.compiled.primitives.length,bridgeReal3dCells:bridge.compiled.primitives.length,
  surfaceCells:surface.length,authoredElements:parent.report.totalAuthoredElements+annex.design.elements.length+bridge.design.elements.length,
  htmlSha256:H(html),designFileSha256:H(fs.readFileSync(sourceFile)),
  mainModelCapUnchanged:160000,annexConnectedToMain:false,
  districtBoundaryProofCount:12,
  sourceOnlyColorReview:true,terminalFocusCount:junctions.terminalRegions.length,
  sourceOnlyTerminalLabels:true,
  cityscapeReadOnly:true,cityscapeVoxelsAcrossModels:report.virtualViewCells,
  cityscapeXSpan:report.horizontalTotalReviewSpan,
  cityscapeOverlaps:report.originalSourceVoxelIntersectionCount,
  cityscapeGeometrySha256:report.cityscapeReviewSha256,
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
  const m=buildB194Preview();
  console.log('B194_3D_PREVIEW',JSON.stringify(m));
 }catch(e){console.error('B194_PREVIEW_HOLD',e.message);process.exitCode=1;}
}
