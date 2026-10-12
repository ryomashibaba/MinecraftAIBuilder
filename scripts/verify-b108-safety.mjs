/** B108 fail-closed safety: source B107/B106/B105 remains unmodified. */
import assert from 'node:assert/strict';
import {compileB108,validateB108Report} from '../source/parallel/b108/main/compile-b108.mjs';
import {validateB108Scene} from '../source/parallel/b108/main/b108-fidelity.mjs';
const b=compileB108(),r=b.report;
assert(validateB108Report(r));
assert.equal(r.safety,'NOT_PREPARED');
assert.equal(r.constructionApproved,false);
assert.equal(r.worldContacts,0);
assert.equal(r.worldCoordinates,null);
assert.equal(r.BuildPlan.status,'NOT_PREPARED');
assert.deepEqual(r.BuildPlan.operations,[]);
assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.BuildPlan.worldCoordinates,null);
assert.equal(r.nineGates.length,9);
assert(r.nineGates.every(g=>g.status==='BLOCKED'));
assert.equal(r.createdWorldBlocks,0);
assert.equal(r.certifiedEducationStates,0);
assert.equal(r.physicalRoofCertified,false);
assert.equal(r.humanAestheticsReviewed,false);
for(let i=0;i<15;i++)assert(validateB108Scene(
 b.refined[i],b.bundle.baseScenes[i],b.bundle.polishScenes[i]));
console.log('PASS B108: 15 new facade/roof review geometries safely anchored, nine gates blocked, zero Minecraft actions');
