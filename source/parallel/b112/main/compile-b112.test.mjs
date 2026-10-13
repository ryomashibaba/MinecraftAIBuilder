import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assembleB112,writeB112} from './compile-b112.mjs';
import {buildB112Audit,validateB112Audit} from './b112-readiness-audit.mjs';
const cache={};
const all=()=>cache.value??(cache.value=assembleB112());
const clone=x=>structuredClone(x);
test('01 B112 latest cross-stage SHA backed report validates',()=>assert(validateB112Audit(all().report)));
test('02 all 15 original building choices are retained',()=>assert.equal(all().report.cases.length,15));
test('03 no duplicate building IDs across the three source stages',()=>{
 const ids=all().report.cases.map(x=>x.id);
 assert.equal(new Set(ids).size,15);
});
test('04 five typologies present',()=>{
 const set=new Set(all().report.cases.map(x=>x.typology));
 assert.deepEqual([...set].sort(),['apartment','hotel','house','library','office']);
});
test('05 total 66 concept floors conserved',()=>assert.equal(all().report.totals.levels,66));
test('06 original 279 B111 room records conserved',()=>assert.equal(all().report.totals.rooms,279));
test('07 original 279 B110 door candidates conserved',()=>assert.equal(all().report.totals.doorCandidates,279));
test('08 ground level exit openings remain recorded',()=>assert.equal(all().report.totals.exteriorOpenings,30));
test('09 all 102 vertical core links retained',()=>assert.equal(all().report.totals.conceptualStairLinks,102));
test('10 stair tread diagrams counted as diagrams, not working stairs',()=>{
 const r=all().report;
 assert.equal(r.totals.stairDiagrams,612);
 assert.equal(r.totals.traversablePhysicalStairs,0);
});
test('11 all 558 B105 furniture anchors conserved',()=>assert.equal(all().report.totals.furnitureAnchors,558));
test('12 all 300 two-cell bed proposals remain strictly conceptual',()=>{
 const r=all().report;
 assert.equal(r.totals.twoCellBedProposals,300);
 assert.equal(r.totals.installedDoors,0);
});
test('13 room pass+room warning always sum to source 279 rooms',()=>{
 const t=all().report.totals;assert.equal(t.roomPathPasses+t.roomLayoutProblems,279);
});
test('14 original roof cap source has 9203 cells',()=>assert.equal(all().report.totals.sourceRoofCells,9203));
test('15 original B109 glass source has 3134 cells',()=>assert.equal(all().report.totals.sourceWindowCells,3134));
test('16 visual panels are review geometry and fewer than roof cells',()=>{
 const t=all().report.totals;
 assert(t.visualRoofPanels>0&&t.visualRoofPanels<t.sourceRoofCells);
});
test('17 every source stage contributes 15 correctly formed integrity digests',()=>{
 const r=all().report;assert.equal(r.provenance.inheritedB111ModelSha256.length,15);
 for(const c of r.cases)for(const id of ['b109Digest','b110Digest','b111Digest'])
 assert.match(c.evidence[id],/^[0-9a-f]{64}$/);
});
test('18 no certified Minecraft Education BlockState or installed object',()=>{
 const t=all().report.totals;
 assert.equal(t.educationVerifiedBlockStateCount,0);
 assert.equal(t.finishedPhysicalRooms,0);
 assert.equal(t.installedDoors,0);
});
test('19 all nine source construction gates remain BLOCKED',()=>{
 const r=all().report;assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
});
test('20 zero world contact and zero executable operation paths',()=>{
 const r=all().report;
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
 assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.BuildPlan.status,'NOT_PREPARED');
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.BuildPlan.commandCount,0);
});
test('21 historical 296 unapproved and 18 held remain in original status',()=>{
 const t=all().report.totals;
 assert.equal(t.legacyUnapproved,296);
 assert.equal(t.legacyHeld,18);
});
test('22 B113 Work phase is explicitly separate from this B112 stage',()=>{
 const r=all().report;
 assert.equal(r.futureWork.next,'B113_USE_LOCAL_WORK_PROJECT');
 assert.equal(r.futureWork.promptPreparedNextChat,true);
 assert.equal(r.futureWork.taskList.length,6);
});
test('23 Work must separately approve even read-only Minecraft world contact',()=>{
 const r=all().report;
 assert.equal(r.futureWork.worldConnectionExplicitlyProhibited,true);
 assert.equal(r.futureWork.newGameContactRequiresUserApproval,true);
 assert.equal(r.futureWork.physicalInstallationRequiresSeparateUserApproval,true);
});
test('24 no invented exact installed Education version or physical collision proof',()=>{
 const e=all().report.evidenceLevels;
 assert.equal(e.minecraftEditionBlockStates,'UNVERIFIED');
 assert.equal(e.physicalDoorPlacement,'NOT_TESTED');
 assert.equal(e.physicallyTraversableStairFlight,'NOT_TESTED');
 assert.equal(e.physicalBedAndFurnitureCollisions,'NOT_TESTED');
});
test('25 a forged source visual digest fails the report integrity check',()=>{
 const f=clone(all().report);
 f.cases[0].evidence.b109Digest='0'.repeat(64);
 assert.equal(validateB112Audit(f),false);
});
test('26 a forged construction approval fails even if hash not updated',()=>{
 const r=clone(all().report);
 r.constructionApproved=true;
 assert.equal(validateB112Audit(r),false);
});
test('27 source mismatch or forged parent input must fail closed',()=>{
 assert.throws(()=>buildB112Audit({},null,{}),/UNSAFE/);
});
test('28 export produces JSON, CSV, Japanese explanation and Work checkpoint',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b112-'));
 try{
  const output=writeB112(all(),dir);
  assert.equal(output.buildings,15);
  assert.equal(output.conceptRooms,279);
  const rows=fs.readFileSync(output.matrixPath,'utf8').trim().split('\n');
  assert.equal(rows.length,16);
  assert.equal(JSON.parse(fs.readFileSync(output.reportPath,'utf8')).cases.length,15);
  const handoff=fs.readFileSync(output.handoffPath,'utf8');
  assert(handoff.includes('B113'));
  assert(handoff.includes('worldContacts=0'));
  assert(handoff.includes('GitHub'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('29 the Work handoff names no unapproved probe/world connection',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b112-hand-'));
 try{
  const files=writeB112(all(),dir);
  const md=fs.readFileSync(files.handoffPath,'utf8');
  assert(md.includes('事前'));
  assert(md.includes('施工'));
  assert(md.includes('承認'));
  assert(!md.includes('authorizationToken='));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('30 tampered B112 report cannot be exported to Work',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b112-bad-'));
 try{
  const s=clone(all());s.report.worldContacts=1;
  assert.throws(()=>writeB112(s,dir),/UNSAFE_EXPORT/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
