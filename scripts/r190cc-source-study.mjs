/** R190-CC two independent authored 3D signed-volume designs.
 * Actual source voxel evidence, B143 VIEWER ONLY; no model/world/network action.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190CC,CB_SHA} from '../source/ai/r190cc-freeform-boolean.mjs';
import {surfaceOnly,renderB143Html} from './b143-gallery-core.mjs';
import {elevationR190BZ,perspectiveR190BZ} from './r190bz-open-shell-study.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const BM='bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a';
const H=b=>createHash('sha256').update(b).digest('hex'),J=v=>JSON.stringify(v,null,2)+'\n';
const VIEWS=['front','rear','west','east','roof','oblique','ground','canyon'];
function viewer(c,p,template){
 const surf=surfaceOnly({primitives:c.primitives}),pts=c.primitives;
 const mn=[Infinity,Infinity,Infinity],mx=[-1,-1,-1];
 for(const q of pts)for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],q[a]);mx[a]=Math.max(mx[a],q[a]);}
 const scene={id:p.id,title:p.title,brief:'CHAT authored independent boolean 3D SOURCE, no art/function certification',
  typology:'3d-rotated-volume-boolean-asymmetric-civic-tower',levels:Math.floor(mx[1]/5)+1,
  layerNames:c.materialNames.map(s=>'CC_'+s.toUpperCase()),surface:surf,
  bounds:{minX:mn[0],minY:mn[1],minZ:mn[2],maxX:mx[0],maxY:mx[1],maxZ:mx[2]},
  sourceSha256:c.originalRawSha256,geometrySha256:c.geometrySha256,
  stats:{voxels:pts.length,renderedSurfaceCells:surf.length,conceptRooms:0,
    functionalCompletion:'NOT_CERTIFIED',realGameWalking:'NOT_TESTED'},
  targetEdition:'MINECRAFT_EDUCATION',designOnly:true,readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]}};
 const payload={schema:'minecraftaibuilder-b143-gallery-v1',edition:'MINECRAFT_EDUCATION',
 sourceHashes:[c.originalRawSha256],geometryHashes:[c.geometrySha256],scenes:[scene],
 safety:{constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
  worldCoordinates:null,worldContacts:0,BuildPlan:{operations:[]},
  original15BuildingSafetyGates:'9 BLOCKED',minecraftWrites:0}};
 return {html:renderB143Html(payload,template),surfaceCount:surf.length};
}
export function studyR190CC(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))throw Error('R190CC_OUTPUT_NOT_NEW');
 const cbRaw=fs.readFileSync(path.join(ROOT,'evidence/r190cb/RIFT_LANTERN.json'));
 if(H(cbRaw)!==CB_SHA||H(fs.readFileSync(path.join(ROOT,'evidence/r190bm/USER_BRIEF.txt')))!==BM)
  throw Error('R190CC_PROVENANCE_MISMATCH');
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 fs.mkdirSync(out,{recursive:false});
 const cases=[];
 for(const label of ['A','B']){
  const raw=fs.readFileSync(path.join(ROOT,'evidence/r190cc/FORM_'+label+'.json'));
  const p=JSON.parse(raw),c=compileR190CC(raw,cbRaw);
  if(p.originalBriefSha256!==BM)throw Error('R190CC_ORIGINAL_BM_MISMATCH');
  const folder=path.join(out,'FORM_'+label);
  fs.mkdirSync(folder);
  const visual=viewer(c,p,template);
  fs.writeFileSync(path.join(folder,'ORIGINAL.json'),raw,{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ALL_VOXELS.json'),J({schema:c.schema,
    originalRawSha256:c.originalRawSha256,originalRouteSha256:c.originalRouteSha256,
    geometrySha256:c.geometrySha256,primitives:c.primitives}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'VIEWER_3D.html'),visual.html,{flag:'wx'});
  for(const side of VIEWS)
   fs.writeFileSync(path.join(folder,'VIEW_'+side+'.svg'),
    ['front','rear','west','east','roof'].includes(side)?
      elevationR190BZ(c,side):perspectiveR190BZ(c,side),{flag:'wx'});
  const record={case:label,title:p.title,id:p.id,originalRawSha256:c.originalRawSha256,
   originalRouteSha256:c.originalRouteSha256,geometrySha256:c.geometrySha256,
   originalSource:'CHAT_GPT_6_AUTHOR_RESEARCH_NOT_QWEN_GEMMA_OUTPUT',
   trueVoxelCount:c.primitives.length,realSurfaceCells:visual.surfaceCount,
   sourceSolidBrushes:p.solids.length,source3dCuts:p.cuts.length,
   metrics:c.metrics,trueViews:VIEWS,designOnly:true,readiness:'NOT_PREPARED',
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,
   worldWrites:0,networkRequests:0,modelCalls:0,officialArtAdoptions:0,
   artGate:'ART_HOLD_AWAITING_ACTUAL_VIEWS',
   functionGate:'HOLD_AUTHOR_ROUTE_PROXY_NOT_MINECRAFT_WALKABILITY',
   independentStructure:'NOT_TESTED'};
  fs.writeFileSync(path.join(folder,'AUDIT.json'),J(record),{flag:'wx'});
  cases.push(record);
 }
 const report={schema:'minecraftaibuilder-r190cc-true-3d-author-study-v1',
  technicalGate:'SOURCE_3D_BOOLEAN_VOXELS_PENDING_INDEPENDENT_QA',
  artGate:'ART_HOLD_AWAITING_ACTUAL_VIEW_INSPECTION',
  functionGate:'NOT_CERTIFIED',cases,designOnly:true,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},worldContacts:0,
  worldWrites:0,networkRequests:0,modelCalls:0,officialArtAdoptions:0};
 fs.writeFileSync(path.join(out,'STUDY.json'),J(report),{flag:'wx'});
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190-CC</title>'+
  '<style>body{background:#101827;color:white;font:15px system-ui}a{color:#8ad8ff}td{border:1px solid #567;padding:9px}</style>'+
  '<h1>R190-CC TRUE 3D Spatial Boolean SOURCE — A / B</h1>'+
  '<p>Not actual Qwen/Gemma output. Source TECH evidence, not ART or Minecraft approval.</p>'+
  '<table><tr><th>Case</th><th>Real voxels</th><th>Real 3D</th><th>Five ortho plus three cameras</th></tr>'+
  cases.map(c=>'<tr><td>'+c.case+'</td><td>'+c.trueVoxelCount+'</td><td><a href="FORM_'+c.case+'/VIEWER_3D.html">3D</a></td><td>'+
   VIEWS.map(side=>'<a href="FORM_'+c.case+'/VIEW_'+side+'.svg">'+side+'</a>').join(' / ')+
   '</td></tr>').join('')+'</table><p><a href="STUDY.json">Real SHA + safety</a></p></html>';
 fs.writeFileSync(path.join(out,'COMPARE.html'),html,{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--out')throw Error('R190CC_CLI');
  const v=studyR190CC(process.argv[3]);
  console.log(J({technicalGate:v.technicalGate,cases:v.cases.map(q=>({
   case:q.case,voxels:q.trueVoxelCount,geometrySHA:q.geometrySha256,
   removedByCuts:q.metrics.removedByTrue3dCuts,
   protectedVoids:q.metrics.protectedVoidResults,
   supportedRouteNodes:q.metrics.supportedRouteNodes,
   programs:q.metrics.programMetrics.map(a=>({id:a.id,rate:a.supportedClearFraction}))}))}));
 }catch(e){console.error(e.stack??String(e));process.exitCode=1;}
}
