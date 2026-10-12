/** B75 read-only footprint reconciliation using pinned source geometry, NOT building instructions. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {preflightProductionPlan} from '../../b72/main/compile-b72.mjs';
import {createOfflinePlanner} from '../../b74/main/b74-vm-runner.mjs';
import {sha} from '../../b73/main/b73-asset-contract.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
const officialReportFile=path.join(here,'evidence/B74_OFFLINE_PLANNER_REPORT.json');
const blockFile=path.join(here,'evidence/Blocks.md');
const originalRuntime=path.resolve(here,'../../b74/main/runtime_evidence');
const pin='49ff9c501b1c96b547aa49fda07a53bc19f7d5fe338aff43fe5f65c3eaaf031f';
const grammarPin='71c0e2bda3e7a044285d681b38d9d4373e3c0aa417808a2f54c652d05ff47d1a';
const fail=reason=>{throw Error('B75_'+reason)};
const modes={office:['slab','tower_on_podium','asymmetric_block','stepped'],hotel:['stepped','U_shape','tower_on_podium','asymmetric_block'],apartment:['L_shape','slab','twin_bar','courtyard']};
const rectangle=(x,z,width,depth,start,end)=>({x,z,width,depth,start,end});
export function massingFromPinnedRules(mode,width,depth,seed){
 if(!Number.isSafeInteger(seed)||seed<0||seed>31||!Number.isSafeInteger(width)||!Number.isSafeInteger(depth)||width<15||depth<12)fail('BAD_ENUM_INPUT');
 const t=Math.min(Math.floor((Math.min(width,depth)-3)/2),Math.max(3,Math.floor(Math.min(width,depth)/4))+seed%2);
 const s=1+seed%2; const heightDrop=1+seed%5;const split=Math.floor(width*.55);
 switch(mode){
  case 'slab':return [rectangle(0,0,width,depth,0,6)];
  case 'L_shape':return [rectangle(0,0,width,t,0,6),rectangle(0,t,t,depth-t,0,6)];
  case 'tower_on_podium':return [rectangle(0,0,width,depth,0,2),rectangle(s,s+1,width-2*s,depth-2*s-1,2,6)];
  case 'stepped':return [0,1,2].map(i=>rectangle(i*s,i*s,width-2*i*s,depth-2*i*s,2*i,2*(i+1)));
  case 'asymmetric_block':return [rectangle(0,0,split,depth-t,0,6),rectangle(split-2,t,width-split+2,depth-t,0,Math.max(1,6-heightDrop))];
  case 'U_shape':return [rectangle(0,depth-t,width,t,0,6),rectangle(0,0,t,depth-t,0,6),rectangle(width-t,0,t,depth-t,0,6)];
  case 'courtyard':return [...massingFromPinnedRules('U_shape',width,depth,seed),rectangle(t,0,width-2*t,t,0,6)];
  case 'twin_bar':return [rectangle(0,0,width,t,0,6),rectangle(0,depth-t,width,t,0,6),rectangle(Math.floor(width/2)-1,t,3,depth-2*t,0,5)];
  default:fail('MODE_NOT_PINNED');
 }
}
export function masksForMasses(masses,width,depth){
 return Array.from({length:6},(_,level)=>{
  const mask=Array.from({length:depth},()=>new Uint8Array(width));
  for(const m of masses){
   if(![m.x,m.z,m.width,m.depth,m.start,m.end].every(Number.isSafeInteger)||m.width<3||m.depth<3||m.x<0||m.z<0||m.x+m.width>width||m.z+m.depth>depth||m.start<0||m.end>6||m.start>=m.end)fail('INVALID_MASS');
   if(m.start<=level&&level<m.end)for(let z=m.z;z<m.z+m.depth;z++)for(let x=m.x;x<m.x+m.width;x++)mask[z][x]=1;
  }
  return mask;
 });
}
export function compareMasks(sections,masses){
 if(sections.length!==6)fail('SIX_FLOORS_REQUIRED');
 const rows=sections[0].floorMaskRows,width=rows[0].length,depth=rows.length;
 const sorted=[...sections].sort((a,b)=>a.level-b.level);
 const masks=masksForMasses(masses,width,depth);
 let matched=0,missing=0,extra=0;const floors=[];
 for(let i=0;i<6;i++){
  const s=sorted[i], actual=masks[i];if(s.level!==i+1||s.floorMaskRows.length!==depth||s.floorMaskRows.some(x=>x.length!==width||!/^[01]+$/.test(x)))fail('BAD_FROZEN_MASK');
  let mm=0,mi=0,ex=0;
  for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
   const a=actual[z][x]===1,n=s.floorMaskRows[z][x]==='1';
   if(a&&n)mm++;else if(n&&!a)mi++;else if(a&&!n)ex++;
  }
  floors.push({level:i+1,matched:mm,missing:mi,extra:ex});matched+=mm;missing+=mi;extra+=ex;
 }
 return {matched,missing,extra,delta:missing+extra,floors};
}
export function auditInterior(sections65,sections66,masses){
 const six=[...sections66].sort((a,b)=>a.level-b.level);
 const w=six[0].floorMaskRows[0].length,d=six[0].floorMaskRows.length;
 const masks=masksForMasses(masses,w,d);
 const byId=new Map(sections65.map(s=>[s.id,s]));
 const totals={roomCellsOutside:0,corridorCellsOutside:0,stairCellsOutside:0,elevatorCellsOutside:0,doorPortsUnsupported:0,nominalWallEdgesTouchingProductionExterior:0};
 const floors=[];
 for(let f=0;f<6;f++){
  const s=six[f],a=byId.get(s.id),mask=masks[f];if(!a)fail('SECTION_LINKAGE');
  const out=p=>!p||!Number.isInteger(p.x)||!Number.isInteger(p.z)||p.x<0||p.z<0||p.x>=w||p.z>=d||mask[p.z][p.x]!==1;
  let roomCellsOutside=0;
  for(const r of s.conceptRooms)for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)if(out({x,z}))roomCellsOutside++;
  const o={level:s.level,roomCellsOutside};
  for(const [k,key] of [['corridorCellsOutside','corridors'],['stairCellsOutside','stairs'],['elevatorCellsOutside','elevators']])o[k]=s.conceptReservations[key].filter(out).length;
  o.doorPortsUnsupported=a.openingPorts.filter(p=>out(p.roomCell)||out(p.hallCell)).length;
  o.nominalWallEdgesTouchingProductionExterior=a.nominalWalls.filter(v=>out(v.insideCell)||out(v.adjacentCell)).length;
  for(const k of Object.keys(totals))totals[k]+=o[k];floors.push(o);
 }
 return {totals,floors,wallExteriorCountIsNotCollisionProof:true,physicalClearancesVerified:false,realDoorStatesVerified:false,realStairStatesVerified:false};
}
export function validateOfficialEvidence(report,blocks){
 if(sha(blocks)!==pin)fail('OFFICIAL_CATALOG_PIN');
 if(report?.schema!=='minecraftaibuilder-b74-production-planner-offline-v1'||report?.status!=='OFFLINE_PLANNER_GENERATED_5_BLOCKED_FROM_CONSTRUCTION'||report?.source?.blockListState!=='PINNED_OFFICIAL'||report.source.pinnedModules!==30||report.source.pinnedBlocksSha256!==pin||report.source.staticESMClosureMissing?.length||report.results?.length!==5||report.summary?.productionPlannerBuildingsRun!==5)fail('SOURCE_EVIDENCE_STATE');
 const {reportSha256,...body}=report;
 if(sha(Buffer.from(JSON.stringify(body)))!==reportSha256)fail('EVIDENCE_DIGEST');
 if(report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||report.constructionApproved!==false||report.gates?.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||report.BuildPlan?.operations?.length!==0||report.BuildPlan?.commandCount!==0||report.summary.worldCommands!==0||report.summary.worldConnections!==0||report.results.some(x=>!x.plannerActuallyCalled||x.geometry?.BuildPlan?.operations?.length||x.geometry?.constructionApproved!==false||x.geometry?.emissionAllowed!==false))fail('UNSAFE_UPLOADED_REPORT');
 return true;
}
export function candidateRank(j,b66,b65){
 const sections=b66.sections.filter(s=>s.id.startsWith(j.id+'/'));
 const s65=b65.sections.filter(s=>s.id.startsWith(j.id+'/'));
 const {width,depth}=j.createBuildingPlanInputCandidate;
 const program=j.id.split('/')[0];
 const options=[];
 for(const mode of modes[program])for(let seed=0;seed<=15;seed++){
  const masses=massingFromPinnedRules(mode,width,depth,seed),cmp=compareMasks(sections,masses);
  const interior=auditInterior(s65,sections,masses);
  options.push({massing:mode,seed,comparison:cmp,interior,masses});
 }
 options.sort((a,b)=>a.comparison.delta-b.comparison.delta||a.interior.totals.roomCellsOutside-b.interior.totals.roomCellsOutside||a.seed-b.seed||modes[program].indexOf(a.massing)-modes[program].indexOf(b.massing));
 return options;
}
export async function runB75({runProduction=true}={}){
 const raw=JSON.parse(fs.readFileSync(officialReportFile,'utf8'));
 const blocks=fs.readFileSync(blockFile);validateOfficialEvidence(raw,blocks);
 const grammar=fs.readFileSync(path.join(originalRuntime,'engine/src/building-grammar.js'));
 if(sha(Buffer.from(grammar))!==grammarPin)fail('GRAMMAR_PIN_MISMATCH');
 const {report:b72,b65,b66,b70}=buildB72();
 const results=[];
 const saved=new Map(raw.results.map(x=>[x.id,x]));
 const jobs=b72.jobs;
 // Original 5 production outputs are pinned by the uploaded Windows evidence.
 for(const job of jobs){
  const original=saved.get(job.id);if(!original)fail('MISSING_REAL_EVIDENCE');
  const sections=b66.sections.filter(s=>s.id.startsWith(job.id+'/'));
  const s65=b65.sections.filter(s=>s.id.startsWith(job.id+'/'));
  const program=job.id.split('/')[0];
  const baseline=massingFromPinnedRules(modes[program][0],job.createBuildingPlanInputCandidate.width,job.createBuildingPlanInputCandidate.depth,0);
  const check=compareMasks(sections,baseline),old=original.geometry;
  if(check.matched!==old.matchedCells||check.missing!==old.missingNominalCells||check.extra!==old.extraProductionCells)fail('PINNED_REAL_COMPARISON_DRIFT_'+job.id);
  const ranked=candidateRank(job,b66,b65);
  const top=ranked[0];
  results.push({id:job.id,program,original:{massing:modes[program][0],seed:0,...check,interior:auditInterior(s65,sections,baseline).totals},
   candidate:{massing:top.massing,seed:top.seed,comparison:top.comparison,interior:top.interior.totals,verifiedByActualPlanner:false,plannerOpsInspectedOnly:0},
   heldReason:top.comparison.delta>0?'FOOTPRINT_MISMATCH_REMAINS':'AWAIT_PHYSICAL_CLEARANCE_FACADE_AND_WORLD_TRANSFORM',
   inputProposal:{...job.createBuildingPlanInputCandidate,massing:top.massing,seed:top.seed},
   authority:'PROPOSED_ONLY_NO_APPROVAL'});
 }
 if(runProduction){
  let scratch;
  try{
   scratch=fs.mkdtempSync(path.join(os.tmpdir(),'b75-offline-'));
   fs.cpSync(originalRuntime,scratch,{recursive:true});
   fs.writeFileSync(path.join(scratch,'catalog/sources/Blocks.md'),blocks);
   const man=JSON.parse(fs.readFileSync(path.join(scratch,'B72_DEPENDENCY_MANIFEST.json')));
   const planner=await createOfflinePlanner(scratch,man);
   for(const item of results){
    const job=jobs.find(j=>j.id===item.id),option=item.candidate;
    // Existing unmodified office-03 plan was executed under the official catalog on Windows.
    if(option.massing===item.original.massing&&option.seed===0&&item.original.delta===0){option.verifiedByActualPlanner=true;option.plannerOpsInspectedOnly=saved.get(item.id).operationsExaminedOnly;option.verification='UPLOADED_OFFICIAL_WINDOWS_ORIGINAL';continue;}
    const snapshot=planner.makePlan(item.inputProposal);
    const cmp=preflightProductionPlan(snapshot,job,b66);
    if(cmp.missingNominalCells!==option.comparison.missing||cmp.extraProductionCells!==option.comparison.extra||cmp.matchedCells!==option.comparison.matched)fail('PINNED_RULE_MISMATCH_'+item.id);
    option.verifiedByActualPlanner=true;option.plannerOpsInspectedOnly=snapshot.counts.operations;option.verification='LOCALLY_REPLAYED_PINNED_OFFICIAL_PLANNER';
   }
  }finally{if(scratch)fs.rmSync(scratch,{recursive:true,force:true});}
 }
 const stats={originalBuildingsWithExactFootprint:results.filter(r=>r.original.delta===0).length,
  candidateBuildingsWithExactFootprint:results.filter(r=>r.candidate.comparison.delta===0&&r.candidate.verifiedByActualPlanner).length,
  originalMismatchCells:results.reduce((n,r)=>n+r.original.delta,0),candidateMismatchCells:results.reduce((n,r)=>n+r.candidate.comparison.delta,0),
  plannerVerifiedCandidates:results.filter(r=>r.candidate.verifiedByActualPlanner).length,physicalDoorBlocks:0,physicalStairBlocks:0,worldCommands:0};
 const body={schema:'minecraftaibuilder-b75-production-footprint-reconciliation-v1',kind:'OFFLINE_CANDIDATE_PROPOSALS_NON_EXECUTABLE',
  source:{productionModulesPinned:30,officialBlockCatalogSha256:pin,productionB74EvidenceSha256:raw.reportSha256,grammarSha256:grammarPin,
   nominalB66Sha256:b66.reportSha256,logicalB65Sha256:b65.reportSha256,nominalB70Sha256:b70.reportSha256},
  statistics:stats,results,remaining:['HOTEL_FOOTPRINT_REQUIRES_DESIGN_APPROVAL_OR_EXTENDED_MASSING','OFF_MASK_CORRIDORS_18_HELD','B42_UPPER_DOORS_60_HELD','NO_REAL_DOOR_BLOCK_STATES','NO_STAIR_HEADROOM_SUPPORT','NO_FACADE_INTERIOR_COLLISION_ANALYSIS','NO_WORLD_COORDINATE_CALIBRATION'],
  scope:'READONLY_LOCAL_GEOMETRY_NOT_MINECRAFT_WORLD',readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  gates:b72.gates.map(g=>({...g,status:'BLOCKED'})),worldContacts:0,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:sha(Buffer.from(JSON.stringify(body)))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const dry=process.argv.includes('--analysis-only');const output=await runB75({runProduction:!dry});
 if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B75_RECONCILIATION_REPORT.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({statistics:output.statistics,results:output.results.map(r=>({id:r.id,massing:r.candidate.massing,seed:r.candidate.seed,delta:r.candidate.comparison.delta,verified:r.candidate.verifiedByActualPlanner,interior:r.candidate.interior})),readiness:output.readiness}));
}
