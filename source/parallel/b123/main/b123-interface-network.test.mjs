import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileB123StairInterfaces} from './b123-interface-network.mjs';
const P=(x,z)=>({x,z}),K=p=>p.x+','+p.z;
function fixture(){
 const source=new Set([P(0,0),P(0,1),P(1,0),P(1,1)].map(K));
 const staged=new Set();
 for(let x=2;x<=5;x++)for(let z=0;z<=1;z++)staged.add(K(P(x,z)));
 const stairs=[
  {stairIndex:0,fromLevel:0,toLevel:1,
   lowerLanding:[P(-1,0),P(-1,1)],upperLanding:[P(-1,0),P(-1,1)]},
  {stairIndex:1,fromLevel:0,toLevel:1,
   lowerLanding:[P(6,0),P(6,1)],upperLanding:[P(6,0),P(6,1)]}];
 return {sourceByLevel:[new Set(source),new Set(source)],
  stagedByLevel:[new Set(staged),new Set(staged)],
  removedByLevel:[new Set(),new Set()],newByLevel:[new Set(),new Set()],
  stairInterfaces:stairs,replacedStairIndex:0,
  replacementLandings:{lowerLanding:stairs[0].lowerLanding,
   upperLanding:stairs[0].upperLanding}};
}
test('unmodified 2-wide source/staged network roots both lanes for both stairs',()=>{
 const r=reconcileB123StairInterfaces(fixture());
 assert.equal(r.status,'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY');
 assert.equal(r.stairCount,2);
 assert.equal(r.interfaceRecords[1].before.LOWER,true);
 assert.equal(r.interfaceRecords[1].before.UPPER,true);
 assert.equal(r.replacedTargetBothRooted,true);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.allOtherStairPhysicalConnectionsCertified,false);
});
test('removing a two-lane B114 bridge exposes a previously rooted second stair',()=>{
 const a=fixture();
 for(let z=0;z<=1;z++)a.removedByLevel[0].add(K(P(3,z)));
 const r=reconcileB123StairInterfaces(a);
 assert.equal(r.status,'HOLD_NETWORK_RECONNECTION_REVIEW');
 assert.equal(r.otherStairRegressionCount,1);
 assert.deepEqual(r.regressions[0],{stairIndex:1,lostSides:['LOWER']});
 assert.equal(r.previouslyRootedOtherInterfaceSidesLost,1);
});
test('adding back the other-side route recovers a disconnected staged branch',()=>{
 const a=fixture();
 for(let z=0;z<=1;z++) {
  a.removedByLevel[0].add(K(P(3,z)));
  a.newByLevel[0].add(K(P(3,z)));
 }
 const r=reconcileB123StairInterfaces(a);
 assert.equal(r.otherStairRegressionCount,0);
 assert.equal(r.status,'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY');
});
test('a single lane without the second adjacent corridor lane cannot count as connected',()=>{
 const a=fixture();
 a.stairInterfaces[1].lowerLanding=[P(6,0),P(6,3)];
 assert.throws(()=>reconcileB123StairInterfaces(a),/B123_INVALID_LANDING_TWO_LANES/);
 const b=fixture();
 b.stagedByLevel[0].delete(K(P(5,1)));
 const r=reconcileB123StairInterfaces(b);
 assert.equal(r.interfaceRecords[1].before.LOWER,false);
});
test('immutable source removal and deletion outside staged cells must throw',()=>{
 const a=fixture();a.stagedByLevel[0].add(K(P(1,0)));
 a.removedByLevel[0].add(K(P(1,0)));
 assert.throws(()=>reconcileB123StairInterfaces(a),/B123_IMMUTABLE_SOURCE_RETRACTION/);
 const b=fixture();b.removedByLevel[0].add(K(P(900,1)));
 assert.throws(()=>reconcileB123StairInterfaces(b),/B123_RETRACTION_OUTSIDE_STAGED_RESERVATIONS/);
});
test('duplicate stair identities and missing target are rejected',()=>{
 const a=fixture();
 a.stairInterfaces[1].stairIndex=0;
 assert.throws(()=>reconcileB123StairInterfaces(a),/B123_STAIR_INVENTORY_NOT_UNIQUE/);
 const b=fixture();b.replacedStairIndex=20;
 assert.throws(()=>reconcileB123StairInterfaces(b),/B123_STAIR_INVENTORY_NOT_UNIQUE/);
});
