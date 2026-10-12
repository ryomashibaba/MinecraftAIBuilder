import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB58FromSource} from './run-b58.mjs';
import {compileB58,verifyB58} from './compile-b58.mjs';
const {report,b57,b42}=buildB58FromSource(), clone=structuredClone;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function resign(x){let {reportSha256,...body}=x;x.reportSha256=digest(body);return x;}
function mut57(f){const x=clone(b57);f(x);return resign(x);}
function mut42(f){const x=clone(b42);f(x);return resign(x);}
function reject57(f,regex=/B58_/){assert.throws(()=>compileB58(mut57(f),b42),regex);}
function reject42(f,regex=/B58_/){assert.throws(()=>compileB58(b57,mut42(f)),regex);}
const apt=report.buildings.find(b=>b.id==='apartment/candidate-01');
test('replay original inputs deterministically',()=>assert.deepEqual(compileB58(b57,b42),report));
test('report verification uses replay',()=>assert.equal(verifyB58(report,b57,b42),true));
test('saved B58 output matches replay',()=>assert.deepEqual(JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'B58_VERTICAL_CORE_REPORT.json'),'utf8')),report));
test('source pinning B57/B42',()=>{assert.equal(report.provenance.b57ReportSha256,b57.reportSha256);assert.equal(report.provenance.b42ReportSha256,b42.reportSha256);});
test('five buildings thirty nominal levels',()=>{assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);});
test('five building six-floor common cells',()=>{assert.equal(report.buildings.length,5);for(const b of report.buildings){assert.equal(b.site.levels,6);assert.ok(b.commonFloorCells>0);}});
test('independent common vertical footprint total',()=>assert.equal(report.totals.commonVerticalFootprintCells,1956));
test('all three tested nominal sizes available without inventing dimensions',()=>{assert.ok(report.buildings.every(b=>b.sharedCoreSearch.map(x=>x.size).join(',')==='2,3,4'));});
test('two-by-two core positions are subset of nominal shared floor footprint',()=>assert.equal(report.totals.candidateTwoByTwoSharedCorePositions,1724));
test('larger core footprints have no more options',()=>{for(const b of report.buildings){const n=b.sharedCoreSearch.map(x=>x.fullySharedOptions);assert.ok(n[0]>=n[1]&&n[1]>=n[2]);}});
test('all top core positions are local, bounded and unapproved',()=>{for(const b of report.buildings)for(const s of b.sharedCoreSearch)for(const c of s.topThree){assert.ok(c.x>=0&&c.x+c.size<=b.site.width);assert.ok(c.z>=0&&c.z+c.size<=b.site.depth);assert.equal(c.approved,false);}});
test('all 15 entrance profile distances have no physical passage certificate',()=>{assert.equal(report.totals.entranceToCoreReviews,15);for(const b of report.buildings)for(const e of b.entranceToCommonCore){assert.equal(e.partitionWallDoorsStairsAndClearancesVerified,false);assert.ok(e.closestSharedTwoByTwoCore?.nominalGroundFootprintSteps>=0);}});
test('B42 archive is only apartment, exactly five review transitions',()=>{assert.equal(apt.id,'apartment/candidate-01');assert.equal(report.legacyStairAudit.totals.transitions,5);});
test('B42 upper-floor mask 398 vs B57 400',()=>{for(const t of report.legacyStairAudit.transitions){assert.equal(t.b42CandidateUpperFloorCells,398);assert.equal(t.canonicalUpperFloorCells,400);}});
test('two known B42-vs-B57 differences in each transition, upper-floor proxy',()=>{for(const t of report.legacyStairAudit.transitions){assert.deepEqual(t.cellsPresentInB57MissingFromB42,[{x:13,z:18},{x:14,z:18}]);assert.deepEqual(t.cellsPresentInB42MissingFromB57,[]);assert.equal(t.b42SourceInterchangeParity,'DIFFERENT');}});
test('five B42 connectors geometrically remain inside B57 floor',()=>{assert.equal(report.legacyStairAudit.totals.routePointsOutsideCanonical,0);for(const t of report.legacyStairAudit.transitions){assert.deepEqual(t.upperConnectorRouteOutsideB57Floor,[]);assert.equal(t.upperLandingCoveredByB57,true);}});
test('historical stair geometry remains unverified and never auto-merged',()=>{assert.equal(report.legacyStairAudit.physicalStairPassageVerified,false);assert.match(report.legacyStairAudit.safetyInterpretation,/NEVER_AUTOMERGE/);});
test('baseline safety NOT_PREPARED all nine BLOCKED',()=>{assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.blockers.M4Gates.length,9);assert.ok(report.blockers.M4Gates.every(g=>g.status==='BLOCKED'));});
test('construction execution and world access impossible by report contract',()=>{assert.deepEqual(report.BuildPlan.operations,[]);for(const k of ['engineCalls','worldContacts','minecraftCommands','scans'])assert.equal(report[k],0);assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);});
test('production parity never claimed',()=>{assert.equal(report.productionFacadeParity,'UNVERIFIED');assert.equal(report.physicalQuality,'UNKNOWN');});
test('reject mutated B57 digest',()=>{const x=clone(b57);x.readiness='READY';assert.throws(()=>compileB58(x,b42),/B58_SOURCE_HASH/);});
test('reject forged B57 approval with recalculated hash',()=>reject57(x=>x.executionAllowed=true));
test('reject forged B57 facade parity',()=>reject57(x=>x.productionFacadeParity='VERIFIED'));
test('reject any B57 blocked-gate escalation',()=>reject57(x=>x.blockers.M4Gates[3].status='PASS'));
test('reject injected B57 build operation',()=>reject57(x=>x.BuildPlan.operations.push({command:'build'})));
test('reject a missing B57 building',()=>reject57(x=>x.buildings.pop()));
test('reject fabricated extra B57 levels',()=>reject57(x=>x.buildings[0].site.floors=7));
test('reject B57 overlapping rectangles',()=>reject57(x=>x.buildings[0].preview.levels[0].floorRectangles.push({...x.buildings[0].preview.levels[0].floorRectangles[0]})));
test('reject B57 displaced floor rectangle',()=>reject57(x=>x.buildings[0].preview.levels[0].floorRectangles[0].x=99));
test('reject entry outside north boundary',()=>reject57(x=>x.buildings[0].variants[0].entry.start=100));
test('reject falsified entry frontage check',()=>reject57(x=>x.buildings[0].variants[0].entry.northBoundaryCovered=false));
test('reject B42 forged readiness',()=>reject42(x=>x.readiness='READY'));
test('reject B42 execution allowed',()=>reject42(x=>x.safety.executionAllowed=true));
test('reject B42 added placement',()=>reject42(x=>x.BuildPlan.operations.push({action:'place'})));
test('reject B42 fake planner-compatibility',()=>reject42(x=>x.interface.outputCompatibleWithRuntimePlanner=true));
test('reject B42 transition renamed',()=>reject42(x=>x.transitions[0].transition='L3_L4'));
test('reject B42 candidate floor row modified without count',()=>reject42(x=>x.transitions[0].floorMask.candidateFloorRows[0]='?'+x.transitions[0].floorMask.candidateFloorRows[0].slice(1)));
test('reject B42 floor count mismatch',()=>reject42(x=>x.transitions[0].floorMask.candidateOccupiedCells++));
test('reject B42 landing placed outside B57 canonical',()=>reject42(x=>x.transitions[0].corridor.upperLanding.x=500));
test('reject recomputed hash of altered result with safety escalation',()=>{let x=clone(report);x.blockers.M4Gates[0].status='PASS';resign(x);assert.throws(()=>verifyB58(x,b57,b42),/OUTPUT_SAFETY/);});
test('reject forged result with changed plausible nominal cell count',()=>{let x=clone(report);x.totals.commonVerticalFootprintCells++;resign(x);assert.throws(()=>verifyB58(x,b57,b42),/REPLAY/);});
