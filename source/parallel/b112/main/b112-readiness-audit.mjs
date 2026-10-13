/**
 * B112: cross-stage readiness evidence (B109 visual, B110 functional, B111 interior).
 * No world access, no commands, no physical placement proposal. Pure audit.
 */
import {createHash} from 'node:crypto';
import {validateB109Report} from '../../b109/main/compile-b109.mjs';
import {validateB110Report} from '../../b110/main/compile-b110.mjs';
import {validateB111Report} from '../../b111/main/compile-b111.mjs';
import {auditB110Model} from '../../b110/main/b110-functional-interfaces.mjs';
import {auditB111Model} from '../../b111/main/b111-interior-access.mjs';
import {validateB109Scene} from '../../b109/main/b109-surface-model.mjs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const safe=r=>r?.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
 r.worldContacts===0&&r.worldCoordinates===null&&
 r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0&&
 r.BuildPlan.commandCount===0&&r.BuildPlan.worldCoordinates===null&&
 r.gates?.length===9&&r.gates.every(g=>g.status==='BLOCKED');
const SUM=(a,k)=>a.reduce((t,x)=>t+(x[k]??0),0);
const ROLE_KEYS=Object.freeze([
 'door','stairs','frame','glass','bed','shelf','desk','seating','generic'
]);
const needsWork=Object.freeze([
 {id:'W01',priority:1,task:'Confirm installed Minecraft Education exact version and offline local project provenance',needsExplicitGameContactApproval:false},
 {id:'W02',priority:2,task:'Inspect local application and available offline block-state evidence WITHOUT world contact',needsExplicitGameContactApproval:false},
 {id:'W03',priority:3,task:'Review door upper/lower state, hinge, swing obstruction on an OFFLINE 2D/3D candidate',needsExplicitGameContactApproval:false},
 {id:'W04',priority:4,task:'Model staircase actual rise and two-cell headroom as OFFLINE geometry; do not call diagram traversable',needsExplicitGameContactApproval:false},
 {id:'W05',priority:5,task:'Model bed direction, secondary block, furniture collision and repeated room accessibility OFFLINE',needsExplicitGameContactApproval:false},
 {id:'W06',priority:6,task:'Decide whether a separately approved sandbox-world probe is required. NEVER run it without separate user approval',needsExplicitGameContactApproval:true}
]);
export function buildB112Audit(visual,functional,interior){
 if(!validateB109Report(visual?.report)||!validateB110Report(functional?.report)||
 !validateB111Report(interior?.report)||!safe(visual.report)||!safe(functional.report)||
 !safe(interior.report)||visual.surfaces?.length!==15||
 visual.parent?.bundle?.baseScenes?.length!==15||
 visual.parent?.bundle?.polishScenes?.length!==15||
 visual.parent?.refined?.length!==15||functional.models?.length!==15||
 interior.models?.length!==15||interior.sourceDesigns?.length!==15||
 interior.parentB110Models?.length!==15)throw Error('B112_UNSAFE_OR_MISSING_PARENT');
 const ids=new Set(),cases=[],warnings=[];
 for(let i=0;i<15;i++){
  const v=visual.surfaces[i],s=visual.parent.bundle.baseScenes[i],
   polished=visual.parent.bundle.polishScenes[i],refined=visual.parent.refined[i],
   b110=functional.models[i],b111=interior.models[i],
   d=interior.sourceDesigns[i],otherB110=interior.parentB110Models[i];
  if(!v||!b110||!b111||!d||!otherB110||ids.has(v.candidateId)||
   [s.id,b110.id,b111.id,otherB110.id,d.candidateId].some(id=>id!==v.candidateId)||
   [s.typology,b110.typology,b111.typology,d.plan?.typology].some(t=>t!==v.typology)||
   [s.levels,b110.levels,b111.levels,d.plan.floors.length].some(levels=>levels!==v.levels)||
   b111.previousB110Digest!==b110.digest||b110.digest!==otherB110.digest||
   !validateB109Scene(v,s,polished,refined)||!auditB110Model(b110)||
   !auditB111Model(b111,d,b110))throw Error('B112_CROSS_STAGE_PROVENANCE:'+i);
  ids.add(v.candidateId);
  const m=b111.metrics,n=b110.metrics,g=v.metrics;
  if(m.conceptRooms!==n.conceptRooms||m.conceptualFurnitureSourceCells!==n.fixtureAnchors||
   m.roomPathPasses+m.roomNeedsRedesign!==m.conceptRooms||
   n.conceptualDoors!==m.conceptRooms||
   m.actualBedsCertified!==0||m.actualUsableFurnitureCertified!==0||
   n.realDoorsCertified!==0||n.realStairsCertified!==0||
   g.actualPhysicalCompletion!==false||
   !b110.doors.every(x=>x.realBlockPlacementValidated===false)||
   !b111.rooms.every(x=>x.physicalFurnitureInstalled===false))throw Error('B112_FUNCTIONAL_GEOMETRY_MISMATCH:'+i);
  cases.push({
   id:v.candidateId,typology:v.typology,levels:v.levels,
   rooms:m.conceptRooms,conceptDoors:n.conceptualDoors,
   conceptualConnectedDoorways:n.nominalConnectedDoorways,
   exteriorOpenings:n.exteriorOpeningCandidates,
   conceptualStairLinks:n.stairLinks,stairTreadDiagrams:n.stairTreadProxies,
   furnitureAnchors:n.fixtureAnchors,
   conceptualRoomPathPasses:m.roomPathPasses,
   roomsNeedingLayoutRevision:m.roomNeedsRedesign,
   twoCellBedProposals:m.bedsProposedAsTwoCells,
   bedPairsWithoutCandidate:m.bedPairsStillUnresolved,
   footprintClashes:m.furnitureOverlapCells,
   disconnectedFloorCells:m.disconnectedInteriorCells,
   fixtureApproachFailures:m.fixtureApproachFailures,
   sourceRoofCells:g.originalRoofCells,
   sourceGlazingCells:g.originalGlazingCells,
   renderedCoalescedRoofSurfaces:g.mergedRoofSurfaces,
   physicalDoorsCertified:0,physicalStairsCertified:0,installedFurnitureCertified:0,
   realEducationBlocksCertified:0,worldContacts:0,
   evidence:{b109Digest:v.digest,b110Digest:b110.digest,b111Digest:b111.digest}
  });
  if(m.roomNeedsRedesign>0)warnings.push({caseId:v.candidateId,code:'OFFLINE_ROOM_LAYOUT_ISSUES',count:m.roomNeedsRedesign});
  if(m.roomsWithNo2wideWalkableSquare>0)warnings.push({caseId:v.candidateId,code:'NO_FREE_TWO_BY_TWO_SQUARE_IS_NOT_CORRIDOR_WIDTH_CERTIFICATION',count:m.roomsWithNo2wideWalkableSquare});
 }
 const t={
  typologies:5,variants:cases.length,levels:SUM(cases,'levels'),
  rooms:SUM(cases,'rooms'),doorCandidates:SUM(cases,'conceptDoors'),
  conceptualDoorwaysConnected:SUM(cases,'conceptualConnectedDoorways'),
  exteriorOpenings:SUM(cases,'exteriorOpenings'),
  conceptualStairLinks:SUM(cases,'conceptualStairLinks'),
  stairDiagrams:SUM(cases,'stairTreadDiagrams'),
  furnitureAnchors:SUM(cases,'furnitureAnchors'),
  roomPathPasses:SUM(cases,'conceptualRoomPathPasses'),
  roomLayoutProblems:SUM(cases,'roomsNeedingLayoutRevision'),
  twoCellBedProposals:SUM(cases,'twoCellBedProposals'),
  unresolvedBedPairs:SUM(cases,'bedPairsWithoutCandidate'),
  furnitureFootprintClashes:SUM(cases,'footprintClashes'),
  disconnectedFloorCells:SUM(cases,'disconnectedFloorCells'),
  fixtureApproachFailures:SUM(cases,'fixtureApproachFailures'),
  sourceRoofCells:SUM(cases,'sourceRoofCells'),
  sourceWindowCells:SUM(cases,'sourceGlazingCells'),
  visualRoofPanels:SUM(cases,'renderedCoalescedRoofSurfaces'),
  educationVerifiedBlockStateCount:0,
  installedDoors:0,traversablePhysicalStairs:0,finishedPhysicalRooms:0,
  worldContacts:0,legacyUnapproved:296,legacyHeld:18};
 const report={
  schema:'minecraftaibuilder-b112-integrated-offline-handoff-v1',
  scope:'B100_TO_B111_REVIEW_AND_B113_LOCAL_WORK_PREPARATION',
  provenance:{b100SourceSha256:functional.report.frozenParentSha256,
   b109VisualSummarySha256:sha(visual.report),
   b110FunctionalSummarySha256:sha(functional.report),
   b111InteriorSummarySha256:sha(interior.report),
   inheritedB111ModelSha256:interior.models.map(x=>x.digest)},
  cases,totals:t,warnings,
  evidenceLevels:{
   sourceDesignAudit:'PASS_READ_ONLY_SOURCE_LINKED',
   realChromeVisualBaseline:'EXISTING_B108_B109_CI_EVIDENCE_NO_NEW_VISUAL_QA',
   minecraftEditionBlockStates:'UNVERIFIED',
   physicalDoorPlacement:'NOT_TESTED',
   physicallyTraversableStairFlight:'NOT_TESTED',
   physicalBedAndFurnitureCollisions:'NOT_TESTED',
   widthsAndFireEgress:'NOT_CERTIFIED',
   approvedWorldProbe:'NOT_AUTHORIZED'
  },
  futureWork:{
   next:'B113_USE_LOCAL_WORK_PROJECT',
   destination:'EXISTING_LOCAL_MINECRAFTAIBUILDER_WORK_PROJECT',
   promptPreparedNextChat:true,
   taskList:needsWork.map(x=>({...x})),
   neverAssumeAccessToWindowsFiles:true,
   verifyGitHubMainAndLocalGitSHAFirst:true,
   worldConnectionExplicitlyProhibited:true,
   newGameContactRequiresUserApproval:true,
   physicalInstallationRequiresSeparateUserApproval:true
  },
  targetEdition:'MINECRAFT_EDUCATION',
  targetVersion:'26.3_FAMILY_LOCAL_BUILD_UNVERIFIED',
  readOnly:true,readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,
  gates:functional.report.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...report,integritySha256:sha(report)};
}
export function validateB112Audit(r){
 const {integritySha256,...body}=r??{};
 if(!r||integritySha256!==sha(body)||!safe(r)||
 r.schema!=='minecraftaibuilder-b112-integrated-offline-handoff-v1'||
 r.scope!=='B100_TO_B111_REVIEW_AND_B113_LOCAL_WORK_PREPARATION'||
 r.readOnly!==true||r.executionAllowed!==false||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.targetVersion!=='26.3_FAMILY_LOCAL_BUILD_UNVERIFIED'||
 r.provenance?.b100SourceSha256?.length!==64||
 r.provenance?.inheritedB111ModelSha256?.length!==15||
 r.cases?.length!==15||new Set(r.cases.map(c=>c.id)).size!==15||
 r.futureWork?.next!=='B113_USE_LOCAL_WORK_PROJECT'||
 r.futureWork?.promptPreparedNextChat!==true||
 r.futureWork?.worldConnectionExplicitlyProhibited!==true||
 r.futureWork?.newGameContactRequiresUserApproval!==true||
 r.futureWork?.physicalInstallationRequiresSeparateUserApproval!==true||
 r.futureWork?.taskList?.length!==6||
 r.evidenceLevels?.minecraftEditionBlockStates!=='UNVERIFIED'||
 r.evidenceLevels?.approvedWorldProbe!=='NOT_AUTHORIZED')return false;
 const t=r.totals;
 const invariants={
  typologies:5,variants:15,levels:66,rooms:279,doorCandidates:279,
  conceptualStairLinks:102,stairDiagrams:612,furnitureAnchors:558,
  educationVerifiedBlockStateCount:0,installedDoors:0,traversablePhysicalStairs:0,
  finishedPhysicalRooms:0,worldContacts:0,legacyUnapproved:296,legacyHeld:18
 };
 if(!Object.entries(invariants).every(([k,v])=>t[k]===v)||
 t.roomPathPasses+t.roomLayoutProblems!==279||
 t.twoCellBedProposals<0||
 !r.cases.every((c,i)=>c.evidence?.b109Digest?.length===64&&
  c.evidence.b110Digest?.length===64&&c.evidence.b111Digest===
  r.provenance.inheritedB111ModelSha256[i]&&c.realEducationBlocksCertified===0&&
  c.worldContacts===0&&c.physicalDoorsCertified===0&&
  c.physicalStairsCertified===0&&c.installedFurnitureCertified===0))return false;
 const aggregates={
  levels:'levels',rooms:'rooms',doorCandidates:'conceptDoors',
  conceptualDoorwaysConnected:'conceptualConnectedDoorways',
  exteriorOpenings:'exteriorOpenings',
  conceptualStairLinks:'conceptualStairLinks',
  stairDiagrams:'stairTreadDiagrams',
  furnitureAnchors:'furnitureAnchors',roomPathPasses:'conceptualRoomPathPasses',
  roomLayoutProblems:'roomsNeedingLayoutRevision',
  twoCellBedProposals:'twoCellBedProposals',unresolvedBedPairs:'bedPairsWithoutCandidate',
  furnitureFootprintClashes:'footprintClashes',
  disconnectedFloorCells:'disconnectedFloorCells',
  fixtureApproachFailures:'fixtureApproachFailures',
  sourceRoofCells:'sourceRoofCells',sourceWindowCells:'sourceGlazingCells',
  visualRoofPanels:'renderedCoalescedRoofSurfaces'
 };
 return Object.entries(aggregates).every(([k,v])=>t[k]===SUM(r.cases,v));
}
