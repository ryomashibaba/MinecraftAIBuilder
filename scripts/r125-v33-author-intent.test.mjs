import {test} from 'node:test';
import {SCHEMA,compileArchitecturePlan,assessR125AuthoredRoomCapacity,estimateR125AuthoredElementReserve} from '../source/ai/r125-architecture-plan.mjs';
import {R125_ARCHITECTURE_RESPONSE_SCHEMA as schema} from '../source/ai/b198g-local-model-adapter.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes} from '../source/ai/r125-source-routes.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const check=(x,m)=>{if(!x)throw Error(m)};
const base=(id)=>({schema:SCHEMA,id,title:'Synthetic shared-space study',brief:'Synthetic test only, not model authored',
 footprint:{width:26,depth:26},levels:[{splitAxis:'z',splitPercent:50,spaces:[
  {id:'public-room',purpose:'Public shared work',access:'public',fixtures:['table']},
  {id:'staff-room',purpose:'Staff work',access:'staff',fixtures:['desk']}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}});
test('new conventional author grammar requires expression, spatial still omits it',()=>{
 check(schema.anyOf.length===5,'same alternatives');
 for(const v of schema.anyOf){
  check(v.required.includes('expression')===Object.hasOwn(v.properties,'expression'),'explicit form contract');
  if(v.properties.expression){
   check(v.properties.levels.items.properties.spaces.items.properties.fixtures.items.enum.includes('table'),'table offered');
  }else check(v.properties.levels.items.properties.rootSpace.properties.fixtures.items.enum.includes('table'),'spatial table offered');
 }
});
const verify=(p,r)=>{
 const t=r.fixtureTargets.find(x=>x.kind==='table');
 check(t&&t.size[0]*t.size[2]===6,'table footprint');
 check(r.design.elements.some(e=>e.id===t.id+'-tabletop'),'real tabletop');
 check(verifyCompiled(r.design,r.compiled),'compiled');
 check(auditR125SourceRoutes(r,{featureTargets:r.fixtureTargets}).status==='SOURCE_ROUTES_REACH_ALL_ZONES','routes');
 check(auditR125VisitorRoutes(r,p).status==='SOURCE_VISITOR_ROUTES_AVOID_STAFF','access');
 check(r.worldWrites===0&&r.compiled.BuildPlan.operations.length===0,'no world');
};
for(const kind of ['flat','tapered','crafted','spatial'])test('compact shared table '+kind,()=>{
 const p=base('table-'+kind);
 if(kind==='tapered'){p.expression.roofProfile='ridge';p.expression.roofVolume='raised';p.expression.ridgeProfile='tapered';p.levels[0].spaces[0].daylight='panorama';}
 if(kind==='crafted')p.levels[0].spaces[0].fixtureDetail='crafted';
 if(kind==='spatial'){delete p.expression;p.footprint={width:30,depth:28};
  p.levels=[{layoutMode:'spatial-tree',spaces:[
   {id:'public-room',purpose:'Public shared work',access:'public',fixtures:['table'],daylight:'panorama',
    volume:{width:14,depth:12,roofY:8,roofForm:'gable',roofAxis:'x'}},
   {id:'staff-room',purpose:'Staff work',access:'staff',fixtures:['desk'],
    volume:{width:8,depth:8,roofY:6,attach:{to:'public-room',side:'east',shift:0}}}]}];
 }
 const before=JSON.stringify(p),r=compileArchitecturePlan(p,kind==='spatial'?{}:{entrancePlacement:'source-accessible'});
 verify(p,r);check(JSON.stringify(p)===before,'immutable');
 check(assessR125AuthoredRoomCapacity(p).zones[0].equipmentFootprintCells===6,'correct capacity');
 check(estimateR125AuthoredElementReserve(p)>=9,'reserved elements');
});
test('legacy plans with no expression remain compilable',()=>{
 const p=base('legacy-unexpressed');delete p.expression;
 p.levels[0].spaces[0].fixtures=['desk'];
 const r=compileArchitecturePlan(p,{entrancePlacement:'source-accessible'});
 check(verifyCompiled(r.design,r.compiled),'legacy compiler compatibility');
});
