import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildB70FromSource} from './run-b70.mjs';
import {compileB70,verifyB70} from './compile-b70.mjs';
const {report,b65,b66,b68,b69}=buildB70FromSource();
const clone=x=>structuredClone(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rehash=x=>{delete x.reportSha256;x.reportSha256=digest(x);return x;};
test('B70 produces complete nonexecuting nominal floor classification',()=>{
 assert.equal(verifyB70(report,b65,b66,b68,b69),true);
 assert.equal(report.summary.floorMaskCells,12778);
 assert.equal(report.summary.floorCandidateCells,10776);
 assert.equal(report.summary.totalCellsHeld,2002);
 assert.equal(report.summary.generatedFloorRuns,4402);
 assert.equal(report.summary.constructionCommands,0);
});
test('provenance chains to the unchanged B65/B66/B68/B69 reports',()=>{
 for(const x of ['b65','b66','b68','b69'])assert.equal(report.provenance[x+'ReportSha256'],({b65,b66,b68,b69})[x].reportSha256);
 assert.equal(report.integration.productionSourceFilesReceived,0);
});
test('every masked nominal floor cell appears in exactly one run and no exterior cell is invented',()=>{
 for(let i=0;i<b66.sections.length;i++){
  const s=b66.sections[i],p=report.sections[i],cover=new Set();
  for(const run of p.floorRuns){
   assert.ok(run.fromX<run.toXExclusive);
   assert.equal(run.emissionProhibited,true);
   for(let x=run.fromX;x<run.toXExclusive;x++){
    const k=`${x},${run.z}`;
    assert.equal(s.floorMaskRows[run.z][x],'1');
    assert.equal(cover.has(k),false);cover.add(k);
   }
  }
  const mask=s.floorMaskRows.join('').split('1').length-1;
  assert.equal(cover.size,mask);
 }
});
test('unclassified, stair and lift region cells stay held and no floor block is emitted',()=>{
 assert.equal(report.summary.unassignedCellsHeld,1444);
 assert.equal(report.summary.stairCellsHeld,288);
 assert.equal(report.summary.elevatorCellsHeld,270);
 for(const s of report.sections){
  assert.equal(s.counts.unknown+s.counts.stair+s.counts.elevator,s.heldCells);
  assert.equal(s.actualFloorBlocks,0);assert.equal(s.actualStairBlocks,0);
 }
});
test('18 out-of-footprint corridor reservations are not included in the candidate geometry',()=>{
 assert.equal(report.sourceConflicts.outsideReferenceFloorCorridorReservations.length,18);
 assert.equal(report.sourceConflicts.outsideReferenceFloorCorridorReservations.every(x=>x.sectionId.startsWith('office/candidate-02/')),true);
 for(const off of report.sourceConflicts.outsideReferenceFloorCorridorReservations){
  const s=report.sections.find(s=>s.id===off.sectionId);
  assert.equal(s.floorRuns.some(r=>r.z===off.z&&r.fromX<=off.x&&off.x<r.toXExclusive),false);
  assert.equal(off.authorization,'HOLD_NO_FOOTPRINT_EXTENSION');
 }
});
test('all 314 nominal door connections retain room and corridor supporting floor classification',()=>{
 assert.equal(report.summary.unresolvedDoorFloorSupports,0);
 assert.equal(b65.sections.reduce((n,s)=>n+s.openingPorts.length,0),314);
});
test('25 vertical reservations maintain identical nominal stair cells, with no stairs created',()=>{
 assert.equal(report.summary.nominalVerticalReservationsChecked,25);
 const m=new Map(report.sections.map(s=>[s.id,s]));
 for(const l of b65.nominalVerticalLinks)assert.deepEqual(m.get(l.lowerSection).stairReservationKeys,m.get(l.upperSection).stairReservationKeys);
 assert.equal(report.summary.actualStairBlocks,0);
});
test('NOT_PREPARED, nine blocked gates and zero operations are nonnegotiable',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.executionAllowed,false);
 assert.equal(report.constructionApproved,false);assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.gates.length,9);assert.ok(report.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 assert.equal(report.BuildPlan.worldCoordinates,null);assert.deepEqual(report.BuildPlan.materialIds,[]);
 assert.equal(report.engineCalls,0);assert.equal(report.worldContacts,0);assert.equal(report.scans,0);
 assert.equal(report.integration.engineAdapterImplemented,false);
});
test('report reconstructs deterministically and matches serialized artifact',()=>{
 assert.deepEqual(compileB70(b65,b66,b68,b69),report);
 const disk=JSON.parse(readFileSync(new URL('./B70_FLOOR_REGION_CANDIDATES.json',import.meta.url)));
 assert.deepEqual(disk,report);
});
test('reject any forged approval in an inherited report',()=>{
 const v=rehash(Object.assign(clone(b65),{executionAllowed:true}));
 assert.throws(()=>compileB70(v,b66,b68,b69),/B70_INHERITED_SAFETY/);
});
test('reject geometry mutation in B66, including fake world geometry',()=>{
 const v=rehash(clone(b66));v.sections[0].floorMaskRows[0]='0'+v.sections[0].floorMaskRows[0].slice(1);
 assert.throws(()=>compileB70(b65,v,b68,b69),/B69_B66_SOURCE|B70_B69_SOURCE/);
});
test('reject rehashed but unapproved B66 mask changes',()=>{
 const v=clone(b66);v.sections[0].floorMaskRows[0]='0'+v.sections[0].floorMaskRows[0].slice(1);rehash(v);
 assert.throws(()=>compileB70(b65,v,b68,b69),/B70_B69_SOURCE|B69_B66_SOURCE/);
});
test('reject any inherited altered or fabricated B69 geometry',()=>{
 const v=clone(b69);v.sections[0].records[0].solidY=[];rehash(v);
 assert.throws(()=>compileB70(b65,b66,b68,v),/B69_NONDETERMINISTIC_REPORT/);
});
test('reject altered readiness in a recomputed B70 report',()=>{
 const v=clone(report);v.executionAllowed=true;
 assert.throws(()=>verifyB70(v,b65,b66,b68,b69),/B70_REPLAY/);
});
test('reject forging success claims for real physical floors',()=>{
 const v=clone(report);v.claims.constructionReady=true;
 assert.throws(()=>verifyB70(v,b65,b66,b68,b69),/B70_REPLAY/);
});
