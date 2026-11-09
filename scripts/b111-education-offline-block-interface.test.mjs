import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {B101_SCENARIOS} from '../source/parallel/b101/main/compile-b101.mjs';
import {coDesignB104} from '../source/parallel/b104/main/b104-joint-layout.mjs';
import {generateB105} from '../source/parallel/b105/main/b105-building-volume.mjs';
import {deriveB110Interfaces} from '../source/parallel/b110/main/b110-functional-interfaces.mjs';
import {modelB111Interiors} from '../source/parallel/b111/main/b111-interior-access.mjs';
import {auditB110OfflineEducationInterfaces} from './b111-education-offline-block-interface.mjs';
test('15 original building designs: real-source door/stair/bed candidate air, with zero physical certification',()=>{
 const original=JSON.parse(fs.readFileSync(new URL('../source/parallel/b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 const pinned=JSON.stringify(original),out=[];
 for(const g of original.architectureCases)for(const c of g.options){
  const d=coDesignB104(c,B101_SCENARIOS[g.caseId]);
  const v=generateB105(d),b110=deriveB110Interfaces(d,v);
  const b111=modelB111Interiors(d,b110);
  const before=JSON.stringify([d,v,b110,b111]);
  const r=auditB110OfflineEducationInterfaces(d,v,b110,b111);
  assert.equal(r.reference.installedEducation26_33StatesVerified,false);
  assert.equal(r.safety.worldWrites,0);
  assert.deepEqual(r.safety.BuildPlan.operations,[]);
  assert.equal(JSON.stringify([d,v,b110,b111]),before);
  out.push(r);
 }
 const sum=key=>out.reduce((n,x)=>n+x.summary[key],0);
 assert.equal(out.length,15);assert.equal(sum('conceptRooms'),279);
 assert.equal(sum('doorCandidates'),279);assert.equal(sum('stairLinks'),102);
 assert.equal(JSON.stringify(original),pinned);
 console.log('B110_OFFLINE_EDU_15_BUILDING_RESULT='+JSON.stringify({
  buildings:out.length,rooms:sum('conceptRooms'),doors:sum('doorCandidates'),
  doorsSourceClear:sum('doorsWithTwoHighSourceAir'),stairLinks:sum('stairLinks'),
  stairSourceClear:sum('stairLinksWithSourceHeadroom'),bedPairs:sum('bedPairs'),
  bedSourceClear:sum('bedPairsWithConceptualSourceClearance'),
  sourceHolds:sum('sourceHolds'),verifiedEducationBlocks:0,worldWrites:0}));
});
test('refuse unsourced data instead of fabricating Education compatibility',()=>{
 const bad={};assert.throws(()=>auditB110OfflineEducationInterfaces(bad,bad,bad,bad),/SOURCE_SAFETY/);
});