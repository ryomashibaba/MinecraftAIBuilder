import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,validateArchitecturePlan,compileArchitecturePlan}
 from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign,verifyCompiled,MATERIALS}
 from '../source/ai/b143-building-dsl.mjs';
import {auditR125SourceRoutes,auditR125VisitorRoutes}
 from '../source/ai/r125-source-routes.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';
import {R125_ARCHITECTURE_RESPONSE_SCHEMA}
 from '../source/ai/b198g-local-model-adapter.mjs';

const original=()=>({
 schema:SCHEMA,id:'public-satellite-demo',
 title:'Visitor gallery overlooking independent work',
 brief:'Public display and independent model assembly, with an actual protected view',
 footprint:{width:28,depth:24},
 levels:[{splitAxis:'x',splitPercent:45,spaces:[
  {id:'public-demo',purpose:'Visitor gallery and display',
   access:'public',fixtures:['display']},
  {id:'maker-station',purpose:'Assembly and inspection workshop',
   access:'staff',fixtures:['assembly-table','inspection-stand']}
 ]}],
 entryZone:'first',
 materials:{floor:'wood',wall:'concrete',roof:'metal'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',
  roofAxis:'x',facadeLanguage:'plain'},
 observationLink:{viewerSpaceId:'public-demo',workSpaceId:'maker-station'}
});
test('a genuinely authored window proves glass, visitor standing access and an eye-level work ray',()=>{
 const authored=original(),raw=JSON.stringify(authored);
 const before=structuredClone(authored);
 assert.equal(validateArchitecturePlan(authored),true);
 const built=compileArchitecturePlan(authored,{entrancePlacement:'source-accessible'});
 const proof=built.observationSource;
 assert.equal(proof?.status,'SOURCE_GLAZED_WORK_VIEW_CONFIRMED');
 assert.equal(proof.actualGlassCells,4);
 assert.equal(proof.viewerSpaceId,'public-demo');
 assert.equal(proof.workSpaceId,'maker-station');
 assert(proof.viewerTwoWideSourceWitness);
 assert(['assembly-table','inspection-stand'].includes(proof.ray.workFixtureKind));
 assert(proof.ray.visibleWorkCell.length===3);
 assert.equal(proof.visitorRouteAvoidsStaff,true);
 assert.equal(built.worldWrites,0);
 assert.equal(built.compiled.BuildPlan.operations.length,0);
 assert.equal(verifyCompiled(built.design,built.compiled),true);
 assert.equal(auditR125SourceRoutes(built,{
  featureTargets:built.fixtureTargets}).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(auditR125VisitorRoutes(built,authored).status,
  'SOURCE_VISITOR_ROUTES_AVOID_STAFF');
 const eye=proof.panelOrigin,glass=MATERIALS.indexOf('glass');
 for(let x=eye[0];x<eye[0]+proof.panelSize[0];x++)
  for(let y=eye[1];y<eye[1]+proof.panelSize[1];y++)
   for(let z=eye[2];z<eye[2]+proof.panelSize[2];z++)
    assert(built.compiled.primitives.some(v=>
     v[0]===x&&v[1]===y&&v[2]===z&&v[3]===glass));
 const report=diagnoseR125ArchitecturePlanOriginal(raw,{
  requestedBrief:'市民が製作の様子を安全に見学できる組立・点検工房'});
 assert.equal(report.sourceVerified,true,report.compilerReason);
 assert.equal(report.observationSource.status,'SOURCE_GLAZED_WORK_VIEW_CONFIRMED');
 assert.deepEqual(authored,before,'the original is never modified');
});
test('the author schema can request an optional room-to-room observation relation',()=>{
 for(const variant of R125_ARCHITECTURE_RESPONSE_SCHEMA.anyOf){
  const relation=variant.properties.observationLink;
  assert(relation&&relation.additionalProperties===false);
  assert.deepEqual(relation.required,['viewerSpaceId','workSpaceId']);
  assert(!variant.required.includes('observationLink'),
   'no automatic glazing for display-only or archived plans');
 }
});
test('no false window claims for invalid relations or absent author request',()=>{
 const p=original();
 const without=structuredClone(p);
 delete without.observationLink;
 const baseline=compileArchitecturePlan(without,{entrancePlacement:'source-accessible'});
 assert.equal(baseline.observationSource,undefined);
 assert.equal(verifyCompiled(baseline.design,compileDesign(baseline.design)),true);
 p.observationLink.viewerSpaceId='maker-station';
 assert.throws(()=>validateArchitecturePlan(p),
  /R125_PLAN_OBSERVATION_LINK_PRIVACY_OR_LEVEL|R125_PLAN_OBSERVATION_LINK_FIELDS/);
 p.observationLink.viewerSpaceId='public-demo';
 p.levels[0].spaces[1].fixtures=['storage'];
 assert.throws(()=>validateArchitecturePlan(p),
  /R125_PLAN_OBSERVATION_LINK_NO_AUTHORED_WORKSTATION/);
});
