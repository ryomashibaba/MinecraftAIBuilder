/**
 * R78 — architecture-first spatial PROGRAM SPECIFICATION, not 3D geometry.
 * Enforces coherence of a proposed narrative/program graph; no dimensions,
 * blocks, world coordinates, fabricated route metrics or inference approvals.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR77FutureArchitecturalBrief,SCHEMA as R77_SCHEMA}
 from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
export const SCHEMA='minecraftaibuilder-b198zr78-spatial-program-spec-v1';
const fail=msg=>{throw Error('B198ZR78_'+msg)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const SITE=Object.freeze([
 {id:'SEASIDE_APPROACH',layer:'LOWER',type:'public_outdoor_arrival',
  purpose:'海辺の公共歩行空間から誰でも発見できる正面入口へ',
  designObligation:'前庭・入口・公共ホールの連続的な床と視線を計画。海岸線と地面標高は未確定'},
 {id:'ENTRY_FORUM',layer:'LOWER',type:'occupied_civic_room',
  purpose:'図書館の入口と案内・待合・左右に分岐する公共ホール',
  designObligation:'閉塞のない出入口、支持床、書架側と上層動線側への接続。見えるだけのダミー室は禁止'},
 {id:'CENTRAL_SKY_ATRIUM',layer:'LOWER_TO_ROOF',type:'protected_negative_space',
  purpose:'低層の公共空間から屋根高まで続く光と視線の主空洞',
  designObligation:'大きい立体的な空気の連続性を守る。上階床で中心を塞がず、単なる中実壁の隙間にしない'},
 {id:'LEFT_BOOK_WING',layer:'LOWER_TO_UPPER',type:'occupied_reading_stacks',
  purpose:'左の曲面外殻の厚みから生まれる書架・閲覧段丘と静かな読書空間',
  designObligation:'読書のための支持床と頭上空間、棚前の使用領域、上下閲覧段丘への実動線'},
 {id:'RIGHT_BOOK_WING',layer:'LOWER_TO_UPPER',type:'occupied_reading_stacks',
  purpose:'右の非対称な翼にある、左とは違う断面リズムの立体書架と閲覧室',
  designObligation:'左翼と対になる利用機能を保つ。外側の張り出しに意味ある本棚・床・開口を含める'},
 {id:'SUPPORTED_PUBLIC_ASCENT',layer:'LOWER_TO_UPPER',type:'abstract_vertical_circulation_requirement',
  purpose:'下層閲覧から上層の公共施設へ連続して進む実体を持つ昇降経路',
  designObligation:'階段・ランプ・側翼回廊等の方式は自由。段差、踊り場、支持床、頭上余裕、接合を後で証明'},
 {id:'GLASS_STARGAZING_LOUNGE',layer:'HIGHEST_OCCUPIABLE',type:'occupied_glazed_destination',
  purpose:'図書館体験の終点となる高所の透明な星空観察ラウンジ',
  designObligation:'上層で室内として立てる床・ガラス外皮・利用空間・支持・入口を一体で考える'},
 {id:'FOLDED_STRUCTURAL_ENVELOPE',layer:'ALL',type:'architectural_mass_shell',
  purpose:'左と右の書架段丘と大空洞を同じ流線で包み込む連続した曲面の外観と屋根',
  designObligation:'薄い化粧殻・箱集合・ラウンジ浮遊塊でなく、厚みと外形が実際の用途構成に呼応'}
]);
const ROUTE=Object.freeze([
 ['SEASIDE_APPROACH','ENTRY_FORUM','海辺の到着から実際の入口を通る'],
 ['ENTRY_FORUM','LEFT_BOOK_WING','左翼の閲覧床に進める'],
 ['ENTRY_FORUM','RIGHT_BOOK_WING','右翼の閲覧床に進める'],
 ['LEFT_BOOK_WING','SUPPORTED_PUBLIC_ASCENT','左書架翼から昇降経路へ接続'],
 ['RIGHT_BOOK_WING','SUPPORTED_PUBLIC_ASCENT','右書架翼から昇降経路へ接続'],
 ['SUPPORTED_PUBLIC_ASCENT','GLASS_STARGAZING_LOUNGE','昇降経路から上層ラウンジに着く']
]);
const RELATIONS=Object.freeze([
 ['CENTRAL_SKY_ATRIUM','LEFT_BOOK_WING','翼が中央の空洞を囲むが空洞は床にならない'],
 ['CENTRAL_SKY_ATRIUM','RIGHT_BOOK_WING','両翼の本棚の段丘から空洞を眺められるようにする'],
 ['CENTRAL_SKY_ATRIUM','FOLDED_STRUCTURAL_ENVELOPE','屋根との関係で全高の空洞・採光を維持する'],
 ['FOLDED_STRUCTURAL_ENVELOPE','LEFT_BOOK_WING','曲面の外殻の厚みと左書架・閲覧段丘が対応する'],
 ['FOLDED_STRUCTURAL_ENVELOPE','RIGHT_BOOK_WING','異なる高さの右翼でも外殻と利用空間を統合'],
 ['FOLDED_STRUCTURAL_ENVELOPE','GLASS_STARGAZING_LOUNGE','上部透明空間は主要屋根と支持関係で結ぶ']
]);
const SECTIONS=Object.freeze([
 {id:'GROUND_PUBLIC_SEQUENCE',order:0,
  spatialArrangement:'海辺→入口フォーラム→左右に分かれる閲覧床、中央には吹抜けの起点',
  physicalQuestion:'現実の海辺の地面高、実扉、各領域の歩ける床と幅は成立するか'},
 {id:'MIDDLE_OCCUPIED_WINGS',order:1,
  spatialArrangement:'左右の書架段丘が中央の巨大空洞を抱き、外側の曲面厚みに居住空間をもつ',
  physicalQuestion:'複数の閲覧階で棚・支持床・頭上空間・採光・公共階段が両立するか'},
 {id:'UPPER_ASCENT_AND_SKYLINE',order:2,
  spatialArrangement:'側翼の昇降路と踊り場が上層へ続き、中央空洞と主要屋根は保たれる',
  physicalQuestion:'中央の空洞を埋めずに実際の階段・踊り場で上階へ行けるか'},
 {id:'TOP_GLAZED_DESTINATION',order:3,
  spatialArrangement:'最上の透明な観察ラウンジを屋根の自由端・上層の翼から支持する形に統合',
  physicalQuestion:'高い場所にあるラウンジが実際の公共の居室として成立するか'}
]);
const OBSERVATIONS=Object.freeze([
 {id:'FRONT',question:'中央の空洞は明瞭か。左右の書架翼と曲面の外形に統一感があるか'},
 {id:'OBLIQUE',question:'厚み・段丘・高さの変化が一つの巨大建築としてつながるか'},
 {id:'SIDE',question:'垂直方向の断面変化、上層ラウンジ、外殻の接合が読めるか'},
 {id:'AERIAL',question:'巨大屋根と吹抜け、回遊路の関係が理解できるか'},
 {id:'INTERIOR_ATRIUM',question:'屋根まで開いた空間と本棚・上層施設の位置関係が感じられるか'},
 {id:'OCCUPIED_LIBRARY',question:'実際に人が読書できる床・棚・階段・採光の実用性があるか'}
]);
const freeze=items=>items.map(x=>structuredClone(x));
/**
 * Audits *program-graph intent*, not built voxel connectivity. A successful
 * graph is NEVER an independent Minecraft walkability check or aesthetic PASS.
 */
