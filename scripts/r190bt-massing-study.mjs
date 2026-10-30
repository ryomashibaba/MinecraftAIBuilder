/** R190-BT: authored V3 massing A/B vs V2 final-voxel and R4 evidence.
 * Research samples only; never local provider output, host repair, Minecraft operations,
 * architecture templates, or automatic artistic approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {deriveBO} from './r190bo-spatial-local.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BRIEF_SHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const TECH_PASS='SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD';
const H=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 modelCalls:0,networkRequests:0,art:'ART_HOLD',officialArtAdoptions:0});
function load(file,brief){
 const raw=fs.readFileSync(path.join(ROOT,file));
 const p=JSON.parse(raw);
 if(p.originalBriefSha256!==BRIEF_SHA||H(brief)!==BRIEF_SHA||
  p.levels.length!==9||!p.assumptions.some(x=>x.includes('CHAT_GPT_6_AUTHORED_NOT_QWEN_GEMMA_OR_LOCAL_PROVIDER')))
  throw Error('R190BT_PROVENANCE_OR_BRIEF');
 return {raw,p};
}
function inspect(dir,src,brief){
 fs.mkdirSync(dir);
 const r=deriveBO({dir,raw:src.raw,brief,origin:'CHAT_GPT_6_AUTHORED_NON_PROVIDER'});
 const functional=fs.existsSync(path.join(dir,'FUNCTIONAL_REVIEW.json'))?
  read(dir,'FUNCTIONAL_REVIEW.json'):null;
 const physical=fs.existsSync(path.join(dir,'PHYSICAL_PROGRAM_REVIEW.json'))?
  read(dir,'PHYSICAL_PROGRAM_REVIEW.json'):null;
 const results=functional?.r4?.evidence?.results;
 const shape={
  schema:'minecraftaibuilder-r190bt-one-massing-candidate-v1',
  sourceTitle:src.p.title,authorship:'CHAT_GPT_6_AUTHORED_NON_PROVIDER',
  originalRawSha256:H(src.raw),briefSha256:H(brief),geometrySha256:r.geometrySha256??null,
  status:r.status,sourceTechnicalStatus:r.sourceTechnicalStatus??null,formalFailure:r.failure??null,
  trueB143:fs.existsSync(path.join(dir,'DERIVED_3D.html')),
  exactFiveViews:['front','rear','west','east','roof'].every(v=>fs.existsSync(path.join(dir,'DERIVED_'+v+'.svg'))),
  physicalLevels:physical?.physicalLevels??null,
  sourcedFloorArea:physical?.spaces.map(x=>({id:x.id,y:x.standingY,origin:x.originXZ,
   width:x.dimensionsXZ[0],depth:x.dimensionsXZ[1],floorArea:x.floorAreaCells,
   unsupportedFloor:x.missingSupportCells,obstructedAir:x.obstructedAirCells}))??null,
  routeStatus:functional?.r4?.status??null,
  destinations:results?.destinations?.map(x=>({id:x.id,reachable:x.reachable,
   shortestPathSteps:x.shortestPathSteps,passed:x.passed}))??null,
  zones:results?.functionalZones?.map(x=>({id:x.id,reachable:x.reachable,passed:x.passed}))??null,
  externallyProvenEntrance:false,fullMinecraftAvatarWalking:false,architecturalArt:'ART_HOLD',
  humanOriginalBriefFidelity:'NOT_CERTIFIED',officialArtAdoptions:0,
  modelCalls:0,worldContacts:0,worldWrites:0
 };
 const technicallyComplete=shape.status===TECH_PASS&&shape.trueB143&&shape.exactFiveViews&&
  shape.physicalLevels?.length===9&&shape.sourcedFloorArea?.every(x=>x.unsupportedFloor===0&&x.obstructedAir===0)&&
  shape.destinations?.length===5&&shape.destinations.every(x=>x.passed)&&
  shape.zones?.length===9&&shape.zones.every(x=>x.passed);
 shape.technicalPass=!!technicallyComplete;
 return shape;
}
function esc(t){return String(t).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
export function studyR190BT({out}){
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(H(brief)!==BRIEF_SHA)throw Error('R190BT_BRIEF_CHANGED');
 const cases=[
  {name:'V2_BASELINE',file:'evidence/r190bs/CHAT_GPT_DESIGN_V2.json'},
  {name:'V3A_TERRACED',file:'evidence/r190bt/CITY_VEIL_V3A.json'},
  {name:'V3B_INTERLOCK',file:'evidence/r190bt/CITY_VEIL_V3B.json'}
 ];
 const dir=path.resolve(out);if(fs.existsSync(dir))throw Error('R190BT_FRESH_OUTPUT_ONLY');
 fs.mkdirSync(dir);
 const results=cases.map(c=>({name:c.name,sourceFile:c.file,
  ...inspect(path.join(dir,c.name),load(c.file,brief),brief)}));
 const baseline=results[0];
 const v3=results.slice(1);
 const reports=results.map(x=>({name:x.name,sourceGeometrySha256:x.geometrySha256,
  technicalPass:x.technicalPass,footprints:x.sourcedFloorArea?.map(s=>s.floorArea),
  obstacleCells:x.sourcedFloorArea?.reduce((a,s)=>a+s.obstructedAir,0)}));
 const changedMassing=v3.every(x=>x.sourcedFloorArea?.some((s,i)=>
  s.floorArea!==baseline.sourcedFloorArea?.[i]?.floorArea));
 const comparison={
  schema:'minecraftaibuilder-r190bt-massing-multiview-comparison-v1',
  exactBriefSha256:H(brief),cases:results,comparison:reports,
  materiallyDifferentOccupiedFootprints:changedMassing,
  technicalGate: v3.every(x=>x.technicalPass)&&baseline.technicalPass&&changedMassing?
   'SOURCE_MULTIPLE_MASSING_PASS':'HOLD_MASSING_OR_FUNCTION',
  artGate:'ART_HOLD_UNREVIEWED',manualArtPasses:0,
  limits:'Tests correct floor/air and abstract one-cell routes only, not art or Minecraft walking.',
  originalSourcesChanged:false,sourceProvenance:'CHAT_AUTHORED_NOT_QWEN_OR_GEMMA',
  ...safe()
 };
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(comparison),{flag:'wx'});
 const rows=results.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.status)+
  '</td><td>'+esc(x.sourcedFloorArea?.map(s=>s.floorArea).join(' / ')??'not available')+
  '</td><td>'+esc(x.destinations?.filter(d=>d.passed).length??'N/A')+
  '/5</td><td><a href="'+x.name+'/REVIEW.html">3D・5方向投影・断面・原文</a></td></tr>').join('');
 fs.writeFileSync(path.join(dir,'COMPARE.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R190-BT source massing A/B review</title><style>body{font:15px/1.7 system-ui;margin:auto;max-width:1250px;padding:25px;background:#111b2a;color:#eaf4fc}a{color:#a8d8ff}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #667}</style>'+
  '<h1>R190-BT：同一原依頼・V2/V3A/V3Bの真正3D比較</h1>'+
  '<p>全案チャットGPT作者、実Qwen/Gemma推論0。床/空気/抽象経路のPASSは美術PASSでない。ART HOLD、施工0。</p>'+
  '<table><thead><tr><th>独立案</th><th>技術状態</th><th>階別床面積</th><th>用途目的地</th><th>原文と立体図</th></tr></thead><tbody>'+rows+'</tbody></table>'+
  '<p>主要ボリュームの評価は実物の3Dとfront/rear/west/east/roofの同条件で人間が行う。</p></html>',
  {flag:'wx'});
 return comparison;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BT_CLI');
  const r=studyR190BT({out:process.argv[3]});
  console.log(J({status:r.technicalGate,art:r.artGate,
   cases:r.comparison,materiallyDifferentOccupiedFootprints:r.materiallyDifferentOccupiedFootprints}));
  if(r.technicalGate!=='SOURCE_MULTIPLE_MASSING_PASS')process.exitCode=2;
 }catch(error){console.error(error.stack??String(error));process.exitCode=1;}
}
