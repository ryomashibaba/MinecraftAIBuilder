import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {reconcileB76,stageDoor,stageStair,verifyCatalogShapes,VALID_CANDIDATE_STATE_KEYS} from './compile-b76.mjs';
import {buildB72} from '../../b72/main/run-b72.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const report=JSON.parse(fs.readFileSync(path.join(here,'B76_STAGING_REPORT.json')));
const b75=JSON.parse(fs.readFileSync(path.resolve(here,'../../b75/main/B75_RECONCILIATION_REPORT.json')));
const {report:b72,b65,b66,b70}=buildB72();
const official=report.officialOfflineReplay;
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const build=()=>reconcileB76({b75,b72,b65,b66,b70,official});
test('B76 report hash and construction prohibited',()=>{
 const {reportSha256,...body}=report;assert.equal(sha(body),reportSha256);
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);
 assert.equal(report.gates.length,9);assert.ok(report.gates.every(x=>x.status==='BLOCKED'));
 assert.equal(report.BuildPlan.commandCount,0);assert.deepEqual(report.BuildPlan.operations,[]);assert.equal(report.worldContacts,0);
});
test('actual production hotel slab has full 3,120 floor cells',()=>{
 const h=report.buildings.find(x=>x.id==='hotel/candidate-01');assert.ok(h);assert.equal(h.floorMask.matched,3120);
 assert.equal(h.floorMask.delta,0);assert.equal(h.source,'B76_REPLAYED_ACTUAL_OFFLINE_PLANNER');assert.equal(report.officialOfflineReplay.hotelPlannerActuallyCalled,true);
 assert.equal(h.requiresExplicitCrossProgramDesignReview,true);assert.equal(h.programPresetListed,false);
});
test('other four still use B75 verified choices, no hidden redesign',()=>{
 for(const old of b75.results.filter(x=>!x.id.startsWith('hotel'))){const s=report.buildings.find(x=>x.id===old.id);assert.equal(s.seed,old.candidate.seed);assert.equal(s.massing,old.candidate.massing);assert.deepEqual(s.floorMask,old.candidate.comparison);}
});
test('314 doors have supported nominal floor and hallway and a cardinal direction',()=>{
 assert.equal(report.doors.length,314);assert.equal(report.counts.doorPortsWithFootprintAndHallwaySupport,314);
 assert.ok(report.doors.every(x=>x.footprintAndCorridorSupport===true&&['north','east','south','west'].includes(x.nominalNormal)));
});
test('door profiles include both vertical halves but no hinge/placement permission',()=>{
 for(const d of report.doors){assert.equal(d.blockStateTemplate.id,'minecraft:spruce_door');assert.equal(d.blockStateTemplate.lower.upper_block_bit,false);assert.equal(d.blockStateTemplate.upper.upper_block_bit,true);assert.equal(d.hinge,'UNDECIDED');assert.equal(d.verifiedForPlacement,false);assert.equal(d.emitAllowed,false);}
});
test('25 stair links preserve nominal reservations and physical gates',()=>{
 assert.equal(report.stairLinks.length,25);assert.equal(report.counts.stairLinksWithNominalFootprintSupport,25);
 for(const s of report.stairLinks){assert.ok(s.verticalXZOverlapCells>0);assert.equal(s.emitAllowed,false);assert.equal(s.headroom,'NOT_CHECKED');assert.equal(s.upperFloorOpening,'NOT_CUT');}
});
test('out-of-original-mask corridors and potential facade edge counts are explicitly kept',()=>{
 assert.equal(report.counts.sourceOutOfMaskCorridorReservationsHeld,18);
 assert.equal(report.counts.nominalWallBoundariesPotentiallyTouchingFacade,706);
 assert.equal(report.counts.physicalFacadeCollisionsVerified,0);
});
test('exact official block state keys are verified in collected catalog',()=>{
 const list=fs.readFileSync(path.resolve(here,'../../b75/main/evidence/Blocks.md'));
 assert.equal(verifyCatalogShapes(list),true);assert.equal(VALID_CANDIDATE_STATE_KEYS['minecraft:spruce_door'].length,4);
});
test('tampered official door catalog entry is rejected',()=>{
 const list=fs.readFileSync(path.resolve(here,'../../b75/main/evidence/Blocks.md'),'utf8');
 assert.throws(()=>verifyCatalogShapes(list.replace('| minecraft:spruce_door |','| minecraft:spruce_door_backup |')),/B76_BLOCK_CATALOG_CHANGED/);
});
test('door normal mismatch is rejected instead of guessing orientation',()=>{
 const d=b65.sections[0].openingPorts[0];const s=b66.sections[0];const rows=s.floorMaskRows.map(r=>Uint8Array.from([...r].map(Number)));
 assert.throws(()=>stageDoor({...d,normal:{dx:0,dz:0}},rows,s.conceptReservations,1),/B76_PORT_NORMAL/);
});
test('door supported by an unsupported external mask is not staged as supported',()=>{
 const d=b65.sections[0].openingPorts[0],s=b66.sections[0];const rows=s.floorMaskRows.map(r=>Uint8Array.from([...r].map(Number)));
 rows[d.hallCell.z][d.hallCell.x]=0;assert.equal(stageDoor(d,rows,s.conceptReservations,1).footprintAndCorridorSupport,false);
});
test('stair lower/upper ID mismatch fails closed',()=>{
 const l=b65.nominalVerticalLinks[0],lo=b66.sections.find(s=>s.id===l.lowerSection),hi=b66.sections.find(s=>s.id===l.upperSection);
 const masks=s=>s.floorMaskRows.map(r=>Uint8Array.from([...r].map(Number)));
 assert.throws(()=>stageStair({...l,upperSection:'wrong'},lo,hi,masks(lo),masks(hi)),/B76_VERTICAL_LINK/);
});
test('changed B75 frozen source digest fails closed',()=>{
 const fake=structuredClone(b75);fake.results[0].candidate.seed=17;
 assert.throws(()=>reconcileB76({b75:fake,b72,b65,b66,b70,official}),/B76_B75_REPORT_INTEGRITY/);
});
test('unverified real Planner evidence fails closed',()=>{
 assert.throws(()=>reconcileB76({b75,b72,b65,b66,b70,official:{...official,hotelPlannerActuallyCalled:false}}),/B76_HOTEL_PRODUCTION_EVIDENCE/);
});
test('consistency compilation deterministic with report',()=>{
 const x=build();assert.deepEqual(x.counts,report.counts);assert.deepEqual(x.buildings,report.buildings);
 assert.deepEqual(x.doors,report.doors);assert.deepEqual(x.stairLinks,report.stairLinks);
});
