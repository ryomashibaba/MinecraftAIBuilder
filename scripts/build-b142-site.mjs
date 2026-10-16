/**
 * B142 — from verified offline B113..B141+B106 models to a read-only,
 * reloadable GitHub Pages design viewer. No SocketBE, world, or build commands.
 * The B105 exterior is kept intact; B140/B141 layers are explicitly proposals.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../source/parallel/b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../source/parallel/b113/main/compile-b113.mjs';
import {b138Fleet,verifyB138} from '../source/parallel/b138/main/b138-five-rise-fleet.mjs';
import {b139Fleet,verifyB139} from '../source/parallel/b139/main/b139-five-rise-repair.mjs';
import {b140Fleet,verifyB140} from '../source/parallel/b140/main/b140-two-wide-gallery-bridge.mjs';
import {b141Fleet,verifyB141,writeB141} from '../source/parallel/b141/main/b141-integrated-network.mjs';
import {assembleB106,validateB106Report} from '../source/parallel/b106/main/compile-b106.mjs';
import {validateB106Scene} from '../source/parallel/b106/main/b106-review-scene.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'b142-site-output');
const hash=s=>createHash('sha256').update(s).digest('hex');
const K=p=>p.x+','+p.z;
const XYZ=p=>p.x+','+p.y+','+p.z;
export const B142_LAYERS=Object.freeze([
 'B142_PROPOSED_TWO_WIDE_CORRIDOR','B142_PROPOSED_FIVE_RISE_STAIR',
 'B142_UPPER_OPENING_REVIEW','B142_OPENING_OVERLAP_HOLD',
 'B142_JOINT_HEADROOM_HOLD'
]);

function ensure(condition,code){if(!condition)throw Error(code);}
function inject(text,needle,replacement){
 ensure(text.includes(needle),'B142_TEMPLATE_CHANGED:'+needle.slice(0,45));
 ensure(text.indexOf(needle)===text.lastIndexOf(needle),'B142_DUPLICATE_SLOT');
 return text.replace(needle,replacement);
}

/** Build a safe, visible annotation only. Does not change B105/source voxels. */
export function addB142Layers(scene,c141,c140,design){
 ensure(validateB106Scene(scene)&&c141.id===scene.id&&c140.id===scene.id&&
  design.candidateId===scene.id,'B142_UNTRUSTED_SCENE_OR_CASE');
 const layerNames=[...scene.layerNames,...B142_LAYERS];
 const out={...scene,layerNames,primitives:scene.primitives.map(p=>[...p])};
 const types=Object.fromEntries(B142_LAYERS.map(k=>[k,layerNames.indexOf(k)]));
 const seen=new Set();
 const add=(loc,kind,level)=>{
  ensure(Number.isSafeInteger(loc.x)&&Number.isSafeInteger(loc.y)&&
   Number.isSafeInteger(loc.z)&&Number.isSafeInteger(level)&&
   level>=0&&level<scene.levels,'B142_INVALID_LOCAL_COORDINATE');
  const key=XYZ(loc)+'|'+kind+'|'+level;
  if(!seen.has(key)){
   seen.add(key);out.primitives.push([loc.x,loc.y,loc.z,types[kind],level]);
  }
 };
 for(const f of c141.merged.levels)for(const p of f.novelCells)
  add({...p,y:f.level*5},'B142_PROPOSED_TWO_WIDE_CORRIDOR',f.level);
 const conflict=new Set(c141.collisions.jointHeadroomCollisionExamples.map(x=>x.voxel));
 let selected=0;
 for(const r of c140.rows){
  if(!r.selected)continue;
  selected++;
  const yUpper=5*r.toLevel;
  for(const piece of r.selected.sketch.positions){
   if(piece.kind!=='NORMAL_OAK_STAIR_CONCEPT')continue;
   const at=piece.position;
   add(at,'B142_PROPOSED_FIVE_RISE_STAIR',r.fromLevel);
   for(let dy=0;dy<=2;dy++){
    const p={...at,y:at.y+dy};
    if(p.y!==yUpper||design.plan.floors[r.toLevel].footprintRows[p.z]?.[p.x]!=='1')continue;
    const upper=design.plan.floors[r.toLevel];
    const overlaps=upper.gallery.some(x=>K(x)===K(p))||
     c141.merged.levels[r.toLevel].novelCells.some(x=>K(x)===K(p))||
     upper.rooms.some(x=>p.x>=x.x&&p.x<x.x+x.width&&p.z>=x.z&&p.z<x.z+x.depth);
    add(p,overlaps?'B142_OPENING_OVERLAP_HOLD':'B142_UPPER_OPENING_REVIEW',r.toLevel);
   }
  }
 }
 for(const k of conflict){
  const [x,y,z]=k.split(',').map(Number);
  add({x,y,z},'B142_JOINT_HEADROOM_HOLD',
   Math.min(scene.levels-1,Math.max(0,Math.floor(y/5))));
 }
 ensure(selected===c141.selectedStairs,'B142_SELECTED_STAIR_COUNT_DRIFT');
 out.stats={...scene.stats,b142Selected:selected,b142Held:c141.unresolved.length,
  b142Headroom:c141.collisions.jointHeadroomCollisionCells,
  b142Openings:c141.collisions.conceptualOpeningUniqueCells,
  b142NewGallery:c141.merged.totalUniqueNovelCells,
  b142ConceptuallyReachable:c141.network.conceptualReachableFloors.length,
  b142CollisionProven:false,b142ConstructionApproved:false};
 return out;
}

