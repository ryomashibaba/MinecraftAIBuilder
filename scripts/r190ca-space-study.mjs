/** R190-CA: true author-authored volumetric architecture with independent spatial audits.
 * No provider, no Minecraft writes, no unapproved design repair. B143 VIEWER ONLY.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190CA,MATERIALS} from '../source/ai/r190ca-authored-space-mass.mjs';
import {surfaceOnly,renderB143Html} from './b143-gallery-core.mjs';
import {elevationR190BZ,perspectiveR190BZ} from './r190bz-open-shell-study.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const J=x=>JSON.stringify(x,null,2)+'\n';
const safe=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldWrites:0,modelCalls:0,networkRequests:0,
  art:'ART_HOLD',officialArtAdoptions:0});
function htmlViewer(c,p,template){
 const s=surfaceOnly({primitives:c.primitives}),v=c.primitives;
 const mn=[Infinity,Infinity,Infinity],mx=[-1,-1,-1];
 for(const q of v)for(let i=0;i<3;i++){mn[i]=Math.min(mn[i],q[i]);mx[i]=Math.max(mx[i],q[i]);}
 const scene={id:p.id,title:p.title,brief:'AUTHORED VOLUMETRIC SOURCE ONLY - not a completed building',
  typology:'author-authored-segmented-mass-and-public-cuts',levels:Math.floor(mx[1]/5)+1,
  layerNames:MATERIALS.map(v=>'CA_'+v.toUpperCase()),surface:s,
  bounds:{minX:mn[0],minY:mn[1],minZ:mn[2],maxX:mx[0],maxY:mx[1],maxZ:mx[2]},
  sourceSha256:c.sourceSha256,geometrySha256:c.geometrySha256,
  stats:{voxels:v.length,renderedSurfaceCells:s.length,conceptRooms:0,
    physicalCompletion:'NOT_CERTIFIED',humanReview:'REQUIRED'},
  targetEdition:'MINECRAFT_EDUCATION',designOnly:true,readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,BuildPlan:{status:'NOT_PREPARED',operations:[]}};
 const payload={schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
  sourceHashes:[c.sourceSha256],geometryHashes:[c.geometrySha256],scenes:[scene],
  safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
    worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
    original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
 return {html:renderB143Html(payload,template),surface:s.length};
}
function spatialMetrics(c){
 const vox=new Set(c.primitives.map(v=>v.slice(0,3).join(',')));
 let xs=[Infinity,-Infinity],ys=[Infinity,-Infinity],zs=[Infinity,-Infinity];
 for(const [x,y,z] of c.primitives){
  xs=[Math.min(xs[0],x),Math.max(xs[1],x)];ys=[Math.min(ys[0],y),Math.max(ys[1],y)];
  zs=[Math.min(zs[0],z),Math.max(zs[1],z)];
 }
 const row=new Map();
 for(const [x,y,z] of c.primitives){
  const q=row.get(y)||[Infinity,-Infinity];
  row.set(y,[Math.min(q[0],z),Math.max(q[1],z)]);
 }
 return {extent:{x:xs,y:ys,z:zs},occupiedYRows:row.size,
  rowsWithDepthSpan40:[...row.values()].filter(q=>q[1]-q[0]>=40).length,
  sampledVoxelOccupancy:vox.size,
  assessment:'RAW_VOXEL_SPATIAL_DIAGNOSTIC_NOT_ARCHITECTURAL_ACCEPTANCE'};
}
export function studyR190CA({out}={}){
 if(typeof out!=='string'||!out)throw Error('R190CA_OUTPUT_REQUIRED');
 const brief=fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt'));
 if(SHA(brief)!==BM)throw Error('R190CA_BM_BRIEF_CHANGED');
 const dir=path.resolve(out);
 if(fs.existsSync(dir))throw Error('R190CA_OUTPUT_EXISTS');fs.mkdirSync(dir);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const cases=[];
 const sides=['front','rear','west','east','roof','oblique','ground','canyon'];
 for(const k of ['A','B']){
  const filename='evidence/r190ca/MASS_'+k+'.json',raw=fs.readFileSync(path.join(ROOT,filename));
  const p=JSON.parse(raw);if(p.originalBriefSha256!==BM)throw Error('R190CA_BRIEF_BINDING');
  const c=compileR190CA(raw),folder=path.join(dir,'MASS_'+k);fs.mkdirSync(folder);
  const display=htmlViewer(c,p,template);
  fs.writeFileSync(path.join(folder,'ORIGINAL.json'),raw,{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ALL_VOXELS.json'),J({schema:c.schema,
   originalRawSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,primitives:c.primitives}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'VIEWER_3D.html'),display.html,{flag:'wx'});
  for(const side of sides){
   const svg=['front','rear','west','east','roof'].includes(side)?
    elevationR190BZ(c,side):perspectiveR190BZ(c,side);
   fs.writeFileSync(path.join(folder,'VIEW_'+side+'.svg'),svg,{flag:'wx'});
  }
  const metrics={case:k,title:p.title,sourceFile:filename,
   origin:'CHAT_GPT_6_AUTHOR_DESIGN_NOT_REAL_LOCAL_QWEN_GEMMA_OUTPUT',
   sourceGrammar:'SEPARATE_R190CA_TRUE_VOXELS_NOT_NATIVE_B143',
   originalRawSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,
   trueFinalVoxelCount:c.primitives.length,sourceMassCount:p.masses.length,
   authoredFloorLevels:p.masses.reduce((n,m)=>n+m.floorYs.length,0),
   beforeCuts:c.stats.beforeCuts,removedByCuts:c.stats.removedByCuts,
   protectedVoids:c.stats.protectedVoidResults,
   programFootprintEvidence:c.stats.programs,spatial:spatialMetrics(c),
   actualVoxelProjectionViews:sides,
   functionGate:'HOLD_PROGRAM_FLOORS_ONLY_WALKABILITY_UNTESTED',
   independentArtReview:'PENDING_VISUAL_EXAMINATION',
   existingB143Unmodified:true,existingBYAndBZSourcesUnmodified:true,
   ...safe()};
  fs.writeFileSync(path.join(folder,'AUDIT.json'),J(metrics),{flag:'wx'});
  cases.push(metrics);
 }
 const pass=cases[0].geometrySha256!==cases[1].geometrySha256&&
  cases.every(v=>v.trueFinalVoxelCount>5000&&v.removedByCuts>500&&
  v.protectedVoids.every(x=>x.pass));
 const report={schema:'minecraftaibuilder-r190ca-verified-independent-source-study-v1',
  originalBMBriefSHA:BM,technicalGate:pass?'SOURCE_VOLUME_AND_CUT_REAL_VOXELS':
    'HOLD_SOURCE_OR_VOIDS',functionGate:'HOLD_INDEPENDENT_PROGRAM_AND_ROUTES',
  artGate:'ART_HOLD_AWAITING_ACTUAL_VIEWS',structuralGate:'NOT_TESTED',
  designAuthorship:'CHAT_GPT_6_NOT_QWEN_GEMMA',cases,...safe()};
 fs.writeFileSync(path.join(dir,'STUDY.json'),J(report),{flag:'wx'});
 const rows=cases.map(x=>'<tr><td>'+x.case+'</td><td>'+x.trueFinalVoxelCount+
  '</td><td>'+x.removedByCuts+'</td><td>'+x.programFootprintEvidence.map(q=>q.id+
  ': '+q.supportedClearFraction).join('<br/>')+'</td><td><a href="MASS_'+x.case+
  '/VIEWER_3D.html">Actual 3D</a></td><td>'+sides.map(side=>
  '<a href="MASS_'+x.case+'/VIEW_'+side+'.svg">'+side+'</a>').join(' / ')+'</td></tr>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-CA architecture source 3D</title>'+
  '<style>body{background:#101827;color:#eaf4ff;font:14px/1.7 system-ui;max-width:1500px;margin:24px auto}a{color:#8bd4ff}table{border-collapse:collapse}td,th{border:1px solid #637;padding:9px}</style>'+
  '<h1>R190-CA｜作者指定の居住可能容積を目指した建築SOURCE研究</h1>'+
  '<p>実モデル推論ではなく作者研究。部屋の用途ラベルだけでは成立認定せず、支持床＋3セル頭上空間を実形状から測定。' +
  '上階接続・実動線・美術・施工は未認定。B143本体の新形式対応ではない。</p>'+
  '<table><tr><th>案</th><th>実voxels</th><th>立体切除voxels</th><th>用途候補の支持床+頭上空間の比率</th><th>実3D</th><th>8実画像</th></tr>'+rows+'</table>'+
  '<p><a href="STUDY.json">SHA・安全境界・独立研究監査</a></p></html>';
 fs.writeFileSync(path.join(dir,'COMPARE.html'),html,{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190CA_CLI');
  const r=studyR190CA({out:process.argv[3]});
  console.log(J({technicalGate:r.technicalGate,functionGate:r.functionGate,
   cases:r.cases.map(c=>({case:c.case,voxels:c.trueFinalVoxelCount,
     raw:c.originalRawSha256,geometry:c.geometrySha256,removedByCuts:c.removedByCuts,
     programs:c.programFootprintEvidence.map(q=>({id:q.id,supportedClear:q.supportedClearFraction}))}))}));
  if(r.technicalGate!=='SOURCE_VOLUME_AND_CUT_REAL_VOXELS')process.exitCode=2;
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
