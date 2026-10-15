/** Reuse the single tested report. No repeated assembly and no game calls. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateB113} from '../source/parallel/b113/main/compile-b113.mjs';
const r=JSON.parse(fs.readFileSync('b113-review-output/B113_Compatibility_Diagnostics.json','utf8'));
assert(validateB113(r));
assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);assert.equal(r.commandCount,0);
assert.equal(r.gates.length,9);assert(r.gates.every(g=>g.status==='BLOCKED'));
assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);
assert.equal(r.totals.legacyUnapproved,296);assert.equal(r.totals.legacyHeld,18);
assert(r.blockRoles.every(x=>x.educationStatus==='UNVERIFIED'&&!x.executable));
assert.equal(r.totals.educationVerifiedBlockStates,0);assert.equal(r.totals.physicallyCertifiedBuildings,0);
console.log('PASS B113: non-contact evidence, source-pinned diagnostics; 9 BLOCKED; operations=[]; worldContacts=0');
