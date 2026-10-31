/** R190-BB deliberately authored synthetic B143 geometry; never an LLM output. */
const box=(id,mode,origin,size,material)=>({id,mode,shape:'box',origin,size,
 ...(material?{material}:{})});
function sample(){
 return {design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'source-outdoor-transition-demo',
  title:'Civic sheltered hall with intentionally authored local boundary walkway',
  brief:'A public protected hall leading to a 2-wide walkway at the bounded site edge.',
  bounds:{width:20,height:16,depth:20},designOnly:true,
  elements:[
   box('ground','add',[2,0,2],[16,2,16],'stone'),
   box('pillar','add',[2,2,2],[2,8,2],'concrete'),
   box('hall-roof','add',[2,10,2],[16,4,16],'metal'),
   box('real-sky-void','cut',[8,10,8],[4,4,4])
  ]},
  explanation:'Manually written research source, no inference of a model.',
  assumptions:[],spatialPlan:{
   entrance:[6,2,5],headroom:2,
   protectedVoids:[{id:'real-sky-void',origin:[8,2,8],size:[4,12,4],maxOccupiedCells:0}],
   destinations:[{id:'meeting',point:[12,2,13],maximumPathSteps:45}],
   functionalZones:[{id:'gathering',origin:[5,2,4],size:[9,2,8],
    minimumReachablePositions:20,minimumReachablePercent:0.3}]
  }
 };
}
export const R190BB_AUTHOR_CASES={
 covered:()=>{
  const s=sample();
  s.design.elements.push(box('external-floor','add',[0,0,4],[6,2,4],'stone'));
  s.design.elements.push(box('complete-edge-overhang','add',[0,10,4],[6,2,4],'metal'));
  return s;
 },
 outdoors:()=>{
  const s=sample();
  s.design.elements.push(box('external-floor','add',[0,0,4],[6,2,4],'stone'));
  return s;
 },
 alternate:()=>{
  const s=sample();
  s.design.elements.push(box('external-floor','add',[0,0,4],[6,2,4],'stone'));
  s.design.elements.push(box('partial-edge-overhang','add',[0,10,4],[6,2,2],'metal'));
  return s;
 },
 tooNarrow:()=>{
  const s=sample();
  s.design.elements.push(box('one-block-wide-edge','add',[0,0,5],[6,2,1],'stone'));
  return s;
 },
 openEntrance:()=>{
  const s=sample();
  s.design.elements.push(box('external-floor','add',[0,0,4],[6,2,4],'stone'));
  s.design.elements.push(box('entrance-skylight','cut',[4,10,4],[5,4,4]));
  return s;
 }
};
