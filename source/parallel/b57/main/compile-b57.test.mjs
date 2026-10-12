import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB57FromSource} from './run-b57.mjs';
import {compileB57,verifyB57} from './compile-b57.mjs';
import {renderB57} from './render-b57.mjs';
const DIR=path.dirname(fileURLToPath(import.meta.url));
const {report,b53,b56}=buildB57FromSource();
const clone=x=>structuredClone(x),sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function resign(o){let {reportSha256,...body}=o;o.reportSha256=sha(body);return o;}
function mutateB53(f){let x=clone(b53);f(x);return resign(x);}
function mutateB56(f){let x=clone(b56);f(x);return resign(x);}
function fail53(f,pattern=/B57_/){assert.throws(()=>compileB57(mutateB53(f),b56),pattern);}
function fail56(f,pattern=/B57_/){assert.throws(()=>compileB57(b53,mutateB56(f)),pattern);}

test('baseline 5 buildings and 30 floors independently rasterized',()=>{assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);});
test('B53 snapshot+ B56 source admission SHA captured',()=>{assert.equal(report.provenance.b53ReportSha256,b53.reportSha256);assert.equal(report.provenance.b56ReportSha256,b56.reportSha256);});
test('floor 12778 and roof 2228 exactly covered',()=>{assert.equal(report.totals.floorCells,12778);assert.equal(report.totals.roofCells,2228);});
test('facade 3022 precise edge set with no omission/extra',()=>{assert.equal(report.totals.facadeEdges,3022);assert.equal(report.totals.facadeMissing,0);assert.equal(report.totals.facadeExtra,0);});
test('all six levels compare roof to difference of floor masks',()=>{assert.equal(report.totals.roofProjectionDifferences,0);for(const b of report.buildings)assert.ok(b.levels.every(x=>x.roofProjectionDifference===0));});
test('courtyard boundaries identified without confusing them with exterior',()=>{assert.equal(report.totals.enclosedVoidFacadeEdges,360);assert.equal(report.buildings[1].totals.enclosedVoidEdges,360);});
test('all floors connected; local below-floor overhangs absent',()=>{assert.equal(report.totals.disconnectedFloorLevels,0);assert.equal(report.totals.localOverhangCells,0);});
test('15 review variants retain explicit nonphysical status',()=>{assert.equal(report.buildings.flatMap(b=>b.variants).length,15);for(const b of report.buildings)for(const v of b.variants){assert.equal(v.approved,false);assert.equal(v.entry.verifiedPhysicalPassage,false);assert.equal(v.rooftop.verifiedPhysicalSupport,false);}});
test('15 candidate top roof footprints geometrically inside top roof',()=>{assert.ok(report.buildings.every(b=>b.variants.every(v=>v.rooftop.coveredOnTopRoof)))});
test('15 candidate frontage strips are located on north wall boundary',()=>{assert.ok(report.buildings.every(b=>b.variants.every(v=>v.entry.northBoundaryCovered)))});
test('readiness stays NOT_PREPARED and 9 M4 gates blocked',()=>{assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');assert.equal(report.blockers.M4Gates.length,9);assert.ok(report.blockers.M4Gates.every(g=>g.status==='BLOCKED'));});
test('no operations, world contacts, Minecraft commands or scans',()=>{for(const k of ['engineCalls','minecraftCommands','worldContacts','scans'])assert.equal(report[k],0);assert.deepEqual(report.BuildPlan.operations,[]);});
test('produced snapshot exactly matches deterministic repeat and stored bytes',()=>{verifyB57(report,b53,b56);const stored=JSON.parse(fs.readFileSync(path.join(DIR,'B57_ENVELOPE_TOPOLOGY.json'),'utf8'));assert.deepEqual(stored,report);});
test('HTML is one self-contained file with no fetching scripts or external modules',()=>{let h=renderB57(report);assert.ok(h.includes('application/json'));assert.ok(h.includes(report.reportSha256));assert.ok(h.includes('NOT_PREPARED'));assert.ok(!/<script\s+src|<link\s+[^>]*href|\bfetch\(|XMLHttpRequest|WebSocket\(|minecraft\.execute/i.test(h));assert.equal(h,fs.readFileSync(path.join(DIR,'B57_OFFLINE_3D_REVIEW.html'),'utf8'));});
test('reject altered source hash before geometry review',()=>{let x=clone(b53);x.totals.floorCells++;assert.throws(()=>compileB57(x,b56),/SOURCE_HASH/);});
test('reject changed reported safety status',()=>fail53(x=>{x.readiness='READY';}));
test('reject upstream construction commands even with resigned hash',()=>fail53(x=>{x.BuildPlan.operations.push({action:'place'});}));
test('reject B56 M4 gate escalation',()=>fail56(x=>{x.blockers.M4Gates[0].status='PASS';}));
test('reject B56 fabricated production parity',()=>fail56(x=>{x.productionParity='VERIFIED';}));
test('reject moved floor rectangle outside site',()=>fail53(x=>{x.buildings[0].floorPlans[0].floor[0].x=70;}));
test('reject floor overlapping rectangles',()=>fail53(x=>{x.buildings[0].floorPlans[0].floor.push({...x.buildings[0].floorPlans[0].floor[0]});}));
test('reject displaced or missing roof coverage',()=>fail53(x=>{x.buildings[0].floorPlans[5].roof[0].x+=1;}));
test('reject duplicated facade marker',()=>fail53(x=>{const q=x.buildings[0].facade.strips[0];q.columns.push(clone(q.columns[0]));}));
test('reject facade segment removed without new coordinates',()=>fail53(x=>{const q=x.buildings[0].facade.strips[0].columns[0];q.original[0]=null;q.overlay[0]=null;q.edgeClasses[0]=null;}));
test('reject facade edge assigned to different face',()=>fail53(x=>{x.buildings[0].facade.strips[0].face='W';}));
test('reject falsified exterior/courtyard classification',()=>fail53(x=>{let q=x.buildings[1].facade.strips.flatMap(s=>s.columns).find(c=>c.edgeClasses.includes('ENCLOSED_VOID_EDGE'));const i=q.edgeClasses.indexOf('ENCLOSED_VOID_EDGE');q.edgeClasses[i]='OUTER_FOOTPRINT_EDGE';}));
test('reject graphics claiming real physical windows by invalid role',()=>fail53(x=>{x.buildings[0].facade.strips[0].columns[0].original[0]='REAL_GLASS';}));
test('reject facade role overlay smuggling a physical module',()=>fail53(x=>{x.buildings[0].facade.strips[0].columns[0].overlay[0]='BLOCK_COMMAND';}));
test('reject candidate signoff escalation',()=>fail53(x=>{x.buildings[0].variants[0].approved=true;}));
test('reject outside rooftop candidate',()=>fail53(x=>{x.buildings[0].variants[0].rooftop.x=99;}));
test('reject unsafe mutation of generated report even if hash updated',()=>{let x=clone(report);x.blockers.M4Gates[0].status='PASS';resign(x);assert.throws(()=>verifyB57(x,b53,b56),/REPORT_SAFETY/);});
test('reject forged zero missing count after deleting one facade section',()=>fail53(x=>{x.buildings[0].facade.strips[0].columns.splice(0,1);}));
