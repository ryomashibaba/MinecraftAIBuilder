/** B103: reproducible cross-typology offline report. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {synthesizeRooms} from '../../b102/main/b102-synthesis-voxels.mjs';
import {planB103,auditB103,previewEducationPalette} from './b103-circulation-3d.mjs';
export function compileB103(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B103_BAD_B100_PARENT');
 const cases=b100.architectureCases.map(group=>{
  const requirements=B101_SCENARIOS[group.caseId];
  if(!requirements)throw Error('B103_UNKNOWN_PROGRAMME');
  return {caseId:group.caseId,typology:group.brief.typology,options:group.options.map(candidate=>{
   if(!validateUniversalCandidate(candidate,group.brief))throw Error('B103_UNSAFE_PARENT_CANDIDATE');
   const layout=synthesizeRooms(candidate,requirements),plan=planB103(candidate,layout);
   const audit=auditB103(plan),palette=previewEducationPalette(audit);
   return {id:candidate.id,status:plan.status,requested:layout.requested,placed:layout.placed,
    connected:plan.summary.connectedRooms,disconnected:plan.summary.disconnectedRooms,
    cores:plan.summary.coreCount,stairFlightProxies:plan.summary.stairFlightCount,
    exits:plan.summary.exteriorGroundPortalCandidates,oldGalleryCells:plan.summary.baselineGalleryCells,
    regeneratedGalleryCells:plan.summary.regeneratedGalleryCells,
    collisions:audit.solidAirCollisions,doorwayViolations:audit.doorway2HighViolations,
    stairClearanceViolations:audit.spiralProxyClearanceViolations,stairProxyBlocks:audit.stepProxyCount,
    paletteNotCertified:palette.validatedEducationBlockStates===0,
    floorSummaries:plan.floors.map(f=>({level:f.level,rooms:f.rooms.length,routed:f.reachableRoomCount,
     corridorCells:f.regeneratedCorridorCells,oldCorridorCells:f.originalB100GalleryCells,
     exits:f.exits.length,coresReached:f.coreRoutes.filter(c=>c.connected).length})),
    realDoorsInstalled:0,realStairsInstalled:0,certifiedExits:0,finishedInteriors:0,
    constructionApproved:false};
  })};
 });
 const o=cases.flatMap(c=>c.options),sum=key=>o.reduce((n,x)=>n+x[key],0);
 const report={schema:'minecraftaibuilder-b103-adaptive-circulation-3d-report-v1',
  targetEdition:'MINECRAFT_EDUCATION',javaAdapter:'NOT_IMPLEMENTED',
  B100ReportSha256:b100.reportSha256,B100B101B102Unmodified:true,
  cases,totals:{typologies:cases.length,variants:o.length,
   floors:o.reduce((n,x)=>n+x.floorSummaries.length,0),roomsPlaced:sum('placed'),roomsRouted:sum('connected'),
   roomsUnrouted:sum('disconnected'),stairFlightProxies:sum('stairFlightProxies'),
   stackableSecondaryCoreVariants:o.filter(x=>x.cores>1).length,
   conceptualExteriorGroundExits:sum('exits'),total3DCollisions:sum('collisions'),
   doorwayAirViolations:sum('doorwayViolations'),stairProxyClearanceViolations:sum('stairClearanceViolations'),
   variantsWithCorridorChange:o.filter(x=>x.oldGalleryCells!==x.regeneratedGalleryCells).length,
   oldUnapprovedRoomCandidates:296,oldHeldRooms:18,certifiedStairs:0,realBlocksEmitted:0,worldContacts:0},
  scopeLimits:['ROOM_POSITIONS_STILL_FROM_B102_LEGACY_GALLERY_CONSTRAINED_PLACEMENT',
   'CORRIDORS_REGENERATED_AS_SHORTEST_2X2_ANCHOR_GRAPH_FROM_ROOM_DOORS',
   '3X3_SPIRAL_STAIRS_ARE_5_RISER_VOXEL_PROXIES_NOT_CERTIFIED_BEDROCK_STAIRS',
   'EXITS_ARE_OUTSIDE_FLOOD_FILL_CANDIDATES_NOT_PHYSICAL_ESCAPE_CERTIFICATES',
   'NO_ROOF_LOAD_PATH_FURNITURE_FINISHED_INTERIOR_OR_MINECRAFT_WORLD_TEST',
   'EDUCATION_PALETTE_SYMBOLIC_ONLY_NO_VERSION_PINNED_BLOCK_STATES'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB103(report))throw Error('B103_INVALID_REPORT');
 return report;
}
export function validateB103(r){
 if(r?.schema!=='minecraftaibuilder-b103-adaptive-circulation-3d-report-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.javaAdapter!=='NOT_IMPLEMENTED'||
 r.B100ReportSha256?.length!==64||r.B100B101B102Unmodified!==true||
 r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan?.operations?.length!==0||
 r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||
 r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||r.cases?.length!==5||
 r.cases.some(g=>g.options?.length!==3))return false;
 const o=r.cases.flatMap(g=>g.options),t=r.totals;
 if(o.length!==15||o.some(x=>x.placed!==x.connected+x.disconnected||
 x.realDoorsInstalled!==0||x.realStairsInstalled!==0||x.certifiedExits!==0||x.finishedInteriors!==0||
 x.constructionApproved!==false||x.paletteNotCertified!==true||
 x.floorSummaries.some(f=>f.routed>f.rooms||f.corridorCells<0)))return false;
 const sum=k=>o.reduce((n,x)=>n+x[k],0);
 return t.typologies===5&&t.variants===15&&t.floors===66&&
 t.roomsPlaced===sum('placed')&&t.roomsRouted===sum('connected')&&t.roomsUnrouted===sum('disconnected')&&
 t.stairFlightProxies===sum('stairFlightProxies')&&t.stackableSecondaryCoreVariants===o.filter(x=>x.cores>1).length&&
 t.conceptualExteriorGroundExits===sum('exits')&&t.total3DCollisions===sum('collisions')&&
 t.doorwayAirViolations===sum('doorwayViolations')&&t.stairProxyClearanceViolations===sum('stairClearanceViolations')&&
 t.variantsWithCorridorChange===o.filter(x=>x.oldGalleryCells!==x.regeneratedGalleryCells).length&&
 t.oldUnapprovedRoomCandidates===296&&t.oldHeldRooms===18&&t.certifiedStairs===0&&
 t.realBlocksEmitted===0&&t.worldContacts===0;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=compileB103();
 console.log(JSON.stringify({totals:r.totals,byType:r.cases.map(g=>({id:g.caseId,variants:g.options.map(o=>({
  id:o.id,rooms:o.placed,routed:o.connected,cores:o.cores,exits:o.exits,collisions:o.collisions,
  doorViolations:o.doorwayViolations,stairViolations:o.stairClearanceViolations
 }))}))},null,2));
}