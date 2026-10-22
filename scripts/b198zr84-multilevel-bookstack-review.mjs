/**
 * R84: review a multi-level bookstack itinerary on the actual parametric
 * 3D research study. All new pads are triangles within ORIGINAL R79
 * reading terraces. Optional micro-links only when conservative centerline
 * screens pass. Not walkability, actual architectural floor support,
 * certified stairs, headroom, safety, or a new Qwen model run.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR83WingLandingStudy,prepareR83ArchitecturalLandingReview,
 SCHEMA as R83_SCHEMA} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
import {nearestR82TerracePointXZ} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
export const SCHEMA='minecraftaibuilder-b198zr84-multilevel-bookstack-itinerary-v1';
const fail=x=>{throw Error('B198ZR84_'+x)};
const hash=x=>createHash('sha256').update(x).digest('hex');
const R=x=>+x.toFixed(7);
const V=p=>p.map(R);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const norm=p=>Math.hypot(...p);
const difference=(a,b)=>a.map((v,i)=>v-b[i]);
const gap=(a,b)=>norm(difference(a,b));

/* R89: for persisted 7-decimal X/Z coordinates, measure planar distance
 * in integer 1e-7 units. A BigInt squared-distance and integer square root
 * make half-unit rounding independent of Math.hypot implementation/JIT.
 * This is a RESEARCH-COMPARISON number, never a physical measurement.
 */
const R89_SCALE=1e7;
const integerCoordinate=v=>{
 if(!Number.isFinite(v)||Math.abs(v)>100000)
  fail('NONFINITE_OR_OUT_OF_RESEARCH_COORDINATE_RANGE');
 return BigInt(Math.round(v*R89_SCALE));
};
function integerSqrt(n){
 if(n<0n)fail('NEGATIVE_INTEGER_SQUARED_DISTANCE');
 if(n<2n)return n;
 let x=n,y=(x+1n)>>1n;
 while(y<x){x=y;y=(x+n/x)>>1n}
 return x;
}
export function deterministicR84PlanLength(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==3||b.length!==3)
  fail('FINITE_3D_PLANAR_ENDPOINTS_REQUIRED');
 const dx=integerCoordinate(b[0])-integerCoordinate(a[0]);
 const dz=integerCoordinate(b[2])-integerCoordinate(a[2]);
 const n=dx*dx+dz*dz;
 const floor=integerSqrt(n);
 const rounded=n-floor*floor>floor?floor+1n:floor;
 return Number(rounded)/R89_SCALE;
}

const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const TIERS=Object.freeze({
 left:[3/16,6/16,8/16],
 right:[3/16,6/16,8/16,11/16]
});
function roof(side,z){
 return side==='left'?.83-.065*(z+.28)**2:
  .98-.095*(z-.17)**2;
}
const tri=(faces,a,b,c,kind)=>faces.push({a:V(a),b:V(b),c:V(c),kind});
function terraceBand(f,side){
 if(f.kind!==side+'_reading_terrace')return -1;
 const mean=[f.a,f.b,f.c].reduce((p,v)=>p.map((x,i)=>x+v[i]/3),[0,0,0]);
 const fraction=mean[1]/roof(side,mean[2]);
 const levels=TIERS[side];
 let index=0,closest=Infinity;
 for(let i=0;i<levels.length;i++){
  const d=Math.abs(fraction-levels[i]);
  if(d<closest){closest=d;index=i;}
 }
 return closest<.026?index:-1;
}
function insetPad(f,faces,kind){
 const centroid=f.a.map((_,i)=>(f.a[i]+f.b[i]+f.c[i])/3);
 const v=[f.a,f.b,f.c].map(p=>V(p.map((c,i)=>
  centroid[i]+.54*(c-centroid[i])+(i===1?.003:0))));
 tri(faces,v[0],v[1],v[2],kind);
 return {center:V(centroid.map((x,i)=>x+(i===1?.003:0))),vertices:v};
}
function railStrip(faces,a,b,kind){
 const run=Math.hypot(b[0]-a[0],b[2]-a[2]);
 if(run<.01)fail('MICRO_LINK_DEGENERATE');
 const dx=(b[2]-a[2])*.012/run,dz=-(b[0]-a[0])*.012/run;
 const p=V([a[0]+dx,a[1],a[2]+dz]),
  q=V([a[0]-dx,a[1],a[2]-dz]),
  r=V([b[0]-dx,b[1],b[2]-dz]),
  s=V([b[0]+dx,b[1],b[2]+dz]);
 tri(faces,p,q,r,kind);tri(faces,p,r,s,kind);
}
function sourceSamples(route){
 if(!Array.isArray(route)||route.length<2)fail('ROUTE_SEGMENTS_REQUIRED');
 const samples=[];
 for(let k=0;k<route.length-1;k++)
  for(let i=0;i<=4;i++){
   const t=i/4;
   samples.push({segmentIndex:k,t,
    point:V(mix(route[k],route[k+1],t))});
  }
 return samples;
}
const envelopes=new Set(['left_outer','left_inner','left_crown',
 'left_end','right_outer','right_inner','right_crown','right_end',
 'sky_lounge_glass']);
