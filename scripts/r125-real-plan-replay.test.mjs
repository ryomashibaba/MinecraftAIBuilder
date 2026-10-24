import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileArchitecturePlan,auditArchitecturePlanCirculation}
 from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';

// Real-world Qwen14B semantic plan from user's October 24 OMEN pilot.
// User-supplied plan is stored byte-for-byte as JSON semantics; NO local LLM
// calls, no fabricated evidence, no Minecraft writes.
const real=JSON.parse(fs.readFileSync(new URL(
 './fixtures/r125-qwen14b-residential-2024a.json',import.meta.url),'utf8'));
test('replay real 14B 24x28 two-level plan exactly, with source/geometry hashes pinned',()=>{
 const result=compileArchitecturePlan(real);
 assert.equal(result.planSha256,
  '46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271');
 assert.equal(result.sourceSha256,
  '4ca2edf2eb066f2f0eecd7dfdc4a710a1e69bc7196c5f85c65483caaa0d9fbd1');
 assert.equal(result.geometrySha256,
  '0fc0db6814e105db62da272abb1235cce9d77d4950eab2a0e91d940283201a2e');
 assert.equal(result.compiled.primitives.length,2620);
 const oldGlobalLargest=525/1286;
 assert.ok(oldGlobalLargest<0.5); // previously incorrectly HIGH
 const crit=critiqueArchitecture({design:result.design,compiled:result.compiled});
 const elevations=crit.objectiveAudit.elevationConnectivity;
 assert.deepEqual(elevations.map(x=>[x.standingY,x.componentCount]),
  [[2,1],[7,1],[12,1]]);
 assert.equal(crit.objectiveAudit.largestComponentShare,0.4082);
 assert.deepEqual(crit.objectiveAudit.fragmentedElevations,[]);
 assert.equal(crit.findings.some(x=>x.id==='FRAGMENTED_PUBLIC_SOURCE_FLOORS'),false);
 assert.equal(crit.highRiskCount,0);
 const circulation=auditArchitecturePlanCirculation(result);
 assert.equal(circulation.status,'SOURCE_CLEARANCE_PROBES_PASS');
 assert.equal(circulation.stairFlights[0].clearSupportedTreads,5);
 assert.equal(circulation.levels.length,2);
 assert.equal(circulation.worldWalking,'NOT_TESTED');
 assert.equal(circulation.worldWrites,0);
});
