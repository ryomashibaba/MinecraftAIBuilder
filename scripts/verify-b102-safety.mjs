/** B102 offline safety audit, B100/B101 baselines unchanged. */
import assert from 'node:assert/strict';
import {compileB102,validateB102} from '../source/parallel/b102/main/compile-b102.mjs';
const r=compileB102();
assert.equal(validateB102(r),true);
assert.equal(r.targetEdition,'MINECRAFT_EDUCATION');
assert.equal(r.javaAdapter,'NOT_IMPLEMENTED');
assert.equal(r.readiness,'NOT_PREPARED');
assert.equal(r.constructionApproved,false);
assert.equal(r.executionAllowed,false);
assert.equal(r.worldContacts,0);
assert.equal(r.BuildPlan.status,'NOT_PREPARED');
assert.deepEqual(r.BuildPlan.operations,[]);
assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.BuildPlan.worldCoordinates,null);
assert.equal(r.gates.length,9);
assert(r.gates.every(g=>g.status==='BLOCKED'));
assert.equal(r.totals.existing296UnapprovedRooms,296);
assert.equal(r.totals.existing18HeldRooms,18);
assert.equal(r.totals.realBlocksEmitted,0);
assert.equal(r.totals.bedrockDoorsBuilt,0);
assert.equal(r.totals.stairsVerified,0);
assert.equal(r.totals.worldContacts,0);
assert.equal(r.totals.unmetRequirements,r.totals.requestedRooms-r.totals.newConceptualRooms);
for(const c of r.cases)for(const v of c.options){
 assert.equal(v.collisionCount,0,'B102 synthetic envelopes must not collide');
 assert.equal(v.conceptualDoorAirPass,v.placedUnits,'Each new conceptual room must have clear 2-high passage to conceptual corridor');
}
console.log('PASS: B102 all geometry invariants; no world; 9 gates blocked; historic 296+18 untouched');
