/** R190-BW. True-B143 author-revision comparison of R190-BU.
 * No provider request, no source repairs, no Minecraft world I/O.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {deriveBO} from './r190bo-spatial-local.mjs';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {auditR190BVStrip} from '../source/ai/r190bv-directed-strip.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const BM_SHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const BU_BASE={
 A:'3159b3736491a8591bd2dccb9fb7e2df979bbf7ecdf26d9fd940c24cb5adb875',
 B:'63979cc6883740232a636c3d729ddc874427df97aa3400cd76f44fb0432ac2ec'
};
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCalls:0,constructionApproved:false,executionAllowed:false,
 officialArtAdoptions:0,art:'ART_HOLD'});
function reportOne(root,letter,brief){
 const src=fs.readFileSync(path.join(ROOT,'evidence/r190bw/BW_'+letter+'.json'));
 const plan=JSON.parse(src);
 const baseline=fs.readFileSync(path.join(ROOT,'evidence/r190bu/RIFTED_CITY_'+letter+'.json'));
 const old=compileR190BNAssembly(baseline,{originalBrief:brief,authorship:'UNVERIFIED_AUTHOR'});
 if(old.geometrySha256!==BU_BASE[letter])throw Error('R190BW_ORIGINAL_BASE_CHANGED_'+letter);
 if(plan.originalBriefSha256!==BM_SHA||plan.levels.length!==11||plan.spaces.length!==20||
  !plan.assumptions.some(x=>x.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BW_SOURCE_OR_PROVENANCE_'+letter);
 const dir=path.join(root,'BW_'+letter);fs.mkdirSync(dir);
 const output=deriveBO({dir,raw:src,brief,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER'});
 const d=compileR190BNAssembly(src,{originalBrief:brief,authorship:'UNVERIFIED_AUTHOR'});
 if(d.geometrySha256!==output.geometrySha256)throw Error('R190BW_DERIVE_INTEGRITY_'+letter);
 const wide=auditR190BVStrip({compiled:d.compiled,bounds:plan.bounds,
  entrance:plan.entrance,destinations:plan.destinations,
  spaces:plan.spaces,levels:plan.levels,headroom:plan.headroom});
 const physicalPath=path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json');
 const physical=fs.existsSync(physicalPath)?JSON.parse(fs.readFileSync(physicalPath)):null;
 const functionalPath=path.join(dir,'FUNCTIONAL_REVIEW.json');
 const func=fs.existsSync(functionalPath)?JSON.parse(fs.readFileSync(functionalPath)):null;
 const graph=func?.r4?.evidence?.results;
 const clear=graph?.protectedVoids?.map(v=>({id:v.id,occupied:v.occupied,volume:v.volume,passed:v.passed}))??null;
 const views=['front','rear','west','east','roof'];
 const r={name:'BW_'+letter,author:'CHAT_GPT_6_AUTHOR_REVISION_NOT_LOCAL_PROVIDER',
  originalInputSha256:H(src),fixedBriefSha256:H(brief),
  baselineBUHistoricalGeometrySha256:old.geometrySha256,
  finalGeometrySha256:d.geometrySha256,
  sourceStatus:d.status,sourceLevelCount:plan.levels.length,sourceSpaceCount:plan.spaces.length,
  sourceOperationCount:plan.operations.length,physicalLevelCount:physical?.physicalLevels?.length??null,
  validSpaces:physical?.spaces?.filter(x=>x.missingSupportCells===0&&x.obstructedAirCells===0).length??null,
  sourceVoids:clear,sourceReachableGoals:graph?.destinations?.filter(x=>x.passed).length??null,
  sourceReachableSpaces:graph?.functionalZones?.filter(x=>x.passed).length??null,
  wideStripStatus:wide.status,wideStripDestinations:wide.destinations.filter(x=>x.passed).length,
  wideStripSpaces:wide.spaces.filter(x=>x.passed).length,
  wideStripHeightEdges:wide.nonzeroHeightEdges,geometryDifferentFromBU:d.geometrySha256!==old.geometrySha256,
  trulyDerived3D:fs.existsSync(path.join(dir,'DERIVED_3D.html')),
  fiveTrueViews:views.every(v=>fs.existsSync(path.join(dir,'DERIVED_'+v+'.svg'))),
  remainingBridges:plan.operations.filter(o=>o.element?.id?.startsWith('skybridge-')).length,
  terraceDecks:plan.operations.filter(o=>o.element?.id?.endsWith('-skydeck')).length,
  art:'ART_HOLD_UNREVIEWED', minecraftWalking:'NOT_TESTED',
  structuralSafety:'NOT_CERTIFIED',...safe()};
 r.technicalPass=r.sourceStatus==='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD'&&
  r.trulyDerived3D&&r.fiveTrueViews&&r.physicalLevelCount===11&&r.validSpaces===20&&
  r.sourceReachableGoals===8&&r.sourceReachableSpaces===20&&
  r.sourceVoids?.length===2&&r.sourceVoids.every(x=>x.occupied===0&&x.passed)&&
  r.wideStripStatus==='SOURCE_DIRECTED_TWO_WIDE_STRIP_PROXY_PASS'&&
  r.wideStripDestinations===8&&r.wideStripSpaces===20&&
  r.remainingBridges===9&&r.geometryDifferentFromBU;
 fs.writeFileSync(path.join(root,'BW_'+letter+'_AUDIT.json'),J(r),{flag:'wx'});
 fs.writeFileSync(path.join(root,'BW_'+letter+'_WIDE_STRIP.json'),J(wide),{flag:'wx'});
 return r;
}
export function studyR190BW({out}={}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(H(brief)!==BM_SHA)throw Error('R190BW_BRIEF_CHANGED');
 const outdir=path.resolve(out);if(fs.existsSync(outdir))throw Error('R190BW_FRESH_OUTPUT_REQUIRED');
 fs.mkdirSync(outdir);
 const results=['A','B'].map(x=>reportOne(outdir,x,brief));
 const different=results[0].finalGeometrySha256!==results[1].finalGeometrySha256;
 const result={schema:'minecraftaibuilder-r190bw-sculptural-revision-study-v1',
  authorship:'GPT_CHAT_AUTHOR_REVISIONS_OF_BU_NOT_AUTONOMOUS_QWEN_OR_GEMMA',
  briefSHA256:BM_SHA,originsUnchanged:true,
  differentGeometryBetweenTwoAuthoredConcepts:different,caseResults:results,
  technicalGate:results.every(x=>x.technicalPass)&&different?
   'SOURCE_REVISED_MASSING_AND_WIDE_PROXY_PASS':'HOLD_SOURCE_REVISED_MASSING_OR_WIDE_PROXY',
  artGate:'HOLD_PENDING_HUMAN_VISUAL_REVIEW',
  limitations:'Width-two strip proves neither turning radius nor real Minecraft walking; five projections do not certify beauty.',
  ...safe()};
 fs.writeFileSync(path.join(outdir,'STUDY.json'),J(result),{flag:'wx'});
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const rows=results.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.sourceStatus)+
  '</td><td>'+x.sourceReachableGoals+'/8</td><td>'+x.wideStripDestinations+'/8</td>'+
  '<td>'+x.remainingBridges+'</td><td><a href="'+x.name+'/REVIEW.html">原文・真正3D・五投影・断面</a></td></tr>').join('');
 fs.writeFileSync(path.join(outdir,'COMPARE.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BW True Source Architecture</title>'+
  '<style>body{font:16px/1.6 system-ui;background:#0e1826;color:#f0f4fc;margin:30px auto;max-width:1200px;padding:22px}td,th{border:1px solid #526178;padding:12px}a{color:#9ad8ff}table{border-collapse:collapse}</style>'+
  '<h1>R190-BW 巨大空洞・中高層ボリュームの独立作者改訂</h1>'+
  '<p>R190-BU原文不変。A/BはチャットGPTによる独立した改訂2案。実Qwen/Gemma推論、Minecraft施工、美術自動採用は0。</p>'+
  '<table><tr><th>原本</th><th>ソース</th><th>1セルR4目的地</th><th>幅2ストリップ</th><th>各階から選んだ橋</th><th>本物の形状</th></tr>'+rows+'</table>'+
  '<p>中央巨大空洞占有0かつ20用途空間成立を厳格検査。美術は同条件五方向投影を見た後に独立判定。</p></html>',{flag:'wx'});
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BW_CLI');
  const r=studyR190BW({out:process.argv[3]});
  console.log(J({status:r.technicalGate,cases:r.caseResults.map(x=>({
   name:x.name,source:x.sourceStatus,pass:x.technicalPass,
   goals:x.sourceReachableGoals,spaces:x.sourceReachableSpaces,
   wideGoals:x.wideStripDestinations,wideSpaces:x.wideStripSpaces,
   voids:x.sourceVoids,bridges:x.remainingBridges}))}));
  if(r.technicalGate!=='SOURCE_REVISED_MASSING_AND_WIDE_PROXY_PASS')process.exitCode=2;
 }catch(error){console.error(error.stack??String(error));process.exitCode=1;}
}
