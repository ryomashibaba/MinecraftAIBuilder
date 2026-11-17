/**
 * V11 read-only room-program diagnosis of ONE saved original Qwen plan.
 * This is evidence for choosing an ART improvement, not a new author, fixture
 * repair, game execution, world connector, or automatic success verdict.
 *
 * node scripts/r125-v11-room-use-diagnosis.mjs
 *   --raw PRIVATE/MODEL_RESPONSE_ORIGINAL.txt
 *   --source PRIVATE/B143_SOURCE_REVIEW_ONLY.json
 *   --out PRIVATE/NEW_ROOM_USE_REVIEW_DIRECTORY
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const hold=reason=>{throw Error('V11_ROOM_USE_'+reason);};

function originalAuthorRooms(raw){
 let parsed;
 try{parsed=JSON.parse(raw);}catch{hold('ORIGINAL_JSON_HOLD');}
 if(!Array.isArray(parsed?.levels))hold('ORIGINAL_LEVELS_HOLD');
 return parsed.levels.flatMap((level,levelIndex)=>
  (level.spaces??[]).map(space=>({
   storey:levelIndex+1,id:space.id,purpose:space.purpose,
   access:space.access??null,
   stationKinds:space.fixtures??(space.fixture?[space.fixture]:[])
  })));
}
function guardedVariant(raw,opts){
 const r=diagnoseR125ArchitecturePlanOriginal(raw,opts);
 if(r.modelCalls!==0||r.worldWrites!==0||
    r.worldGates?.length!==9||r.worldGates.some(x=>x!=='BLOCKED'))
  hold('DERIVED_WORLD_GATES');
 return {
  status:r.status,sourceVerified:r.sourceVerified===true,
  sourceSha256:r.sourceSha256??null,geometrySha256:r.geometrySha256??null,
  compilerReason:r.compilerReason??null,
  modelChosenFixtures:r.modelChosenFixtures??null,
  roomUseEvidence:r.roomUseEvidence??null
 };
}
export function inspectR125SavedRoomUse({rawPath,sourcePath,outDir}={}){
 if([rawPath,sourcePath,outDir].some(x=>typeof x!=='string'||!x))
  hold('PATH_ARGUMENTS_REQUIRED');
 const rawFile=path.resolve(rawPath),sourceFile=path.resolve(sourcePath),
  out=path.resolve(outDir),parent=path.dirname(out);
 if(out===rawFile||out===sourceFile||out===root||
    out.startsWith(root+path.sep)||
    !fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
    fs.existsSync(out))hold('FRESH_PRIVATE_OUTPUT_REQUIRED');
 const realParent=fs.realpathSync(parent);
 if(realParent===root||realParent.startsWith(root+path.sep)||
    realParent===path.parse(realParent).root)
  hold('OUTPUT_OUTSIDE_REPOSITORY_REQUIRED');
 for(const [p,max] of [[rawFile,60000],[sourceFile,2000000]])
  if(!fs.existsSync(p)||!fs.statSync(p).isFile()||
     fs.statSync(p).size<1||fs.statSync(p).size>max)
   hold('MISSING_OR_OVERSIZE_ORIGINAL');
 const raw=fs.readFileSync(rawFile,'utf8');
 let saved;
 try{saved=JSON.parse(fs.readFileSync(sourceFile,'utf8'));}
 catch{hold('INVALID_SAVED_SOURCE');}
 const baseline=guardedVariant(raw,{});
 if(!baseline.sourceVerified||baseline.status!=='B143_SOURCE_CANDIDATE_ART_HOLD')
  hold('BASELINE_SOURCE_HOLD_'+String(baseline.compilerReason??baseline.status));
 const exact=diagnoseR125ArchitecturePlanOriginal(raw);
 const scene=compileDesign(saved);
 if(!verifyCompiled(saved,scene)||
    scene.sourceSha256!==baseline.sourceSha256||
    scene.geometrySha256!==baseline.geometrySha256||
    saved.id!==exact.sourceDesign?.id||
    scene.worldContacts!==0||scene.BuildPlan?.operations?.length!==0)
  hold('BASELINE_SHA_OR_WORLD_GUARD');
 const authorRooms=originalAuthorRooms(raw);
 const authoredCount=authorRooms.reduce((n,r)=>n+r.stationKinds.length,0);
 if(authoredCount!==baseline.modelChosenFixtures)
  hold('AUTHOR_STATION_COUNT_MISMATCH');
 const evidence=baseline.roomUseEvidence;
 if(!Array.isArray(evidence?.storeys))hold('ROOM_EVIDENCE_MISSING');
 const roomEvidence=evidence.storeys.flatMap(level=>level.rooms.map(room=>({
  storey:level.storey,...room
 })));
 const rooms=authorRooms.map(room=>{
  const matches=roomEvidence.filter(x=>x.storey===room.storey&&x.id===room.id);
  if(matches.length!==1||matches[0].authoredStationCount!==
     room.stationKinds.length||
     JSON.stringify(matches[0].stationKinds)!==JSON.stringify(room.stationKinds))
   hold('AUTHOR_ROOM_EVIDENCE_MISMATCH');
  const actual=matches[0];
  return {storey:room.storey,id:room.id,purpose:room.purpose,
   access:room.access,authorSelectedStationKinds:[...room.stationKinds],
   authoredStationCount:room.stationKinds.length,
   zoneAreaUpperBoundCells:actual.roomBoundsAreaUpperLimit,
   stationFootprintProxyCells:actual.stationFootprintProxyCells,
   stationToZoneUpperBoundFraction:actual.approximateRoomAreaFraction};
 });
 const spatial=guardedVariant(raw,{hostDetail:'spatial-v1'});
 const activity=guardedVariant(raw,{hostDetail:'spatial-v1',
  fixtureArt:'activity-layout'});
 const variants=[['spatial-v1',spatial],['activity-layout',activity]].map(
  ([name,v])=>({
   name,status:v.status,sourceVerified:v.sourceVerified,
   sourceSha256:v.sourceSha256,geometrySha256:v.geometrySha256,
   compilerReason:v.compilerReason,
   modelChosenFixtures:v.modelChosenFixtures,
   authoredStationsPreserved:v.modelChosenFixtures===authoredCount
  }));
 const report={
  schema:'r125-v11-saved-room-use-diagnosis-v1',
  status:variants.every(v=>v.sourceVerified&&v.authoredStationsPreserved)?
   'SOURCE_VERIFIED_ROOM_USE_ART_HOLD':'DERIVED_SOURCE_HOLD',
  originalSha256:sha(raw),originalUnchanged:true,
  baselineSourceSha256:baseline.sourceSha256,
  savedSourceSha256:scene.sourceSha256,
  authoredStoreys:evidence.storeys.length,authoredRooms:rooms.length,
  modelAuthoredStationCount:authoredCount,
  roomsWithNoAuthoredStation:rooms.filter(r=>r.authoredStationCount===0)
   .map(r=>({storey:r.storey,id:r.id})),
  rooms,
  variants,
  activityVsSpatialSourceChanged:
   Boolean(spatial.sourceSha256&&activity.sourceSha256&&
    spatial.sourceSha256!==activity.sourceSha256),
  stationAreaProxyNotTrueWalkableArea:true,
  stationCountsNotArtQuality:true,
  sourceRoutesDoNotProveMinecraftWalking:true,
  art:'HUMAN_REVIEW_REQUIRED',educationReal:'NOT_TESTED',
  modelCalls:0,worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]},nineWorldGates:Array(9).fill('BLOCKED'),
  constructionApproved:false
 };
 if(fs.readFileSync(rawFile,'utf8')!==raw)hold('ORIGINAL_CHANGED');
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'ROOM_USE_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--raw'||a[2]!=='--source'||a[4]!=='--out')
   hold('CLI_RAW_SOURCE_OUT');
  const r=inspectR125SavedRoomUse({rawPath:a[1],sourcePath:a[3],outDir:a[5]});
  console.log('V11_ROOM_USE_SOURCE_ONLY',JSON.stringify({
   status:r.status,originalSha256:r.originalSha256,
   baselineSourceSha256:r.baselineSourceSha256,
   authoredStoreys:r.authoredStoreys,authoredRooms:r.authoredRooms,
   modelAuthoredStationCount:r.modelAuthoredStationCount,
   roomsWithNoAuthoredStation:r.roomsWithNoAuthoredStation,
   rooms:r.rooms.map(x=>({storey:x.storey,id:x.id,
    kinds:x.authorSelectedStationKinds,
    zoneAreaUpperBoundCells:x.zoneAreaUpperBoundCells,
    stationToZoneUpperBoundFraction:x.stationToZoneUpperBoundFraction})),
   variants:r.variants.map(v=>({name:v.name,status:v.status,
    sourceVerified:v.sourceVerified,authoredStationsPreserved:
     v.authoredStationsPreserved,
    compilerReason:v.compilerReason})),
   activityVsSpatialSourceChanged:r.activityVsSpatialSourceChanged,
   art:r.art,modelCalls:0,worldWrites:0
  }));
 }catch(e){
  console.error('V11_ROOM_USE_HOLD',
   String(e?.message??e).slice(0,270));
  process.exitCode=2;
 }
}
