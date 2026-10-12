/** B106 high assurance guard; runs offline and never connects to Minecraft.
 * Enforces that browser visual previews cannot grant construction permission.
 */
import assert from 'node:assert/strict';
import {assembleB106,validateB106Report} from '../source/parallel/b106/main/compile-b106.mjs';
import {validateB106Scene,auditB106Registry} from '../source/parallel/b106/main/b106-review-scene.mjs';
const {report:r,scenes}=assembleB106(),t=r.totals;
assert(validateB106Report(r));
assert.equal(r.targetEdition,'MINECRAFT_EDUCATION');
assert.equal(r.readiness,'NOT_PREPARED');
assert.equal(r.executionAllowed,false);
assert.equal(r.constructionApproved,false);
assert.equal(r.worldContacts,0);
assert.deepEqual(r.BuildPlan.operations,[]);
assert.equal(r.BuildPlan.status,'NOT_PREPARED');
assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.BuildPlan.worldCoordinates,null);
assert.equal(r.gates.length,9);
assert(r.gates.every(g=>g.status==='BLOCKED'));
assert.equal(t.variants,15);
assert.equal(t.conceptualLevels,66);
assert.equal(t.conceptualRooms,279);
assert.equal(t.connectedRooms,279);
assert.equal(t.oldUnapprovedCandidates,296);
assert.equal(t.oldHeldRooms,18);
assert.equal(t.physicallyFinishedRooms,0);
assert.equal(t.visualHumanApprovedVariants,0);
assert.equal(t.versionPinnedVerifiedBlockStates,0);
assert.equal(t.worldContacts,0);
assert.equal(t.blockCommands,0);
assert.equal(scenes.length,15);
for(const scene of scenes){
 assert(validateB106Scene(scene),'No altered or false 3D scene');
 assert.equal(scene.worldContacts,0);
 assert.equal(scene.constructionApproved,false);
 assert.deepEqual(scene.BuildPlan.operations,[]);
 assert.equal(scene.stats.allRoofGaps,0);
 assert.equal(scene.stats.interiorPathObstructions,0);
 assert.equal(scene.stats.conceptRooms,scene.stats.connectedRooms);
 const audit=auditB106Registry(scene);
 assert.equal(audit.versionPinnedVerifiedStates,0);
 assert.equal(audit.certifiedRealBlocks,0);
}
console.log('PASS: B106 15 self-contained review scenes, nine gates blocked, no world I/O, zero Education blockstate certifications');
