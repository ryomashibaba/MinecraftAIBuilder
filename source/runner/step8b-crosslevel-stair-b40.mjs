/** B40: cross-level / opening-mask / room-and-wall geometry audit. NEVER executable. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildB39,validateB39} from './step8b-stair-route-b39.mjs';
import {decomposeFloorMaskB33} from './step8b-emitter-fixture-b33.mjs';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const key=p=>`${p.x},${p.z}`;
const vkey=p=>`${p.x},${p.y},${p.z}`;
const fail=s=>{throw Object.assign(new Error('B40_'+s),{code:'B40_'+s});};
const sourcePins=Object.freeze({
 'B39_FILE_SHA256.json':'d0ad556b6ed7b5c146fa14989a3f39ded2679fb3e0bd5a908ce8ddc3536f307d',
 'reports/B39_STAIR_ROUTE_REVIEW.json':'431537a65b0e7d65765ea590cd2ef0c886ffd87454b6233db65662da18ea6c15',
 'reports/B17_INTERIOR_INTEGRATION_IR.json':'e04e8ca2789bd8b65548a10e98e940e9537a562ebbf38a63e456ac9b73fb425d',
 'reports/B21_BLOCKSCALE_REVIEW.json':'2d7b1e3d71f252331dfe35e600411acc3354c43702e5b3db9fd9a5e0533932bc',
 'reports/B31_FLOOR_DOOR_OVERLAY.json':'6d233d5ad09b8138650f65d46e0cf2d2ab143577d3862696b562a3857545c430',
});
function checked(root,rel){
 if(typeof root!=='string'||!root||!Object.hasOwn(sourcePins,rel))fail('SOURCE_PATH');
 const full=path.join(root,rel); let st;try{st=fs.lstatSync(full);}catch{fail('SOURCE_MISSING');}
 if(!st.isFile()||st.isSymbolicLink())fail('SOURCE_TYPE');
 const raw=fs.readFileSync(full);
 // Byte-level hash, independent of UTF-8 decoding.
 const digest=createHash('sha256').update(raw).digest('hex');
 if(digest!==sourcePins[rel])fail('SOURCE_PIN_'+rel.replace(/\W/g,'_'));
 return JSON.parse(raw.toString('utf8'));
}
const volSet=x=>new Set(x.map(vkey));
function footprint(original,proposed){
 if(original?.length!==proposed?.length||original.some((s,z)=>s.length!==proposed[z].length))fail('FOOTPRINT_SIZE');
 const before=original.map(s=>[...s].map(ch=>ch==='#'));
 const after=proposed.map(s=>[...s].map(ch=>ch==='#'));
 const a=decomposeFloorMaskB33(before),b=decomposeFloorMaskB33(after);
 const add=[],removed=[];
 for(let z=0;z<before.length;z++)for(let x=0;x<before[0].length;x++){
  if(!before[z][x]&&after[z][x])add.push({x,z});
  if(before[z][x]&&!after[z][x])removed.push({x,z});
 }
 if(a.cells!==b.cells||add.length!==1||removed.length!==1||key(add[0])!=='14,17'||key(removed[0])!=='14,19'||!a.coverageExact||!b.coverageExact)fail('MASK_CHANGE');
 return {originalFloorCells:a.cells,proposedFloorCells:b.cells,
  beforeRectangles:a.rectangleCount,afterRectangles:b.rectangleCount,
  addedFloor: add,removedFloor:removed,exactRectangleCoverage:true,
  rectangleDigest:hash(b.rectangles)};
}
const neighbors=(p,q)=>Math.abs(p.x-q.x)+Math.abs(p.z-q.z)===1;
const segments=x=>x.slice(1).map((p,i)=>`${Math.sign(p.x-x[i].x)},${Math.sign(p.z-x[i].z)}`);
export function inspectStairCandidateB40(candidate,{upperWallVoxels,upperReservationSets,upperY,upperFloorRows}){
 if(!candidate||!Array.isArray(candidate.treads)||candidate.treads.length!==4||
 !Array.isArray(candidate.nominalHeadspace)||candidate.nominalHeadspace.length!==8||
 !Number.isSafeInteger(upperY)||!Array.isArray(upperWallVoxels)||!upperReservationSets||!Array.isArray(upperFloorRows))fail('INPUT');
 const cells=[candidate.flatLeadIn,...candidate.treads,candidate.topLandingEntry];
 if(cells.some(p=>!p||![p.x,p.z].every(Number.isSafeInteger))||
  !cells.slice(1).every((p,i)=>neighbors(cells[i],p)))fail('BROKEN_PATH');
 const walls=volSet(upperWallVoxels);
 const upHeads=candidate.nominalHeadspace.filter(p=>p.y>=upperY);
 const upperWallClashes=upHeads.filter(p=>walls.has(vkey(p)));
 const floorHeadspaceClashes=upHeads.filter(p=>upperFloorRows[p.z]?.[p.x]!=='o');
 const entrancePoint=key(candidate.topLandingEntry);
 const doorPortClashes=[...upperReservationSets.doors].filter(k=>cells.some(x=>key(x)===k));
 const upperElevatorClashes=[...upperReservationSets.elevator].filter(k=>cells.some(x=>key(x)===k));
 const turnPath=segments(cells), turns=turnPath.slice(1).filter((dir,i)=>dir!==turnPath[i]).length;
 const provisionalRejectReasons=[];
 if(upperWallClashes.length)provisionalRejectReasons.push('UPPER_WALL_HEADSPACE_INTERSECTION');
 if(floorHeadspaceClashes.length)provisionalRejectReasons.push('UPPER_FLOOR_HEADSPACE_INTERSECTION');
 if(doorPortClashes.length)provisionalRejectReasons.push('UPPER_DOOR_PORT_FOOTPRINT_INTERSECTION');
 if(upperElevatorClashes.length)provisionalRejectReasons.push('UPPER_ELEVATOR_RESERVATION_INTERSECTION');
 const turnFootprints=cells.slice(1,-1).filter((_,i)=>turnPath[i]!==turnPath[i+1]).map(p=>key(p));
 return {flatLeadIn:candidate.flatLeadIn,treads:candidate.treads,topLandingEntry:candidate.topLandingEntry,
  signature:cells.map(key).join('|'),planarTurns:turns,turnFootprints,
  upperWallHeadspaceIntersections:upperWallClashes.length,
  upperFloorHeadspaceIntersections:floorHeadspaceClashes.length,
  upperDoorPortPlanarIntersections:doorPortClashes.length,
  upperElevatorPlanarIntersections:upperElevatorClashes.length,
  entrancePortInsideUpperCorridor:upperReservationSets.corridor.has(entrancePoint),
  upperCutoutStillInsideStairReservation:['14,18','14,19'].every(k=>upperReservationSets.stair.has(k)),
  provisionalRejectReasons,reviewGeometryStatus:provisionalRejectReasons.length?'REJECT_CONCEPTUAL_GEOMETRY':'NOMINAL_SCREEN_PASSED_NOT_CONSTRUCTIBLE',
  physicalSupportVerified:false,stairBlockStateVerified:false,actualWalkabilityVerified:false,autoAdopted:false};
}
export function buildB40(root){
 const manifest=checked(root,'B39_FILE_SHA256.json');
 if(manifest.schema!=='minecraftaibuilder-step8b-b39-manifest-v1'||manifest.fileCount!==646)fail('FROZEN_MANIFEST');
 const prior=checked(root,'reports/B39_STAIR_ROUTE_REVIEW.json');
 const ir=checked(root,'reports/B17_INTERIOR_INTEGRATION_IR.json');
 const block=checked(root,'reports/B21_BLOCKSCALE_REVIEW.json');
 const plate=checked(root,'reports/B31_FLOOR_DOOR_OVERLAY.json');
 validateB39(prior,root);
 const regenerated=buildB39(root);if(JSON.stringify(prior)!==JSON.stringify(regenerated))fail('B39_REGEN');
 const get=o=>o.buildings?.find(b=>b.id===prior.building);
 const rooms=get(ir),walls=get(block),floor=get(plate);
 if(!rooms||!walls||!floor||rooms.floors.length!==6||walls.floors.length!==6||floor.floors.length!==6)fail('MAPPING');
 const variants=[];const maskSummaries=[];
 for(const l of prior.levels){
  const upper=l.upperLevel,u=upper-1;
  const R=rooms.floors[u],W=walls.floors[u],F=floor.floors[u];
  if(R.level!==upper||W.id!==R.id||F.level!==upper||F.overlayRows?.length!==F.depth)fail('UPPER_LEVEL');
  const rows=[...F.overlayRows];
  if(rows[17]?.[14]!=='o'||rows[18]?.[14]!=='o'||rows[19]?.[14]!=='#')fail('BASE_MASK');
  rows[17]=rows[17].slice(0,14)+'#'+rows[17].slice(15);
  rows[19]=rows[19].slice(0,14)+'o'+rows[19].slice(15);
  const stats=footprint(F.overlayRows,rows);maskSummaries.push({upperLevel:upper,...stats});
  const ports=new Set(R.roomDoorInterfaces.flatMap(d=>[key(d.doorCell),key(d.hallCell)]));
  const sets={doors:ports,elevator:new Set(R.elevatorReservation.map(key)),
    corridor:new Set(R.corridorReservation.map(key)),stair:new Set(R.stairReservation.map(key))};
  const upperWallVoxels=W.wallCandidates.flatMap(v=>v.localGridVolumes);
  for(const variant of l.variants){
   const all=variant.unapprovedCutoutRelocation.nominalSearch.candidates.map(c=>inspectStairCandidateB40(c,{
    upperWallVoxels,upperReservationSets:sets,upperY:R.localYRange[0],upperFloorRows:rows}));
   const sorted=[...all].sort((a,b)=>a.provisionalRejectReasons.length-b.provisionalRejectReasons.length||
     a.planarTurns-b.planarTurns||a.signature.localeCompare(b.signature));
   variants.push({lowerLevel:l.lowerLevel,upperLevel:upper,id:variant.id,candidates:all,
    reviewShortlist:sorted.slice(0,2).map(c=>({signature:c.signature,planarTurns:c.planarTurns,reviewGeometryStatus:c.reviewGeometryStatus})),
    nominalCandidates:all.length,conceptualGeometryRejected:all.filter(x=>x.provisionalRejectReasons.length).length,
    fullPhysicalVerificationCount:0,approved:false});
  }
 }
 const candidates=variants.flatMap(x=>x.candidates);
 if(candidates.length!==44||variants.length!==10||maskSummaries.length!==5)fail('EXPECTED_BASELINE');
 const signatureCount=new Set(candidates.map(x=>x.signature)).size;
 const allByVariant=variants.map(x=>new Set(x.candidates.map(c=>c.signature)));
 const commonSignatures=[...allByVariant[0]].filter(s=>allByVariant.every(set=>set.has(s))).sort();
 const violations=candidates.reduce((n,c)=>n+c.provisionalRejectReasons.length,0);
 const report={schema:'minecraftaibuilder-step8b-b40-crosslevel-audit-v1',
  purpose:'ONLY_OFFLINE_REVIEW_NO_BUILDPLAN_OR_WORLD_COORDS',
  provenance:{immutableInputs:sourcePins,archivedB39Verified:true,realEngineInvoked:false,bridgeContact:false,worldAccess:false},
  building:prior.building,proposedFloorMasks:maskSummaries,variants,
  totals:{levels:5,reviewVariants:10,nominalRouteInstances:candidates.length,uniqueLocalRouteSignatures:signatureCount,
   commonSignatureCountAcrossAllVariants:commonSignatures.length,
   provisionalGeometryRejections:candidates.filter(x=>x.provisionalRejectReasons.length>0).length,
   provisionalViolationConditions:violations,
   nominalPassedPhysicalUncertified:candidates.filter(x=>x.provisionalRejectReasons.length===0).length,
   newFloorCellsAcrossLevels:5,removedFloorCellsAcrossLevels:5,physicalRoutesVerified:0,constructionOperations:0},
  commonSignaturesAcrossAllVariants:commonSignatures,
  riskNotes:[
   'Restored floor cells and new holes are within conceptual stair-reservation volume; floor support and vertical interfaces are NOT proven',
   'Upper wall check is based on B21 conceptual wall voxels; installed wall and headroom must not be inferred',
   'Per-step rise is a symbolic full local Y cell; no Minecraft stair orientation, half-step, or collision-shape validation',
   'No physical support, guardrail, door clearance, evacuation, load-bearing structure, or engine run has been verified',
   'No selected route, material ID, world coordinate, operation or Minecraft command is generated'],
  blockers:Array.from({length:9},(_,i)=>({id:`M4-0${i+1}`,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',deployment:'BLOCKED',approvedVariant:null,
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,legacyModified:false,frozenEvidenceModified:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],materialIds:[],worldCoordinates:null},constructionCommands:0};
 report.reportSha256=hash(report);return report;
}
export function validateB40(report,root){
 if(report?.schema!=='minecraftaibuilder-step8b-b40-crosslevel-audit-v1'||report.readiness!=='NOT_PREPARED'||
 report.deployment!=='BLOCKED'||report.approvedVariant!==null||report.constructionCommands!==0||
 report.safety?.constructionApproved!==false||report.safety?.executionAllowed!==false||
 report.safety?.worldAccess!==false||report.safety?.bridgeContact!==false||
 report.BuildPlan?.operations?.length!==0||report.BuildPlan?.materialIds?.length!==0||
 report.BuildPlan?.worldCoordinates!==null||report.blockers?.length!==9||report.blockers.some(x=>x.status!=='BLOCKED')||
 report.variants?.some(v=>v.approved||v.candidates?.some(c=>c.autoAdopted||c.actualWalkabilityVerified||c.physicalSupportVerified)))fail('SAFETY');
 const {reportSha256,...body}=report;if(hash(body)!==reportSha256||JSON.stringify(buildB40(root))!==JSON.stringify(report))fail('REPORT_TAMPERED');
 return true;
}
