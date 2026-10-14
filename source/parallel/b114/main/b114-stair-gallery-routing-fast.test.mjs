/**
 * B114 geometry-only smoke tests. Runs WITHOUT the expensive B111 parent,
 * Minecraft, network, or any workflow report artifacts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {planTwoWide} from './b114-stair-gallery-integration.mjs';

const K=p=>p.x+','+p.z;
const cardinal=[
 {dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}
];
function emptyFloor(){
 const allowed=new Set();
 for(let x=0;x<20;x++)for(let z=0;z<20;z++)allowed.add(x+','+z);
 return allowed;
}
function makeScenario(ascent,upper){
 const w={dx:-ascent.dz,dz:ascent.dx};
 const landing=[{x:10,z:10},{x:10+w.dx,z:10+w.dz}];
 const outbound=upper?ascent:{dx:-ascent.dx,dz:-ascent.dz};
 const walk=new Set([
  {x:10+outbound.dx*6,z:10+outbound.dz*6},
  {x:10+w.dx+outbound.dx*6,z:10+w.dz+outbound.dz*6}
 ].map(K));
 return {landing,ascent,upper,allowed:emptyFloor(),walk};
}
test('two-wide connectors find consistent cardinal lower/upper routes (8 directions)',()=>{
 for(const d of cardinal)for(const upper of [false,true]){
  const scenario=makeScenario(d,upper);
  const route=planTwoWide(scenario);
  assert.equal(route.status,'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',
   'direction '+JSON.stringify(d)+' upper='+upper);
  assert.equal(route.continuousTwoWideLocalSquareChain,true);
  assert(route.addedCells.length>=4);
  assert.equal(new Set(route.addedCells.map(K)).size,route.addedCells.length);
  assert(route.addedCells.every(p=>scenario.allowed.has(K(p))));
  assert.equal(route.physical3DBodyClearanceCertified,false);
  assert.equal(route.doorSwingAndFurnitureVerified,false);
 }
});
test('strict room/core protection forbids two-wide start adjacent to a stair',()=>{
 for(const d of cardinal)for(const upper of [false,true]){
  const s=makeScenario(d,upper);
  const outbound=upper?d:{dx:-d.dx,dz:-d.dz};
  s.allowed.delete(K({x:s.landing[0].x+outbound.dx,
   z:s.landing[0].z+outbound.dz}));
  const r=planTwoWide(s);
  assert.equal(r.status,'NO_TWO_WIDE_FIRST_TWO_ROWS');
  assert.deepEqual(r.addedCells,[]);
 }
});
test('sealed corridor cannot falsely claim to reach a disjoint existing gallery',()=>{
 const s=makeScenario({dx:1,dz:0},true);
 for(let z=0;z<20;z++)s.allowed.delete('13,'+z);
 const r=planTwoWide(s);
 assert.equal(r.status,'NO_2_WIDE_GALLERY_PATH');
 assert.deepEqual(r.addedCells,[]);
});
test('geometry-only smoke test never creates a Minecraft BuildPlan',()=>{
 const s=makeScenario({dx:0,dz:1},false),r=planTwoWide(s);
 assert.equal(r.status,'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE');
 assert.equal(r.physical3DBodyClearanceCertified,false);
 assert.equal(r.doorSwingAndFurnitureVerified,false);
 assert.equal(Object.hasOwn(r,'worldCoordinates'),false);
 assert.equal(Object.hasOwn(r,'BuildPlan'),false);
 assert.equal(Object.hasOwn(r,'operations'),false);
});
