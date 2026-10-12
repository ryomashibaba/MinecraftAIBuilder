/** B104: cross-typology reproducible co-design report; Education-first, offline only. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104,drawB104Floor} from './b104-joint-layout.mjs';
export function compileB104(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B104_FROZEN_PARENT_INVALID');
 const cases=b100.architectureCases.map(g=>{
  const req=B101_SCENARIOS[g.caseId];if(!req)throw Error('B104_MISSING_PROGRAMME');
  const options=g.options.map(c=>{
   if(!validateUniversalCandidate(c,g.brief))throw Error('B104_PARENT_CANDIDATE_INVALID');
   const d=coDesignB104(c,req);
   return {id:c.id,selection:d.strategy,feedbackRound:d.feedbackRound,experiments:d.experiments,
    requested:d.result.requested,placed:d.result.placed,connected:d.result.connected,
    unmet:d.result.unmet,disconnected:d.result.disconnected,conceptualSafe:d.result.conceptualSafe,
    initialB102Rooms:d.baseline.placed,initialRouted:d.baseline.connected,
    coreCount:d.result.coreCount,groundExitCandidates:d.result.groundExitCandidates,
    corridorCells:d.result.corridorCells,netRoomArea:d.result.netRoomArea,
    changedRooms:d.result.movedOrResizedRoomEnvelopes,inputGalleryCellDelta:d.result.inputGalleryCellDelta,
    global3DCollisions:d.result.global3DCollisions,blockedDoorways:d.result.blockedDoorways,
    obstructedStairProxies:d.result.obstructedStairProxies,
    floors:d.plan.floors.length,realDoorsInstalled:0,realStairsInstalled:0,realExitsCertified:0,
    structurallyCertified:false,finishedInteriors:0,constructionApproved:false};
  });
  // One reviewable schematic per typology, explicitly NOT a finished 3D render.
  const view=coDesignB104(g.options[0],req,{feedback:false});
  return {caseId:g.caseId,typology:g.brief.typology,options,
   representativeGroundFloorASCII:drawB104Floor(view,0),floorLegend:{R:'concept room',D:'doorway void',C:'core reservation',E:'exterior candidate', '=':'2-wide gallery','' :''},
   reviewOnly:true};
 });
 const choices=cases.flatMap(g=>g.options),sum=k=>choices.reduce((n,c)=>n+c[k],0);
 const report={schema:'minecraftaibuilder-b104-room-gallery-alternation-v1',targetEdition:'MINECRAFT_EDUCATION',
  javaAdapter:'NOT_IMPLEMENTED',parentB100Sha256:b100.reportSha256,B100ToB103Unmodified:true,
  strategy:'BOUNDED_ALTERNATING_ROOM_GALLERY_CO_DESIGN_WITH_BASELINE_FALLBACK',
  cases,totals:{typologies:cases.length,variants:choices.length,floors:sum('floors'),
   placedRooms:sum('placed'),connectedRooms:sum('connected'),unmetOrDisconnected:sum('disconnected')+
    choices.reduce((n,c)=>n+c.unmet.reduce((m,r)=>m+r.missing,0),0),
   variantsWithRepositionedRooms:choices.filter(c=>c.changedRooms>0).length,
   repositionedRoomEnvelopes:sum('changedRooms'),
   variantsWithNewInputGalleries:choices.filter(c=>c.inputGalleryCellDelta>0).length,
   variantsSelectingNonBaseline:choices.filter(c=>c.selection!=='BASELINE').length,
   secondCoreVariants:choices.filter(c=>c.coreCount===2).length,
   conceptualGroundExits:sum('groundExitCandidates'),totalNetRoomCells:sum('netRoomArea'),
   '3DConflicts':sum('global3DCollisions'),doorwayHeadroomConflicts:sum('blockedDoorways'),
   stairProxyConflicts:sum('obstructedStairProxies'),legacyUnapprovedCandidates:296,legacyHeldRooms:18,
   realBlocksEmitted:0,certifiedPhysicalStairs:0,certifiedRealExits:0,worldContacts:0},
  limitations:['B102_RECTANGLE_GREEDY_PLACEMENT_IS_REUSED_INSIDE_ALTERNATING_OPTIMIZER',
   'TWO_GALLERY_PROFILES_AND_ONE_FEEDBACK_ROUND_NOT_GLOBAL_OPTIMIZATION',
   'ROOM_OR_CORRIDOR_LAYOUT_METRICS_ARE_NOT_AESTHETIC_FINISH_CERTIFICATION',
   'B103_SPIRAL_STAIR_TREADS_ARE_UNVERIFIED_PROXY_VOXELS',
   'NO_VERSION_PINNED_EDUCATION_BLOCKSTATE_VALIDATION',
   'NO_ROOF_STRUCTURE_WINDOWS_FURNITURE_FINISHED_INTERIOR_OR_REAL_WORLD_CONTACT'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB104(report))throw Error('B104_INVALID_REPORT');
 return report;
}
export function validateB104(r){
 if(r?.schema!=='minecraftaibuilder-b104-room-gallery-alternation-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.javaAdapter!=='NOT_IMPLEMENTED'||
 r.parentB100Sha256?.length!==64||r.B100ToB103Unmodified!==true||
 r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||
 r.BuildPlan?.commandCount!==0||r.BuildPlan?.worldCoordinates!==null||
 r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.cases?.length!==5||r.cases.some(g=>g.options?.length!==3||g.reviewOnly!==true||
 typeof g.representativeGroundFloorASCII!=='string'))return false;
 const c=r.cases.flatMap(g=>g.options),t=r.totals;
 if(c.length!==15||c.some(x=>x.realDoorsInstalled!==0||x.realStairsInstalled!==0||
 x.realExitsCertified!==0||x.structurallyCertified!==false||x.finishedInteriors!==0||
 x.constructionApproved!==false||x.connected>x.placed||x.placed>x.requested||
 x.disconnected!==x.placed-x.connected||!Array.isArray(x.unmet)||!Array.isArray(x.experiments)||
 x.experiments.length<2||x.initialB102Rooms>x.requested||x.conceptualSafe!==true||
 x.global3DCollisions!==0||x.blockedDoorways!==0||x.obstructedStairProxies!==0))return false;
 const sum=k=>c.reduce((n,x)=>n+x[k],0);
 return t.typologies===5&&t.variants===15&&t.floors===sum('floors')&&t.floors===66&&
 t.placedRooms===sum('placed')&&t.connectedRooms===sum('connected')&&
 t.unmetOrDisconnected===sum('disconnected')+c.reduce((n,x)=>n+x.unmet.reduce((m,u)=>m+u.missing,0),0)&&
 t.variantsWithRepositionedRooms===c.filter(x=>x.changedRooms>0).length&&
 t.repositionedRoomEnvelopes===sum('changedRooms')&&
 t.variantsWithNewInputGalleries===c.filter(x=>x.inputGalleryCellDelta>0).length&&
 t.variantsSelectingNonBaseline===c.filter(x=>x.selection!=='BASELINE').length&&
 t.secondCoreVariants===c.filter(x=>x.coreCount===2).length&&
 t.conceptualGroundExits===sum('groundExitCandidates')&&t.totalNetRoomCells===sum('netRoomArea')&&
 t['3DConflicts']===sum('global3DCollisions')&&
 t.doorwayHeadroomConflicts===sum('blockedDoorways')&&t.stairProxyConflicts===sum('obstructedStairProxies')&&
 t.legacyUnapprovedCandidates===296&&t.legacyHeldRooms===18&&
 t.realBlocksEmitted===0&&t.certifiedPhysicalStairs===0&&t.certifiedRealExits===0&&t.worldContacts===0;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=compileB104();
 console.log(JSON.stringify({totals:r.totals,byType:r.cases.map(g=>({id:g.caseId,
  alternatives:g.options.map(x=>({id:x.id,selection:x.selection,round:x.feedbackRound,
   placed:x.placed,roomsMoved:x.changedRooms,corridorChange:x.inputGalleryCellDelta,
   cores:x.coreCount,exits:x.groundExitCandidates,conflicts:x.global3DCollisions}))}))},null,2));
}