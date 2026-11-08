/** R190-BS: preserve a failed chat-authored design and test V2 in real BN/B143.
 * This is NOT Qwen/Gemma inference, a model response replay, or a runtime template.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {deriveBO} from './r190bo-spatial-local.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM_BRIEF='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const H=b=>createHash('sha256').update(b).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const read=name=>fs.readFileSync(path.join(ROOT,name));
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,
 art:'ART_HOLD',officialArtAdoptions:0,constructionApproved:false,executionAllowed:false});
function traceRaw(raw,brief){
 const p=JSON.parse(raw.toString('utf8'));
 if(p.originalBriefSha256!==H(brief)||p.levels.length!==9||
  !p.assumptions.some(s=>s.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BS_PROVENANCE_OR_BRIEF');
 return p;
}
function inspect(dir,raw,brief){
 fs.mkdirSync(dir);
 const receipt=deriveBO({dir,raw,brief,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER'});
 const functionalFile=path.join(dir,'FUNCTIONAL_REVIEW.json');
 const physicalFile=path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json');
 const functional=fs.existsSync(functionalFile)?JSON.parse(fs.readFileSync(functionalFile)):null;
 const physical=fs.existsSync(physicalFile)?JSON.parse(fs.readFileSync(physicalFile)):null;
 const d=fs.existsSync(path.join(dir,'DERIVED_3D.html'));
 const routes=functional?.r4?.evidence?.results;
 return {rawSha256:H(raw),status:receipt.status,sourceTechnicalStatus:receipt.sourceTechnicalStatus,
  geometrySha256:receipt.geometrySha256??null,hasGenuineDerived3D:d,firstError:receipt.failure??null,
  verifiedLevels:physical?.physicalLevels??null,missingSupport:physical?.spaces.map(s=>s.missingSupportCells)??null,
  obstructedAir:physical?.spaces.map(s=>s.obstructedAirCells)??null,
  reachableDestinations:routes?.destinations.map(d=>({id:d.id,reachable:d.reachable,shortest:d.shortestPathSteps}))??null,
  reachableZones:routes?.functionalZones.map(z=>({id:z.id,positions:z.reachable,passed:z.passed}))??null,
  routeStatus:functional?.r4?.status??null,providerModelCalls:0,art:'ART_HOLD'};
}
export function studyR190BS({out}){
 const brief=read('evidence/r190bm/USER_BRIEF.txt');
 if(H(brief)!==BM_BRIEF)throw Error('R190BS_BRIEF_CHANGED');
 const v1=read('evidence/r190bs/CHAT_GPT_DESIGN.json');
 const v2=read('evidence/r190bs/CHAT_GPT_DESIGN_V2.json');
 traceRaw(v1,brief);traceRaw(v2,brief);
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R190BS_FRESH_OUTPUT_REQUIRED');
 fs.mkdirSync(dir);
 const first=inspect(path.join(dir,'V1_FAILED_ORIGINAL'),v1,brief);
 const second=inspect(path.join(dir,'V2_REVISED_DESIGN'),v2,brief);
 const comparison={schema:'minecraftaibuilder-r190bs-actual-geometry-comparison-v2',
  authorship:'CHAT_GPT_6_AUTHORED_NON_PROVIDER_NOT_QWEN_GEMMA',
  exactBMBriefSha256:H(brief),originalUnmodified:true,
  v1: first,v2:second,sourceDesignChangedByAuthor:true,hostGeometryRepair:false,
  noUserWorldAccess:true,independentFidelity:'NOT_CERTIFIED',providerModelsEvaluated:0,
  technicalComparisonOnly:true,artDecision:'ART_HOLD',...safe()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(comparison),{flag:'wx'});
 const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 fs.writeFileSync(path.join(dir,'COMPARE.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BS Source Geometry Comparison</title>'+
  '<style>body{font:16px/1.7 system-ui;background:#101827;color:white;margin:30px auto;max-width:1000px}a{color:#91d5ff}pre{overflow:auto;background:#243449;padding:15px}</style>'+
  '<h1>R190-BS｜V1失敗原本 vs V2作者修正版</h1>'+
  '<p>チャットのGPT設計であり、Qwen/Gemma実験ではありません。両案ART HOLD・施工禁止。</p>'+
  '<p><a href="V1_FAILED_ORIGINAL/REVIEW.html">V1 真正3D・失敗箇所</a>　 /　'+
  '<a href="V2_REVISED_DESIGN/REVIEW.html">V2 真正3D・連続動線</a>　 /　'+
  '<a href="STUDY.json">比較・SHA・全状態</a></p>'+
  '<h2>元V1</h2><pre>'+escape(first.status+' / '+first.routeStatus+
    '\n原文SHA: '+first.rawSha256+'\n屋内閉塞数: '+first.obstructedAir)+'</pre>'+
  '<h2>新V2</h2><pre>'+escape(second.status+' / '+second.routeStatus+
    '\n原文SHA: '+second.rawSha256+'\n屋内閉塞数: '+second.obstructedAir)+'</pre>'+
  '<p>正式な用途・美術合格は未審査。形状成功と人間の利用・美しさは別。</p></html>',{flag:'wx'});
 // Source tests are strict: an invalid candidate should not silently count as a geometry success.
 const expected=first.status==='HOLD_DERIVED_SOURCE_FUNCTION'&&
  first.obstructedAir?.some(n=>n>0)&&
  second.status==='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD'&&
  second.verifiedLevels?.length===9&&
  second.obstructedAir?.every(n=>n===0)&&second.missingSupport?.every(n=>n===0)&&
  second.reachableDestinations?.every(x=>x.reachable)&&second.reachableZones?.every(x=>x.passed);
 comparison.comparePass=!!expected;
 fs.writeFileSync(path.join(dir,'EVALUATION.json'),J({comparePass:!!expected,
  sourceGeometryOnly:true,art:'ART_HOLD',worldWrites:0}),{flag:'wx'});
 return comparison;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BS_CLI');
  const r=studyR190BS({out:process.argv[3]});
  console.log(J(r));
  if(!r.comparePass)process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
