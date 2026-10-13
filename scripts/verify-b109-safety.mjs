/** B109 no-construction proof for exact-cell merged review-only architecture. */
import assert from 'node:assert/strict';
import {compileB109,validateB109Report} from '../source/parallel/b109/main/compile-b109.mjs';
import {validateB109Scene} from '../source/parallel/b109/main/b109-surface-model.mjs';
const all=compileB109(),r=all.report,m=r.totals;
assert(validateB109Report(r));
assert.equal(r.readiness,'NOT_PREPARED');
assert.equal(r.constructionApproved,false);
assert.equal(r.executionAllowed,false);
assert.equal(r.worldContacts,0);
assert.equal(r.worldCoordinates,null);
assert.equal(r.gates.length,9);
assert(r.gates.every(g=>g.status==='BLOCKED'));
assert.equal(r.BuildPlan.status,'NOT_PREPARED');
assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.BuildPlan.worldCoordinates,null);
assert.deepEqual(r.BuildPlan.operations,[]);
assert.equal(m.variants,15);
assert.equal(m.conceptFloors,66);
assert.equal(m.rooms,279);
assert.equal(m.legacyUnapproved,296);
assert.equal(m.legacyHeld,18);
assert.equal(m.approvedPhysicalRooms,0);
assert.equal(m.physicallyValidMinecraftWindows,0);
assert.equal(m.verifiedEducationBlockStates,0);
assert.equal(m.worldContacts,0);
assert(m.savedPrimaryDrawingPrimitives>0);
for(let i=0;i<15;i++)assert(validateB109Scene(all.surfaces[i],
 all.parent.bundle.baseScenes[i],all.parent.bundle.polishScenes[i],
 all.parent.refined[i]));
console.log('PASS B109: 15 exact-source cohesive surface reviews; zero world contact or approval; 9 gates BLOCKED');
