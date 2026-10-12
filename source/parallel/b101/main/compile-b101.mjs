/** B101: compare five B100-independent building types, no frozen edits or world operations. */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {allocateProgramme,auditCandidateRoutes,parseProgrammeJapanese} from './b101-programme-route.mjs';

export const B101_SCENARIOS=Object.freeze({
 HOUSE:[{purpose:'居間',count:1,minAreaCells:16},{purpose:'寝室',count:2,minAreaCells:16}],
 HOTEL:[{purpose:'客室',count:24,minAreaCells:16},{purpose:'ロビー',count:1,minAreaCells:16}],
 APARTMENT:[{purpose:'住戸',count:24,minAreaCells:12},{purpose:'共用室',count:3,minAreaCells:12}],
 OFFICE:[{purpose:'執務室',count:20,minAreaCells:12},{purpose:'会議室',count:6,minAreaCells:12}],
 LIBRARY:[{purpose:'閲覧室',count:6,minAreaCells:20},{purpose:'書庫',count:6,minAreaCells:20}]
});

export function compileB101(){
 const b100=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(b100)||b100.reportSha256?.length!==64)throw Error('B101_FROZEN_PARENT_INVALID');
 const cases=b100.architectureCases.map(group=>{
  const requirements=B101_SCENARIOS[group.caseId];
  if(!requirements)throw Error('B101_UNKNOWN_REFERENCE_CASE');
  const options=group.options.map(option=>{
   if(!validateUniversalCandidate(option,group.brief))throw Error('B101_UNSAFE_B100_CANDIDATE');
   const programme=allocateProgramme(option,requirements),routes=auditCandidateRoutes(option);
   return {id:option.id,programmeStatus:programme.status,requestedUnits:programme.requested,
    allocatedUnits:programme.allocated,unmetHardRequirements:programme.unmet,
    hypotheticalRoomPurposeChanges:programme.assignments.filter(x=>x.hypotheticalRetag).length,
    conceptualRooms:routes.conceptualRooms,nominalRoutedRooms:routes.nominal2DWideCorePaths,
    nominalUnreachableRooms:routes.nominalUnreachableRooms,
    groundExteriorPortalCandidateSites:routes.potentialGroundExitSites,
    twoWideProblemFloors:routes.floors.filter(f=>f.unreachableTwoWideAnchors>0).length,
    floorSummary:routes.floors.map(f=>({level:f.level,rooms:f.conceptualRooms,nominalRoutes:f.nominalRoutedRooms,
      notRouted:f.nominalUnreachableRooms,anchorSquares:f.twoWideAnchors,
      disconnectedAnchorSquares:f.unreachableTwoWideAnchors,possibleExteriorSites:f.potentialExteriorGroundPortals})),
    completeInteriorRooms:0,physicalStairCertified:false,physicalExteriorExitCertified:false,
    realDoorCertified:false,constructionApproved:false};
  });
  return {caseId:group.caseId,typology:group.brief.typology,requirements,options,reviewOnly:true};
 });
 const opts=cases.flatMap(c=>c.options),example=parseProgrammeJapanese('ホテルを5階建て。客室を12室。客室の面積は20ブロック以上。屋上プールは30ブロック');
 const totals={typologies:cases.length,variants:opts.length,floors:opts.reduce((n,o)=>n+o.floorSummary.length,0),
  requestedProgrammeUnits:opts.reduce((n,o)=>n+o.requestedUnits,0),
  assignedProgrammeUnits:opts.reduce((n,o)=>n+o.allocatedUnits,0),
  optionsWithHardRequirementsMet:opts.filter(o=>o.programmeStatus==='CONCEPTUAL_VOLUMES_FIT_PROGRAMME').length,
  nominalRoutes:opts.reduce((n,o)=>n+o.nominalRoutedRooms,0),
  nominalUnreachableRooms:opts.reduce((n,o)=>n+o.nominalUnreachableRooms,0),
  unapprovedLegacyRooms:296,heldLegacyRooms:18,actualCertifiedExits:0,realDoors:0,finishedInteriors:0,blockCommands:0,worldContacts:0};
 const report={schema:'minecraftaibuilder-b101-education-offline-programme-route-v1',
  B100ReportSha256:b100.reportSha256,B100SourceReadOnly:true,targetEdition:'MINECRAFT_EDUCATION',
  javaAdapter:'DEFERRED_UNIMPLEMENTED',cases,totals,
  unknownHardExample:{unparsed:example.unknownNumberClauses,warnings:example.warnings,preserveUnknownRequirements:true},
  safetyNotes:['THESE_ARE_2D_WIDTH2_FLOOR_GRAPH_ROUTES_NOT_REAL_EGRESS',
   'EXTERIOR_CANDIDATES_ARE_NOT_DOORS_OR_SAFE_GROUND_ACCESS',
   'NO_3D_SOLID_AIR_HEADROOM_OR_STAIRS',
   'NO_UNRESTRICTED_JAPANESE_UNDERSTANDING',
   'NO_AUTO_CONSTRUCTION_OR_WORLD_COORDINATES'],
  gates:b100.gates.map(g=>({...g,status:'BLOCKED'})),readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,worldContacts:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB101(report))throw Error('B101_BAD_SELF_REPORT');
 return report;
}
export function validateB101(r){
 if(r?.schema!=='minecraftaibuilder-b101-education-offline-programme-route-v1'||
  r.B100ReportSha256?.length!==64||r.B100SourceReadOnly!==true||
  r.targetEdition!=='MINECRAFT_EDUCATION'||r.javaAdapter!=='DEFERRED_UNIMPLEMENTED'||
  r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||
  r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||
  r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||
  r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED'))return false;
 if(r.cases?.length!==5||r.cases.some(x=>x.options?.length!==3||x.reviewOnly!==true))return false;
 const variants=r.cases.flatMap(c=>c.options),t=r.totals;
 if(variants.length!==15||variants.some(v=>v.constructionApproved||v.completeInteriorRooms!==0||v.realDoorCertified||
  v.physicalStairCertified||v.physicalExteriorExitCertified||v.allocatedUnits>v.requestedUnits||
  v.floorSummary.some(f=>f.notRouted<0||f.disconnectedAnchorSquares<0)))return false;
 if(t.typologies!==5||t.variants!==15||t.floors!==66||t.unapprovedLegacyRooms!==296||
  t.heldLegacyRooms!==18||t.actualCertifiedExits!==0||t.realDoors!==0||
  t.finishedInteriors!==0||t.blockCommands!==0||t.worldContacts!==0)return false;
 if(t.requestedProgrammeUnits!==variants.reduce((n,v)=>n+v.requestedUnits,0)||
  t.assignedProgrammeUnits!==variants.reduce((n,v)=>n+v.allocatedUnits,0)||
  t.nominalRoutes!==variants.reduce((n,v)=>n+v.nominalRoutedRooms,0)||
  t.nominalUnreachableRooms!==variants.reduce((n,v)=>n+v.nominalUnreachableRooms,0)||
  t.optionsWithHardRequirementsMet!==variants.filter(v=>v.programmeStatus==='CONCEPTUAL_VOLUMES_FIT_PROGRAMME').length)return false;
 if(!r.unknownHardExample?.preserveUnknownRequirements||
   !r.unknownHardExample.warnings?.includes('UNKNOWN_NUMERIC_CONSTRAINT'))return false;
 return true;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=compileB101();
 console.log(JSON.stringify({totals:report.totals,cases:report.cases.map(c=>({id:c.caseId,options:c.options.map(v=>({id:v.id,assigned:v.allocatedUnits,requested:v.requestedUnits,nominalPaths:v.nominalRoutedRooms,unrouted:v.nominalUnreachableRooms}))}))},null,2));
}
