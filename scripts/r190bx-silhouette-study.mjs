/** R190-BX: real B143 art-first silhouette A/B. No functional route, provider, world or construction. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const briefSHA='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const sides=['front','rear','west','east','roof'];
const masks={
 A:[{id:'front-rift',origin:[40,19,12],size:[6,60,10]},
    {id:'rear-rift',origin:[40,19,33],size:[6,60,8]}],
 B:[{id:'front-rift',origin:[40,19,12],size:[9,60,10]},
    {id:'rear-rift',origin:[40,19,33],size:[9,60,8]}]
};
const safety=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
 modelCalls:0,networkRequests:0,worldContacts:0,worldWrites:0,art:'ART_HOLD',officialArtAdoptions:0});
export function auditBXGeometry(scene,design,masks){
 if(!verifyCompiled(design,scene))throw Error('R190BX_COMPILER_MISMATCH');
 const voxel=new Set(scene.primitives.map(p=>p.slice(0,3).join(',')));
 const empty=masks.map(v=>{
  let occupied=0;
  for(let x=v.origin[0];x<v.origin[0]+v.size[0];x++)
  for(let y=v.origin[1];y<v.origin[1]+v.size[1];y++)
  for(let z=v.origin[2];z<v.origin[2]+v.size[2];z++)
   if(voxel.has(x+','+y+','+z))occupied++;
  return {...v,volume:v.size.reduce((a,b)=>a*b,1),finalOccupiedVoxels:occupied,passed:occupied===0};
 });
 return {sourceSha256:scene.sourceSha256,geometrySha256:scene.geometrySha256,
  fullVoxelCount:scene.primitives.length,elementCount:design.elements.length,
  verticalBands:Array.from({length:6},(_,i)=>({range:[i*16,i*16+15],
   voxels:scene.primitives.filter(p=>p[1]>=i*16&&p[1]<i*16+16).length})),
  materialCounts:scene.stats.layerCounts,voids:empty,voidsTrulyClear:empty.every(v=>v.passed),
  sourceStatus:'B143_REAL_SCULPTURE_ONLY_FUNCTION_UNTESTED',
  beauty:'ART_HOLD',usableFloor:'NOT_TESTED',entranceWalking:'NOT_TESTED',
  realMinecraftWalking:'NOT_TESTED',structuralSafety:'NOT_CERTIFIED',...safety()};
}
export function studyR190BX({out}){
 const brief=fs.readFileSync(path.join(root,'evidence/r190bm/USER_BRIEF.txt'));
 if(sha(brief)!==briefSHA)throw Error('R190BX_ORIGINAL_BRIEF_CHANGED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R190BX_FRESH_OUTPUT');
 fs.mkdirSync(dir);
 const originalA=fs.readFileSync(path.join(root,'evidence/r190bx/SILHOUETTE_A.json'));
 let originalRejection='UNEXPECTED_ACCEPTANCE';
 try{validateDesign(JSON.parse(originalA))}catch(error){originalRejection=error.message;}
 if(originalRejection!=='B143_OUTSIDE_LOCAL_BOUNDS')
  throw Error('R190BX_ORIGINAL_A_FAILURE_NOT_REPRODUCED:'+originalRejection);
 fs.writeFileSync(path.join(dir,'A_INITIAL_REJECTION.json'),json({
  originalRawSHA256:sha(originalA),sourceFile:'evidence/r190bx/SILHOUETTE_A.json',
  strictB143Failure:originalRejection,originalUnmodified:true,authorRevision:'SILHOUETTE_A2.json',
  note:'Source-authored structural beams exceeded y=0 by one voxel; rejection is deliberate, no clamping or host auto repair.'}),{flag:'wx'});
 const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
 const cases=[];
 for(const letter of ['A','B']){
  const rel='evidence/r190bx/SILHOUETTE_'+(letter==='A'?'A2':letter)+'.json';
  const raw=fs.readFileSync(path.join(root,rel)),design=JSON.parse(raw);
  if(raw.length>25000)throw Error('R190BX_ORIGINAL_SIZE');
  validateDesign(design);
  const scene=compileDesign(design),review=auditBXGeometry(scene,design,masks[letter]);
  if(!review.voidsTrulyClear||review.fullVoxelCount<1500)throw Error('R190BX_VOXEL_CONCEPT_HOLD_'+letter);
  const gallery=compileB143Gallery([design]);
  const dest=path.join(dir,'SILHOUETTE_'+letter);fs.mkdirSync(dest);
  fs.writeFileSync(path.join(dest,'ORIGINAL_SOURCE.json'),raw,{flag:'wx'});
  fs.writeFileSync(path.join(dest,'FINAL_VOXELS.json'),json({sourceSha256:scene.sourceSha256,
   geometrySha256:scene.geometrySha256,primitives:scene.primitives}),{flag:'wx'});
  fs.writeFileSync(path.join(dest,'VIEWER_3D.html'),renderB143Html(gallery,template),{flag:'wx'});
  for(const side of sides)fs.writeFileSync(path.join(dest,'VIEW_'+side+'.svg'),
   renderR164Elevation(scene,design,side),{flag:'wx'});
  fs.writeFileSync(path.join(dest,'AUDIT.json'),json({...review,originalRawSHA256:sha(raw),
   briefSHA256:briefSHA,authorship:'CHAT_GPT_6_NOT_QWEN_OR_GEMMA'}),{flag:'wx'});
  cases.push({letter,title:design.title,sourcePath:rel,originalRawSHA256:sha(raw),
   geometrySha256:scene.geometrySha256,sourceSha256:scene.sourceSha256,
   voxelCount:review.fullVoxelCount,renderSurfaceCount:gallery.scenes[0].surface.length,
   canyon:review.voids,sculpturalOnly:true,functionalCertification:false,
   actualMinecraftWalking:false,art:'ART_HOLD'});
 }
 const report={schema:'minecraftaibuilder-r190bx-sculpture-first-study-v1',
  source:'CHAT_AUTHOR_INDEPENDENT_B143_NOT_MODEL_GENERATED',
  initialOriginalARejectionReproduced:originalRejection,
  initialOriginalASHA256:sha(originalA),
  BM_OriginalBriefSHA256:briefSHA,protectedBUandBWOriginals:true,
  geomDifferent:cases[0].geometrySha256!==cases[1].geometrySha256,
  technicalGate:cases[0].geometrySha256!==cases[1].geometrySha256?
   'SOURCE_TWO_ORIGINAL_B143_SCULPTURES_CLEAR_CANYON':'HOLD_UNDIFFERENTIATED_CONCEPT',
  artGate:'ART_HOLD_AWAIT_HUMAN_VISUAL',usableArchitecture:'NOT_TESTED',
  conceptIsNotFunctionalBuilding:true,cases,...safety()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),json(report),{flag:'wx'});
 const rows=cases.map(c=>'<tr><td>'+c.letter+'</td><td>'+c.voxelCount+
  '</td><td>'+c.canyon.map(v=>v.finalOccupiedVoxels).join(',')+
  '</td><td><a href="SILHOUETTE_'+c.letter+'/VIEWER_3D.html">actual 3D</a></td><td>'+
  sides.map(v=>'<a href="SILHOUETTE_'+c.letter+'/VIEW_'+v+'.svg">'+v+'</a>').join(' / ')+
  '</td></tr>').join('');
 fs.writeFileSync(path.join(dir,'COMPARE.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-BX genuine voxel art-first</title>'+
  '<style>body{background:#101a2b;color:#f8f9ff;font:16px/1.7 system-ui;margin:30px auto;max-width:1200px;padding:18px}td,th{border:1px solid #578;padding:12px}a{color:#9df}table{border-collapse:collapse}</style>'+
  '<h1>R190-BX：最初に主殻・都市空洞・入口を造形する独立2案</h1>'+
  '<p>真正B143 voxel・5投影のSOURCE研究。用途機能、階段、幅2歩行、美術完成のPASSは一切主張しない。モデル呼び出し0、世界書込み0。</p>'+
  '<table><tr><th>案</th><th>実ボクセル</th><th>2空洞の占有セル</th><th>実3D</th><th>投影</th></tr>'+rows+'</table>'+
  '<p><a href="STUDY.json">原文SHAと品質ゲート</a></p></html>',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190BX_CLI');
  const r=studyR190BX({out:process.argv[3]});
  console.log(json({gate:r.technicalGate,art:r.artGate,cases:r.cases.map(x=>({
   letter:x.letter,voxels:x.voxelCount,sha:x.geometrySha256,canyon:x.canyon}))}));
  if(r.technicalGate!=='SOURCE_TWO_ORIGINAL_B143_SCULPTURES_CLEAR_CANYON')process.exitCode=2;
 }catch(error){console.error(error.stack??String(error));process.exitCode=1;}
}
