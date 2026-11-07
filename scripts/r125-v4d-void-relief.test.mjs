import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV4DSyntheticCivicStudy} from './r125-v4d-synthetic-fixture.mjs';
import {compileSculptedSpineV4D} from '../source/ai/r125-sculpted-spine-v4d.mjs';
import {validateV4DVoidRelief,compileV4DVoidRelief}
 from '../source/ai/r125-v4d-void-relief.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';

import {makeV4DVoidReliefFixture} from './r125-v4d-void-relief-fixture.mjs';
test('V4D second opt-in proposal retains original and creates REAL open roof, changed footprint and routes',()=>{
 const original=compileSculptedSpineV4D(makeV4DSyntheticCivicStudy());
 const p=makeV4DVoidReliefFixture(),before=structuredClone(p);
 validateV4DVoidRelief(p);
 const r=compileV4DVoidRelief(p);
 assert.deepEqual(p,before);
 assert(verifyCompiled(r.design,r.compiled));
 assert.notEqual(r.geometrySha256,r.baselineGeometrySha256);
 assert.equal(compileSculptedSpineV4D(makeV4DSyntheticCivicStudy()).geometrySha256,original.geometrySha256);
 assert(r.sourceProof.trueOpenAirTransectFloorPads>=180);
 assert(r.sourceProof.removedPerimeterFootprintVoxels>=30);
 assert(r.sourceProof.nonRectangularEdgeBends>=8);
 assert(r.sourceProof.survivingRealGlassVoxels>=12);
 assert.equal(r.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert(r.sourceRoutes.zones.every(z=>z.reachedFromEntrance));
 assert(r.compiled.primitives.some(p=>p[3]===MATERIALS.indexOf('glass')));
 assert(r.design.elements.some(e=>e.id==='v4d-open-air-public-transect'&&e.mode==='cut'));
 assert(r.design.elements.some(e=>e.id==='v4d-edge-cut-6'&&e.mode==='cut'));
 assert.equal(r.provenance,'SYNTHETIC_AUTHOR_SUPPLIED_NOT_REAL_QWEN');
 assert.equal(r.authorIsRealModel,'NOT_ATTESTED');
 assert.equal(r.architecturalArt,'NOT_REVIEWED');
 assert.equal(r.minecraftWalking,'NOT_TESTED');
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);
 assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
});
test('invalid authored void/outline, collision and extra authority are fail-closed without auto repair',()=>{
 const p=makeV4DVoidReliefFixture(),before=JSON.stringify(p);
 const cases=[];
 const mutate=f=>{const bad=structuredClone(p);f(bad);cases.push(bad);};
 mutate(x=>x.schema='unknown');
 mutate(x=>x.worldCoordinates=[1,2,3]);
 mutate(x=>x.base.worldWrites=1);
 mutate(x=>x.publicVoid.bandId='missing');
 mutate(x=>x.publicVoid.spanZ=2);
 mutate(x=>x.publicVoid.offsetZ=12);
 mutate(x=>x.publicVoid.bandId='atelier-wing');
 mutate(x=>x.publicVoid.bandId='arrival-hall');
 mutate(x=>{x.publicVoid.bandId='atelier-wing';x.publicVoid.offsetZ=4;x.publicVoid.spanZ=8;});
 mutate(x=>x.edgeRelief.bandId='high-forum');
 mutate(x=>x.edgeRelief.side='north');
 mutate(x=>x.edgeRelief.insets=[0,0,0,0,0,0,0,0,0,0]);
 mutate(x=>x.edgeRelief.insets[4]=9);
 mutate(x=>x.edgeRelief.insets[5]=0);
 mutate(x=>x.edgeRelief.insets[0]=2);
 mutate(x=>x.edgeRelief.offsetZ=15);
 mutate(x=>x.edgeRelief.bandId='missing');
 mutate(x=>{x.edgeRelief.bandId='high-forum';x.edgeRelief.side='west';});
 for(const x of cases){
  assert.throws(()=>validateV4DVoidRelief(x),/R125_V4D(_RELIEF)?_/);
  assert.throws(()=>compileV4DVoidRelief(x),/R125_V4D(_RELIEF)?_/);
 }
 assert.equal(JSON.stringify(p),before);
});
