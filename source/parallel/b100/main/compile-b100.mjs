/** B100: deterministic, offline common architectural IR. Education Edition first.
 * Inherits the B99 report ONLY AS AN IMMUTABLE COMPARISON / SAFETY ANCHOR.
 */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {hash,safe} from '../../b79/main/compile-b79.mjs';
import {validateB99} from '../../b99/main/compile-b99.mjs';
import {DEFAULT_BRIEFS,normalizeBrief,buildUniversalCandidate,validateUniversalCandidate,assessDiversity} from './b100-universal-design.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const fail=s=>{throw Error('B100_'+s)};
const PLACEHOLDER={mode:'OFFLINE_RESEARCH_ONLY',edition:'MINECRAFT_EDUCATION',materialMapperStatus:'NOT_IMPLEMENTED',worldTransportStatus:'DISABLED',
 futureJavaAdapter:'FUTURE_SEPARATE_BACKEND_NOT_IMPLEMENTED',replayVersion:'B99_PINNED_COMPARISON_ONLY',allowedToEmitCommands:false};
export function validateB100(r){
 if(r.schema!=='minecraftaibuilder-b100-generic-education-first-design-ir-v1'||r.targetEdition!=='MINECRAFT_EDUCATION'||r.readiness!=='NOT_PREPARED'||
  r.constructionApproved!==false||r.executionAllowed!==false||r.worldContacts!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
  r.BuildPlan?.operations?.length!==0||r.BuildPlan?.commandCount!==0||r.BuildPlan?.worldCoordinates!==null||r.BuildPlan?.status!=='NOT_PREPARED')return false;
 if(r.editionAdapter?.edition!=='MINECRAFT_EDUCATION'||r.editionAdapter.allowedToEmitCommands!==false||r.editionAdapter.worldTransportStatus!=='DISABLED'||r.editionAdapter.futureJavaAdapter!=='FUTURE_SEPARATE_BACKEND_NOT_IMPLEMENTED')return false;
 if(r.architectureCases?.length!==5||r.architectureCases.some(s=>s.options.length!==3||s.diversity.distinctFootprintSignatures!==3||!s.diversity.nonTrivialStructuralDifferences||!s.brief.requiresHumanReview))return false;
 if(r.architectureCases.some(s=>s.options.some((v,i)=>v.variant!==i||!validateUniversalCandidate(v,s.brief))))return false;
 const totals=r.totals;
 if(totals.caseTypes!==5||totals.designBranches!==15||totals.floors!==66||totals.previousUnapprovedRooms!==296||totals.previousHeldRooms!==18||totals.newApprovedRooms!==0||totals.productionEdits!==0||totals.commands!==0||totals.verifiedBedrockDoors!==0||totals.actualBuildingExitsVerified!==0)return false;
 if(totals.floors!==r.architectureCases.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.floors.length,0),0))return false;
 if(totals.nominalRoomFrontages!==r.architectureCases.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.summary.nominalTwoCellFrontageRooms,0),0))return false;
 if(totals.programmedRooms!==r.architectureCases.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.summary.programmeRetainedRooms,0),0))return false;
 if(r.legacySafetyAnchor?.b99FrozenSha256?.length!==64||r.legacySafetyAnchor.b99SourceReadOnly!==true||r.legacySafetyAnchor.legacyCandidatePromotion!==false)return false;
 if(r.approvals?.forConstruction!==null||r.approvals?.forReplacingB99!==null||r.approvals?.forDoorCertification!==null)return false;
 return true;
}
export function compileB100(){
 const b99=read('parallel/b99/main/B99_ARCHITECTURE_SAFETY_REPORT.json');
 safe(b99,'minecraftaibuilder-b99-offline-architecture-safety-frontier-v1');
 if(!validateB99(b99))fail('PARENT_B99_TAMPERED');
 const archive=[];
 for(const input of DEFAULT_BRIEFS){
  const brief=normalizeBrief(input),options=[0,1,2].map(v=>buildUniversalCandidate(brief,v));
  for(const o of options)if(!validateUniversalCandidate(o,brief))fail('BAD_OPTION_'+o.id);
  const diversity=assessDiversity(options);if(!diversity.nonTrivialStructuralDifferences)fail('DUPLICATE_MASSING_'+brief.id);
  archive.push({caseId:brief.id,brief,options,diversity,approvedForProduction:false,reviewOnly:true,
   selectionAdvice:'MULTI_CRITERIA_REVIEW_REQUIRED_NO_AUTOMATIC_BEST_CHOICE'});
 }
 const report={schema:'minecraftaibuilder-b100-generic-education-first-design-ir-v1',kind:'EDITION_NEUTRAL_ARCHITECTURAL_CONCEPT_WITH_EDUCATION_FIRST_TARGET_AND_NO_COMMANDS',
  targetEdition:'MINECRAFT_EDUCATION',editionAdapter:PLACEHOLDER,
  legacySafetyAnchor:{b99FrozenSha256:b99.reportSha256,b98FrozenSha256:b99.provenance.b98,b99SourceReadOnly:true,
   previousUnapprovedCandidateCount:296,previousHeldRoomCount:18,legacyCandidatePromotion:false,referenceBuildings:5,referenceFloors:30},
  architectureIR:{version:1,stageOrder:['BRIEF','PROGRAM','MASSING','FLOOR_MASK','VERTICAL_CORE','TWO_WIDE_GALLERY','ROOM_VOLUME','REVIEW'],
   units:'ONE_LOGICAL_CELL_EQUALS_ONE_PLANNED_MINECRAFT_BLOCK',gridConvention:'LOCAL_X_Z_Y_UP',floorHeightCells:5,
   genericInputs:['typology','landDimensions','numberOfFloors','hardShapeConstraints','requiredProgramme','style'],
   representation:['orderedFloorOccupancyMasks','commonStackedVerticalCore','nominalAccessibleTwoWideGallery','independentRectangularRoomVolumes','conceptualDoorFrontageBays'],
   forbiddenGlobalAssumptions:['ALL_BUILDINGS_ARE_COURTYARDS','ALL_CORES_ARE_CENTRAL','ALL_BUILDINGS_HAVE_SIX_FLOORS','WINDOWS_IN_ONE_DIRECTION','ALL_ROOMS_SAME_DIMENSIONS'],
   explicitKnownGaps:['NO_TRUE_HINGE_DOOR','NO_STAIRS_OR_ELEVATORS','NO_REAL_EGRESS_OR_LOAD_PATH','NO_MATERIALIZED_BEDROCK_PALETTE','NO_ACTUAL_DAYLIGHT','NO_FREE_FORM_JAPANESE_NLP','NO_PHYSICAL_INTERIOR_OR_FURNITURE']},
  architectureCases:archive,
  totals:{caseTypes:archive.length,designBranches:archive.reduce((n,s)=>n+s.options.length,0),floors:archive.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.floors.length,0),0),
   programmedRooms:archive.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.summary.programmeRetainedRooms,0),0),
   nominalRoomFrontages:archive.reduce((n,s)=>n+s.options.reduce((m,o)=>m+o.summary.nominalTwoCellFrontageRooms,0),0),
   structuralDiverseThreeWayTestsPassed:archive.length,previousUnapprovedRooms:296,previousHeldRooms:18,newApprovedRooms:0,
   productionEdits:0,commands:0,verifiedBedrockDoors:0,actualBuildingExitsVerified:0},
  nextMilestone:{id:'B101',title:'generic design constraints, property-based variety, Education block vocabulary audit',
   priority:['CONSTRAINT_AWARE_PROGRAMME_ALLOCATION','UNREACHABLE_ROOM_NEGATIVE_TESTS','TRUE_3D_DOOR_HEADROOM_MODEL','MULTIPLE_CORE_AND_EXIT_TOPOLOGY','INDEPENDENT_EDUCATION_BLOCK_MATERIAL_ADAPTER_READ_ONLY','JAPANESE_BRIEF_SEMANTICS_WITH_UNKNOWN_CONSTRAINTS_PRESERVED'],
   noConstructionPermission:true},
  safetyLimitations:['INDEPENDENT NEW BUILDINGS ONLY NOT PATCHES FOR FROZEN B99','COVERAGE OF FIVE TEST BRIEFS DOES NOT PROVE UNRESTRICTED NATURAL LANGUAGE','ROOM FRONTAGE DOES NOT MEAN DOOR/HINGE/SWING VERIFIED',
   'HORIZONTAL CONCEPT PATH DOES NOT MEAN REAL EGRESS OR TWO BLOCK HEADROOM','COURTYARD/ATRIUM VOID IS UNPROVEN STRUCTURALLY','NO BEDROCK BLOCK STATE COMPATIBILITY OR CONSTRUCTION','CONCEPTUAL AREA DIVERSITY NOT QUALITATIVE BEAUTY'],
  approvals:{forConstruction:null,forReplacingB99:null,forDoorCertification:null},
  readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,worldContacts:0,
  gates:b99.gates.map(g=>({...g,status:'BLOCKED'})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB100(report))fail('INTERNAL_VALIDATION_FAILED');return {...report,reportSha256:hash(report)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=compileB100();if(process.argv.includes('--write'))fs.writeFileSync(path.join(here,'B100_GENERIC_DESIGN_REPORT.json'),JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({totals:r.totals,rows:r.architectureCases.map(s=>({caseId:s.caseId,minDiversity:s.diversity.minimumDifference,
  rooms:s.options.map(o=>o.summary.programmeRetainedRooms),frontages:s.options.map(o=>o.summary.nominalTwoCellFrontageRooms),areas:s.options.map(o=>o.footprintAreaByLevel)}))},null,2));
}
