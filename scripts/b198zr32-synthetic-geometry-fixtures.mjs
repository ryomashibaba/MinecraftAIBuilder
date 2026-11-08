/**
 * R32 TEST-ONLY hand-authored geometry fixtures.
 * They are NOT Qwen output, building presets, production fallbacks,
 * or templates selected for user requests. No world coordinates/operations.
 */
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {SCHEMA as REVIEW_SCHEMA,evaluateFunctionalReviewContract}
 from '../source/ai/b198zr3-functional-review-contract.mjs';
import {reviewR4PlannedProposal}
 from '../source/ai/b198zr4-planned-source.mjs';
export const SCHEMA='minecraftaibuilder-b198zr32-test-only-geometry-fixtures-v1';
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,...(material?{material}:{}),origin,size
});
const base=(id,title,brief,bounds,elements,plan)=>({
 design:{schema:'minecraftaibuilder-b143-building-dsl-v1',designOnly:true,
  id,title,brief,bounds,elements},
 explanation:'Synthetic geometry fixture. Never attributed to a model.',
 assumptions:['No Minecraft operations or human architectural approval.'],
 spatialPlan:{
  designIntent:'Synthetic spatial layout for deterministic review tests.',
  massStrategy:'Hand-authored distinct geometry, never production template.',
  circulationStrategy:'Connected supported conceptual standing positions.',
  ...plan
 }
});
export function r32Courtyard(){
 return base('r32-courtyard','R32 shell and courtyard',
  'Fictional open public gallery, synthetic fixture only.',
  {width:16,height:12,depth:16},[
   box('floor','add',[0,0,0],[16,1,16],'concrete'),
   {id:'outer-shell',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[14,5,14],shell:1},
   box('clear-interior-floor','cut',[2,1,2],[12,1,12]),
   box('skylight','cut',[6,5,6],[4,1,4]),
   box('door','cut',[6,1,1],[4,3,2])
  ],{
   entrance:[7,1,2],headroom:2,
   protectedVoids:[{id:'court-air',origin:[6,1,6],
    size:[4,4,4],maxOccupiedCells:0}],
   destinations:[{id:'opposite-wall',point:[8,1,12],maximumPathSteps:28}],
   functionalZones:[{id:'public-hall',origin:[3,1,3],size:[10,1,10],
    minimumReachablePositions:90,minimumReachablePercent:90}]
  });
}
export function r32Bridge(){
 return base('r32-bridge','R32 branching skywalk',
  'Open-air two-wing walkway with an L-shaped connector.',
  {width:20,height:10,depth:20},[
   box('west-platform','add',[1,0,1],[6,1,7],'stone'),
   box('east-platform','add',[13,0,11],[6,1,7],'stone'),
   box('east-west-bridge','add',[6,0,4],[11,1,1],'metal'),
   box('north-south-bridge','add',[16,0,4],[1,1,9],'metal')
  ],{
   entrance:[2,1,4],headroom:2,
   protectedVoids:[{id:'open-sky',origin:[8,1,4],
    size:[5,2,1],maxOccupiedCells:0}],
   destinations:[{id:'east-wing',point:[16,1,14],maximumPathSteps:38}],
   functionalZones:[{id:'east-public-floor',origin:[14,1,12],size:[4,1,4],
    minimumReachablePositions:16,minimumReachablePercent:100}]
  });
}
export function r32Ring(){
 return base('r32-ring','R32 ring walk',
  'Open-air ring walkway with a central absent floor and clear courtyard.',
  {width:20,height:10,depth:20},[
   box('ring-floor','add',[2,0,2],[16,1,16],'wood'),
   box('open-center','cut',[6,0,6],[8,1,8])
  ],{
   entrance:[3,1,8],headroom:2,
   protectedVoids:[{id:'central-void',origin:[7,1,7],
    size:[6,2,6],maxOccupiedCells:0}],
   destinations:[{id:'far-side',point:[14,1,8],maximumPathSteps:38}],
   functionalZones:[{id:'ring-gallery',origin:[13,1,6],size:[3,1,5],
    minimumReachablePositions:5,minimumReachablePercent:33}]
  });
}
export const R32_CASES=Object.freeze([
 {id:'courtyard',create:r32Courtyard},
 {id:'bridge',create:r32Bridge},
 {id:'ring',create:r32Ring}
]);
export function reviewR32SyntheticFixture(proposal,{caseId='r32-synthetic-test'}={}){
 const compiled=compileDesign(proposal.design);
 const independentContract={
  schema:REVIEW_SCHEMA,caseId,
  authorship:'TEST_FIXTURE',sourceSha256:compiled.sourceSha256,
  entrance:structuredClone(proposal.spatialPlan.entrance),
  headroom:proposal.spatialPlan.headroom,
  protectedVoids:structuredClone(proposal.spatialPlan.protectedVoids),
  destinations:structuredClone(proposal.spatialPlan.destinations),
  functionalZones:structuredClone(proposal.spatialPlan.functionalZones)
 };
 const r4=reviewR4PlannedProposal(proposal,{independentContract});
 const r3=evaluateFunctionalReviewContract({
  design:proposal.design,compiled,contract:independentContract});
 return {id:caseId,geometrySha256:compiled.geometrySha256,
  sourceSha256:compiled.sourceSha256,finalConceptVoxels:compiled.primitives.length,
  r3Status:r3.status,r4Status:r4.status,
  entrance:proposal.spatialPlan.entrance,
  destinationResults:r3.results.destinations,
  zoneResults:r3.results.functionalZones,
  abstractReachablePositions:r3.results.abstractReachablePositions,
  independentContractAuthorship:'TEST_FIXTURE',
  modelGenerated:false,realWorldTested:false,qualityCertified:false,
  modelCalls:0,worldContacts:0,worldWrites:0,
  safety:{readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}}};
}
export function auditR32SyntheticGeometry(){
 return {schema:SCHEMA,syntheticOnly:true,
  scenarios:R32_CASES.map(({id,create})=>
   reviewR32SyntheticFixture(create(),{caseId:'r32-'+id})),
  noModelCallPerformed:true,noMinecraftWorldContact:true,
  doesNotProveQwenGeneralization:true,
  originalR25Status:'HOLD',
  modelCalls:0,worldContacts:0,worldWrites:0};
}
