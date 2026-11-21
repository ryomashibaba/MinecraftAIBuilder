import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVoidMassingV4C,compileVoidMassingV4C}
 from '../source/ai/r125-void-massing-v4c.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {STRUCTURE_IDS,makeStructurePlan} from './r125-v4c-structural-fixtures.mjs';

const copy=x=>JSON.parse(JSON.stringify(x));
test('three NOT-QWEN authored structural inputs have distinct link topologies, genuine large voids and B143 SOURCE routes',()=>{
 const shapes=[],topologies=[],courtAreas=[];
 for(let i=0;i<STRUCTURE_IDS.length;i++){
  const plan=makeStructurePlan(i),untouched=copy(plan);
  validateVoidMassingV4C(plan);
  const r=compileVoidMassingV4C(plan);
  assert.deepEqual(plan,untouched);
  assert(verifyCompiled(r.design,r.compiled));
  assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(r.sourceRoutes.zones.length,plan.masses.length+1);
  assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
  assert.equal(r.sourceProof.fullHeightCourtyardInteriorCells,
   (plan.court.width-2)*(plan.court.depth-2));
  assert.equal(r.sourceProof.supportedPublicForecourtCells,
   plan.plaza.width*plan.plaza.depth);
  assert(r.sourceProof.fullHeightCourtyardInteriorCells>=49);
  assert(r.sourceProof.supportedPublicForecourtCells>=60);
  assert.equal(r.worldWrites,0);
  assert.equal(r.worldContacts,0);
  assert.equal(r.constructionApproved,false);
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.equal(r.authorIsRealModel,'NOT_ATTESTED');
  assert.equal(r.architecturalArt,'NOT_REVIEWED');
  assert.equal(r.minecraftWalking,'NOT_TESTED');
  assert.equal(r.sourceProof.genuinelyDistinctAuthoredTopology,'NOT_CERTIFIED_BY_HASH');
  shapes.push(r.geometrySha256);
  courtAreas.push(r.sourceProof.fullHeightCourtyardInteriorCells);
  topologies.push(plan.links.map(l=>l.from+'>'+l.to+':'+l.side).join('|'));
 }
 assert.equal(new Set(shapes).size,3);
 assert.equal(new Set(topologies).size,3);
 assert.deepEqual(courtAreas,[64,90,110]);
});
test('invalid authorship and unsafe or inadequate public spaces fail closed without schema repair',()=>{
 const p=makeStructurePlan(0),original=JSON.stringify(p),cases=[];
 const mutate=fn=>{const x=copy(p);fn(x);cases.push(x)};
 mutate(x=>x.schema='unknown');
 mutate(x=>x.modelProvider='qwen3:14b');
 mutate(x=>x.id='../outside');
 mutate(x=>x.materials.roof='tnt');
 mutate(x=>x.masses[1].id=x.masses[0].id);
 mutate(x=>x.masses[1].x=37); // overlapping rectangles, not shared wall
 mutate(x=>x.masses[0].roofY=2);
 mutate(x=>x.links.pop());
 mutate(x=>x.links[0].from='imaginary');
 mutate(x=>x.links[0].side='west');
 mutate(x=>x.links[0].offset=0);
 mutate(x=>x.entry.massId='east-laboratory');
 mutate(x=>x.entry.side='west');
 mutate(x=>x.court.width=8); // insufficient actual open space
 mutate(x=>x.court.offsetX=1);
 mutate(x=>x.court.gateSide='up');
 mutate(x=>x.court.gateOffset=0);
 mutate(x=>x.court.ownerId='east-laboratory');
 mutate(x=>x.plaza.width=9);
 mutate(x=>x.plaza.depth=5);
 mutate(x=>x.plaza.x=30); // no longer connects to actual authored door
 mutate(x=>delete x.plaza);
 for(const x of cases){
  assert.throws(()=>validateVoidMassingV4C(x),/R125_V4C_/);
  assert.throws(()=>compileVoidMassingV4C(x),/R125_V4C_/);
 }
 assert.equal(JSON.stringify(p),original);
});
test('a void does not authorize Minecraft writes or a new Qwen inference',()=>{
 const r=compileVoidMassingV4C(makeStructurePlan(2));
 assert.equal(r.authorIR.title.startsWith('SYNTHETIC'),true);
 assert.equal(r.authorIsRealModel,'NOT_ATTESTED');
 assert.equal(r.sourceProof.exteriorTerrain,'NOT_TESTED');
 assert(r.geometrySha256.length===64&&r.sourceSha256.length===64);
 assert(!r.design.elements.some(e=>'worldCoordinates' in e));
 assert(r.design.elements.some(e=>e.id==='v4c-court-open-roof'&&e.mode==='cut'));
 assert(r.design.elements.some(e=>e.id==='v4c-forecourt'&&e.mode==='add'));
});
