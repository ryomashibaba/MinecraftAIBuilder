/** R190-BU: two independently chat-authored dual-wing high-rise experiments, strict source compiler only.
 * No local Qwen/Gemma, no model or world I/O, no automatic architecture repair.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {deriveBO} from './r190bo-spatial-local.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const readJson=(d,f)=>JSON.parse(fs.readFileSync(path.join(d,f),'utf8'));
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 constructionApproved:false,executionAllowed:false,worldContacts:0,worldWrites:0,modelCalls:0,
 art:'ART_HOLD',officialArtAdoptions:0});
function examine(name,file,output,brief){
 const raw=fs.readFileSync(path.join(ROOT,file)),plan=JSON.parse(raw);
 if(H(brief)!==BM||plan.originalBriefSha256!==BM||plan.levels.length!==11||
  plan.spaces.length!==20||plan.protectedVoids.length!==2||
  !plan.assumptions.some(x=>x.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BU_ORIGINAL_PROVENANCE_OR_SOURCE_GRAMMAR');
 fs.mkdirSync(output);
 const derived=deriveBO({dir:output,raw,brief,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER'});
 const physical=fs.existsSync(path.join(output,'PHYSICAL_PROGRAM_REVIEW.json'))?
  readJson(output,'PHYSICAL_PROGRAM_REVIEW.json'):null;
 const functional=fs.existsSync(path.join(output,'FUNCTIONAL_REVIEW.json'))?
  readJson(output,'FUNCTIONAL_REVIEW.json'):null;
 const graph=functional?.r4?.evidence?.results;
 const required=['front','rear','west','east','roof'];
 const actualVoidResults=graph?.protectedVoids?.map(v=>({id:v.id,occupancy:v.occupied,
  volume:v.volume,passed:v.passed}))??null;
 const actualZones=graph?.functionalZones?.map(v=>({id:v.id,reachable:v.reachable,
  standable:v.standable,passed:v.passed}))??null;
 const actualDestinations=graph?.destinations?.map(v=>({id:v.id,reachable:v.reachable,
  shortestPathSteps:v.shortestPathSteps,passed:v.passed}))??null;
 const state={name,originalFile:file,authorship:'CHAT_GPT_6_AUTHORED_NON_PROVIDER_NOT_LOCAL_LLM',
  inputOriginalSha256:H(raw),originalBriefSha256:H(brief),geometrySha256:derived.geometrySha256??null,
  sourceStatus:derived.status,sourceTechnicalStatus:derived.sourceTechnicalStatus??null,
  failure:derived.failure??null,modelCalls:0,
  true3D:fs.existsSync(path.join(output,'DERIVED_3D.html')),
  fiveIndependentViews:required.every(n=>fs.existsSync(path.join(output,'DERIVED_'+n+'.svg'))),
  physicalLevels:physical?.physicalLevels??null,spaceEvidence:physical?.spaces.map(s=>({
   id:s.id,standingY:s.standingY,usableArea:s.floorAreaCells,
   missingFloor:s.missingSupportCells,obstructedAir:s.obstructedAirCells}))??null,
  destinations:actualDestinations,zones:actualZones,protectedVoids:actualVoidResults,
  r4Status:functional?.r4?.status??null,
  sourceDimensions:plan.bounds,authoredSourceElements:plan.operations.length,
  mainVoidGeometryIsNotHostCarved:true,art:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  structuralEngineering:'NOT_CERTIFIED',manualBriefFidelity:'NOT_CERTIFIED',...safe()};
 state.technicalPass=state.sourceStatus==='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD'&&
  state.true3D&&state.fiveIndependentViews&&state.physicalLevels?.length===11&&
  state.spaceEvidence?.length===20&&state.spaceEvidence.every(x=>!x.missingFloor&&!x.obstructedAir)&&
  state.destinations?.length===8&&state.destinations.every(x=>x.passed)&&
  state.zones?.length===20&&state.zones.every(x=>x.passed)&&
  state.protectedVoids?.length===2&&state.protectedVoids.every(x=>x.passed&&x.occupancy===0);
 return state;
}
const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function studyR190BU({out}={}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(H(brief)!==BM)throw Error('R190BU_FROZEN_BRIEF_CHANGED');
 const root=path.resolve(out);if(fs.existsSync(root))throw Error('R190BU_OUTPUT_ALREADY_EXISTS');
 fs.mkdirSync(root);
 const studies=[
  examine('A_TWIN_ASCENT','evidence/r190bu/RIFTED_CITY_A.json',path.join(root,'A_TWIN_ASCENT'),brief),
  examine('B_FOLDED_SKYLINE','evidence/r190bu/RIFTED_CITY_B.json',path.join(root,'B_FOLDED_SKYLINE'),brief)
 ];
 const changed=studies[0].geometrySha256&&studies[1].geometrySha256&&
  studies[0].geometrySha256!==studies[1].geometrySha256;
 const verified=!!changed&&studies.every(s=>s.technicalPass);
 const report={schema:'minecraftaibuilder-r190bu-frozen-chat-source-architecture-study-v1',
  authoredCaseCount:2,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER',modelCalls:0,
  originalsAreNotSourceRepairs:true,briefSha256:H(brief),cases:studies,
  different3DGeometries:!!changed,technicalGate:verified?'SOURCE_RIFT_VOID_AND_FUNCTION_PASS':
   'HOLD_RIFT_SOURCE_OR_FUNCTION',
  prohibitedClaim:'Not actual Qwen/Gemma design success, no human art pass, no Minecraft walking',
  humanArtReview:'HOLD_NOT_YET_INDEPENDENTLY_ACCEPTED',...safe()};
 fs.writeFileSync(path.join(root,'STUDY.json'),J(report),{flag:'wx'});
 const rows=studies.map(s=>'<tr><td>'+escape(s.name)+'</td><td>'+escape(s.sourceStatus)+
  '</td><td>'+escape(s.physicalLevels?.length??'none')+
  '</td><td>'+escape(s.spaceEvidence?.filter(x=>!x.missingFloor&&!x.obstructedAir).length??'n/a')+
  '/20</td><td>'+escape(s.protectedVoids?.map(x=>x.occupancy).join(',')??'n/a')+
  '</td><td><a href="'+escape(s.name)+'/REVIEW.html">実3D・五投影・断面・モデル非推論原文</a></td></tr>').join('');
 const page='<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BU RIFTED CITY</title>'+
  '<style>body{font:16px/1.6 system-ui;margin:auto;max-width:1250px;padding:30px;background:#0c1324;color:#ecf5ff}a{color:#8dd4ff}table{border-collapse:collapse}td,th{padding:12px;border:1px solid #607088}</style>'+
  '<h1>R190-BU — 巨大な実3D空洞を持つ二翼都市建築</h1>'+
  '<p>チャットGPTによる独立原本。実Qwen/Gemma推論・建築施工・美術自動採用はゼロ。</p>'+
  '<table><tr><th>案</th><th>技術</th><th>立脚階</th><th>成立空間</th><th>主空洞/副空洞 占有</th><th>原文・真正3D</th></tr>'+rows+'</table>'+
  '<p>建築の美しさ、11階程度の規模、外部・屋内環境の質はソース技術PASSと独立して審査する。ART HOLD。</p></html>';
 fs.writeFileSync(path.join(root,'COMPARE.html'),page,{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BU_CLI_USAGE');
  const x=studyR190BU({out:process.argv[3]});
  console.log(J({technicalGate:x.technicalGate,art:x.art,source:x.origin,cases:x.cases.map(s=>({
   name:s.name,technicalPass:s.technicalPass,sourceStatus:s.sourceStatus,
   geometrySha256:s.geometrySha256,levels:s.physicalLevels?.length,
   zones:s.zones?.filter(z=>z.passed).length,goals:s.destinations?.filter(z=>z.passed).length,
   voids:s.protectedVoids}))}));
  if(x.technicalGate!=='SOURCE_RIFT_VOID_AND_FUNCTION_PASS')process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
