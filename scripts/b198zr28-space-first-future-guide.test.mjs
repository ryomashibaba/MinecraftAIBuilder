/** R28 prompt contract QA: no real model, no Ollama, no Minecraft. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';
import {R21_FUTURE_GUIDE,R21_FUTURE_GUIDE_SHA256}
 from '../source/ai/b198zr21-future-architecture-guide.mjs';
import {
 R28_ADDITIONAL_GUIDE,R28_ADDITIONAL_GUIDE_SHA256,
 R28_SPACE_FIRST_GUIDE,R28_SPACE_FIRST_GUIDE_SHA256,
 R28_FROZEN_R21_SHA256,R28_ACTIVATION_STATUS,
 inspectR28Advisory
} from '../source/ai/b198zr28-space-first-future-guide.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
test('R28 extends R21 exactly, never edits frozen R11/R21 guide hashes',()=>{
 assert.equal(sha(R11_COMPACT_GUIDE),R11_GUIDE_SHA256);
 assert.equal(sha(R21_FUTURE_GUIDE),R21_FUTURE_GUIDE_SHA256);
 assert.equal(R28_FROZEN_R21_SHA256,R21_FUTURE_GUIDE_SHA256);
 assert.equal(R28_SPACE_FIRST_GUIDE,R21_FUTURE_GUIDE+'\n'+R28_ADDITIONAL_GUIDE);
 assert.equal(sha(R28_ADDITIONAL_GUIDE),R28_ADDITIONAL_GUIDE_SHA256);
 assert.equal(sha(R28_SPACE_FIRST_GUIDE),R28_SPACE_FIRST_GUIDE_SHA256);
});
test('R28 addresses observed five CUT materials, shell, zone and entry failures',()=>{
 for(const term of [
  'CUT MUST omit','base-shell','solid ADD box','headroom 2 or 3',
  'minimumReachablePositions','minimumReachablePercent',
  'z=45','z=44','landings','100%','fixed template'
 ])assert(R28_SPACE_FIRST_GUIDE.includes(term),term);
});
test('R28 candidate stays disconnected from live model and Minecraft',()=>{
 const d=inspectR28Advisory();
 assert.equal(R28_ACTIVATION_STATUS,'NOT_ENABLED');
 assert.equal(d.activationStatus,'NOT_ENABLED');
 assert.equal(d.doesNotAuthorizeAnyLocalModelCall,true);
 assert.equal(d.doesNotAlterHistoricalPromptProfiles,true);
 assert.equal(d.modelCalls,0);
 assert.equal(d.worldContacts,0);
 assert.equal(d.worldWrites,0);
 assert.equal(d.safety.readiness,'NOT_PREPARED');
 assert.equal(d.safety.gates.length,9);
 assert(d.safety.gates.every(g=>g==='BLOCKED'));
 assert.deepEqual(d.safety.BuildPlan.operations,[]);
});
