import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {buildB51FromSource} from './run-b51.mjs';
import {entranceFootprintContract,rooftopFootprintContract,facadeRhythmContract,compileB51,verifyB51} from './compile-b51.mjs';
let ctx,report;
before(()=>{ctx=buildB51FromSource();report=ctx.report;});
const clone=structuredClone;
const invalid=(fn,regex)=>assert.throws(fn,new RegExp(regex));
const entr=(a=ctx.b49.buildings[0],g=ctx.b48.buildings[0],v=ctx.b50.buildings[0])=>entranceFootprintContract(a,g,v.entranceGraphicStudy);
const roof=(a=ctx.b49.buildings[0],g=ctx.b48.buildings[0],v=ctx.b50.buildings[0])=>rooftopFootprintContract(a,g,v.roofGraphicStudy);
const fac=(a=ctx.b49.buildings[0],v=ctx.b50.buildings[0])=>facadeRhythmContract(a,v);
const args=()=>[ctx.b50,ctx.b49,ctx.b48,ctx.b47,ctx.b46,ctx.b45,ctx.structure,ctx.main,ctx.evidence];
test('B51 integrates all five buildings and all 30 levels',()=>{assert.equal(report.totals.buildings,5);assert.equal(report.totals.levels,30);});
test('B51 keeps identical source facade units',()=>assert.equal(report.totals.facadeUnits,3022));
test('B51 source graphic columns and pairs are coherent',()=>{
 assert.equal(report.totals.graphicColumns,604);assert.equal(report.totals.stableAdjacentPairs,611);
 assert.equal(report.totals.changedAdjacentPairs,1807);
});
test('all 91 B49 entrance options are reviewed, with footprint rows',()=>{
 assert.equal(report.totals.entryOptionsReviewed,91);
 for(const b of report.buildings)for(const o of b.entranceFootprint.rankedLocalFootprintCandidates){
  assert.equal(o.inwardFootprintRows[0].spanCells,o.nominalWidth);
  assert.equal(o.inwardFootprintRows[0].coveredCells,o.nominalWidth);
  assert.ok(o.fullWidthInwardFootprintBands<=4);
  assert.equal(o.verifiedPassage,false);assert.equal(o.verifiedEgress,false);
 }
});
test('non-executing B49 horizontal roof options are conserved',()=>{
 assert.equal(report.totals.roofOptionsReviewed,91);assert.equal(report.totals.bufferedRoofOptions,91);
 assert.equal(report.totals.twoCellBufferedRoofOptions,0);
});
test('2D rooftop expansion searches beyond fixed-z B49 candidates',()=>{
 assert.equal(report.totals.expandedRoofPreviewCandidates,1464);
 assert.ok(report.buildings.some(b=>b.rooftopFootprint.independentlyExpanded2DEnvelope.candidatesWithTwoCellBuffer>0));
 for(const b of report.buildings){
  const e=b.rooftopFootprint.independentlyExpanded2DEnvelope;
  assert.ok(e.totalCandidates>=b.rooftopFootprint.candidateCount);
  assert.ok(e.topFiveLocalPreviewOptions.length<=5);
  assert.equal(e.productionPlannerPlacementMatched,false);
  assert.equal(e.actualModulesEmitted,0);
 }
});
test('2D rooftop expansion apartment thin roof does not invent 2-cell margins',()=>{
 const a=report.buildings.find(b=>b.id.startsWith('apartment/'));
 assert.equal(a.rooftopFootprint.independentlyExpanded2DEnvelope.candidatesWithTwoCellBuffer,0);
});
test('graphic rhythms never assert structure or production parity',()=>{
 for(const b of report.buildings){
  assert.equal(b.facadeRhythm.referencePlannerFacadeParity,false);
  assert.equal(b.facadeRhythm.physicalWallAndWindowContinuityVerified,false);
  assert.equal(b.facadeRhythm.sourceFloorCoverage.length,6);
  assert.equal(b.facadeRhythm.columnStacks.length,b.facadeRhythm.localColumns);
 }
});
test('B51 remains fully NOT_PREPARED with nine blocked preflight gates',()=>{
 assert.equal(report.readiness,'NOT_PREPARED');assert.equal(report.deployment,'BLOCKED');
 assert.equal(report.blockers.M4Gates.length,9);
 assert.ok(report.blockers.M4Gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(report.BuildPlan.operations,[]);
});
test('no materials coordinates commands or network runtime',()=>{
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.materialIds,[]);
 assert.equal(report.engineCalls,0);assert.equal(report.buildOperations,0);
 assert.equal(report.totals.runtimePlannerCalls,0);assert.equal(report.totals.minecraftCommands,0);
 assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);
});
test('built-in report replay reconstructs exactly',()=>assert.equal(verifyB51(report,...args()),true));
test('source and schema provenance bind to B50 and B49 hashes',()=>{
 assert.equal(report.provenance.b50ReportSha256,ctx.b50.reportSha256);
 assert.equal(report.provenance.b49ReportSha256,ctx.b49.reportSha256);
 assert.equal(report.scope.deployment,'FORBIDDEN');
});
test('runtime source remains callsite only (missing real composeFacade)',()=>{
 assert.equal(ctx.evidence.status,'CALLSITE_ONLY_NOT_IMPLEMENTATION_PARITY');
 assert.equal(report.provenance.productionSourceStatus,'MISSING_FUNCTION_BODIES_NO_PRODUCTION_PARITY');
});
test('entrance has valid recorded source floor geometry',()=>{assert.equal(entr().candidateCount,20);});
test('entrance rejects face swap and ungrounded alternatives',()=>{
 const a=clone(ctx.b49.buildings[0]);a.entranceReview.referenceFront.face='E';
 invalid(()=>entr(a),'ENTRANCE_INPUT');
});
test('entrance rejects wrong graphic start',()=>{
 const v=clone(ctx.b50.buildings[0]);v.entranceGraphicStudy.rankedAlternatives[0].start=-5;
 invalid(()=>entr(undefined,undefined,v),'ENTRANCE_GRAPHIC_DRIFT');
});
test('entrance rejects duplicate alternatives',()=>{
 const a=clone(ctx.b49.buildings[0]);a.entranceReview.alternatives.push(clone(a.entranceReview.alternatives[0]));
 invalid(()=>entr(a),'ENTRANCE_OPTIONS');
});
test('entrance rejects changed floor rectangles not matching canonical cell count',()=>{
 const g=clone(ctx.b48.buildings[0]);g.levels[0].canonical.floorRectangles[0].width--;
 invalid(()=>entr(undefined,g),'FLOOR_DRIFT');
});
test('entrance rejects fake physical egress verification',()=>{
 const v=clone(ctx.b50.buildings[0]);v.entranceGraphicStudy.architecturalEgressVerified=true;
 invalid(()=>entr(undefined,undefined,v),'ENTRANCE_INPUT');
});
test('roof rejects edited nominal width',()=>{
 const a=clone(ctx.b49.buildings[0]);a.roofTopReview.alternatives[0].width++;
 invalid(()=>roof(a),'ROOF_OPTION');
});
test('roof rejects a source roof cell removed while leaving candidate intact',()=>{
 const g=clone(ctx.b48.buildings[0]);g.levels.at(-1).canonical.roofRectangles=[];
 invalid(()=>roof(undefined,g),'ROOF_SURFACE_DRIFT');
});
test('roof rejects unapproved -> approved tamper',()=>{
 const a=clone(ctx.b49.buildings[0]);a.roofTopReview.alternatives[0].approved=true;
 invalid(()=>roof(a),'ROOF_OPTION');
});
test('roof rejects fake physical support verification',()=>{
 const v=clone(ctx.b50.buildings[0]);v.roofGraphicStudy.supportVerified=true;
 invalid(()=>roof(undefined,undefined,v),'ROOF_INPUT');
});
test('rhythm rejects visual role mismatch with source',()=>{
 const v=clone(ctx.b50.buildings[0]);v.facadeFloors[0].bayReview.bays[0].graphicIntent='INVALID';
 invalid(()=>fac(undefined,v),'FACADE_SOURCE_DRIFT');
});
test('rhythm rejects repeated bay geometry',()=>{
 const v=clone(ctx.b50.buildings[0]);v.facadeFloors[0].bayReview.bays.push(clone(v.facadeFloors[0].bayReview.bays[0]));
 invalid(()=>fac(undefined,v),'FACADE_DUPLICATE_BAY');
});
test('rhythm rejects missing source boundary',()=>{
 const v=clone(ctx.b50.buildings[0]);v.facadeFloors[0].bayReview.bays.pop();
 invalid(()=>fac(undefined,v),'FACADE_COVERAGE');
});
test('rhythm rejects duplicated source wall units',()=>{
 const a=clone(ctx.b49.buildings[0]);a.surfaceAtlas[0].facade.unitIndex.push(clone(a.surfaceAtlas[0].facade.unitIndex[0]));
 invalid(()=>fac(a),'FACADE_UNIT');
});
test('tampering readiness is rejected',()=>{
 const x=clone(report);x.readiness='PREPARED';invalid(()=>verifyB51(x,...args()),'B50_SAFETY');
});
test('tampering gate permission is rejected',()=>{
 const x=clone(report);x.blockers.M4Gates[0].status='PASS';invalid(()=>verifyB51(x,...args()),'B50_SAFETY');
});
test('tampering build operations is rejected',()=>{
 const x=clone(report);x.BuildPlan.operations.push({id:'invalid'});invalid(()=>verifyB51(x,...args()),'B50_SAFETY');
});
test('tampering report interior invalidates content hash',()=>{
 const x=clone(report);x.buildings[0].rooftopFootprint.previewPosition.x+=1;
 invalid(()=>verifyB51(x,...args()),'REPORT_HASH');
});
test('B51 reconstruction never mutates source B50 report',()=>{
 const original=JSON.stringify(ctx.b50);const r=compileB51(...args());
 assert.equal(JSON.stringify(ctx.b50),original);assert.equal(r.reportSha256,report.reportSha256);
});
