/** B68 project integration decision record: never equates static source signals to parity. */
import {createHash} from 'node:crypto';
import {missingSourceReport} from './inspect-b68.mjs';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=x=>{throw Error('B68_GATE_'+x)};
const EXPECTED=Object.freeze([
 {source:'engine/src/general-building-planner.js',concern:'ENTRY_ORCHESTRATION',b65B66Contract:'NON_EXECUTING_ASSEMBLY_TO_ENGINE_HANDOFF'},
 {source:'engine/src/building-grammar.js',concern:'PHYSICAL_STRUCTURE_AND_VERTICAL_GEOMETRY',b65B66Contract:'WALL_AND_VERTICAL_INTENT_TRANSLATION'},
 {source:'engine/src/architectural-quality.js',concern:'GEOMETRY_AND_QUALITY_ASSERTIONS',b65B66Contract:'OPENING_CLEARANCE_AND_SUPPORT_VALIDATION'},
 {source:'modules/architectural-library.js',concern:'ARCHITECTURAL_COMPONENT_FACTORIES',b65B66Contract:'DOOR_WALL_STAIR_LIBRARY_IDENTIFIERS'},
 {source:'styles/urban_japanese.json',concern:'MATERIAL_AND_STYLE_LOOKUP',b65B66Contract:'PALETTE_BLOCK_AND_STATE_RESOLUTION'}
]);
export function compileB68(b67,inventory=missingSourceReport()){
 if(!b67||b67.schema!=='minecraftaibuilder-b67-source-collection-readiness-v1'||
 b67.reportSha256!==hash(Object.fromEntries(Object.entries(b67).filter(([k])=>k!=='reportSha256')))||
 b67.executionAllowed!==false||b67.constructionApproved!==false||b67.originalSourceState.available!==0||
 b67.M4Gates?.length!==9||b67.M4Gates.some(g=>g.status!=='BLOCKED')||b67.BuildPlan?.operations?.length!==0)fail('B67_BASELINE');
 if(inventory?.schema!=='minecraftaibuilder-b68-static-source-inventory-v1'||inventory.files?.length!==5||
 inventory.count?.required!==5||inventory.count.found<0||inventory.count.found>5||
 inventory.count.found+inventory.count.missing!==5||inventory.safety?.sourceExecuted!==false||
 inventory.safety?.sourceImported!==false||inventory.safety?.sourceWrittenToDisk!==false||
 inventory.safety?.executionAllowed!==false||inventory.safety?.M4Blocked!==9||
 inventory.safety?.buildOperations!==0||inventory.productionParity!=='UNVERIFIED'||
 inventory.files.some((f,i)=>f.path!==EXPECTED[i].source))fail('INVENTORY_UNSAFE');
 const body={schema:'minecraftaibuilder-b68-static-production-contract-gate-v1',
 provenance:{b67ReportSha256:b67.reportSha256,sourceArchiveSha256:inventory.sourceArchiveSha256??null},
 intake:{...inventory.count,metadata:inventory.metadata},
 interfaceMatrix:EXPECTED.map((x,i)=>({...x,sourceStatus:inventory.files[i].status,
  staticNamesFound:inventory.files[i].inventory?.targetReferences?.map(x=>x.name)??[],
  inspectionLevel:inventory.files[i].inventory?'LEXICAL_ONLY':'NOT_AVAILABLE',
  runtimeParity:'UNVERIFIED',implementationApproved:false})),
 concreteNextGate:inventory.count.found===0?'B67_ORIGINAL_SOURCE_ZIP_REQUIRED':'REVIEW_STATIC_SOURCE_INVENTORY_THEN_REQUIRE_HUMAN_VERIFIED_API_AND_PHYSICAL_PARITY',
 hardBlockers:['PRODUCTION_API_PARITY_NOT_PROVEN','PHYSICAL_BLOCK_STATE_MAPPING_UNVERIFIED',
  'REAL_DOOR_SWING_AND_CLEARANCE_UNVERIFIED','STAIR_SUPPORT_AND_HEADROOM_UNVERIFIED',
  'B42_UPPER_60_DOOR_CIRCULATION_NOT_VERIFIED','B62_B64_CONNECTOR_NOT_APPROVED'],
 guards:{readiness:'NOT_PREPARED',executionAllowed:false,constructionApproved:false,
  sourceExecuted:false,sourceImported:false,worldCalls:0,scans:0,
  M4Gates:b67.M4Gates.map(g=>({...g})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}},
 productionParity:'UNVERIFIED'};
 return {...body,reportSha256:hash(body)};
}
export function verifyB68(r,b67,inventory=missingSourceReport()){
 const ref=compileB68(b67,inventory);
 if(!r||JSON.stringify(r)!==JSON.stringify(ref)||r.reportSha256!==ref.reportSha256||
 r.guards.M4Gates.some(g=>g.status!=='BLOCKED')||r.guards.BuildPlan.operations.length!==0)fail('REPORT_DRIFT');
 return true;
}
