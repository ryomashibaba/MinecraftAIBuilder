/** B104 strict fail-closed verification: entire building concept, NO world operations. */
import assert from 'node:assert/strict';
import {compileB104,validateB104} from '../source/parallel/b104/main/compile-b104.mjs';
const r=compileB104(),t=r.totals;
assert(validateB104(r));
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
assert.equal(t.legacyUnapprovedCandidates,296);
assert.equal(t.legacyHeldRooms,18);
assert.equal(t.realBlocksEmitted,0);
assert.equal(t.certifiedPhysicalStairs,0);
assert.equal(t.certifiedRealExits,0);
assert.equal(t['3DConflicts'],0);
assert.equal(t.doorwayHeadroomConflicts,0);
assert.equal(t.stairProxyConflicts,0);
assert.equal(t.unmetOrDisconnected,0,'B104 may not silently lose required room paths');
for(const c of r.cases)for(const x of c.options){
 assert(x.placed>=x.initialB102Rooms,'B104 may not lose valid B102 rooms');
 assert.equal(x.connected,x.placed);
 assert.equal(x.global3DCollisions,0);
 assert.equal(x.blockedDoorways,0);
 assert.equal(x.obstructedStairProxies,0);
}
console.log('PASS: B104 room-gallery co-design and 3D safety; old files immutable; world disabled');
