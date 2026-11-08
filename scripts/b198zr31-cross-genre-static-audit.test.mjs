/** R31 offline fixture tests: no Ollama, Qwen, network or Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {R30_ADDITIONAL_GUIDE,R30_GENERALIZED_GUIDE,R30_GUIDE_SHA256}
 from '../source/ai/b198zr30-generalized-space-guide.mjs';
import {auditR31CrossGenre,R31_GENRES}
 from '../source/ai/b198zr31-cross-genre-static-audit.mjs';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');

test('R31 frozen R30 covers 10 general contracts across 6 dissimilar briefs',()=>{
 const a=auditR31CrossGenre();
 assert.equal(a.status,'STATIC_SCENARIO_COVERAGE_PASS_NOT_MODEL_PROOF');
 assert.equal(a.frozenR30Unmodified,true);
 assert.equal(sha(R30_GENERALIZED_GUIDE),R30_GUIDE_SHA256);
 assert.equal(a.staticChecksCovered,10);
 assert.equal(a.staticChecksTotal,10);
 assert.equal(a.scenarioCount,6);
 assert.equal(a.r27FailureMappingCount,10);
 assert.equal(a.r30ClauseCount,10);
 assert.deepEqual(a.contradictoryInstructionFlags,[]);
 assert(R31_GENRES.some(g=>g.routePattern==='ring'));
 assert(R31_GENRES.some(g=>g.routePattern==='branching-bridge'));
 assert(a.scenarios.every(g=>g.checks.every(c=>c.covered)));
 assert(a.scenarios.every(g=>!g.generatedGeometryExamined));
});
test('R31 fails if multi-route flexibility is deleted',()=>{
 const mutated=R30_ADDITIONAL_GUIDE.replace('ONE or MANY routes','one route');
 const a=auditR31CrossGenre({additionalGuide:mutated});
 assert.equal(a.status,'HOLD_STATIC_GUIDE_CONTRACT');
 assert(a.staticChecks.some(c=>c.id==='MULTIPLE_ROUTES'&&!c.covered));
 assert.equal(a.frozenR30Unmodified,false);
});
test('R31 flags explicit single-route-only contradiction even with positive text retained',()=>{
 const a=auditR31CrossGenre({additionalGuide:
  R30_ADDITIONAL_GUIDE+'\nYou must use exactly one route.'});
 assert.equal(a.status,'HOLD_STATIC_GUIDE_CONTRACT');
 assert(a.contradictoryInstructionFlags.includes('SINGLE_ROUTE_REQUIRED'));
});
test('R31 flags prohibited loops and forced fixed floorplans',()=>{
 const a=auditR31CrossGenre({additionalGuide:
  R30_ADDITIONAL_GUIDE+'\nNever allow loops. Always use the same layout.'});
 assert.equal(a.status,'HOLD_STATIC_GUIDE_CONTRACT');
 assert(a.contradictoryInstructionFlags.includes('LOOPS_PROHIBITED'));
 assert(a.contradictoryInstructionFlags.includes('FIXED_TEMPLATE_REQUIRED'));
 assert(a.scenarios.every(g=>g.hardcodedLayoutRequirementDetected));
});
test('R31 rejects CUT material requirement and historical entrance coordinate leakage',()=>{
 const a=auditR31CrossGenre({additionalGuide:
  R30_ADDITIONAL_GUIDE+'\nCUT must include material. Entrance z=44.'});
 assert.equal(a.status,'HOLD_STATIC_GUIDE_CONTRACT');
 assert(a.contradictoryInstructionFlags.includes('CUT_REQUIRES_MATERIAL'));
 assert(a.contradictoryInstructionFlags.includes('HISTORICAL_COORDINATES'));
});
test('R31 preserves strict no-inference and no-world construction gates',()=>{
 const a=auditR31CrossGenre();
 assert.equal(a.activation,'NOT_ENABLED');
 assert.equal(a.r25OriginalStatus,'HOLD');
 assert.equal(a.modelCalls,0);
 assert.equal(a.worldContacts,0);
 assert.equal(a.worldWrites,0);
 assert.equal(a.modelQualityImprovementProven,false);
 assert.equal(a.safety.readiness,'NOT_PREPARED');
 assert(a.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(a.safety.BuildPlan.operations,[]);
});