export function auditR78SpatialProgram(spec){
 if(!spec||!Array.isArray(spec.zones)||
  !Array.isArray(spec.requiredPublicRouteEdges)||
  !Array.isArray(spec.nonWalkableDesignRelations)||
  !Array.isArray(spec.sectionSequence))fail('INVALID_SPATIAL_SPEC');
 const ids=new Set(spec.zones.map(z=>z.id));
 if(ids.size!==SITE.length||SITE.some(z=>!ids.has(z.id)))fail('REQUIRED_ZONES_MISSING');
 const route=spec.requiredPublicRouteEdges;
 const expected=new Set(ROUTE.map(([a,b])=>a+'>'+b));
 const seen=new Set();
 for(const e of route){
  if(!ids.has(e.from)||!ids.has(e.to))fail('ROUTE_UNKNOWN_ROOM');
  const k=e.from+'>'+e.to;
  if(!expected.has(k)||seen.has(k))fail('UNSUPPORTED_ROUTE_OR_DUPLICATE');
  seen.add(k);
 }
 if(expected.size!==seen.size)fail('UNFINISHED_REQUIRED_PUBLIC_ROUTE');
 if(route.some(e=>e.from==='CENTRAL_SKY_ATRIUM'||
  e.to==='CENTRAL_SKY_ATRIUM'||
  e.from==='FOLDED_STRUCTURAL_ENVELOPE'||
  e.to==='FOLDED_STRUCTURAL_ENVELOPE'))
  fail('NON_WALKABLE_VOID_OR_SHELL_AS_ROUTE');
 const g=new Map([...ids].map(id=>[id,[]]));
 for(const e of route)g.get(e.from).push(e.to);
 const q=['SEASIDE_APPROACH'],visited=new Set(q);
 while(q.length){
  for(const to of g.get(q.shift())||[])
   if(!visited.has(to)){visited.add(to);q.push(to);}
 }
 for(const id of ['ENTRY_FORUM','LEFT_BOOK_WING','RIGHT_BOOK_WING',
  'SUPPORTED_PUBLIC_ASCENT','GLASS_STARGAZING_LOUNGE'])
  if(!visited.has(id))fail('PROGRAM_INTENT_ROUTE_UNCONNECTED');
 const actualRelations=new Set(spec.nonWalkableDesignRelations.map(e=>e.a+'>'+e.b));
 const expectedRelations=new Set(RELATIONS.map(([a,b])=>a+'>'+b));
 if(actualRelations.size!==expectedRelations.size||
  [...expectedRelations].some(x=>!actualRelations.has(x)))
  fail('MASS_VOID_RELATIONS_INCOMPLETE');
 if(spec.sectionSequence.length!==SECTIONS.length||
  spec.sectionSequence.some((x,i)=>x.id!==SECTIONS[i].id))
  fail('SECTION_ORDER_OR_COVERAGE_MISMATCH');
 return {status:'DESIGN_INTENT_GRAPH_INTERNALLY_COMPLETE_NOT_PHYSICALLY_VERIFIED',
  conceptualZones:ids.size,conceptualRouteEdges:seen.size,
  massVoidDesignRelations:actualRelations.size,
  programDestinationsReachableInPaperGraph:visited.has('GLASS_STARGAZING_LOUNGE'),
  geometryOrWalkabilityVerified:false,
  artisticQualityPass:false,constructionApproved:false};
}
export function prepareR78SpatialProgramSpec({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence
}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  sha(raw)!==expectedRawSha256)fail('IMMUTABLE_MODEL_SOURCE_SHA_REQUIRED');
 const r77=prepareR77FutureArchitecturalBrief({
  raw,expectedRawSha256,b143Status,expectedGeometrySha256,
  r61Evidence,r64Evidence,r66Evidence,r67Evidence,
  r68Evidence,r69Evidence,r70Evidence,r71Evidence,r72Evidence,
  r73Evidence,r74Evidence,r62Evidence,r76Evidence});
 if(!r77Evidence||r77Evidence.schema!==R77_SCHEMA||
  JSON.stringify(r77Evidence)!==JSON.stringify(r77))
  fail('R77_COMPLETE_PROVENANCE_RECALCULATION_MISMATCH');
 const frozen=CREATION_CASES.find(c=>c.id==='c01');
 if(!frozen||r77.independentCriteria.length!==4||
  r77.independentCriteria.some((c,i)=>c.id!==frozen.criteria[i].id||
   c.visualOrFunctionalHumanEvidence!=='NOT_REVIEWED'))
  fail('FROZEN_C01_INDEPENDENT_CRITERIA_MISSING');
 const spec={
  zones:freeze(SITE),
  requiredPublicRouteEdges:ROUTE.map(([from,to,reason])=>({
   from,to,reason,physicalStatus:'NOT_BUILT_OR_VERIFIED',
   exactCoordinates:null,stairLandingsVerified:false})),
  nonWalkableDesignRelations:RELATIONS.map(([a,b,reason])=>({a,b,reason,
   note:'architectural design relation only; not a human walking edge'})),
  sectionSequence:freeze(SECTIONS),
  requiredHumanViews:freeze(OBSERVATIONS)
 };
 const audit=auditR78SpatialProgram(spec);
 const sourceHold=r77.status==='ARCHITECTURE_FIRST_BRIEF_B143_SOURCE_HOLD';
 const steps=[
  'Make original high-impact mass and full-height negative-space section read as one cohesive architectural concept.',
  'Place REAL reading floors and bookshelf volumes in both thick asymmetric wings. Reserve daylight, human occupancy, and genuine landings rather than ornamental blocks.',
  'Design a continuous public route from seaside arrival to both reading wings and to the upper glazed lounge without converting the atrium into a floor.',
  'Shape the primary roof, supports, envelope, and skylounge together. Confirm mass/void hierarchy in front, side, oblique, aerial and interior views.',
  'Only AFTER the concept and actual use are coherent, express it in the existing strict B143 source language for a separately consented future Qwen attempt. Do not invent B143 JSON here.'
 ];
 return {schema:SCHEMA,status:sourceHold?
   'FUTURE_HUMAN_PROGRAM_SPEC_WITH_OLD_B143_HOLD':
   'FUTURE_HUMAN_PROGRAM_SPEC_COMPILED_OLD_BUT_QUALITY_UNVERIFIED',
  originalRawSha256:expectedRawSha256,
  frozenC01PromptSha256:r77.frozenOriginalPromptSha256,
  frozenOriginalIntent:r77.frozenOriginalPrompt,
  r77EvidenceRecomputedAndAuthenticated:true,
  conceptualReferenceName:r77.conceptHypothesis.name,
  conceptualReferenceIsNotFrozenArchitecturalSolution:true,
  ...spec,programGraphAudit:audit,
  humanReviewCriteria:r77.independentCriteria,
  designOrder:steps,
  unresolvedPhysicalDesignEvidence:[
   'Actual geometry and local coordinates of every program zone are not generated.',
   'Real-world ground and entrance height are unknown.',
   'Actual two-high interior occupancy, bookshelf use, stair and landing connectivity remain unverified.',
   'Exterior curved shell and volumetric atrium have not been implemented by the model.',
   'Real Minecraft Education character movement and visual quality have not been assessed.'
  ],
  designCoordinatesNotInvented:true,
  routeMetricsNotInvented:true,
  modelArchitecturalQualityImproved:false,
  approvedForNewModelInference:false,
  noConsentToUseOldQwenAuthorization:true,
  noFrozenSourceOrWorldModification:true,
  independentHumanQualityPass:false,
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR78SpatialProgramSpec({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('EXISTING_NORMAL_DIR_REQUIRED');
 const json=path.join(destination,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),
  html=path.join(destination,'R78_LIBRARY_SECTIONS_AND_ROUTE_SPEC.html');
 if(fs.existsSync(json)||fs.existsSync(html))fail('NO_OVERWRITE');
 const spec=prepareR78SpatialProgramSpec(args);
 const names=new Map(spec.zones.map(z=>[z.id,z.purpose]));
 const program=spec.zones.map(z=>'<tr><td>'+esc(z.id)+
  '</td><td>'+esc(z.layer)+'</td><td>'+esc(z.purpose)+
  '</td><td>'+esc(z.designObligation)+'</td></tr>').join('');
 const sequence=spec.sectionSequence.map(x=>
  '<section><h3>'+esc(x.id)+'</h3><p>'+esc(x.spatialArrangement)+
  '</p><p><strong>確認すべき物理条件：</strong>'+esc(x.physicalQuestion)+
  '</p></section>').join('');
 const route=spec.requiredPublicRouteEdges.map(e=>
  '<li>'+esc(names.get(e.from))+' → '+esc(names.get(e.to))+
  '<small> — '+esc(e.reason)+'（実経路未実装・未検証）</small></li>').join('');
 const views=spec.requiredHumanViews.map(v=>
  '<li><b>'+esc(v.id)+'</b>：'+esc(v.question)+'</li>').join('');
 const document='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R78 未来型図書館の空間・動線設計仕様</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1110px;margin:25px auto;padding:0 20px;color:#253d51}.notice{background:#fff1d9;padding:13px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c7d5e0;padding:8px;vertical-align:top}section{padding:10px 0;border-bottom:1px solid #d9e2e9}small{color:#5f7181}li{margin:8px 0}</style></head><body>'+
  '<h1>R78 建築の断面・機能・動線を一つにつなぐ仕様</h1>'+
  '<p class="notice">これは人間作成の空間構成仕様であって、実際の3D設計データや Minecraft Education の歩行可能ルートではありません。グラフの整合性テストPASSは美術・動線・施工可能性PASSを意味しません。中央アトリウムは歩行路に数えません。</p>'+
  '<p>保存モデル原本SHA '+esc(spec.originalRawSha256)+
  ' ／旧モデル原本状態 '+esc(spec.status)+'</p>'+
  '<h2>独立した用途領域</h2><table><tr><th>ID</th><th>高さ関係</th><th>意味</th><th>次に設計すべき条件</th></tr>'+program+'</table>'+
  '<h2>下層から屋根までの4断面</h2>'+sequence+
  '<h2>入口→左右の書架→最上層ガラスラウンジの必須動線関係</h2><ol>'+route+'</ol>'+
  '<h2>人間による6方向の評価</h2><ul>'+views+'</ul>'+
  '<p><a href="R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html">R77の自由な美術構想</a> ／ <a href="R76_ARCHITECTURE_NEXT_DECISIONS.html">R76の改善優先度</a></p>'+
  '<p>未認証の4品質基準を維持。モデル新規推論には別の単発明示承認が必要です。NOT_PREPARED / 施工9ゲートBLOCKED / 実Qwen0 / 世界操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,document,{flag:'wx'});
 return {relativeFile:path.basename(html),status:spec.status,
  modelCalls:0,worldWrites:0};
}
