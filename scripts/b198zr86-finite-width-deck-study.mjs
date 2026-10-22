/**
 * R86: physical-width TRIANGLE ART CANDIDATES from screened R85 wing routes.
 * Dimensionless research. No avatar collision, surface supports, safe
 * headroom, building-code dimensions, or Minecraft world contact.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {intersectR81SegmentTriangle} from './b198zr81-envelope-portal-connection-review.mjs';
import {studyR85RouteAlternatives,prepareR85RouteReview,SCHEMA as R85_SCHEMA}
 from './b198zr85-wing-route-alternatives.mjs';

export const SCHEMA='minecraftaibuilder-b198zr86-ribbon-deck-research-v1';
const fail=s=>{throw Error('B198ZR86_'+s)};
const hash=b=>createHash('sha256').update(b).digest('hex');
const round=n=>+n.toFixed(7), vec=p=>p.map(round);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const hull=new Set(['left_outer','left_inner','left_crown','left_end',
 'right_outer','right_inner','right_crown','right_end','sky_lounge_glass']);
const sourceKeys=new Set(['left_reading_terrace','right_reading_terrace']);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const shift=(p,n,s)=>vec([p[0]+n[0]*s,p[1],p[2]+n[1]*s]);
const interpolate=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=v=>Math.hypot(...v);
const RIBBON_WIDTH=.032;
const CLEARANCE_PROBE_HEIGHTS=[.004,.045,.10]; // NORMALIZED, NEVER PLAYER BODY

/** Pure isolated testable finite-width study. Returns faces ONLY if screened. */
export function screenR86ResearchRibbon(points,side,faces,options={}){
 if(!Array.isArray(points)||points.length!==3||
  points.some(p=>!Array.isArray(p)||p.length!==3||
   p.some(v=>typeof v!=='number'||!Number.isFinite(v)))||
  !['left','right'].includes(side)||!Array.isArray(faces))
  fail('THREE_FINITE_WAYPOINTS_AND_WING_REQUIRED');
 const width=options.width??RIBBON_WIDTH;
 if(!Number.isFinite(width)||width<=0||width>.08)
  fail('RESEARCH_WIDTH_OUTSIDE_LIMIT');
 const reasons=[],unitDirs=[],normals=[];
 for(let k=0;k<2;k++){
  const a=points[k],b=points[k+1];
  const dx=b[0]-a[0],dz=b[2]-a[2],run=Math.hypot(dx,dz);
  if(run<.015||run>.24)reasons.push('LEG_LENGTH_NOT_LOCAL');
  if(run<1e-9||Math.abs(a[1]-b[1])/run>.28)
   reasons.push('GRADE_NOT_STUDY_CANDIDATE');
  if(run<1e-9){
   unitDirs.push([0,0]);normals.push([0,0]);
  }else{
   unitDirs.push([dx/run,dz/run]);normals.push([-dz/run,dx/run]);
  }
 }
 const turn=dot(unitDirs[0],unitDirs[1]);
 if(turn<.18)reasons.push('ELBOW_TOO_SHARP_FOR_CONTINUOUS_WIDTH');
 const bisect=add(normals[0],normals[1]);
 const bs=norm(bisect);
 let miter=[0,0],factor=Infinity;
 if(bs>1e-9){
  miter=bisect.map(x=>x/bs);
  const divisor=dot(miter,normals[0]);
  factor=divisor>1e-6?1/divisor:Infinity;
 }
 if(!Number.isFinite(factor)||factor>2)
  reasons.push('EXCESSIVE_MITER_AT_TURN');
 const half=width/2;
 const offsets=[normals[0].map(x=>x*half),
  miter.map(x=>x*half*Math.min(2,Number.isFinite(factor)?factor:2)),
  normals[1].map(x=>x*half)];
 const edges=points.map((p,i)=>({
  left:shift(p,offsets[i],1),right:shift(p,offsets[i],-1)
 }));
 // Preserve the whole protected void, including finite-width outer edges.
 for(let k=0;k<2;k++)for(let step=0;step<=12;step++){
  const t=step/12;
  for(const key of ['left','right']){
   const p=interpolate(edges[k][key],edges[k+1][key],t);
   if(side==='left'?p[0]>=-.40:p[0]<=.40)
    reasons.push('FULL_RIBBON_INTO_PRESERVED_VOID');
  }
 }
 // Conservative sampled collision: both edges and center, at multiple heights.
 // It does NOT imply a continuous person-sized swept-volume proof.
 let probes=0,intersections=0;
 for(let k=0;k<2;k++){
  for(const line of ['left','right','center'])for(const h of CLEARANCE_PROBE_HEIGHTS){
   const a=line==='center'?points[k]:edges[k][line];
   const b=line==='center'?points[k+1]:edges[k+1][line];
   const from=[a[0],a[1]+h,a[2]],to=[b[0],b[1]+h,b[2]];
   for(const f of faces){
    if(!hull.has(f.kind))continue;
    probes++;
    if(intersectR81SegmentTriangle(from,to,f))intersections++;
   }
  }
 }
 if(intersections)reasons.push('WIDTH_OR_OVERHEAD_PROXY_INTERSECTS_HULL');
 if(!Array.isArray(faces)||faces.some(f=>!f||typeof f.kind!=='string'))
  fail('MESH_FACES_INVALID');
 const accepted=reasons.length===0;
 const triangles=[];
 if(accepted)for(let k=0;k<2;k++){
  const a=edges[k],b=edges[k+1];
  triangles.push({a:a.left,b:a.right,c:b.right,kind:'R86_RESEARCH_DECK_NOT_CERTIFIED'});
  triangles.push({a:a.left,b:b.right,c:b.left,kind:'R86_RESEARCH_DECK_NOT_CERTIFIED'});
 }
 return {accepted,triangles,reasonCodes:[...new Set(reasons)],
  sampledHullIntersectionCount:intersections,sampledHullChecks:probes,
  normalizedDesignWidth:width,headroomProxyHeights:CLEARANCE_PROBE_HEIGHTS,
  sampleNotContinuousSweptCollision:true,physicalWalkingCertified:false,
  edges:accepted?edges:[]};
}
export function buildR86Candidate3D(nodes){
 const previous=studyR85RouteAlternatives(nodes);
 const decisions=[],acceptedFaces=[];
 for(const t of previous.rows){
  if(t.existingResearchConnector){
   decisions.push({side:t.side,tier:t.tier,status:'R84_LINK_NOT_FULL_WIDTH_VERIFIED',
    examinedOptions:0,rejectionReasons:['PREVIOUS_TENTATIVE_LINK_NOT_RETESTED'],
    chosenRoute:null,linkCertification:false});
   continue;
  }
  const trials=t.alternatives.map(option=>{
   if(!option.tentativeCenterlineOnly)
    return {kind:option.kind,accepted:false,
     reasonCodes:option.reasons,sampledHullChecks:0,triangles:[]};
   const scan=screenR86ResearchRibbon(option.points,t.side,previous.faces);
   return {kind:option.kind,...scan};
  });
  const best=trials.find(x=>x.accepted);
  if(best)acceptedFaces.push(...best.triangles);
  decisions.push({side:t.side,tier:t.tier,
   status:best?'RESEARCH_WIDTH_PANEL_GENERATED_NOT_WALKABLE':
    'NO_FULL_WIDTH_PANEL_ADDED',
   examinedOptions:trials.length,
   rejectionReasons:[...new Set(trials.flatMap(x=>x.reasonCodes))],
   chosenRoute:best?.kind??null,
   linkCertification:false,
   rejectedTrialKinds:trials.filter(x=>!x.accepted).map(x=>x.kind)});
 }
 if(decisions.length!==7)fail('SEVEN_TIERS_REQUIRED');
 const a=[...previous.faces,...acceptedFaces];
 if(a.some(f=>[f.a,f.b,f.c].some(p=>p.some(n=>!Number.isFinite(n)))))
  fail('INVALID_RESEARCH_MESH');
 return {decisions,faces:a,
  sourceTriangleCount:previous.faces.length,addedTriangleCount:acceptedFaces.length,
  unlinkedTierCount:previous.unresolvedTierCount,
  narrowArtCandidateCount:decisions.filter(x=>x.chosenRoute).length,
  routeCertificationCount:0,
  widthsAreNormalizedNotMinecraftMeters:true,
  originalR84FacesPreserved:true,centralAtriumPreservedByScreens:true};
}
export function prepareR86DeckReview(args={}){
 const {r85Evidence,...old}=args;
 const recalculated=prepareR85RouteReview(old);
 if(!r85Evidence||r85Evidence.schema!==R85_SCHEMA||
  JSON.stringify(r85Evidence)!==JSON.stringify(recalculated))
  fail('R85_COMPLETE_SOURCE_EVIDENCE_MISMATCH');
 if(typeof args.raw!=='string'||hash(args.raw)!==args.expectedRawSha256)
  fail('ORIGINAL_BYTES_SHA_MISMATCH');
 const study=buildR86Candidate3D(args.r80Evidence.conceptualRouteNodes);
 const {faces,...stats}=study;
 return {schema:SCHEMA,originalRawSha256:args.expectedRawSha256,
  oldB143Status:recalculated.oldB143Status,
  sourceR85FullyRecomputed:true,...stats,
  humanArchitectureQuality:'NOT_REVIEWED',
  realModelInferenceCalls:0,minecraftWorldConnections:0,
  actualWalkingCertified:false,constructionAllowed:false,
  originalCapturesAndSourceUnmodified:true,safety:safe()};
}
function toObj(faces){
 const lines=['# R86 R84 TRIANGLES + conditionally added actual-width ART-STUDY SURFACES',
  '# These are not certified walking decks; no Minecraft/world operations'];
 let index=1,previous=null;
 for(const f of faces){
  if(f.kind!==previous){lines.push('g '+f.kind.replace(/[^a-zA-Z0-9_]/g,'_'));previous=f.kind;}
  for(const p of [f.a,f.b,f.c])lines.push('v '+p.join(' '));
  lines.push('f '+index+' '+(index+1)+' '+(index+2));
  index+=3;
 }
 return lines.join('\n')+'\n';
}
export function writeR86DeckReview({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_SAFE_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R86_READING_TIER_WIDTH_SCREEN.json'),
  html=path.join(destination,'R86_WIDE_DECK_CONCEPT_REVIEW.html'),
  obj=path.join(destination,'R86_READING_DECK_WIDTH_CANDIDATES.obj');
 if([json,html,obj].some(x=>fs.existsSync(x)))fail('DO_NOT_OVERWRITE');
 const evidence=prepareR86DeckReview(args);
 const study=buildR86Candidate3D(args.r80Evidence.conceptualRouteNodes);
 const table=evidence.decisions.map(t=>'<tr><td>'+esc(t.side)+
  '</td><td>'+t.tier+'</td><td>'+esc(t.status)+
  '</td><td>'+esc(t.chosenRoute??'—')+
  '</td><td>'+esc(t.rejectionReasons.join('、')||'幅付き試験候補')+
  '</td></tr>').join('');
 const page='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R86 finite-width art candidate review</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:1100px;margin:28px auto;padding:0 18px}th,td{border:1px solid #abc;padding:7px;text-align:left}table{border-collapse:collapse;width:100%}</style>'+
  '<h1>R86 書架7層への幅付きデッキ：成立条件と3D研究</h1>'+
  '<p>R85の3候補を元に、線だけでなく幅を持つ研究用三角形床を条件付きで生成します。'+
  '候補幅は正規化単位でありMinecraftブロック数や人間の寸法ではありません。'+
  'サンプリング式の外殻判定は完全な掃引衝突・構造荷重・足場・頭上安全性を証明しません。</p>'+
  '<p>新しい3D研究床の候補が生じた層：'+evidence.narrowArtCandidateCount+
  '、追加研究面：'+evidence.addedTriangleCount+
  '。元の建築と中央吹き抜けの原本は変更しません。</p>'+
  '<table><tr><th>翼</th><th>層</th><th>検討状態</th><th>仮の形状</th><th>未達条件</th></tr>'+
  table+'</table><p><a href="R86_READING_DECK_WIDTH_CANDIDATES.obj">'+
  '幅付き候補を含む研究3D OBJ</a> ／'+
  '<a href="R85_SEVEN_TIER_ROUTE_REVIEW.html">R85の経路比較</a></p>'+
  '<p>原本SHA：'+esc(evidence.originalRawSha256)+
  ' / NOT_PREPARED / BLOCKED×9 / 実Qwen0 / ワールド操作0 / NOT_REVIEWED</p></html>';
 fs.writeFileSync(json,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(obj,toObj(study.faces),{flag:'wx'});
 fs.writeFileSync(html,page,{flag:'wx'});
 return {relativeFile:path.basename(html),tierCount:7,
  addedTriangleCount:evidence.addedTriangleCount,modelCalls:0,worldWrites:0};
}
