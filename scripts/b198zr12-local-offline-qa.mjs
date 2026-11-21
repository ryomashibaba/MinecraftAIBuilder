/**
 * R12 portable installation QA: NO network calls, NO Ollama requests, NO
 * Minecraft client, NO changes to saved worlds, NO model inference.
 *
 * Runs actual R9/R10 compiler, R3 path checker, R11 guide hash and 4-key
 * source inspection on a clearly synthetic fixture. Never certifies Qwen
 * quality, real physical walking, or release/placement readiness.
 */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {evaluateFunctionalReviewContract,SCHEMA as CONTRACT}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {inspectR11OriginalRaw,R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';

export const R12_SCHEMA='minecraftaibuilder-b198zr12-offline-only-qa-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const BOUNDS={width:40,height:18,depth:24};
const base={
 schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'r12-local-offline-qa',title:'Synthetic R12 QA building',
 brief:'Generated in test code only: never an actual Qwen model response.',
 bounds:BOUNDS,designOnly:true
};
const box=(id,origin,size,mode='add')=>({
 id,shape:'box',mode,...(mode==='add'?{material:'concrete'}:{}),
 origin,size
});
const flight={
 id:'stair-flight',shape:'staircase',mode:'add',material:'concrete',
 origin:[3,1,4],axis:'x',direction:1,width:3,steps:6,treadDepth:2
};
const rib={
 id:'column-series',shape:'box',mode:'add',material:'metal',
 origin:[3,1,18],size:[1,7,1],repeat:{count:5,offset:[6,0,0]}
};
function design(elements){return {...base,elements}}
function expandedColumns(){
 return Array.from({length:5},(_,i)=>({
  ...rib,id:'column-'+i,origin:[3+6*i,1,18],repeat:undefined
 })).map(({repeat,...e})=>e);
}
export function runR12OfflineQA(){
 const other=[
  box('ground',[0,0,0],[40,1,24]),
  flight,
  box('upper-floor',[15,6,4],[8,1,3])
 ];
 const compact=design([...other,rib]),
  expanded=design([...other,...expandedColumns()]);
 const one=compileDesign(compact),many=compileDesign(expanded);
 assert.deepEqual(one.primitives,many.primitives,
  'R10 repeated columns must produce exactly the same full material geometry');
 assert(verifyCompiled(compact,one),'R9/R10 SHA and structure verification');
 assert.equal(one.stats.designOperations.at(-1).instances,5,
  'R10 intended column count');
 const review=evaluateFunctionalReviewContract({
  design:compact,compiled:one,contract:{
   schema:CONTRACT,caseId:'r12-offline-standability',
   authorship:'TEST_FIXTURE',sourceSha256:one.sourceSha256,
   entrance:[2,1,5],headroom:2,protectedVoids:[],
   destinations:[{id:'upper-floor',point:[17,7,5],maximumPathSteps:30}],
   functionalZones:[{id:'upper-usable-room',origin:[15,7,4],size:[7,1,3],
    minimumReachablePositions:18,minimumReachablePercent:85}]
  }
 });
 assert.equal(review.status,'FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS');
 const proposal={design:compact,
  spatialPlan:{designIntent:'Synthetic only',massStrategy:'Offline geometry',
   circulationStrategy:'Offline route',entrance:[2,1,5],headroom:2,
   protectedVoids:[],destinations:[],functionalZones:[]},
  explanation:'Test fixture, not real Qwen data',assumptions:[]};
 const raw=JSON.stringify(proposal);
 const rawAudit=inspectR11OriginalRaw(raw);
 assert.equal(rawAudit.exactFourKeyJsonParseable,true);
 assert.equal(rawAudit.repeatedElements,1);
 assert.equal(rawAudit.staircaseElements,1);
 assert.equal(rawAudit.modelCallsInitiatedByInspection,0);
 assert.equal(R11_GUIDE_SHA256,sha(R11_COMPACT_GUIDE));
 const bridge=createB198SNativeBridge({
  plannedSourceMode:true,compactPlannedGuide:true
 });
 assert.equal(bridge.requestBudget.r11CompactOutputProfileOptIn,true);
 assert.equal(bridge.requestBudget.r11CompactGuideSha256,R11_GUIDE_SHA256);
 assert.equal(bridge.telemetry().length,0,
  'bridge construction MUST NOT contact the model');
 return {
  schema:R12_SCHEMA,status:'OFFLINE_SYNTHETIC_QA_PASS',
  dataSource:'SELF_AUTHORED_FIXTURE_NOT_QWEN',
  exactVoxelParity:true,voxels:one.primitives.length,
  modelSourceElements:compact.elements.length,
  expandedFixtureElements:expanded.elements.length,
  staircasePresent:true,repeatedColumns:5,
  abstractFunctionalRoute:review.status,
  realMinecraftWalkingVerified:false,
  r11CompactGuideSha256:R11_GUIDE_SHA256,
  r11CompleteFourKeyJsonSynthetic:true,
  actualQwenInferenceCalls:0,ollamaRequests:0,
  minecraftWorldContacts:0,minecraftWorldWrites:0,
  sourceOnly:true,constructionApproved:false,
  readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  releaseApproved:false,modelQualityVerified:false
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=runR12OfflineQA();
  console.log(JSON.stringify(report,null,2));
  console.log('R12_OFFLINE_ONLY_PASS: No Qwen, no Minecraft construction.');
 }catch(e){
  console.error('R12_OFFLINE_ONLY_HOLD:',String(e?.message??e).slice(0,240));
  process.exitCode=1;
 }
}
