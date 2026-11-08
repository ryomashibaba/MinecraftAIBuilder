/**
 * R187 independent 3D source comparison: R186 upper-room proof vs
 * room-connected skycourt, true west stair daylight and east panorama.
 * STATIC SYNTHETIC. Original R186 and Minecraft world not modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeR186SyntheticReply} from './r186-vertical-slice-comparison.mjs';
import {compileR186VerticalSlice}
 from '../source/ai/r186-vertical-public-slice.mjs';
import {R187_SCHEMA,compileR187DaylitUpperCourt}
 from '../source/ai/r187-daylit-upper-court.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {renderB143Html,compileB143Gallery}
 from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const fail=s=>{throw Error('R187_REAL_SOURCE_REVIEW_'+s)};
const safe=r=>r?.readiness==='NOT_PREPARED'&&r?.constructionApproved===false&&
 r?.executionAllowed===false&&r?.worldContacts===0&&r?.worldWrites===0&&
 Array.isArray(r.gates)&&r.gates.length===9&&r.gates.every(g=>g==='BLOCKED')&&
 r.BuildPlan?.operations?.length===0;

export function makeR187SyntheticReply(){
 return {schema:R187_SCHEMA,base:makeR186SyntheticReply(),
  daylight:{roomId:'assembly-gallery',roomFacing:'east',
   stairFacing:'west',courtUse:'accessible-outdoor-balcony'}};
}
export function buildR187DaylightReview(){
 const proposal=makeR187SyntheticReply(),
  previous=compileR186VerticalSlice(JSON.stringify(proposal.base)),
  next=compileR187DaylitUpperCourt(JSON.stringify(proposal)),
  audit=next.daylightSourceAudit;
 if(!safe(previous)||!safe(next)||!verifyCompiled(next.design,next.compiled)||
  !verifyCompiled(previous.design,previous.compiled)||
  next.originalR186GeometrySha256!==previous.compiled.geometrySha256||
  next.originalR186VoxelCount!==previous.compiled.primitives.length||
  next.resultingR187VoxelCount!==next.compiled.primitives.length||
  next.resultingR187VoxelCount===next.originalR186VoxelCount||
  audit.sourcePublicGraphStatus!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audit.westStairLightViewRayWitnesses?.length!==3||
  audit.eastRoomPanoramaViewRayWitnesses?.length!==2||
  audit.physicallyContinuousPosts!==2||
  audit.actualBalconyAccess?.reachedFromEntrance!==true||
  audit.preservedExhibitService?.reachableFromEntrance!==true||
  audit.actualEnclosedRoomAccess?.reachedFromEntrance!==true||
  audit.sourceRoomAndStairAudit!=='r186-two-level-B143-voxel-route-audit-v1'||
  audit.luxIllumination!=='NOT_SIMULATED'||
  next.modelCalls!==0||next.artDecision!=='ART_HOLD_HUMAN_REVIEW')
  fail('REAL_GEOMETRY_ROUTE_OR_SOURCE_SAFETY');
 return {
  schema:'r187-exterior-interior-source-cause-and-effect-comparison-v1',
  authenticity:'STATIC_HOST_RESEARCH_NOT_QWEN_GEMMA',
  sourceOnly:true,modelCalls:0,worldWrites:0,
  artStatus:'ART_HOLD',old:previous,now:next,
  comparison:{
   commonFunctionalSlice:'SAME_16_STAIRS_SINGLE_ASSEMBLY_ROOM_DISPLAY',
   previousVoxelCount:previous.compiled.primitives.length,
   currentVoxelCount:next.compiled.primitives.length,
   previousGeometryHash:previous.compiled.geometrySha256,
   currentGeometryHash:next.compiled.geometrySha256,
   supportedAndReachedOutdoorTerrace:true,
   physicallyVerifiedWestStairViewRays:audit.westStairLightViewRayWitnesses,
   physicallyVerifiedEastRoomViewRays:audit.eastRoomPanoramaViewRayWitnesses,
   accessAudit:audit.sourcePublicGraphStatus,
   sourceRoomAndStairInvariantsIntact:true,
   limits:['NOT_AN_ILLUMINATION_SIMULATION','NOT_ENGINEERING_STRUCTURAL_PROOF',
    'NOT_GENUINE_QWEN_GEMMA_RESULT',
    'NOT_REAL_MINECRAFT_PLAYER_PHYSICS',
    'NOT_ALL_THREE_ROOMS_MODELED','ART_HOLD']
  }
 };
}
function witnessSvg(report){
 const a=report.now.daylightSourceAudit;
 const lines=[
  'Stair: '+a.westStairLightViewRayWitnesses.map(v=>v.stairEye.join(',')).join(' / '),
  'Room: '+a.eastRoomPanoramaViewRayWitnesses.map(v=>v.roomEye.join(',')).join(' / '),
  'Balcony: '+a.actualBalconyAccess.sourceWitness?.join(','),
  'Ground and upper source paths: '+a.sourcePublicGraphStatus,
  'B143 light/transparency rays, not a sunlight / lux simulation'
 ];
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 1100 205">'+
  '<rect width="1100" height="205" fill="#172c43"/>'+
  '<text x="22" y="28" font-size="20" fill="#edf4fc">R187 — Independent physical voxel witnesses</text>'+
  lines.map((l,i)=>'<text x="22" y="'+(61+i*27)+
   '" fill="#d3e5f5" font-size="16">'+l.replaceAll('&','&amp;')+'</text>').join('')+
  '</svg>';
}
export function saveR187DaylightReview(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('OUTPUT_MUST_BE_NEW');
 const report=buildR187DaylightReview(),
  dir=path.resolve(out),root=path.dirname(fileURLToPath(import.meta.url)),
  template=fs.readFileSync(path.join(root,
   '../source/ai/b143-viewer-template.html'),'utf8'),
  files=new Map();
 for(const [label,p] of [['r186',report.old],['r187',report.now]]){
  files.set(label+'.html',renderB143Html(compileB143Gallery([p.design]),template));
  for(const side of ['front','rear','east','west','roof'])
   files.set(label+'-'+side+'.svg',
    renderR164Elevation(p.compiled,p.design,side));
 }
 files.set('r187-real-sightlines.svg',witnessSvg(report));
 files.set('R187_SOURCE_QA.json',JSON.stringify({
  schema:report.schema,sourceOnly:true,authenticity:report.authenticity,
  realModelCalls:0,worldWrites:0,artStatus:report.artStatus,
  comparison:report.comparison,
  verifiedCurrentSafety:{
   readiness:report.now.readiness,
   constructionApproved:report.now.constructionApproved,
   executionAllowed:report.now.executionAllowed,
   gates:report.now.gates,BuildPlan:report.now.BuildPlan,
   worldContacts:report.now.worldContacts,worldWrites:report.now.worldWrites},
  sourceProof:report.now.daylightSourceAudit,
  exactOriginalRawIR:report.now.rawSyntheticIR
 },null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R187 daylight public room comparison</title>'+
  '<style>body{background:#152638;color:#eef6ff;font:15px/1.5 system-ui;padding:20px}'+
  '.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
  'article{background:#2c485d;padding:10px}iframe{width:100%;height:490px;'+
  'border:1px solid #6b879a}img{width:19%;margin:.5%}.proof{width:100%}</style>'+
  '<h1>R187 — one source-reached outdoor balcony, stairwell light and panoramic upper room</h1>'+
  '<p>STATIC SYNTHETIC REAL B143, not real model inference. 16 old stair steps, old display and'+
  ' ground public path preserved. Air-glass sightline only; lux and engineering NOT TESTED.'+
  ' Aesthetic quality ART HOLD and all Minecraft writes prohibited.</p>'+
  '<div class="pair">'+[['r186',report.old],['r187',report.now]].map(([label,p])=>
   '<article><h2>'+label.toUpperCase()+' — '+p.compiled.primitives.length+
   ' physical voxels</h2><iframe src="'+label+'.html" loading="lazy"></iframe>'+
   ['front','rear','east','west','roof'].map(v=>'<img src="'+label+'-'+v+
    '.svg" alt="'+v+'">').join('')+'</article>').join('')+
  '</div><h2>Physical proof of outside views and real reachability</h2>'+
  '<img class="proof" src="r187-real-sightlines.svg" alt="Real B143 source witness">');
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,value] of files)
  fs.writeFileSync(path.join(dir,name),value,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
   '### R187 actual source geometry — daylit stair and balcony',
   '**STATIC SYNTHETIC; ART HOLD; NO MINECRAFT WORLD WRITES.**',
   '- Old stair/source room: 16 steps + one display remain connected',
   '- True stair glass-through-air sightlines: 3',
   '- True upper room panorama through glass to open air: 2',
   '- Open-sky upper balcony: physically supported and R125 source reached',
   '- BEFORE voxels: '+report.comparison.previousVoxelCount,
   '- AFTER voxels: '+report.comparison.currentVoxelCount,
   '- Minecraft player collision / illumination lux / building loads NOT TESTED',
   ''
  ].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const review=saveR187DaylightReview(args[1]);
  console.log(JSON.stringify({realModelCalls:0,worldWrites:0,
   oldVoxels:review.comparison.previousVoxelCount,
   newVoxels:review.comparison.currentVoxelCount}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2;}
}
