/** Shared synthetic transport fixture; not model architecture. */
export const syntheticOriginal=()=>JSON.stringify({
 design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'r190bd-fake-only',title:'Synthetic test building not a model result',
  brief:'Fully synthetic source for mock R4 tests, no independent design',
  bounds:{width:24,height:16,depth:24},designOnly:true,
  elements:[
   {id:'supported-floor',shape:'box',mode:'add',material:'stone',
    origin:[1,1,1],size:[22,1,22]},
   {id:'canopy',shape:'box',mode:'add',material:'wood',
    origin:[3,10,3],size:[8,1,10]}
  ]
 },explanation:'This data is hard-coded for a provider mock only.',
 assumptions:[],
 spatialPlan:{
  designIntent:'Synthetic test for a sheltered room and open pad.',
  massStrategy:'A ground slab plus small elevated canopy tests geometry.',
  circulationStrategy:'Supported walking along the unbroken flat ground.',
  entrance:[4,2,4],headroom:2,protectedVoids:[],
  destinations:[{id:'far-pad',point:[14,2,9],maximumPathSteps:40}],
  functionalZones:[{id:'some-pad',origin:[4,2,4],size:[6,1,6],
   minimumReachablePositions:5,minimumReachablePercent:70}]
 }
});
