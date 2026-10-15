import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateB118Review} from './b118-fleet-review.mjs';
const r=JSON.parse(fs.readFileSync('b118-review-output/B118_Nine_Exit_Alternatives.json','utf8'));
test('15 buildings, 66 floors, 102 stairs, nine source-pinned held exits',()=>{
 assert(validateB118Review(r));
 assert.equal(r.totals.buildings,15);assert.equal(r.totals.conceptFloors,66);
 assert.equal(r.totals.sourceStairs,102);assert.equal(r.totals.originalHeldExits,9);
 assert.equal(r.cases.reduce((n,x)=>n+x.exits.length,0),9);
});
test('no fixed-landing concept is called a physically validated repair',()=>{
 for(const c of r.cases)for(const x of c.exits){
  assert.equal(x.physicalTraversalCertified,false);assert.equal(x.constructionBlocked,true);
  assert.equal(x.noSourceCellsModified,true);assert.equal(x.shiftHintsNotValidatedAsStairGeometry,true);
  for(const v of x.candidates){
   assert.equal(v.MinecraftWalkabilityCertified,false);
   if(v.possibleInScoped2DModel)
    assert.equal(v.sourceProxyStatus,'NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES');
  }
 }
});
test('relocation hints never silently shift old stairs',()=>{
 for(const c of r.cases)for(const x of c.exits)for(const s of x.conceptualShiftHints){
  assert.equal(s.notAnAvailableReplacementStair,true);
  assert.equal(s.requiresWholeStairGeometryRedesign,true);
  assert.equal(s.preservesOldLandingUntilApproval,true);
  assert.equal(s.physicalTraversalCertified,false);
 }
});
test('nine gates BLOCKED, BuildPlan empty and no world access',()=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.equal(r.commandCount,0);assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.gates.length,9);assert(r.gates.every(x=>x.status==='BLOCKED'));
});
test('all nine locations present in CSV and Japanese report',()=>{
 const csv=fs.readFileSync('b118-review-output/B118_Nine_Exit_Shortlist.csv','utf8');
 const md=fs.readFileSync('b118-review-output/B118_Nine_Exit_Review_JA.md','utf8');
 assert.equal(csv.trim().split('\n').length,10);
 assert(md.includes('NOT_PREPARED'));assert(md.includes('元のHOLDは維持'));
});
