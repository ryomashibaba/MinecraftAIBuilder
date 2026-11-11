import test from 'node:test';
import assert from 'node:assert/strict';
import {compileAuthoredGraph}
 from '../source/ai/r125-v4d-authored-topology.mjs';
import {validateEnvelopeIntegrity,compileEnvelopeIntegrity}
 from '../source/ai/r125-v4d-envelope-integration.mjs';
import {verifyCompiled,validateDesign} from '../source/ai/b143-building-dsl.mjs';
import {makeV4DEnvelopeIntegrationFixtures}
 from './r125-v4d-envelope-integration-fixtures.mjs';

test('3 frozen author graphs gain REAL roof-wall closure, wider thresholds and shaded civic arcades',()=>{
 const items=makeV4DEnvelopeIntegrationFixtures();
 const signatures=new Set(),hashes=new Set();
 assert.equal(items.length,3);
 for(const {plan,envelope} of items){
  const priorPlan=structuredClone(plan),priorEnvelope=structuredClone(envelope);
  const before=compileAuthoredGraph(plan);
  validateEnvelopeIntegrity(plan,envelope);
  const r=compileEnvelopeIntegrity(plan,envelope);
  assert.deepEqual(plan,priorPlan);
  assert.deepEqual(envelope,priorEnvelope);
  assert(verifyCompiled(r.design,r.compiled));
  assert.notEqual(r.geometrySha256,before.geometrySha256);
  assert(r.sourceProof.originalRoofWallMissingCells>=100);
  assert(r.sourceProof.verifiedFinalRoofWallPerimeterCells>=200);
  assert(r.sourceProof.shelteredSupportedRoofCells>=50);
  assert(r.sourceProof.supportedOpenSkyCells>=100);
  assert.equal(r.sourceProof.entranceAndLinkPortalWidth,4);
  assert.equal(r.sourceProof.physicallyVerifiedWidePortalFloorCells,
   4*(plan.links.length+1));
  assert.equal(r.sourceProof.continuousShadeColumns,
   2*plan.nodes.filter(n=>n.kind==='sky').length);
  assert(r.sourceProof.b143Elements<=160);
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert(r.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
  assert.equal(r.sourceProof.reachableFunctionServicePoints,plan.fixtures.length);
  assert(r.design.elements.some(e=>e.id==='portal-emphasis-left'));
  assert(r.design.elements.some(e=>e.id.startsWith('public-covered-arcade-')));
  assert.equal(r.architecturalArt,'NOT_REVIEWED');
  assert.equal(r.realModelAuthorship,'NOT_ATTESTED');
  assert.equal(r.minecraftWalking,'NOT_TESTED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.worldWrites,0);
  signatures.add(before.sourceProof.degreeSignature+'/'+before.sourceProof.cycleRank);
  hashes.add(r.geometrySha256);
 }
 assert.equal(signatures.size,3);
 assert.equal(hashes.size,3);
});
test('author envelope selections cause different final B143 geometry',()=>{
 const a=makeV4DEnvelopeIntegrationFixtures()[1],b=structuredClone(a);
 b.envelope.gables[0].upperFacade='wall';
 if(a.envelope.gables[0].upperFacade==='wall')
  b.envelope.gables[0].upperFacade='glass';
 const r1=compileEnvelopeIntegrity(a.plan,a.envelope);
 const r2=compileEnvelopeIntegrity(b.plan,b.envelope);
 assert.notEqual(r1.authoredEnvelopeSha256,r2.authoredEnvelopeSha256);
 assert.notEqual(r1.geometrySha256,r2.geometrySha256);
});
test('enclosure decisions fail closed, including incompatible frontage glazing',()=>{
 const v=makeV4DEnvelopeIntegrationFixtures()[1];
 const orig=JSON.stringify(v),cases=[],bad=fn=>{
  const x=structuredClone(v);fn(x);cases.push(x);
 };
 bad(x=>x.envelope.portalWidth=2);
 bad(x=>x.envelope.worldWrites=1);
 bad(x=>x.envelope.schema='unknown');
 bad(x=>x.envelope.gables.pop());
 bad(x=>x.envelope.gables[0].upperFacade='unknown');
 bad(x=>x.envelope.gables[0].nodeId='missing');
 bad(x=>x.envelope.gables[1].nodeId=x.envelope.gables[0].nodeId);
 bad(x=>x.envelope.publicShelters.pop());
 bad(x=>x.envelope.publicShelters[0].edge='east');
 bad(x=>x.envelope.publicShelters[0].roofY=2);
 bad(x=>x.envelope.publicShelters[0].depth=10);
 bad(x=>x.envelope.publicShelters[0].material='lava');
 bad(x=>x.plan.windows[0].offset=10);
 for(const x of cases){
  assert.throws(()=>validateEnvelopeIntegrity(x.plan,x.envelope),
   /R125_V4D_INTEGRITY_/);
  assert.throws(()=>compileEnvelopeIntegrity(x.plan,x.envelope),
   /R125_V4D_INTEGRITY_|R125_V4D_GRAPH_/);
 }
 assert.equal(JSON.stringify(v),orig);
});

test('legal long public-space IDs preserve authored intent and identical physical B143',()=>{
 // Independent PUBLIC synthetic regression, not the PRIVATE V6 answer.
 const fixture=makeV4DEnvelopeIntegrationFixtures()[0];
 const baseline=compileEnvelopeIntegrity(fixture.plan,fixture.envelope);
 // Exact pre-fix successful source: existing short IDs must not drift.
 assert.equal(baseline.sourceSha256,
  'b12d95acd80f55acdb47e76c06d81c9118b3a1480cdcd2dbb86d260582537bf1');
 assert.equal(baseline.geometrySha256,
  'ae3eed64ffd0f9c0fb13442c7930e996d8ea2d41c2e79f8aeaed5799f00a8494');
 for(const length of [17,18,25,35]){
  const v=structuredClone(fixture),sky=v.plan.nodes.find(n=>n.kind==='sky');
  const old=sky.id,id='public-'+ 'x'.repeat(length-7);
  sky.id=id;
  for(const l of v.plan.links){
   if(l.from===old)l.from=id;
   if(l.to===old)l.to=id;
  }
  for(const f of v.plan.fixtures)if(f.nodeId===old)f.nodeId=id;
  for(const s of v.envelope.publicShelters)if(s.nodeId===old)s.nodeId=id;
  const original=structuredClone(v);
  const r=compileEnvelopeIntegrity(v.plan,v.envelope);
  assert.deepEqual(v,original,'Do not rename any authored identifier/reference');
  assert.deepEqual(r.authorIR,v.plan);
  assert.deepEqual(r.envelopeAuthorIR,v.envelope);
  assert.deepEqual(r.compiled.primitives,baseline.compiled.primitives,
   'Every coordinate, material and layer must match, not just voxel count');
  assert(verifyCompiled(r.design,r.compiled));
  assert.equal(r.sourceProof.continuousShadeColumns,
   baseline.sourceProof.continuousShadeColumns);
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert(r.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.equal(r.worldContacts,0);
  assert.equal(r.worldWrites,0);
  // The frozen B143 limit still rejects oversized labels.
  const invalid=structuredClone(r.design);
  invalid.elements[0].id='x'.repeat(41);
  assert.throws(()=>validateDesign(invalid),/^Error: B143_ELEMENT_ID$/);
 }
});
