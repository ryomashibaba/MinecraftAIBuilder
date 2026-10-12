import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {safe} from '../../b79/main/compile-b79.mjs';
import {corridorConnectivity,auditShaftCandidate,exploreR013Shafts,planCoreCorridorBypasses,validateB95} from './b95-shaft-audit.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const report=JSON.parse(fs.readFileSync(path.join(here,'B95_VERTICAL_CORE_SLAB_AUDIT_REPORT.json')));
const b94=JSON.parse(fs.readFileSync(path.join(root,'parallel/b94/main/B94_BUILDING_COMPOSITION_REPORT.json')));
const b93=JSON.parse(fs.readFileSync(path.join(root,'parallel/b93/main/B93_ALTERNATE_PROGRAMME_REPORT.json')));
function synthetic({glass=false,slab=false,protectedSite=false,extraRoom=false,withCore=true}={}){
 const sections=[1,2,3].map(level=>({id:`unit/L${level}`,level,floorMaskRows:Array(10).fill('1'.repeat(10)),
  conceptRooms:[{id:'held',x:3,z:3,width:2,depth:2},...(extraRoom?[{id:'preserved',x:4,z:4,width:2,depth:2}]:[])],
  conceptReservations:{corridors:Array.from({length:9},(_,x)=>({x,z:5})),stairs:withCore?[{x:0,z:6}]:[],elevators:[]}}));
 const indices=new Map(sections.map(s=>[s.id,{final:new Map()}])),fixedBySection=new Map(sections.map(s=>[s.id,{solids:new Set(),reserved:new Set(),protectedSites:new Set()}])),heldBySection=new Map(sections.map(s=>[s.id,['held']]));
 if(glass)indices.get('unit/L2').final.set('3,6,3',{occupied:true,role:'glass',block:'minecraft:glass'});
 if(slab)for(const s of sections)indices.get(s.id).final.set(`3,${(s.level-1)*5},3`,{occupied:true,role:'floor',block:'minecraft:basalt'});
 if(protectedSite)fixedBySection.get('unit/L1').protectedSites.add('3,3');
 return {sections,indices,fixedBySection,heldBySection};
}
test('B95 report safety hash and read-only gates',()=>{safe(report,'minecraftaibuilder-b95-vertical-core-slab-corridor-audit-v1');assert.equal(validateB95(report),true)});
test('Immutable B94 and B93 report hashes',()=>{assert.equal(report.provenance.b94,b94.reportSha256);assert.equal(report.provenance.b93,b93.reportSha256)});
test('B95 reviewed exact historical 314/296/18, no approvals',()=>{assert.deepEqual([report.totals.originalNominalRooms,report.totals.priorUnapprovedCandidates,report.totals.heldRooms,report.totals.approvedNewRooms],[314,296,18,0])});
test('Read-only fixed two production replays',()=>{assert.deepEqual(report.replayed.map(r=>r.building).sort(),['apartment/candidate-01','office/candidate-01'].sort());assert.ok(report.replayed.every(r=>r.verifiedReadOnly))});
test('B94 origin shaft, 6 floors, 5 interfaces',()=>{const s=report.verticalAudit.selected;assert.deepEqual([s.x,s.z,s.width,s.depth,s.slices.length,s.interFloorGaps.length],[24,18,2,2,6,5])});
test('Existing original shaft floor basalt detected 4 cells x six floors',()=>{const s=report.verticalAudit.selected;assert.equal(s.counts.allProductionVoxelContacts,24);for(const t of s.slices){assert.equal(t.productionContactCount,4);assert.ok(t.productionContacts.every(c=>c.dy===0&&c.role==='floor'&&c.block==='minecraft:basalt'))}});
test('Interfloor slab boundaries need review, never executed',()=>{const s=report.verticalAudit.selected;assert.equal(s.counts.interFloorProductionCutRequests,20);assert.deepEqual(s.interFloorGaps.map(g=>g.productionCutCount),Array(5).fill(4));assert.ok(s.interFloorGaps.every(g=>!g.slabCutApproved&&g.operations.length===0))});
test('No false claim of shaft/body or stair certification',()=>{const s=report.verticalAudit.selected;assert.equal(s.counts.headroomContacts,0);assert.equal(s.shaftConstructible,false);assert.equal(s.allDesignAndConstructionApprovalsGranted,false);assert.equal(s.needSlabEngineering,true)});
test('B94 shaft intersects no other room or glass or 296',()=>{const s=report.verticalAudit.selected;assert.equal(s.counts.nonHeldRoomFootprintContacts,0);assert.equal(s.counts.hardGlassContacts,0);assert.equal(s.counts.prior296Reservations,0);assert.equal(s.affectedHeldRoomIds.length,6)});
test('Nominal corridor and actual-core reachability impact measured',()=>{const s=report.verticalAudit.selected;assert.equal(s.counts.nominalCorridorCellsRepurposed,18);assert.equal(s.counts.physicallyReachableCorridorSitesLostOutsideFootprint,12);assert.ok(s.slices.every(f=>f.outsideCorridorDisconnectedFromCore===2))});
test('All 100 nearby alternative shape evaluations remain unapproved',()=>{assert.equal(report.verticalAudit.trialCount,100);assert.ok(report.verticalAudit.trialOutcomes.every(r=>!r.approved))});
test('Alternatives that intersect glass are rejected, even if corridor remains intact',()=>{const r=report.verticalAudit.trialOutcomes.find(t=>t.x===24&&t.z===19&&t.width===2&&t.depth===2);assert.equal(r.reviewClass,'REJECT_PROTECTED_GEOMETRY');assert.ok(r.counts.hardGlassContacts>0)});
test('All floor bypass proposals are unapproved and non-world actions',()=>{assert.equal(report.shaftBypassFloors.length,6);assert.ok(report.shaftBypassFloors.every(f=>f.operations.length===0&&f.worldCoordinates===null&&f.localBypasses.every(x=>!x.approved)))});
test('Floor one has two physically-clear conceptual bypasses',()=>{const f=report.shaftBypassFloors[0];assert.equal(f.reachableProposals,2);assert.equal(f.conceptBudgetProposals,2);assert.ok(f.localBypasses.some(x=>x.convertedHeldRooms.includes('F1-R013')))});
test('Floors two through six still lack protected-free bypasses',()=>{assert.deepEqual(report.shaftBypassFloors.slice(1).map(f=>f.unresolved),[2,2,2,2,2])});
test('Four remediation patterns preserve all 18 held rooms',()=>{assert.deepEqual(report.remediationPatterns.map(p=>[p.pattern,p.roomCount]),[['apartment:R006',4],['apartment:R012',4],['apartment:R013',6],['office:R004',4]])});
test('R006 remains long detour and R012 requires room grid rethink',()=>{assert.match(report.remediationPatterns[0].direction,/LONG_DETOUR/);assert.match(report.remediationPatterns[1].direction,/NEW_ROOM_GRID/)});
test('Fake report with gate unblocked rejected',()=>{const r=structuredClone(report);r.gates[0].status='PASS';assert.equal(validateB95(r),false)});
test('Fake report with construction allowed rejected',()=>{const r=structuredClone(report);r.BuildPlan.operations.push({type:'fill'});assert.equal(validateB95(r),false)});
test('Synthetic protected prior room footprint excluded',()=>{const p=synthetic({extraRoom:true});const r=auditShaftCandidate({...p,x:3,z:3,width:2,depth:2});assert.equal(r.designReviewClass,'REJECT_PROTECTED_GEOMETRY');assert.ok(r.counts.nonHeldRoomFootprintContacts>0)});
test('Synthetic glass/height obstruction excluded',()=>{const p=synthetic({glass:true});const r=auditShaftCandidate({...p,x:3,z:3});assert.equal(r.designReviewClass,'REJECT_PROTECTED_GEOMETRY');assert.ok(r.counts.hardGlassContacts>0)});
test('Synthetic preserved reserved site excluded',()=>{const p=synthetic({protectedSite:true});const r=auditShaftCandidate({...p,x:3,z:3});assert.equal(r.designReviewClass,'REJECT_PROTECTED_GEOMETRY');assert.ok(r.counts.prior296Reservations>0)});
test('Synthetic slab requests are unapproved despite empty body',()=>{const p=synthetic({slab:true});const r=auditShaftCandidate({...p,x:3,z:3});assert.equal(r.counts.headroomContacts,0);assert.ok(r.counts.interFloorProductionCutRequests>0);assert.equal(r.shaftConstructible,false)});
test('Synthetic no floor crossing still cannot imply stair certification',()=>{const p=synthetic();const r=auditShaftCandidate({...p,x:3,z:3});assert.equal(r.counts.allProductionVoxelContacts,0);assert.equal(r.shaftConstructible,false)});
test('Synthetic opening alternative enumeration includes larger 3x3 geometries',()=>{const p=synthetic();const r=exploreR013Shafts(p,{x:3,z:3,radius:0});assert.equal(r.trialCount,4);assert.ok(r.trialOutcomes.some(v=>v.width===3&&v.depth===3));assert.equal(r.verifiedNewCoreStairs,0)});
test('Synthetic no detached original corridor reachability',()=>{const p=synthetic();const c=corridorConnectivity({section:p.sections[0],idx:p.indices.get('unit/L1'),fixed:p.fixedBySection.get('unit/L1')});assert.equal(c.certifiedEmergencyEgress,false);assert.ok(Array.isArray(c.physicalNamedCorridorKeySet))});
test('Synthetic bypass never adds built operations',()=>{const p=synthetic();const v=planCoreCorridorBypasses({section:p.sections[0],idx:p.indices.get('unit/L1'),fixed:p.fixedBySection.get('unit/L1'),heldRoomIds:['held'],shaft:[{x:4,z:5},{x:5,z:5}]});assert.deepEqual(v.operations,[]);assert.equal(v.allFullyApproved,false)});
test('Top-roof blackstone makes roof penetration a separate unapproved gate',()=>{const roof=report.verticalAudit.selected.roofBoundary;assert.equal(roof.productionContacts.length,4);assert.ok(roof.productionContacts.every(p=>p.block==='minecraft:blackstone'&&!p.roofModificationApproved));assert.equal(roof.roofChangeApproved,false)});
test('All successful first-floor detours need programme and circulation signoff',()=>{const a=report.shaftBypassFloors[0].localBypasses.filter(b=>b.resolved);assert.ok(a.every(b=>b.physicalTwoHighAirOnly&&b.requiresNewWallsAndLegalAccessReview&&b.routeDoesNotCertifyEmergencyEgress))});
