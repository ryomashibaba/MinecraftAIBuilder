import test from 'node:test';
import {createHash} from 'node:crypto';
const awaitImportHash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
import assert from 'node:assert/strict';
import {buildB69FromSource} from './run-b69.mjs';
import {compileB69,verifyB69} from './compile-b69.mjs';
const {report,b65,b66,b68}=buildB69FromSource();
const mutate=(o,f)=>{const c=structuredClone(o);f(c);return c;};
const section=()=>b65.sections[0], section3d=()=>b66.sections[0];
test('B69 deterministic replay and 16,484 solid slots / 628 empty door slots',()=>{
 assert.equal(verifyB69(report,b65,b66,b68),true);
 assert.equal(compileB69(b65,b66,b68).reportSha256,report.reportSha256);
 assert.equal(report.summary.solidVoxelPreviewSlots,16484);
 assert.equal(report.summary.emptyDoorPreviewSlots,628);
 assert.equal(report.summary.doorPaths,314);
 assert.equal(report.summary.verticalStairConnectionsReserved,25);
});
test('every door opening is empty in the nominal 2-layer standing plane',()=>{
 let doors=0;for(const s of report.sections){const solids=new Set();for(const x of s.records)for(const y of x.solidY)solids.add(`${x.u}/${y}/${x.v}`);
  for(const d of s.doorPaths){const ly=(s.level-1)*5;doors++;
   assert.ok(!solids.has(`${d.openingCentre.u}/${ly}/${d.openingCentre.v}`));
   assert.ok(!solids.has(`${d.openingCentre.u}/${ly+1}/${d.openingCentre.v}`));
   assert.ok(solids.has(`${d.openingCentre.u}/${ly+2}/${d.openingCentre.v}`));
   assert.equal(d.physicalPassageVerified,false);
  }}assert.equal(doors,314);
});
test('no real blocks, actual stairs, material IDs, world anchor, engine calls or commands',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.productionParity,undefined);
 assert.equal(report.integration.productionParity,'UNVERIFIED');assert.equal(report.executionAllowed,false);
 assert.equal(report.gates.length,9);assert.ok(report.gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.BuildPlan.commandCount,0);
 assert.equal(report.BuildPlan.worldCoordinates,null);assert.deepEqual(report.BuildPlan.materialIds,[]);
 assert.equal(report.engineCalls,0);assert.equal(report.worldContacts,0);assert.equal(report.scans,0);
 assert.ok(report.sections.every(s=>s.emissionProhibited&&s.realStairsBuilt===0&&s.realDoorsBuilt===0));
});
test('preserve exact B65 wall and opening identifiers with no loss',()=>{
 for(let i=0;i<b65.sections.length;i++){
  const a=b65.sections[i],p=report.sections[i];
  assert.deepEqual(p.records.map(r=>r.boundaryId),a.nominalWalls.map(r=>r.id));
  assert.deepEqual(new Set(p.doorPaths.map(r=>r.portId)),new Set(a.openingPorts.map(r=>r.id)));
 }
});
test('stairs are reservations only and align with B66, not generated',()=>{
 let total=0;for(let i=0;i<report.sections.length;i++){
  const s=report.sections[i];assert.deepEqual(s.stairReservedConceptCells,b66.sections[i].conceptReservations.stairs);
  total+=s.counts.stairReservationCells;
 }assert.equal(total,report.summary.stairReservationCells);
 assert.equal(report.claims.actualStaircaseGenerated,false);
});
test('reject if B65 is modified, even as an apparently innocent coordinate correction',()=>{
 const a=mutate(b65,x=>x.sections[0].nominalWalls[0].insideCell.x++);
 assert.throws(()=>compileB69(a,b66,b68),/B69_B65_SOURCE/);
});
test('reject if B66 preview geometry is tampered',()=>{
 const a=mutate(b66,x=>x.sections[0].virtualWallPanels[0].box[0]+=1);
 assert.throws(()=>compileB69(b65,a,b68),/B69_B66_SOURCE/);
});
test('reject if source receipt is claimed without a validated integration',()=>{
 const a=mutate(b68,x=>x.intake.found=5);
 assert.throws(()=>compileB69(b65,b66,a),/B69_B68_PRODUCTION_GATE/);
});
test('reject if B68 gate is flipped to READY',()=>{
 const a=mutate(b68,x=>x.guards.M4Gates[0].status='PASS');
 assert.throws(()=>compileB69(b65,b66,a),/B69_B68_PRODUCTION_GATE/);
});
test('reject if B65 tries to emit a construction operation',()=>{
 const a=mutate(b65,x=>x.BuildPlan.operations.push({command:'bad'}));
 assert.throws(()=>compileB69(a,b66,b68),/B69_B65_SOURCE/);
});
test('reject if B66 is marked executable',()=>{
 const a=mutate(b66,x=>x.executionAllowed=true);
 assert.throws(()=>compileB69(b65,a,b68),/B69_B66_SOURCE/);
});
test('reject if B65 or B66 lineage is inconsistent',()=>{
 const a=mutate(b66,x=>x.provenance.b65ReportSha256='0'.repeat(64));
 a.reportSha256='';// no fake signed trust
 assert.throws(()=>compileB69(b65,a,b68),/B69_B66_SOURCE/);
});
test('reject spoofed B65 wall count even if rehashed',()=>{
 const a=mutate(b65,x=>x.summary.nominalWallEdges=5703);
 delete a.reportSha256;
 a.reportSha256=(awaitImportHash(a));
 assert.throws(()=>compileB69(a,b66,b68),/B69_SOURCE_LINEAGE/);
});
test('reject changing a section order in signed B66',()=>{
 const a=mutate(b66,x=>x.sections.reverse());
 assert.throws(()=>compileB69(b65,a,b68),/B69_B66_SOURCE/);
});
test('reject tampered B69 final report',()=>{
 const a=mutate(report,x=>x.sections[0].records[0].solidY=[]);
 assert.throws(()=>verifyB69(a,b65,b66,b68),/B69_NONDETERMINISTIC_REPORT/);
});
test('reject any claim that physical building has been verified',()=>{
 const a=mutate(report,x=>x.claims.physicalConstructionValidated=true);
 assert.throws(()=>verifyB69(a,b65,b66,b68),/B69_NONDETERMINISTIC_REPORT/);
});
test('report is identical to saved B69 asset',async()=>{
 const {readFileSync}=await import('node:fs');
 const saved=JSON.parse(readFileSync(new URL('./B69_LOCAL_VOXEL_SHELL.json',import.meta.url),'utf8'));
 assert.deepEqual(saved,report);
});
