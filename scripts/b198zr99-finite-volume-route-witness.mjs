/**
 * R99: actual source-triangle corridor probes along eight public research
 * paths (entrance -> seven rooms plus lounge). NEVER a simulated avatar
 * or engineering / Education walkability approval. Original R98 preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditR92CirculationGraph} from './b198zr92-whole-library-circulation-atlas.mjs';
import {buildR98ElevatedCrownStudy,prepareR98ElevatedCrownReview,
 SCHEMA as R98_SCHEMA} from './b198zr98-elevated-right-crown.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr99-finite-volume-route-witness-v1';
const fail=s=>{throw Error('B198ZR99_'+s)};
const sha=s=>createHash('sha256').update(JSON.stringify(s)).digest('hex');
const R=n=>+n.toFixed(7);
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const add=(p,x,y,z)=>[p[0]+x,p[1]+y,p[2]+z];
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

export const PROXY=Object.freeze({
 halfWidth:.023,
 height:.135,
 footToleranceBelow:.035,
 sampleSpacingUpperBound:.07,
 classification:'DIMENSIONLESS_SURROGATE_ONLY_NOT_A_HUMAN_METRIC'
});
const KINDS=new Set(['floor','overhead','lateral']);
function intersectsAny(mesh,a,b){
 // Cheap source-face bounding gate; do not ignore any face based on label.
 const lo=a.map((v,i)=>Math.min(v,b[i])-1e-7),
  hi=a.map((v,i)=>Math.max(v,b[i])+1e-7);
 for(const f of mesh){
  if(f.max.some((v,i)=>v<lo[i])||f.min.some((v,i)=>v>hi[i]))continue;
  const hit=intersectR81SegmentTriangle(a,b,f.face);
  if(hit)return {kind:f.face.kind,triangle:f.index,position:hit.point};
 }
 return null;
}
function indexMesh(faces){
 if(!Array.isArray(faces)||!faces.length)fail('ACTUAL_SOURCE_TRIANGLES_REQUIRED');
 return faces.map((f,index)=>{
  if(!['a','b','c'].every(k=>finite(f[k]))||typeof f.kind!=='string')
   fail('MALFORMED_TRIANGLE');
  const vertices=[f.a,f.b,f.c];
  return {face:f,index,min:[0,1,2].map(i=>Math.min(...vertices.map(p=>p[i]))),
   max:[0,1,2].map(i=>Math.max(...vertices.map(p=>p[i])))};
 });
}
function sampleAt(mesh,p,normal){
 const witnesses=[];
 for(const offset of [-PROXY.halfWidth,0,PROXY.halfWidth]){
  const q=add(p,normal[0]*offset,0,normal[2]*offset);
  const support=intersectsAny(mesh,add(q,0,.024,0),add(q,0,-PROXY.footToleranceBelow,0));
  const ceiling=intersectsAny(mesh,add(q,0,.012,0),add(q,0,PROXY.height,0));
  if(!support)witnesses.push({class:'floor',offset:R(offset)});
  if(ceiling)witnesses.push({class:'overhead',offset:R(offset),...ceiling});
 }
 for(const height of [.065,.110]){
  const from=add(p,-normal[0]*PROXY.halfWidth,height,-normal[2]*PROXY.halfWidth);
  const to=add(p,normal[0]*PROXY.halfWidth,height,normal[2]*PROXY.halfWidth);
  const cross=intersectsAny(mesh,from,to);
  if(cross)witnesses.push({class:'lateral',height,...cross});
 }
 return witnesses;
}
/**
 * Bounded sampling of real 3D triangles. 3 across-width roof and support
 * rays + 2 lateral cross-section rays per station. Cannot prove full swept
 * collision-free passage, load capacity or any metre/block clearance.
 */
