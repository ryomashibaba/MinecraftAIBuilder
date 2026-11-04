import test from 'node:test';
import assert from 'node:assert/strict';
import {MEZZANINE_SCHEMA,MEZZANINE_SYSTEM_PROMPT,
 compileMezzanineAuthorIntent} from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';

const originalAuthor=sample=>({
 ...structuredClone(sample.heightAuthor),schema:MEZZANINE_SCHEMA,
 mezzanine:structuredClone(sample.mezzanine)
});

test('V4H precise nested window author instructions preserve one response, never host-repair',()=>{
 const prompt=MEZZANINE_SYSTEM_PROMPT;
 assert.match(prompt,/EACH covered space must include windowPriority/);
 assert.match(prompt,/precisely four UNIQUE compass direction strings/);
 assert.match(prompt,/north, east, south and west/);
 assert.match(prompt,/EACH sky space must set windowPriority:null/);
 assert.match(prompt,/host will not insert, reorder/);
 assert.match(prompt,/One model POST maximum/);
 assert.match(prompt,/No world writes/);
});

test('V4H rejects a delimiter-collapsed root key rather than relying on downstream failure',()=>{
 const value=originalAuthor(syntheticFiveAuthorMezzanineCases()[0]);
 const merged=structuredClone(value);
 delete merged.id;
 delete merged.massing;
 merged['id|massing']='not-two-valid-keys';
 assert.throws(()=>compileMezzanineAuthorIntent(merged),
  /R125_V4H_MEZZANINE_AUTHOR_ONE_COMPLETE_JSON_AND_EXPLICIT_FUNCTIONAL_LEVEL/);
 assert.notDeepEqual(merged,value);
});

test('V4H rejects a delimiter-collapsed mezzanine author key with no fallback',()=>{
 const value=originalAuthor(syntheticFiveAuthorMezzanineCases()[0]);
 const merged=structuredClone(value);
 delete merged.mezzanine.side;
 delete merged.mezzanine.stairLane;
 merged.mezzanine['side|stairLane']='north';
 assert.throws(()=>compileMezzanineAuthorIntent(merged),
  /R125_V4H_MEZZANINE_AUTHOR_ONE_COMPLETE_JSON_AND_EXPLICIT_FUNCTIONAL_LEVEL/);
});

test('V4H five genuine fixture SOURCE compiles keep the 9 frozen world gates',()=>{
 for(const original of syntheticFiveAuthorMezzanineCases()){
  const author=originalAuthor(original),frozen=structuredClone(author);
  const result=compileMezzanineAuthorIntent(author);
  assert.deepEqual(author,frozen);
  assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(result.authoredMezzanineSourceWitness.connectedUpperProgram.reachedFromEntrance,true);
  assert.equal(result.authoredMezzanineSourceWitness.connectedPublicService.reachableFromEntrance,true);
  assert.equal(result.worldContacts,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.constructionApproved,false);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.readiness,'NOT_PREPARED');
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.BuildPlan.operations,[]);
  assert.equal(result.humanArt,'NOT_REVIEWED');
  assert.equal(result.minecraftWalking,'NOT_TESTED');
 }
});
