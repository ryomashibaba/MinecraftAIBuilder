import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSculptedSpineV4D,compileSculptedSpineV4D}
 from '../source/ai/r125-sculpted-spine-v4d.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {makeV4DSyntheticCivicStudy} from './r125-v4d-synthetic-fixture.mjs';

const copy=x=>structuredClone(x);
test('V4D synthetic authored profile gives B143 stepping, loggia, glass, public SOURCE route',()=>{
 const plan=makeV4DSyntheticCivicStudy(),before=copy(plan);
 validateSculptedSpineV4D(plan);
 const r=compileSculptedSpineV4D(plan);
 assert.deepEqual(plan,before);
 assert(verifyCompiled(r.design,r.compiled));
 assert.equal(r.sourceProof.bandCount,3);
 assert.deepEqual(r.sourceProof.roofDatums,[10,18,12]);
 assert.deepEqual(r.sourceProof.xOffsets,[22,14,28]);
 assert.equal(r.sourceProof.openLoggiaBays,3);
 assert.equal(r.sourceProof.actualGlassVoxels,50);
 assert(r.sourceProof.twoWideReachableApronPads>=25);
 assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(r.sourceRoutes.zones.length,4);
 assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert(r.compiled.primitives.some(p=>p[3]===MATERIALS.indexOf('glass')));
 assert(r.design.elements.some(e=>e.id==='civic-canopy'&&e.mode==='add'));
 assert(r.design.elements.some(e=>e.id==='loggia-bay-2'&&e.mode==='cut'));
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.authorIsRealModel,'NOT_ATTESTED');
 assert.equal(r.architecturalArt,'NOT_REVIEWED');
 assert.equal(r.minecraftWalking,'NOT_TESTED');
});
test('unsafe/flattened AUTHOR intents are rejected before any host repair',()=>{
 const p=makeV4DSyntheticCivicStudy(),orig=JSON.stringify(p);
 const cases=[];
 const mutate=fn=>{const x=copy(p);fn(x);cases.push(x)};
 mutate(x=>x.schema='wrong');
 mutate(x=>x.id='../bad');
 mutate(x=>x.provider='fake qwen');
 mutate(x=>x.materials.roof='tnt');
 mutate(x=>x.bands.pop());
 mutate(x=>x.bands[1].id=x.bands[0].id);
 mutate(x=>x.bands[1].z+=3);
 mutate(x=>x.bands[1].x=80);
 mutate(x=>x.bands.forEach(b=>b.roofY=11));
 mutate(x=>x.bands.forEach(b=>b.x=22));
 mutate(x=>x.portals[0].to='not-existent');
 mutate(x=>x.portals[0].offset=0);
 mutate(x=>x.entry.offset=1);
 mutate(x=>x.forecourt.x=80);
 mutate(x=>x.canopy.z=6);
 mutate(x=>x.canopy.roofY=2);
 mutate(x=>x.loggia.apronWidth=1);
 mutate(x=>x.loggia.bays[1].offsetZ=4);
 mutate(x=>x.loggia.bays[0].width=1);
 mutate(x=>x.loggia.bays[0].offsetZ=-1);
 mutate(x=>x.glazing.side='north');
 mutate(x=>x.glazing.height=9);
 mutate(x=>x.glazing.bandId='missing');
 for(const bad of cases){
  assert.throws(()=>validateSculptedSpineV4D(bad),/R125_V4D_/);
  assert.throws(()=>compileSculptedSpineV4D(bad),/R125_V4D_/);
 }
 assert.equal(JSON.stringify(p),orig);
});
test('result remains SOURCE-only, not an art or Education permission',()=>{
 const r=compileSculptedSpineV4D(makeV4DSyntheticCivicStudy());
 assert.equal(r.provenance,'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN');
 assert.equal(r.sourceProof.exteriorTerrain,'NOT_TESTED');
 assert.equal(r.design.designOnly,true);
 assert.equal(r.compiled.designOnly,true);
 assert(r.geometrySha256.length===64);
 assert(!r.design.elements.some(e=>Object.hasOwn(e,'worldCoordinates')));
});
