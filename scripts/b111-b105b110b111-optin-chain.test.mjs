/**
 * Actual-node native integration (requires an official GitHub repository checkout).
 * We deliberately do NOT vendor, alter, or fake any B100-B111 production source.
 * This is a research test, not part of protected CI or a Minecraft operation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {B101_SCENARIOS} from '../source/parallel/b101/main/compile-b101.mjs';
import {coDesignB104} from '../source/parallel/b104/main/b104-joint-layout.mjs';
import {generateB105} from '../source/parallel/b105/main/b105-building-volume.mjs';
import {tryB105B110B111TwoWideOptIn} from './b111-b105b110b111-optin-chain.mjs';

const preserved=()=>JSON.parse(fs.readFileSync(
 new URL('../source/parallel/b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));

test('15 B100 designs regenerate opt-in B105, genuine B110 and genuine B111 without altering canonical geometry',()=>{
 const frozen=preserved(),sourceSha=JSON.stringify(frozen);
 assert.equal(frozen.architectureCases.length,5);
 const outcomes=[];
 for(const group of frozen.architectureCases){
  const programme=B101_SCENARIOS[group.caseId];
  assert(programme);
  for(const authorChoice of group.options){
   const design=coDesignB104(authorChoice,programme),originalB105=generateB105(design);
   const baseDesign=JSON.stringify(design),baseB105=JSON.stringify(originalB105);
   const result=tryB105B110B111TwoWideOptIn(design,originalB105);
   assert.equal(result.status,'UNADOPTED_REGENERATED_B105_B110_B111_SOURCE_ONLY');
   assert.equal(result.summary.twoWideUnresolved,0);
   assert.equal(result.summary.oldSourceGeometryUnchanged,true);
   assert.equal(result.summary.actualMinecraftWalkingVerified,false);
   assert.equal(result.safety.constructionApproved,false);
   assert.equal(result.safety.worldWrites,0);
   assert.equal(result.safety.BuildPlan.operations.length,0);
   assert.equal(result.safety.gates.length,9);
   assert.equal(JSON.stringify(design),baseDesign);
   assert.equal(JSON.stringify(originalB105),baseB105);
   outcomes.push(result);
  }
 }
 const sum=k=>outcomes.reduce((s,o)=>s+o.summary[k],0);
 assert.equal(outcomes.length,15);
 assert.equal(sum('rooms'),279);
 assert.equal(sum('originalFixtureAnchors'),558);
 assert.equal(sum('reanchoredRooms'),9);
 assert.equal(sum('reanchoredFixtureCount'),18);
 assert.equal(sum('netFurniturePlaceholderMoves'),9);
 assert.equal(sum('twoWideDirect')+sum('twoWideByLegalOrientation'),279);
 assert.equal(JSON.stringify(frozen),sourceSha);
});
