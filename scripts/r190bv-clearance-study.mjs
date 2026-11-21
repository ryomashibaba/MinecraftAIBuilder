/** R190-BV: read frozen BU originals and audit actual final B143 voxels with 2x2 clearance. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190BV} from '../source/ai/r190bv-contiguous-clearance.mjs';
import {auditR190BVStrip} from '../source/ai/r190bv-directed-strip.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const SHA=x=>createHash('sha256').update(x).digest('hex'),J=x=>JSON.stringify(x,null,2)+'\n';
const BRIEF_SHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const cases=[
 {label:'A_TWIN_ASCENT',path:'evidence/r190bu/RIFTED_CITY_A.json',
  raw:'31fecf6f8ab35175dd5181b0f25b5f9548f3674616188fbd3bd6d1b2746bb6aa',
  geometry:'3159b3736491a8591bd2dccb9fb7e2df979bbf7ecdf26d9fd940c24cb5adb875'},
 {label:'B_FOLDED_SKYLINE',path:'evidence/r190bu/RIFTED_CITY_B.json',
  raw:'ed6dd69e921868742aa9ce2e7a1228c5c953872907a6e132aa8f78628b1f3831',
  geometry:'63979cc6883740232a636c3d729ddc874427df97aa3400cd76f44fb0432ac2ec'}
];
function inspect(c,brief){
 const raw=fs.readFileSync(path.join(ROOT,c.path)),plan=JSON.parse(raw);
 if(SHA(raw)!==c.raw||plan.originalBriefSha256!==BRIEF_SHA||
  !plan.assumptions.some(x=>x.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BV_ORIGINAL_PROVENANCE_SHA:'+c.label);
 const derived=compileR190BNAssembly(raw,{originalBrief:brief,authorship:'UNVERIFIED_AUTHOR'});
 if(derived.geometrySha256!==c.geometry||
  derived.status!=='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD')
  throw Error('R190BV_FROZEN_SOURCE_GEOMETRY:'+c.label);
 const evidence=auditR190BV({compiled:derived.compiled,bounds:plan.bounds,
  entrance:plan.entrance,destinations:plan.destinations,
  spaces:plan.spaces,levels:plan.levels,headroom:plan.headroom});
 const strip=auditR190BVStrip({compiled:derived.compiled,bounds:plan.bounds,
  entrance:plan.entrance,destinations:plan.destinations,
  spaces:plan.spaces,levels:plan.levels,headroom:plan.headroom});
 if(evidence.geometrySha256!==derived.geometrySha256||strip.geometrySha256!==derived.geometrySha256)
  throw Error('R190BV_AUDIT_GEOMETRY_MISMATCH');
 return {case:c.label,originalFile:c.path,originalSha256:SHA(raw),
  sourceTechnicalGate:derived.status,wide:evidence,strip};
}
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,modelCalls:0,art:'ART_HOLD',officialArtAdoptions:0});
export function studyR190BV({out}={}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(SHA(brief)!==BRIEF_SHA)throw Error('R190BV_FROZEN_BRIEF');
 const dir=path.resolve(out);if(fs.existsSync(dir))throw Error('R190BV_FRESH_OUTPUT_ONLY');
 fs.mkdirSync(dir);
 const evidence=cases.map(c=>inspect(c,brief));
 for(const r of evidence)fs.writeFileSync(path.join(dir,r.case+'_CLEARANCE.json'),J(r),{flag:'wx'});
 const summary={schema:'minecraftaibuilder-r190bv-two-wide-audit-study-v1',
  origin:'CHAT_AUTHOR_NON_PROVIDER_SOURCE_RECOMPILED_INDEPENDENTLY',
  frozenOriginalBriefSha256:BRIEF_SHA,
  previousSingleCellStatus:'SOURCE_RIFT_VOID_AND_FUNCTION_PASS',
  newWideStatus:evidence.every(r=>r.wide.status==='SOURCE_CONSERVATIVE_2X2_ROUTE_PASS')?
   'SOURCE_CONSERVATIVE_2X2_ROUTE_PASS':'HOLD_CONSERVATIVE_2X2_ROUTE',
  newStripStatus:evidence.every(r=>r.strip.status==='SOURCE_DIRECTED_TWO_WIDE_STRIP_PROXY_PASS')?
   'SOURCE_DIRECTED_TWO_WIDE_STRIP_PROXY_PASS':'HOLD_DIRECTED_TWO_WIDE_STRIP_PROXY',
  cases:evidence.map(r=>({name:r.case,geometrySha256:r.wide.geometrySha256,
   status:r.wide.status,entry:r.wide.entry,
   stripStatus:r.strip.status,stripEntry:r.strip.entry,
   stripPassedGoals:r.strip.destinations.filter(v=>v.passed).length,
   stripPassedSpaces:r.strip.spaces.filter(v=>v.passed).length,
   stripNonzeroHeightEdges:r.strip.nonzeroHeightEdges,
   passedDestinations:r.wide.destinations.filter(v=>v.passed).length,
   destinationCount:r.wide.destinations.length,
   passedSpaces:r.wide.spaces.filter(v=>v.passed).length,
   spaceCount:r.wide.spaces.length,reachableWideAnchors:r.wide.reachableWideAnchors})),
  artGate:'ART_REJECT_BOTH_R190BU_SAMPLES',technicalResearchCompleted:true,
  newUserModelInference:false,artCertification:false,actualMinecraftWalking:'NOT_TESTED',
  note:'2x2 square all-four-support is a conservative proxy; HOLD is not proof actual walking fails. A research CI success never certifies a wide route.',
  priorSourcesModified:false,...safe()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(summary),{flag:'wx'});
 const escape=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const rows=summary.cases.map(c=>'<tr><td>'+escape(c.name)+'</td><td>'+
  escape(c.status)+'</td><td>'+c.passedDestinations+'/'+c.destinationCount+
  '</td><td>'+c.passedSpaces+'/'+c.spaceCount+'</td><td><a href="'+
  escape(c.name)+'_CLEARANCE.json">最終ボクセル監査結果</a></td></tr>').join('');
 fs.writeFileSync(path.join(dir,'REVIEW.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BV</title>'+
  '<style>body{font:16px/1.7 system-ui;background:#111e2d;color:#ebf5ff;margin:30px auto;max-width:1100px;padding:15px}a{color:#9df}td,th{padding:12px;border:1px solid #456}table{border-collapse:collapse}</style>'+
  '<h1>R190-BV：真正B143の2×2経路監査</h1><p>旧R4の1セルPASSとは別の保守的ゲート。ART REJECT/全体HOLD。Qwen/Gemma実推論・世界施工0。</p>'+
  '<table><tr><th>独立原本</th><th>厳格2×2経路</th><th>目的地</th><th>空間</th><th>詳細</th></tr>'+rows+'</table>'+
  '<p>厳しい検査でHOLDでも実Minecraft歩行不可能と断定しない。<a href="STUDY.json">全体状態</a></p></html>',
  {flag:'wx'});
 const files=fs.readdirSync(dir).filter(x=>x!=='INVENTORY.json').sort().map(file=>{
  const b=fs.readFileSync(path.join(dir,file));return {file,sha256:SHA(b),bytes:b.length};
 });
 fs.writeFileSync(path.join(dir,'INVENTORY.json'),J({files,sourceOriginalUnchanged:true,networkRequests:0}),{flag:'wx'});
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BV_CLI');
  const r=studyR190BV({out:process.argv[3]});
  console.log(J({wideStatus:r.newWideStatus,stripStatus:r.newStripStatus,cases:r.cases,art:r.artGate,
   noModelInference:true,noWorldOperation:true}));
  if(!r.cases.every(x=>x.destinationCount===8&&x.spaceCount===20))process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