export function assertSafeInput({b141,b140,b106}){
 ensure(verifyB141(b141)&&verifyB140(b140)&&validateB106Report(b106.report),
  'B142_PARENT_INTEGRITY_OR_SAFETY_FAILURE');
 ensure(b141.pinned.B140===b140.integritySha256&&b141.cases.length===15&&
  b140.cases.length===15&&b106.scenes.length===15,'B142_PARENT_PROVENANCE_DRIFT');
 ensure(b106.scenes.every(validateB106Scene),'B142_SCENE_INTEGRITY_FAILURE');
 ensure(b141.readiness==='NOT_PREPARED'&&b141.gates.length===9&&
  b141.gates.every(g=>g.status==='BLOCKED')&&
  b141.BuildPlan.operations.length===0&&b141.executionAllowed===false&&
  b141.worldCoordinates===null,'B142_CONSTRUCTION_GATE_MUST_REMAIN_BLOCKED');
 return true;
}

export function makeB142Payload({b141,b140,b106,parent}){
 assertSafeInput({b141,b140,b106});
 ensure(parent?.sourceDesigns?.length===15,'B142_MISSING_SOURCE_DESIGNS');
 const cases=new Map(b141.cases.map(c=>[c.id,c]));
 const bridges=new Map(b140.cases.map(c=>[c.id,c]));
 const designs=new Map(parent.sourceDesigns.map(c=>[c.candidateId,c]));
 const scenes=b106.scenes.map(scene=>{
  const c=cases.get(scene.id),b=bridges.get(scene.id),d=designs.get(scene.id);
  ensure(c&&b&&d,'B142_MISSING_SOURCE_MATCH');
  return addB142Layers(scene,c,b,d);
 });
 const count=scenes.reduce((n,s)=>n+s.stats.b142Selected,0);
 ensure(count===70&&scenes.length===15&&b141.totals.floors===66&&
  b141.totals.stairs===102&&b141.totals.held===32,'B142_FLEET_COUNT_DRIFT');
 return {scenes,meta:{schema:'minecraftaibuilder-b142-offline-design-preview-v1',
  target:'MINECRAFT_EDUCATION',conceptualOnly:true,
  readyForWorld:false,constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,operations:[],
  gates:b141.gates.map(g=>g.status),
  b141IntegritySha256:b141.integritySha256,
  b140IntegritySha256:b140.integritySha256,
  b106SourceSha256:b106.report.parentB100Sha256,
  totals:b141.totals,sceneCount:scenes.length,
  limitations:['STAIR_GEOMETRY_IS_CONCEPTUAL','HEADROOM_IS_CONSERVATIVE',
   'APERTURES_AND_SUPPORTS_NOT_APPROVED','MINECRAFT_COLLISION_NOT_CERTIFIED']}};
}

export function verifyPayload(payload){
 const m=payload?.meta,t=m?.totals;
 return m?.schema==='minecraftaibuilder-b142-offline-design-preview-v1'&&
  m?.target==='MINECRAFT_EDUCATION'&&m.conceptualOnly===true&&
  m.readyForWorld===false&&m.constructionApproved===false&&
  m.executionAllowed===false&&m.worldContacts===0&&
  m.worldCoordinates===null&&Array.isArray(m.operations)&&m.operations.length===0&&
  m.gates?.length===9&&m.gates.every(s=>s==='BLOCKED')&&
  /^[a-f0-9]{64}$/.test(m.b141IntegritySha256)&&
  /^[a-f0-9]{64}$/.test(m.b140IntegritySha256)&&
  /^[a-f0-9]{64}$/.test(m.b106SourceSha256)&&
  t?.buildings===15&&t.floors===66&&t.stairs===102&&
  t.selectedIndependent===70&&t.held===32&&
  payload.scenes?.length===15&&
  new Set(payload.scenes.map(s=>s.id)).size===15&&
  payload.scenes.every(s=>s.layerNames?.slice(-B142_LAYERS.length)
   .every((name,i)=>name===B142_LAYERS[i])&&s.stats?.b142CollisionProven===false&&
   s.stats?.b142ConstructionApproved===false&&
   s.primitives?.every(p=>p.length===5&&p.every(Number.isSafeInteger)&&
    p[3]>=0&&p[3]<s.layerNames.length&&p[4]>=0&&p[4]<s.levels));
}