export function screenR99FiniteRoute(faces,points){
 if(!Array.isArray(points)||points.length<2||points.some(p=>!finite(p))||
  points.length>64)fail('VALID_LIMITED_3D_ROUTE_REQUIRED');
 const mesh=indexMesh(faces),stations=[],segments=[];
 let totalDist=0;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],len=dist(a,b);
  if(len<1e-7)continue;
  totalDist+=len;
  const planar=Math.hypot(b[0]-a[0],b[2]-a[2]);
  if(planar<1e-7){
   segments.push({i,classification:'VERTICAL_SOURCE_SEGMENT_UNSCREENED'});
   continue;
  }
  const normal=[(b[2]-a[2])/planar,0,-(b[0]-a[0])/planar];
  const divisions=Math.min(24,Math.max(1,Math.ceil(len/PROXY.sampleSpacingUpperBound)));
  segments.push({i,divisions,normalizedLength:R(len),
   planarGradient:R(Math.abs(b[1]-a[1])/planar)});
  for(let step=0;step<=divisions;step++){
   const pt=lerp(a,b,step/divisions),obs=sampleAt(mesh,pt,normal);
   if(obs.length)stations.push({segment:i,step,at:pt.map(R),
    observed:obs.slice(0,16)});
  }
 }
 const counts={floor:0,overhead:0,lateral:0};
 for(const s of stations)for(const w of s.observed){
  if(!KINDS.has(w.class))fail('UNKNOWN_OBSTRUCTION_CLASS');
  counts[w.class]++;
 }
 return {normalizedRouteLength:R(totalDist),segments,
  stationCount:segments.reduce((s,v)=>s+(v.divisions===undefined?0:v.divisions+1),0),
  witnessStationCount:stations.length,witnessCounts:counts,
  // Retain only first 24 witness stations for bounded review JSON; totals are full.
  examples:stations.slice(0,24),
  screeningStatus:counts.floor+counts.overhead+counts.lateral>0?
   'HOLD_FINITE_VOLUME_PROBES_FOUND_GAPS_OR_INTERSECTIONS':
   'NO_PROBE_HITS_NOT_PHYSICAL_WALKABILITY_CERTIFICATION',
  finite3DSweepCertified:false,humanBodyVolumeCertified:false,
  noOverheadHitDoesNotCertifyRealHeadroom:true};
}
function routeForRoom(nodes,p){
 const side=p.side,branch=nodes[side==='left'?'westAscent':'eastAscent'];
 const main=side==='left'?nodes.westAccess:nodes.entrance;
 if(!branch||!main||p.r80SegmentIndex<0||p.r80SegmentIndex>=branch.length-1)
  fail('SOURCE_ROUTE_SEGMENT_NOT_FOUND');
 const at=p.r88GalleryFrom,dest=p.r84ReadingRoomAt;
 if(!finite(at)||!finite(dest)||!finite(branch[p.r80SegmentIndex]))
  fail('SOURCE_GALLERY_POINTS_INVALID');
 if(dist(main.at(-1),branch[0])>1e-6)
  fail('PUBLIC_ROUTE_BRANCH_DISCONNECTED');
 const pts=[...main,...branch.slice(1,p.r80SegmentIndex+1),at,dest];
 if(pts.some(q=>!finite(q)))fail('NONFINITE_ROUTE_POINT');
 return pts;
}
export function buildR99FiniteVolumeStudy(nodes){
 const original=buildR98ElevatedCrownStudy(nodes);
 const graph=auditR92CirculationGraph(nodes);
 if(original.faces.length!==4692||graph.levels.length!==7||
  !graph.summary.researchGraphLoungeReached)fail('SOURCE_RESEARCH_GRAPH_INVALID');
 const goals=graph.levels.map(t=>({
  id:t.side+'_tier'+t.tier,side:t.side,tier:t.tier,
  sourceGraphConnectionOnly:t.limitedGeometricRouteCompleted,
  points:routeForRoom(nodes,t)
 }));
 const last=nodes.eastAscent.at(-1);
 if(dist(last,graph.roofLoungePosition)>1e-6)fail('LOUNGE_SOURCE_VERTEX_CHANGED');
 goals.push({id:'rooftop_lounge',side:'right',tier:null,
  sourceGraphConnectionOnly:true,
  points:[...nodes.entrance,...nodes.eastAscent.slice(1)]});
 const routeAudit=goals.map(g=>({
  id:g.id,side:g.side,tier:g.tier,
  sourceGraphConnectionOnly:g.sourceGraphConnectionOnly,
  routeNodes:g.points.length,
  ...screenR99FiniteRoute(original.faces,g.points)
 }));
 const totals={floor:0,overhead:0,lateral:0};
 for(const r of routeAudit)for(const [k,v] of Object.entries(r.witnessCounts))
  totals[k]+=v;
 const results={originalR98MeshSha256:sha(original.faces),
  sourceR98TriangleCount:original.faces.length,
  screenedDestinations:routeAudit.length,readingRooms:routeAudit.filter(q=>q.tier!==null).length,
  loungeGraphIncluded:true,
  finiteWidthProxy:PROXY,
  actual3DTriangleIntersections:true,
  originalRoutesAndR98SourceUnmodified:true,
  warningCountByClass:totals,
  researchGraphIsNotTraversableGeometry:true,
  certifiedAccessibleDestinations:0,
  pathCollisionFreeCertification:false,
  currentArchitecturalStatus:'HOLD_REQUIRES_VALIDATED_FUNCTIONAL_REDESIGN',
  independentHumanVisualReview:'NOT_REVIEWED',
  routes:routeAudit,
  safety:safety()};
 return {results,source:original.faces};
}
function prepare(args){
 const {r98Evidence,...older}=args;
 const previous=prepareR98ElevatedCrownReview(older);
 if(!r98Evidence||r98Evidence.schema!==R98_SCHEMA||
  JSON.stringify(previous)!==JSON.stringify(r98Evidence))
  fail('R98_FULL_ORIGINAL_EVIDENCE_MISMATCH');
 const {results}=buildR99FiniteVolumeStudy(args.r80Evidence.conceptualRouteNodes);
 return {schema:SCHEMA,oldB143Status:previous.oldB143Status,
  originalRawSha256:args.expectedRawSha256,
  r98FullChainRecomputed:true,...results};
}
export function prepareR99FiniteVolumeReview(args={}){return prepare(args)}
function routeDiagram(routes){
 // Plan view of REAL R80/R92 points, with observation counts in the table.
 const W=1000,H=590,px=p=>[
  (500+230*p[0]).toFixed(2),(300-200*p[2]).toFixed(2)];
 const paths=routes.map((r,i)=>'<polyline points="'+
  r.points.map(p=>px(p).join(',')).join(' ')+'" fill="none" stroke="'+
  (r.tier===null?'#ca734c':r.side==='left'?'#3c86a0':'#b48462')+
  '" stroke-width="3" opacity=".72"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+
  '"><rect width="'+W+'" height="'+H+'" fill="#edf3f7"/>'+paths+
  '<text x="20" y="40" fill="#264156" font-size="18">R99 SOURCE LINE ROUTES: NOT WALKABILITY</text></svg>';
}
export function writeR99FiniteVolumeReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_REVIEW_DIRECTORY_REQUIRED');
 const prefix='R99_FINITE_WIDTH_HEADROOM_SOURCE_ROUTES',
  json=path.join(destination,prefix+'_EVIDENCE.json'),
  html=path.join(destination,prefix+'_REVIEW.html');
 if([json,html].some(f=>fs.existsSync(f)))fail('DO_NOT_OVERWRITE');
 const report=prepare(args),
  graph=auditR92CirculationGraph(args.r80Evidence.conceptualRouteNodes);
 const all=[...graph.levels.map(t=>({
  side:t.side,tier:t.tier,points:routeForRoom(args.r80Evidence.conceptualRouteNodes,t)
 })),{side:'right',tier:null,points:[
  ...args.r80Evidence.conceptualRouteNodes.entrance,
  ...args.r80Evidence.conceptualRouteNodes.eastAscent.slice(1)]}];
 const rows=report.routes.map(r=>'<tr><td>'+esc(r.id)+'</td><td>'+
  r.routeNodes+'</td><td>'+r.stationCount+'</td><td>'+
  r.witnessCounts.floor+'</td><td>'+r.witnessCounts.overhead+
  '</td><td>'+r.witnessCounts.lateral+'</td><td>'+
  esc(r.screeningStatus)+'</td></tr>').join('');
 const doc='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R99 Body-Clearance Research HOLD</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1250px;margin:24px auto;padding:0 18px}'+
  'table{border-collapse:collapse;width:100%}td,th{border:1px solid #afc0cc;padding:7px}svg{max-width:100%}</style>'+
  '<h1>R99：入口→左右7室＋上層ラウンジの有限幅・頭上・足元を実三角形で検査</h1>'+
  '<p>これは実際のR98比較形状に対する3本の横幅サンプルと垂直Ray、'+
  '横断Rayによる研究用の限定検査であり、人間の衝突体積や法令上の幅・高さではない。'+
  '数値はMinecraftブロックやメートルへ変換しない。</p>'+
  '<p>研究用半幅 '+PROXY.halfWidth+' / 高さ '+PROXY.height+
  '（正規化単位）。接触の観察結果は非認証。'+
  '経路上に実際の床や壁が存在する/存在しないことの完全証明ではない。</p>'+
  routeDiagram(all)+
  '<table><tr><th>目的地</th><th>節点</th><th>観察ステーション</th>'+
  '<th>床未検出</th><th>頭上交差</th><th>横断交差</th><th>判断</th></tr>'+rows+'</table>'+
  '<p>グラフ上の7室＋ラウンジ接続と、現実の人が歩けるという判定は別。'+
  '検出した失敗はR100以降の形状修正候補にする。'+
  '<a href="R98_RIGHT_CROWN_LOCAL_LOFT_ACTIVE_ARCHITECTURE.obj">元R98 OBJ</a> / '+
  '<a href="R98_RIGHT_CROWN_LOCAL_LOFT_SIX_VIEW.html">R98美術比較</a></p>'+
  '<p>HOLD / NOT_REVIEWED / NOT_PREPARED / 9 gates BLOCKED / BuildPlan空 / Qwen0 / World0。</p></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 try{fs.writeFileSync(html,doc,{flag:'wx'})}catch(e){
  fs.rmSync(json,{force:true});throw e;
 }
 return {relativeFile:path.basename(html),
  routes:report.routes.length,certifiedRoutes:0,
  modelCalls:0,worldWrites:0};
}