function screenLink(a,b,side,faces){
 const run=deterministicR84PlanLength(a,b);
 let crossedVoid=false,crossedWrongWing=false;
 const pts=[];
 for(let i=0;i<=32;i++){
  const p=mix(a,b,i/32);
  const here=Math.abs(p[0])<.40&&Math.abs(p[2])<.94;
  crossedVoid ||= here;
  crossedWrongWing ||= side==='left'?p[0]>=-.40:p[0]<=.40;
  pts.push(p);
 }
 const kinds=new Set();
 let surfaceIntersections=0;
 for(const f of faces){
  if(!envelopes.has(f.kind))continue;
  const hit=intersectR81SegmentTriangle(a,b,f);
  if(hit){surfaceIntersections++;kinds.add(f.kind);}
 }
 const dy=Math.abs(b[1]-a[1]),slope=run>.001?dy/run:null;
 const rejected=[];
 if(run<.030)rejected.push('NOT_ENOUGH_HORIZONTAL_RUN');
 if(run>.24)rejected.push('LOCAL_CONNECTION_TOO_LONG');
 if(slope===null||slope>.24)rejected.push('LOCAL_RAMP_GRADE_UNRESOLVED');
 if(crossedVoid||crossedWrongWing)rejected.push('PRESERVED_CENTRAL_ATRIUM_OR_WING_BOUNDARY');
 if(surfaceIntersections)rejected.push('EXTERIOR_OR_ROOF_MESH_INTERSECTION');
 return {horizontalLength:run,verticalRise:R(dy),
  normalizedSlope:slope===null?null:R(slope),
  centerlineSamples:pts.length,surfaceIntersections,
  crossedVoid,crossedWrongWing,intersectedKinds:[...kinds],
  designReviewRejections:rejected,
  acceptedAsTentativeArtStudyOnly:rejected.length===0,
  sweptDeckAndHeadroomNotChecked:true};
}
function nearestTierCandidate({side,tier,source,faces}){
 const route=sourceSamples(source);
 const matches=faces.map((face,i)=>({face,i}))
  .filter(x=>terraceBand(x.face,side)===tier);
 if(!matches.length)fail('SOURCE_R79_TERRACE_BAND_MISSING');
 // Keep a modest search over real sampled deck segments and real faces.
 // Rank an artist review suggestion, never an executable shortest path.
 let best=null;
 for(const s of route)for(const {face,i} of matches){
  const point=nearestR82TerracePointXZ(s.point,face);
  const score=point.spatialDistance+.30*Math.abs(point.verticalDifference);
  if(!best||score<best.score-1e-10||
   (Math.abs(score-best.score)<1e-10&&
    (s.segmentIndex<best.segmentIndex||
     (s.segmentIndex===best.segmentIndex&&i<best.triangleIndex)))){
   best={score,segmentIndex:s.segmentIndex,segmentFraction:s.t,
    routePoint:s.point,triangleIndex:i,triangle:face,
    sourceDistance:point.spatialDistance};
  }
 }
 if(!best)fail('NO_TRIANGLE_PROXIMITY_RESULT');
 return best;
}
export function buildR84MultilevelResearch(nodes){
 if(!nodes||!nodes.westAscent||!nodes.eastAscent)
  fail('R80_MULTILEVEL_CONCEPT_NODES_REQUIRED');
 const prior=buildR83WingLandingStudy(nodes),faces=prior.faces;
 const additions=[],tiers=[],existing=prior.landingPrototypes;
 for(const side of ['left','right']){
  const levels=TIERS[side],route=nodes[side==='left'?'westAscent':'eastAscent'];
  const previous=existing.find(x=>x.side===side);
  if(!previous)fail('R83_ONE_PAD_PER_WING_REQUIRED');
  const baselineFace=faces[previous.exactTerraceTriangleIndex];
  const existingTier=terraceBand(baselineFace,side);
  if(existingTier<0)fail('R83_PAD_ORIGINAL_SOURCE_TIER_UNRECOGNIZED');
  for(let tier=0;tier<levels.length;tier++){
   if(tier===existingTier){
    tiers.push({side,tier,normalizedLayer:levels[tier],
     reuseR83Landing:true,
     triangleIndex:previous.exactTerraceTriangleIndex,
     padCenter:previous.padCenter,linkCreatedByR83:previous.connectorEmitted,
     linkCreatedByR84:false,conditionalResearchLinkOnly:true,
     sourceDeckWaypointIndex:previous.sourceDeckWaypointIndex,
     layerIsNotArchitecturallyAccessible:true,
     rejectionReasons:previous.rejectionReasons});
    continue;
   }
   const best=nearestTierCandidate({side,tier,source:route,faces});
   const pad=insetPad(best.triangle,additions,
    side+'_tier'+tier+'_contained_bookstack_PAD_NOT_ACCESS_CERTIFIED');
   const review=screenLink(best.routePoint,pad.center,side,faces);
   if(review.acceptedAsTentativeArtStudyOnly)
    railStrip(additions,best.routePoint,pad.center,
     side+'_tier'+tier+'_RESEARCH_CONNECTOR_NOT_WALKABILITY');
   tiers.push({side,tier,normalizedLayer:levels[tier],reuseR83Landing:false,
    triangleIndex:best.triangleIndex,sourceDeckSegment:best.segmentIndex,
    sourceSegmentFraction:best.segmentFraction,
    sourceRoutePoint:best.routePoint,originalTerraceNearestDistance:R(best.sourceDistance),
    padCenter:pad.center,padVertices:pad.vertices,
    linkCreatedByR84:review.acceptedAsTentativeArtStudyOnly,
    linkCreatedByR83:false,conditionalResearchLinkOnly:true,
    connectionReview:review,rejectionReasons:review.designReviewRejections,
    layerIsNotArchitecturallyAccessible:true});
  }
 }
 if(tiers.length!==7||
  tiers.filter(x=>x.side==='left').length!==3||
  tiers.filter(x=>x.side==='right').length!==4)
  fail('SEVEN_ORIGINAL_READING_TIERS_NOT_PRESERVED');
 const checkedR84=tiers.filter(x=>!x.reuseR83Landing);
 const all=[...faces,...additions];
 if(all.some(f=>[f.a,f.b,f.c].some(p=>p.length!==3||
  p.some(n=>!Number.isFinite(n)))))
  fail('INVALID_NEW_MESH_FACE');
 return {faces:all,tiers,sourceFaceCount:faces.length,
  addedFaces:additions.length,originalR83ReusedLandings:2,
  newlyPlacedResearchLandings:checkedR84.length,
  additionalCandidateLinks:checkedR84.length,
  tentativeResearchLinks:checkedR84.filter(x=>x.linkCreatedByR84).length,
  rejectedAdditionalLinks:checkedR84.filter(x=>!x.linkCreatedByR84).length,
  leftTierCount:3,rightTierCount:4,
  neverBridgesCentralAtriumAutomatically:true,
  multipleFloorsNotCertifiedReachable:true,
  oldR83ModelUnmodified:true};
}
function obj(faces){
 const lines=['# R84: original R83 plus distinct R79 reading-tier pads and gated local research links',
  '# Not construction, not B143 voxels, not safe stairs, not certified support.',
  'o TidalLightLibrary_R84_SevenTierStudy'];
 let i=1,group='';
 for(const f of faces){
  if(f.kind!==group){group=f.kind;lines.push('g '+group);}
  for(const p of [f.a,f.b,f.c])lines.push('v '+p.map(x=>x.toFixed(7)).join(' '));
  lines.push('f '+i+' '+(i+1)+' '+(i+2));i+=3;
 }
 return lines.join('\n')+'\n';
}
function project(p,az,el){
 const a=az*Math.PI/180,e=el*Math.PI/180;
 return [Math.cos(a)*p[0]-Math.sin(a)*p[2],
  Math.cos(e)*p[1]-Math.sin(e)*(Math.sin(a)*p[0]+Math.cos(a)*p[2]),
  Math.cos(e)*(Math.sin(a)*p[0]+Math.cos(a)*p[2])+Math.sin(e)*p[1]];
}
function view(faces,az,el,label){
 const data=faces.map(f=>{
  const pts=[f.a,f.b,f.c].map(p=>project(p,az,el));
  return {pts,z:pts.reduce((s,p)=>s+p[2],0)/3,kind:f.kind};
 }).sort((a,b)=>a.z-b.z);
 const all=data.flatMap(f=>f.pts),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
 const midX=(Math.min(...xs)+Math.max(...xs))/2,
  midY=(Math.min(...ys)+Math.max(...ys))/2;
 const scale=Math.min(750/(Math.max(...xs)-Math.min(...xs)),
  520/(Math.max(...ys)-Math.min(...ys)));
 const px=p=>[(425+(p[0]-midX)*scale).toFixed(1),
  (300-(p[1]-midY)*scale).toFixed(1)];
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+
  escape(label)+'" viewBox="0 0 850 620">'+
  '<rect width="850" height="620" fill="#eef4f6"/>'+
  data.map(f=>{
   const color=f.kind.includes('tier')&&f.kind.includes('PAD')?'#4dae85':
    f.kind.includes('RESEARCH_CONNECTOR')?'#d78b35':
    f.kind.includes('contained_landing')?'#78c5a8':
    f.kind.includes('glass')?'#89cfdc':
    f.kind.includes('deck')?'#edb16a':
    f.kind.startsWith('left_')?'#7b9db6':'#96a8c1';
   return '<polygon points="'+f.pts.map(p=>px(p).join(',')).join(' ')+
    '" fill="'+color+'" fill-opacity="'+(f.kind.includes('glass')?.39:.92)+
    '" stroke="#25455a" stroke-opacity=".16" stroke-width=".30"/>';
  }).join('')+
  '<text x="24" y="32" font-family="system-ui" font-weight="700" font-size="18" fill="#264359">'+
  escape(label)+'</text></svg>';
}
function levelsSvg(tiers){
 const h=540,w=900;
 const lines=tiers.map((t,i)=>{
  const x=t.side==='left'?240:625,
   y=480-t.normalizedLayer*460;
  const color=t.reuseR83Landing?'#376e9f':
   t.linkCreatedByR84?'#229a71':'#c27936';
  return '<path d="M'+(x-130)+' '+y+' H'+(x+130)+
   '" stroke="'+color+'" stroke-width="8" stroke-linecap="round"/>'+
   '<text x="'+x+'" y="'+(y-10)+'" font-size="14" text-anchor="middle" fill="#2a4355">'+
   escape(t.side)+' tier '+t.tier+
   (t.reuseR83Landing?' (R83)':
    t.linkCreatedByR84?' (study candidate)':' (unresolved)')+'</text>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Seven original reading tiers, not guaranteed accessible" viewBox="0 0 '+w+' '+h+'">'+
  '<rect width="'+w+'" height="'+h+'" fill="#eff5f5"/>'+
  '<text x="30" y="30" font-family="system-ui" font-size="19" font-weight="bold" fill="#264457">Seven tier concept / no Minecraft walking PASS</text>'+
  lines+'</svg>';
}
export function prepareR84MultilevelReview({
 raw,expectedRawSha256,b143Status,expectedGeometrySha256=null,
 r61Evidence=null,r64Evidence=null,r66Evidence=null,r67Evidence=null,
 r68Evidence=null,r69Evidence=null,r70Evidence=null,r71Evidence=null,
 r72Evidence=null,r73Evidence=null,r74Evidence=null,
 r62Evidence,r76Evidence,r77Evidence,r78Evidence,r79Evidence,
 r80Evidence,r81Evidence,r82Evidence,r83Evidence
}={}){
 if(typeof raw!=='string'||hash(raw)!==expectedRawSha256||
  Buffer.byteLength(raw)>120000)fail('IMMUTABLE_SOURCE_SHA_REQUIRED');
 const r83=prepareR83ArchitecturalLandingReview({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,r64Evidence,
  r66Evidence,r67Evidence,r68Evidence,r69Evidence,r70Evidence,
  r71Evidence,r72Evidence,r73Evidence,r74Evidence,r62Evidence,
  r76Evidence,r77Evidence,r78Evidence,r79Evidence,r80Evidence,
  r81Evidence,r82Evidence});
 if(!r83Evidence||r83Evidence.schema!==R83_SCHEMA||
  JSON.stringify(r83Evidence)!==JSON.stringify(r83))
  fail('R83_COMPLETE_EVIDENCE_RECOMPUTE_MISMATCH');
 const study=buildR84MultilevelResearch(r80Evidence.conceptualRouteNodes);
 const {faces,...details}=study;
 return {schema:SCHEMA,
  status:study.rejectedAdditionalLinks?
   'MULTILEVEL_RESEARCH_LANDINGS_WITH_UNRESOLVED_CONNECTIONS':
   'SEVEN_RESEARCH_TIERS_NOT_CERTIFIED_WALKABLE',
  originalRawSha256:expectedRawSha256,
  oldB143Status:b143Status,
  r83RecomputedAndAuthenticated:true,
  ...details,
  allTierResearchLabeledNotConstruction:true,
  fullWidthDeckCollisionNotVerified:true,
  actualHeadroomAndLandingsNotVerified:true,
  independentArchitecturalQuality:'NOT_REVIEWED',
  minecraftActualWalkingProven:false,
  actualQwenCalls:0,
  sourceUnmodified:true,
  constructionAllowed:false,
  worldWrites:0,safety:safety()};
}
export function writeR84MultilevelReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_NORMAL_OUTPUT_DIRECTORY_REQUIRED');
 const evidence=path.join(destination,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),
  html=path.join(destination,'R84_MULTILEVEL_LIBRARY_CIRCULATION_REVIEW.html'),
  mesh=path.join(destination,'R84_MULTILEVEL_BOOKSTACK_LANDINGS.obj');
 if([evidence,html,mesh].some(x=>fs.existsSync(x)))
  fail('DO_NOT_OVERWRITE');
 const review=prepareR84MultilevelReview(args);
 const geometry=buildR84MultilevelResearch(args.r80Evidence.conceptualRouteNodes);
 const views=[view(geometry.faces,0,14,'FRONT'),
  view(geometry.faces,36,25,'OBLIQUE'),
  view(geometry.faces,90,15,'SIDE'),
  view(geometry.faces,36,69,'AERIAL'),
  levelsSvg(review.tiers)];
 const labels=['正面','斜視','側面','俯瞰','左右7層の高さ比較'];
 const rows=review.tiers.map(t=>'<tr><td>'+escape(t.side)+
  '</td><td>'+t.tier+'</td><td>'+t.normalizedLayer.toFixed(4)+
  '</td><td>'+(t.reuseR83Landing?'R83着地点を再利用':t.linkCreatedByR84?'R84研究連絡面':'局所接続を保留')+
  '</td><td>'+escape(t.rejectionReasons.join('・')||'人体・支持・クリアランスは未検証')+
  '</td></tr>').join('');
 const page='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R84 seven reading tiers concept review</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1300px;margin:23px auto;padding:0 20px;color:#293e50}.warn{background:#fff0d6;padding:14px}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:16px}figure{margin:0}figcaption{font-weight:bold}svg{width:100%;border:1px solid #bdcddd}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbccda;padding:7px;text-align:left}</style></head><body>'+
  '<h1>R84 図書館7層の書架段丘と立体動線を調べる</h1>'+
  '<p class="warn">既存の左3・右4段丘に研究用踊り場を置きました。青はR83、緑は追加研究着地点、橙は接続未解決または限定的な研究連絡です。短い連絡面を追加できた場合も、本当の床・頭上余裕・手すり・支持・Minecraft実機の安全性や美術合格は未検証です。中央吹抜けを横切る自動橋は作りません。</p>'+
  '<p>既存R83の着地点再利用：'+review.originalR83ReusedLandings+
  '、新規着地点：'+review.newlyPlacedResearchLandings+
  '、限定研究連絡：'+review.tentativeResearchLinks+
  '、保留連絡：'+review.rejectedAdditionalLinks+
  '。<a href="R84_MULTILEVEL_BOOKSTACK_LANDINGS.obj">3D研究OBJ</a></p>'+
  '<table><tr><th>翼</th><th>層</th><th>屋根高さに対する比</th><th>研究判定</th><th>残る問題</th></tr>'+
  rows+'</table><div class="views">'+views.map((v,i)=>
   '<figure><figcaption>'+labels[i]+'</figcaption>'+v+'</figure>').join('')+'</div>'+
  '<p><a href="R83_BOOKSTACK_ACCESS_GEOMETRY_REVIEW.html">R83局所着地点</a> ／'+
  '<a href="R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html">R82の実三角形との距離</a></p>'+
  '<p>元原本SHA：'+escape(review.originalRawSha256)+
  ' / NOT_PREPARED / 9ゲートBLOCKED / Qwen推論0 / Minecraft接続0</p></body></html>';
 fs.writeFileSync(evidence,JSON.stringify(review,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(mesh,obj(geometry.faces),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),status:review.status,
  tierCount:review.tiers.length,modelCalls:0,worldWrites:0};
}
