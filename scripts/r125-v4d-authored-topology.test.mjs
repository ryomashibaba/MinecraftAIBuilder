import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV4DTopologyFixtures} from './r125-v4d-authored-topology-fixtures.mjs';
import {validateAuthoredGraph,compileAuthoredGraph}
 from '../source/ai/r125-v4d-authored-topology.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
test('real B143 source from genuinely different serial, star, and loop authored graphs',()=>{
 const samples=makeV4DTopologyFixtures(),signatures=new Set(),geom=new Set(),sources=new Set();
 assert.equal(samples.length,3);
 for(const p of samples){
  const frozen=structuredClone(p),v=validateAuthoredGraph(p);
  assert.equal(v.portals.length,p.links.length);
  const r=compileAuthoredGraph(p);
  assert.deepEqual(p,frozen);
  assert(verifyCompiled(r.design,r.compiled));
  assert(r.compiled.primitives.length>2000);
  assert(r.sourceProof.roofTwoLayerCellsVerified>700);
  assert(r.sourceProof.supportedOpenSkyPadCandidates>=100);
  assert(r.sourceProof.genuineGlassVoxels>=30);
  assert(r.sourceProof.b143ElementCount<=160);
  assert.equal(r.sourceProof.physicalPortalCount,p.links.length);
  assert.equal(r.sourceProof.verifiedPortalFloorCells,p.links.length*2);
  assert.equal(r.sourceProof.accessibleServiceFeatures,p.fixtures.length);
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.sourceRoutes.zones.length,p.nodes.length);
  assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert(r.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance));
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.worldWrites,0);assert.equal(r.worldContacts,0);
  assert.equal(r.realModelAuthorship,'NOT_ATTESTED');
  assert.equal(r.architecturalArt,'NOT_REVIEWED');
  assert.equal(r.minecraftWalking,'NOT_TESTED');
  assert.equal(r.provenance,'THREE_SEPARATE_SYNTHETIC_AUTHOR_INPUTS_NOT_REAL_LLM');
  signatures.add(r.sourceProof.degreeSignature+'/'+r.sourceProof.cycleRank);
  geom.add(r.geometrySha256);sources.add(r.sourceSha256);
 }
 assert.deepEqual([...signatures].sort(),[
  '1-1-2-2/0','1-1-1-3/0','2-2-2-2/1'].sort());
 assert.equal(geom.size,3);assert.equal(sources.size,3);
});
test('changing actual AUTHOR roof section changes PHYSICAL geometry',()=>{
 const a=makeV4DTopologyFixtures()[0],b=structuredClone(a);
 b.nodes[0].roof.peakY--;
 const r1=compileAuthoredGraph(a),r2=compileAuthoredGraph(b);
 assert.notEqual(r1.sourceSha256,r2.sourceSha256);
 assert.notEqual(r1.geometrySha256,r2.geometrySha256);
});
test('invalid edges, false portals, unapproved side glazing and fixtures are rejected',()=>{
 const p=makeV4DTopologyFixtures()[0],snap=JSON.stringify(p),cases=[];
 const add=f=>{let a=structuredClone(p);f(a);cases.push(a);};
 add(x=>x.schema='bad');
 add(x=>x.worldWrites=1);
 add(x=>x.nodes.pop());
 add(x=>x.nodes[1].id=x.nodes[0].id);
 add(x=>x.nodes[1].roof={axis:'x',type:'shed',eaveY:12,peakY:19,peakPercent:50});
 add(x=>x.nodes[0].roof.peakY=27);
 add(x=>x.nodes[0].x=120);
 add(x=>x.links.pop());
 add(x=>x.links[0].to='missing');
 add(x=>x.links[0].side='north');
 add(x=>x.links[1]={...x.links[0]});
 add(x=>x.links[0].offset=999);
 add(x=>x.nodes[2].x=46);
 add(x=>x.entry.nodeId='maker');
 add(x=>x.entry.plazaDepth=30);
 add(x=>x.windows[0].side='east');
 add(x=>x.windows[0].span=50);
 add(x=>x.fixtures[0].offsetX=0);
 add(x=>x.fixtures[0].material='lava');
 add(x=>x.fixtures=[]);
 for(const x of cases){
  assert.throws(()=>validateAuthoredGraph(x),/R125_V4D_GRAPH_/);
  assert.throws(()=>compileAuthoredGraph(x),/R125_V4D_GRAPH_/);
 }
 assert.equal(JSON.stringify(p),snap);
});
