/**
 * Source-only R146 original vs R149/R170 HOST-derived 3D massing.
 * The archived Qwen rooms, doors, weights and eight furnishings are protected.
 * New roof heights/windows are HOST choices, never new model-authored geometry.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {CASE} from './r141-local-graph-evidence.mjs';
import {parseR139RelationalFurnishedReply} from './r139-relational-model.mjs';
import {deriveR149EnvelopeExpression} from '../source/ai/r149-architectural-expression.mjs';
import {deriveR170FourRoomVolumes} from '../source/ai/r170-four-room-volumes.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rawFile=path.join(root,'scripts/fixtures/r146-user-qwen14b-20261025-raw.json');
const rawSha='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const faces=['front','rear','west','east','roof'];
const key=p=>p.slice(0,3).join(',');
const low=p=>new Map(p.compiled.primitives.filter(v=>v[1]<=5).map(v=>[key(v),v[3]]));
const equal=(a,b)=>a.size===b.size&&[...a].every(([k,v])=>b.get(k)===v);
const safe=(p,legacy=false)=>(p.readiness==='NOT_PREPARED'||
 (legacy&&p.readiness===undefined))&&p.worldWrites===0&&
 p.worldContacts===0&&p.executionAllowed===false&&p.constructionApproved===false&&
 p.gates?.length===9&&p.gates.every(g=>g==='BLOCKED')&&p.BuildPlan?.operations?.length===0;
const write=(d,n,v)=>fs.writeFileSync(path.join(d,n),
 typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function run(dir){
 if(fs.existsSync(dir)||dir===root||dir.startsWith(root+path.sep))
  throw Error('NEW_OUTPUT_OUTSIDE_REPOSITORY_REQUIRED');
 const raw=fs.readFileSync(rawFile,'utf8');
 assert.equal(createHash('sha256').update(raw).digest('hex'),rawSha);
 const q=parseR139RelationalFurnishedReply(raw,makeR134FreshRequest({brief:CASE.brief}),
  {allowRoofMaterialCorrection:true});
 assert.equal(q.boundedHostRepairRequired,true);
 assert.equal(q.hostRepairActions.length,1);
 assert.deepEqual(q.derivedModelReply.objects,JSON.parse(raw).objects);
 const original=q.featured,ground=low(original);
 assert.equal(original.placements.length,8);
 assert.equal(original.program[0].zones.length,4);
 assert.equal(q.relationalBase.directAdjacencyDoorEvidence.length,1);
 assert(safe(original,true)); // R130 legacy lacks readiness; other 9 safety flags remain mandatory
 const shell=deriveR149EnvelopeExpression(original,{plan:q.derivedModelReply});
 assert.equal(shell.r149ExpressionEvidence.unchangedInteriorVoxels,true);
 assert.equal(shell.r149ExpressionEvidence.modelIntentChanged,false);
 const study=deriveR170FourRoomVolumes(shell,{studyStyle:'R173_SCULPTED_CLERESTORY'});
 const builds=[['original',original],['host-clerestory',study]],optional=[];
 try{
  builds.push(['host-upper-setback',
   deriveR170FourRoomVolumes(shell,{studyStyle:'R175_SETBACK_TERRACES'})]);
 }catch(e){optional.push({study:'R175_SETBACK_TERRACES',status:'HOLD',code:String(e?.message??e).slice(0,120)});}
 const evidence=builds.map(([name,p])=>{
  assert(verifyCompiled(p.design,p.compiled),name+':B143');
  assert(safe(p,name==='original'),name+':SAFETY');
  assert.equal(p.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(p.sourceRouteAudit.zones.length,4);
  assert.equal(p.sourceRouteAudit.featureAccess.length,8);
  assert(p.sourceRouteAudit.featureAccess.every(f=>f.reachableFromEntrance));
  assert(equal(low(p),ground),name+':MODEL_SELECTED_LOWER_VOXELS_CHANGED');
  return {name,sourceSha256:p.sourceSha256,geometrySha256:p.geometrySha256,
   voxelCount:p.compiled.primitives.length,
   maxY:Math.max(...p.compiled.primitives.map(v=>v[1])),
   modelSelectedGroundRoomsEquipmentUnchanged:true,sourceReachableRooms:4,
   sourceReachableEquipment:8,
   realExteriorClerestoryWindows:p.r170FourRoomVolumeEvidence?.realExteriorClerestoryWindows??0,
   raisedRoomSections:p.r170FourRoomVolumeEvidence?.roomSections??null,
   derivedGeometryProvenance:name==='original'?'ORIGINAL_ARCHIVED_QWEN_DESIGN':
    'R149_R170_HOST_DERIVED_NOT_MODEL_SELECTED_HEIGHT'};
 });
 assert.notEqual(evidence[0].geometrySha256,evidence[1].geometrySha256);
 assert(evidence[1].maxY>evidence[0].maxY+1);
 assert(evidence[1].realExteriorClerestoryWindows>=4);
 assert.equal(study.r170FourRoomVolumeEvidence.roomSections.length,4);
 assert(study.r170FourRoomVolumeEvidence.roomSections.every(s=>s.extraAirColumnsAtY6Y7>=30));
 assert(study.r170FourRoomVolumeEvidence.originalLowerFiveLevelsUnchanged);
 const receipt={schema:'r146-archived-real-qwen-host-volume-research-v1',
  status:'REAL_B143_SOURCE_PASS_HUMAN_ART_UNREVIEWED',
  archivedRawSha256:rawSha,modelOrigin:'USER_REPORTED_QWEN_UNATTESTED',
  originalModelRawEdited:false,modelRoomAndEquipmentAuthorshipKept:true,
  hostMassingNotModelAuthored:true,modelCalls:0,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),variants:evidence,optional};
 fs.mkdirSync(dir,{recursive:false});
 const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
 write(dir,'R146_HOST_VOLUME_COMPARISON.json',receipt);
 for(const [name,p] of builds){
  write(dir,name+'-B143.json',p.design);
  write(dir,name+'-VOXELS.json',p.compiled);
  write(dir,name+'-interactive.html',renderB143Html(compileB143Gallery([p.design]),template));
  for(const f of faces)write(dir,name+'-'+f+'.svg',renderR164Elevation(p.compiled,p.design,f));
 }
 const cards=builds.map(([n],i)=>'<section><h2>'+n+'</h2><p>'+
  evidence[i].voxelCount+' voxels / highest Y='+evidence[i].maxY+'</p>'+
  '<p><a href="'+n+'-interactive.html">Interactive TRUE B143</a></p>'+
  faces.map(f=>'<figure><img src="'+n+'-'+f+'.svg"><figcaption>'+f+'</figcaption></figure>').join('')+'</section>').join('');
 write(dir,'index.html','<!doctype html><html lang="ja"><meta charset="utf-8"><title>R146 HOST-only 3D comparison</title>'+
  '<style>body{font:15px system-ui;background:#14212e;color:#f0f5f7;padding:24px}a{color:#80d5ff}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}section{border:1px solid #607080;padding:14px}figure{margin:12px 0}img{width:100%}figcaption{color:#b4cbd9}</style>'+
  '<h1>Archived Qwen design vs HOST-only R170 massing</h1>'+
  '<p>New volumes, heights and high windows are HOST-derived from archived room weights; NOT newly model-authored. ART/Human approval pending. Minecraft 9 gates blocked.</p><main>'+
  cards+'</main><p><a href="R146_HOST_VOLUME_COMPARISON.json">Source receipt</a></p></html>');
 return receipt;
}
const a=process.argv.slice(2);
try{
 if(a.length!==2||a[0]!=='--out'||!a[1])throw Error('USAGE_--out_NEW_DIRECTORY');
 const r=run(path.resolve(a[1]));
 console.log(JSON.stringify({status:r.status,variants:r.variants.map(v=>({
  name:v.name,voxels:v.voxelCount,maxY:v.maxY,windows:v.realExteriorClerestoryWindows,
  rooms:v.sourceReachableRooms,equipment:v.sourceReachableEquipment})),optional:r.optional,
  modelCalls:0,worldWrites:0}));
}catch(e){console.error('R146_HOST_VOLUME_HOLD:',String(e?.message??e));process.exitCode=2;}
