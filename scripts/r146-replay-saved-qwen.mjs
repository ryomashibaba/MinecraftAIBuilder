/**
 * R146 offline replay of the byte-identical R145 Qwen3:14b user capture.
 * ZERO provider calls. Preserve raw SHA, allow only the explicitly recorded
 * roof-profile-as-material field correction, then attempt the exact shared
 * R139/R130/B143 + independent source-door/equipment/route pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseR139RelationalFurnishedReply}
 from './r139-relational-model.mjs';
import {makeR134FreshRequest} from './r134-fresh-model-pilot.mjs';
import {CASE} from './r141-local-graph-evidence.mjs';
import {auditR143GraphEvidence} from './r143-independent-graph-audit.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rawFixture=path.join(root,'scripts','fixtures',
 'r146-user-qwen14b-20261025-raw.json');
const expectedSha='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
export function replayR146SavedQwen({outDir,
 rawFile=rawFixture}={}){
 if(typeof outDir!=='string'||!outDir||typeof rawFile!=='string'||
  !rawFile||fs.existsSync(outDir))
  throw Error('R146_REPLAY_OUTPUT_EXISTS_OR_INVALID_ARGUMENTS');
 const raw=fs.readFileSync(rawFile,'utf8');
 const originalSha=createHash('sha256').update(raw).digest('hex');
 if(path.resolve(rawFile)===rawFixture&&originalSha!==expectedSha)
  throw Error('R146_REPLAY_ARCHIVED_QWEN_RAW_SHA_CHANGED');
 const directory=path.resolve(outDir);
 fs.mkdirSync(directory,{recursive:false});
 const report={
  schema:'r146-preserved-real-qwen14b-bounded-one-field-offline-replay-v1',
  status:'HOLD_NOT_STARTED',
  originalQwenRawSha256:originalSha,
  verifiedOriginalR145RawSha256:originalSha===expectedSha,
  originalRawPreserved:true,modelCalls:0,
  hostMaterialCorrectionApplied:false,
  qwenRoomLayoutChanged:false,qwenRoomGraphChanged:false,
  qwenEquipmentChanged:false,sourceSha256:null,geometrySha256:null,
  independentGraphSourceAudit:'NOT_CHECKED',
  actualMinecraftWalking:'NOT_TESTED',humanArtReview:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
  executionAllowed:false,constructionApproved:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 try{
  write(directory,'R145_QWEN_RAW_ORIGINAL_UNCHANGED.txt',raw);
  const request=makeR134FreshRequest({brief:CASE.brief});
  const result=parseR139RelationalFurnishedReply(raw,request,
   {allowRoofMaterialCorrection:true});
  report.hostMaterialCorrectionApplied=result.boundedHostRepairRequired;
  report.qwenRoomLayoutChanged=
   JSON.stringify(result.derivedModelReply.layout)!==
   JSON.stringify(JSON.parse(raw).layout);
  report.qwenRoomGraphChanged=
   JSON.stringify(result.derivedModelReply.relations)!==
   JSON.stringify(JSON.parse(raw).relations);
  report.qwenEquipmentChanged=
   JSON.stringify(result.derivedModelReply.objects)!==
   JSON.stringify(JSON.parse(raw).objects);
  write(directory,'R146_EXACT_MATERIAL_REPAIR_EVIDENCE.json',
   result.roofMaterialBoundaryEvidence);
  write(directory,'R146_DERIVED_REPLY_NOT_QWEN_ORIGINAL.json',
   result.derivedModelReply);
  const featured=result.featured,graph=result.relationalBase;
  write(directory,'R146_FINAL_B143_SOURCE.json',featured.design);
  write(directory,'R146_FINAL_B143_VOXELS.json',featured.compiled);
  const independent=auditR143GraphEvidence({
   intent:result.semanticIntent,graphDesign:graph.design,
   finalDesign:featured.design,finalCompiled:featured.compiled,
   graphAudit:{
    sourceSha256:graph.sourceSha256,
    geometrySha256:graph.geometrySha256,
    entryFacing:graph.entryFacingZoneEvidence,
    directDoors:graph.directAdjacencyDoorEvidence
   },
   roomProgram:graph.program,featurePlacements:featured.placements
  });
  write(directory,'R146_INDEPENDENT_GRAPH_AUDIT.json',independent);
  report.independentGraphSourceAudit=independent.status;
  report.sourceSha256=featured.sourceSha256;
  report.geometrySha256=featured.geometrySha256;
  report.roomCount=graph.program[0].zones.length;
  report.furnishedEquipmentCount=featured.placements.length;
  report.directDoorCount=graph.directAdjacencyDoorEvidence.length;
  report.finalVoxelCount=featured.compiled.primitives.length;
  report.finalSourceRoutes=featured.sourceRouteAudit.status;
  if(independent.status!=='SOURCE_ROOM_GRAPH_VERIFIED')
   throw Error('R146_REPLAY_SOURCE_GRAPH_INDEPENDENT_AUDIT_HOLD');
  const template=fs.readFileSync(path.join(root,
   'source/ai/b143-viewer-template.html'),'utf8');
  write(directory,'index.html',renderB143Html(
   compileB143Gallery([featured.design]),template));
  report.status='REAL_QWEN_PROGRAM_HOST_CORRECTED_MATERIAL_REAL_3D_SOURCE_REVIEW_REQUIRED';
  return report;
 }catch(e){
  report.status='HOLD_R146_SAVED_REAL_QWEN_REPLAY';
  report.failureReason=String(e?.message??e).slice(0,500);
  return report;
 }finally{
  write(directory,'R146_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),i=args.indexOf('--out'),j=args.indexOf('--raw');
 try{
  if(i<0||!args[i+1]||args.length!==2&&(args.length!==4||
   j<0||!args[j+1]))throw Error('USAGE: node scripts/r146-replay-saved-qwen.mjs --out NEW_DIRECTORY [--raw UNMODIFIED_MODEL_RAW_ORIGINAL.txt]');
  const report=replayR146SavedQwen({outDir:args[i+1],
   ...(j>=0?{rawFile:args[j+1]}:{})});
  console.log(JSON.stringify({status:report.status,
   failureReason:report.failureReason??null,modelCalls:0,
   roomCount:report.roomCount,sourceAudit:report.independentGraphSourceAudit,
   output:args[i+1],worldWrites:0}));
  if(report.status.startsWith('HOLD'))process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