export function renderB142Html(payload,sourceTemplate){
 ensure(verifyPayload(payload),'B142_UNSAFE_SITE_PAYLOAD');
 let html=sourceTemplate;
 html=inject(html,
  '<h1>MinecraftAIBuilder — B106 建物全体3Dレビュー</h1>',
  '<h1>MinecraftAIBuilder <span class="b142-tag">DESIGN LIVE / B142</span></h1>');
 html=inject(html,
  'B105の実測ローカルボクセルを描画。階段・家具・屋根・窓は実Minecraftブロックとして認証されていません。',
  '15棟のB105建築概念モデル＋B140/B141階段・共用廊下・開口案。実Minecraft施工済みではなく、階段衝突・上階開口・支持床は未承認です。');
 html=inject(html,'<title>MinecraftAIBuilder — B106 3D Design Review</title>',
  '<title>MinecraftAIBuilder | B142 Design Live</title>');
 html=inject(html,'</style>',[
  '.b142-tag{font-size:.65rem;font-weight:800;color:#7ce4c5;background:#183d43;',
  'padding:6px 9px;border:1px solid #2a827f;border-radius:5px;vertical-align:middle}',
  '.b142-footer{padding:12px;margin-top:10px;background:#152c37;',
  'border-left:3px solid #60d3be;border-radius:6px;font-size:.81rem;line-height:1.65}',
  '</style>'
 ].join(''));
 html=inject(html,'<h2>表示モード</h2>',
  '<h2>表示モード</h2><div class="b142-footer">モデルはGitHub Actionsから生成。ページ再読み込みで最新の公開版に更新します。<strong> NOT_PREPARED / 9 BLOCKED</strong></div>');
 html=inject(html,'<div class="note">\nマウスドラッグ',[
  '<h2>新しい設計レイヤー（B142）</h2>',
  '<label class="toggle"><input type="checkbox" data-layer="B142_PROPOSED_TWO_WIDE_CORRIDOR" checked> 追加予定の幅2廊下</label>',
  '<label class="toggle"><input type="checkbox" data-layer="B142_PROPOSED_FIVE_RISE_STAIR" checked> 5ブロック上昇階段案</label>',
  '<label class="toggle"><input type="checkbox" data-layer="B142_UPPER_OPENING_REVIEW" checked> 上階開口（未承認）</label>',
  '<label class="toggle"><input type="checkbox" data-layer="B142_OPENING_OVERLAP_HOLD" checked> 開口と廊下等の重複</label>',
  '<label class="toggle"><input type="checkbox" data-layer="B142_JOINT_HEADROOM_HOLD" checked> 階段頭上の干渉</label>',
  '<div class="note">\nマウスドラッグ'
 ].join('\n'));
 html=inject(html,'<footer id="renderInfo"></footer>',
  '<footer id="renderInfo"></footer><div class="b142-footer" id="b142Meta"></div>');
 html=inject(html,'const facadePalettes=',[
  'kindColors.B142_PROPOSED_TWO_WIDE_CORRIDOR="#42f5b2";',
  'kindColors.B142_PROPOSED_FIVE_RISE_STAIR="#f5c45d";',
  'kindColors.B142_UPPER_OPENING_REVIEW="#fa8ac0";',
  'kindColors.B142_OPENING_OVERLAP_HOLD="#fd6058";',
  'kindColors.B142_JOINT_HEADROOM_HOLD="#f92e5d";',
  'const facadePalettes='
 ].join('\n'));
 html=inject(html,'const counts=[',[
  'const counts=[',
  '["B142の階段接続案",s.stats.b142Selected+"件"],',
  '["未解決の階段",s.stats.b142Held+"件"],',
  '["追加の廊下セル",s.stats.b142NewGallery+"個"],',
  '["頭上干渉セル",s.stats.b142Headroom+"個"],',
  '["上階開口の検討セル",s.stats.b142Openings+"個"],',
  '["概念的に接続する階床",s.stats.b142ConceptuallyReachable+"/"+s.levels],'
 ].join('\n'));
 html=inject(html,'const p=v.p,thickness=p[3]>=5?0.09:1,baseY=p[1],topY=baseY+thickness;',
  'const p=v.p,thickness=v.kind==="B142_PROPOSED_FIVE_RISE_STAIR"?0.8:p[3]>=5?0.12:1,baseY=p[1],topY=baseY+thickness;');
 html=inject(html,'const opacity=v.kind==="EXTERIOR_PORTAL_VOID_PROXY"?0.24:v.kind==="WINDOW_GLAZING_PROXY"?0.8:1;',
  'const opacity=v.kind==="EXTERIOR_PORTAL_VOID_PROXY"?0.24:v.kind==="WINDOW_GLAZING_PROXY"?0.8:v.kind==="B142_UPPER_OPENING_REVIEW"?0.65:1;');
 html=inject(html,'<script>\n"use strict";','<script>\n"use strict";');
 html=inject(html,'const scenes=payload.scenes;',[
  'const scenes=payload.scenes;',
  'document.getElementById("b142Meta").textContent="B141 source SHA256: "+payload.meta.b141IntegritySha256.slice(0,16)+" / 15棟・66階床・102階段。表示はローカル座標の設計案。Minecraftへの接続・施工コマンドはありません。";'
 ].join('\n'));
 const json=JSON.stringify(payload).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 html=inject(html,'__B106_SCENE_PAYLOAD__',json);
 ensure(!html.includes('__B106_SCENE_PAYLOAD__')&&!html.includes('fetch('),
  'B142_ONLINE_SCRIPT_OR_TEMPLATE_SLOT');
 return html;
}

