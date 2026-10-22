
/* R85: study source-grounded two-leg alternatives, never real paths. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildR84MultilevelResearch,prepareR84MultilevelReview,SCHEMA as R84_SCHEMA} from './b198zr84-multilevel-bookstack-review.mjs';
import {buildR83WingLandingStudy} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr85-wing-routes-study-v1';
const fail=s=>{throw Error('B198ZR85_'+s)};
const hash=s=>createHash('sha256').update(s).digest('hex');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},modelCalls:0,
 worldContacts:0,worldReads:0,worldWrites:0});
const P=p=>p.map(x=>+x.toFixed(7));
const mix=(a,b,t)=>P(a.map((v,i)=>v+(b[i]-v)*t));
const len=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const hull=new Set(['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']);
function check(a,b,side,faces){
 const run=len(a,b),rise=Math.abs(a[1]-b[1]),issues=[];
 if(run<.015)issues.push('RUN_TOO_SHORT');
 if(run>.24)issues.push('RUN_TOO_LONG');
 if(run<1e-7||rise/run>.28)issues.push('GRADE_TOO_STEEP');
 for(let i=0;i<=32;i++){
  const q=mix(a,b,i/32);
  if(side==='left'?q[0]>=-.40:q[0]<=.40){
   issues.push('PROTECTED_ATRIUM_OR_OPPOSITE_WING');break;
  }
 }
 let hits=0;
 for(const f of faces)
  if(hull.has(f.kind)&&intersectR81SegmentTriangle(a,b,f))hits++;
 if(hits)issues.push('ENVELOPE_INTERSECTION');
 return {horizontalRun:+run.toFixed(7),rise:+rise.toFixed(7),
  sourceMeshHits:hits,issues};
}
export function studyR85RouteAlternatives(nodes){
 const source=buildR84MultilevelResearch(nodes);
 const older=buildR83WingLandingStudy(nodes);
 const rows=source.tiers.map(t=>{
  const r83=older.landingPrototypes.find(p=>p.side===t.side);
  if(!r83)fail('MISSING_R83_SOURCE_WING');
  const priorLink=Boolean(t.linkCreatedByR83||t.linkCreatedByR84);
  const anchor=t.reuseR83Landing?r83.segmentStart:t.sourceRoutePoint;
  if(!Array.isArray(anchor)||anchor.length!==3||!anchor.every(Number.isFinite))
   fail('MISSING_SOURCE_ANCHOR');
  const end=t.padCenter;
  const mid=mix(anchor,end,.5),sgn=t.side==='left'?-1:1;
  const mids=[
   {id:'OUTWARD_BEND',p:P([mid[0]+sgn*.055,mid[1],mid[2]])},
   {id:'LONGITUDINAL_FIRST',p:P([anchor[0],mid[1],end[2]])},
   {id:'LATERAL_FIRST',p:P([end[0],mid[1],anchor[2]])}
  ];
  const alternatives=priorLink?[]:mids.map(c=>{
   const legs=[check(anchor,c.p,t.side,source.faces),check(c.p,end,t.side,source.faces)];
   const reasons=[...new Set(legs.flatMap(x=>x.issues))];
   return {kind:c.id,points:[anchor,c.p,end],legs,reasons,
    tentativeCenterlineOnly:reasons.length===0};
  }).sort((a,b)=>a.reasons.length-b.reasons.length||
   a.kind.localeCompare(b.kind));
  return {side:t.side,tier:t.tier,padCenter:end,anchor,
   existingResearchConnector:priorLink,
   oldRejections:t.rejectionReasons,
   alternatives,unverifiedPhysicalAccess:true};
 });
 if(rows.length!==7||rows.filter(x=>x.side==='left').length!==3||
  rows.filter(x=>x.side==='right').length!==4)
  fail('SEVEN_ORIGINAL_READING_TIERS_REQUIRED');
 return {rows,faces:source.faces,unresolvedTierCount:rows.filter(x=>!x.existingResearchConnector).length,
  tentativeDetourCount:rows.filter(x=>x.alternatives.some(p=>p.tentativeCenterlineOnly)).length,
  massAndAtriumUnmodified:true,continuousWalkingProof:false};
}
export function prepareR85RouteReview(args={}){
 const {r84Evidence,...prior}=args;
 const checked=prepareR84MultilevelReview(prior);
 if(!r84Evidence||r84Evidence.schema!==R84_SCHEMA||
  JSON.stringify(r84Evidence)!==JSON.stringify(checked))
  fail('R84_FULL_EVIDENCE_MISMATCH');
 if(hash(args.raw)!==args.expectedRawSha256)fail('RAW_SHA_MISMATCH');
 const out=studyR85RouteAlternatives(args.r80Evidence.conceptualRouteNodes);
 const {faces,...details}=out;
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:checked.oldB143Status,authenticatedR84:true,...details,
  actualModelCalls:0,worldWrites:0,humanArtReview:'NOT_REVIEWED',
  certifiedTravelPaths:0,constructionApproved:false,
  sourceUnmodified:true,safety:safe()};
}
function obj(study){
 const rows=['# R85 original R84 triangles plus non-walkable proposal polylines'];
 let n=1;
 for(const f of study.faces){
  for(const v of [f.a,f.b,f.c])rows.push('v '+v.join(' '));
  rows.push('f '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 for(const t of study.rows){
  if(!t.alternatives.length)continue;
  rows.push('g R85_'+t.side+'_tier'+t.tier+'_NOT_A_DECK');
  for(const v of t.alternatives[0].points)rows.push('v '+v.join(' '));
  rows.push('l '+n+' '+(n+1)+' '+(n+2));n+=3;
 }
 return rows.join('\n')+'\n';
}
export function writeR85RouteReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('SAFE_EXISTING_DESTINATION_REQUIRED');
 const j=path.join(destination,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),
  h=path.join(destination,'R85_SEVEN_TIER_ROUTE_REVIEW.html'),
  o=path.join(destination,'R85_TENTATIVE_REVIEW_CENTERLINES.obj');
 if([j,h,o].some(x=>fs.existsSync(x)))fail('DO_NOT_OVERWRITE');
 const proof=prepareR85RouteReview(args);
 const st=studyR85RouteAlternatives(args.r80Evidence.conceptualRouteNodes);
 const body=proof.rows.map(t=>'<tr><td>'+esc(t.side)+'</td><td>'+t.tier+
  '</td><td>'+(t.existingResearchConnector?'暫定研究連絡あり':'連絡なし')+
  '</td><td>'+esc(t.alternatives[0]?.kind||'—')+'</td><td>'+
  esc(t.alternatives[0]?.reasons.join('・')||'人体の通行性は未検証')+
  '</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R85 7層への翼側動線検討</title><style>body{font:15px/1.7 system-ui;max-width:1050px;margin:24px auto;padding:0 18px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #abc;padding:8px}</style>'+
  '<h1>R85 全7層の未接続箇所と3種類の翼側経路比較</h1>'+
  '<p>中央アトリウム・元の三角形は不変更。経路は正規化単位の中心線のみ。人体幅、床の支持、屋根クリアランス、全衝突、実Minecraft歩行、美術品質は未認証です。</p>'+
  '<p>未接続の研究層：'+proof.unresolvedTierCount+
  '、中心線の限定条件を通過する別案のある層：'+proof.tentativeDetourCount+
  '（建築品質PASSではありません）。</p>'+
  '<table><tr><th>翼</th><th>層</th><th>R84</th><th>別案候補</th><th>保留要因</th></tr>'+body+'</table>'+
  '<p><a href="R85_TENTATIVE_REVIEW_CENTERLINES.obj">非歩行研究用ライン付きOBJ</a> ／'+
  '<a href="R84_MULTILEVEL_LIBRARY_CIRCULATION_REVIEW.html">R84の3D資料</a></p>'+
  '<p>SHA '+esc(proof.originalRawSha256)+' / NOT_PREPARED / 9 BLOCKED / 推論0 / World接続0</p>';
 fs.writeFileSync(j,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(o,obj(st),{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {relativeFile:path.basename(h),tierCount:proof.rows.length,modelCalls:0,worldWrites:0};
}