export function verifyOutput(outDir=OUT){
 const manifest=JSON.parse(fs.readFileSync(path.join(outDir,'manifest.json'),'utf8'));
 const html=fs.readFileSync(path.join(outDir,'index.html'),'utf8');
 ensure(manifest?.schema==='b142-preview-manifest-v1'&&
  /^[a-f0-9]{64}$/.test(manifest.b141IntegritySha256)&&
  manifest.htmlSha256===hash(html)&&manifest.buildingCount===15&&
  manifest.constructionApproved===false&&manifest.worldOperations===0&&
  manifest.gateStatuses?.length===9&&
  manifest.gateStatuses.every(g=>g==='BLOCKED')&&
  html.includes('B142_PROPOSED_FIVE_RISE_STAIR')&&
  html.includes('NOT_PREPARED / 9 BLOCKED')&&
  html.includes(manifest.b141IntegritySha256),'B142_PUBLISHED_ARTIFACT_UNVERIFIED');
 return manifest;
}

export async function buildB142(outDir=OUT){
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 ensure(validateB113(b113),'B142_B113_INVALID');
 const b138=b138Fleet(parent,b113);
 ensure(verifyB138(b138),'B142_B138_INVALID');
 const b139=b139Fleet(parent,b113,b138);
 ensure(verifyB139(b139),'B142_B139_INVALID');
 const b140=b140Fleet(parent,b113,b138,b139);
 ensure(verifyB140(b140),'B142_B140_INVALID');
 const b141=b141Fleet(parent,b113,b138,b139,b140);
 ensure(verifyB141(b141),'B142_B141_INVALID');
 writeB141(b141);
 const b106=assembleB106();
 const payload=makeB142Payload({b141,b140,b106,parent});
 const template=fs.readFileSync(path.join(ROOT,
  'source/parallel/b106/main/review-template.html'),'utf8');
 const html=renderB142Html(payload,template);
 fs.mkdirSync(outDir,{recursive:true});
 fs.writeFileSync(path.join(outDir,'index.html'),html);
 const manifest={schema:'b142-preview-manifest-v1',buildingCount:15,
  b141IntegritySha256:b141.integritySha256,
  htmlSha256:hash(html),
  worldOperations:0,constructionApproved:false,
  gateStatuses:b141.gates.map(g=>g.status)};
 fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 ensure(JSON.stringify(verifyOutput(outDir))===JSON.stringify(manifest),
  'B142_OUTPUT_POSTWRITE_MISMATCH');
 return {manifest,totals:b141.totals,outputDir:outDir};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  console.log(JSON.stringify(process.argv.includes('--verify')?
   verifyOutput():await buildB142(),null,2));
 }catch(e){console.error('B142_HOLD:',e.message);process.exitCode=1;}
}
