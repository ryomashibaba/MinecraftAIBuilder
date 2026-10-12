import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildB50FromSource,inspectB50SourceEvidence} from './run-b50.mjs';
import {bayLayout,entranceDesignReview,roofDesignReview,verticalGraphicReview,compileB50,verifyB50,verifyEvidence,validateSafety} from './compile-b50.mjs';
let input,report;
before(()=>{input=buildB50FromSource();report=input.report;});
const clone=v=>structuredClone(v);
const compile=(r=input.b49,e=input.evidence)=>compileB50(r,input.b48,input.b47,input.b46,input.b45,input.structure,input.main,e);
const invalid=(fn,part)=>assert.throws(fn,new RegExp(part));
const id=u=>`${u.face}/${u.fixed}/${u.along}`;
test('B50 5 buildings and 30 levels compile from immutable B49 sources',()=>{
 assert.equal(report.buildings.length,5);assert.equal(report.totals.levels,30);
 assert.deepEqual(report.buildings.map(b=>b.id),input.b49.buildings.map(b=>b.id));
});
test('B50 safety remains NOT_PREPARED, all 9 gates BLOCKED',()=>{
 assert.equal(validateSafety(report),undefined);assert.equal(report.blockers.M4Gates.length,9);
 assert.ok(report.blockers.M4Gates.every(g=>g.status==='BLOCKED'));
 assert.deepEqual(report.blockers,input.b49.blockers);
});
test('B50 never creates engine calls, block operations or materials',()=>{
 assert.equal(report.engineCalls,0);assert.equal(report.buildOperations,0);
 assert.equal(report.totals.physicalConstructionOperations,0);assert.deepEqual(report.materialIds,[]);
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.executionAllowed,false);assert.equal(report.constructionApproved,false);
});
test('source evidence names missing implementations explicitly',()=>{
 assert.deepEqual(inspectB50SourceEvidence(),input.evidence);
 assert.equal(input.evidence.status,'CALLSITE_ONLY_NOT_IMPLEMENTATION_PARITY');
 assert.equal(input.evidence.missingSources.length,3);
 assert.equal(verifyEvidence(input.evidence,input.b49.provenance.pinnedReference),true);
});
test('source evidence rejects false runtime parity claim',()=>{
 const e=clone(input.evidence);e.realComposeFacadeImplementationPresent=true;
 invalid(()=>compile(input.b49,e),'EVIDENCE');
});
test('source evidence rejects changed planner pin and callsite count',()=>{
 const e=clone(input.evidence);e.plannerSha256='bad';invalid(()=>compile(input.b49,e),'EVIDENCE');
 e.plannerSha256=input.evidence.plannerSha256;e.facadeCallsites=2;invalid(()=>compile(input.b49,e),'EVIDENCE');
});
test('total floor envelope units exactly conserved by schematic bays',()=>{
 assert.equal(report.totals.facadeUnits,3022);
 const total=report.buildings.reduce((n,b)=>n+b.facadeFloors.reduce((m,l)=>m+l.bayReview.bays.reduce((a,q)=>a+q.width,0),0),0);
 assert.equal(total,3022);
});
test('bays never exceed selected width and remain level-tagged',()=>{
 for(const b of report.buildings)for(const l of b.facadeFloors){
  assert.equal(l.bayReview.maximumBayWidth,4);
  for(const q of l.bayReview.bays){assert.ok(q.width>=1&&q.width<=4);assert.equal(q.level,l.level);}
 }
});
test('every facade unit covered once with exactly the source graphic role',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const got=report.buildings[i],src=input.b49.buildings[i];
  for(let j=0;j<got.facadeFloors.length;j++){
   const bay=got.facadeFloors[j].bayReview,from=src.surfaceAtlas[j].facade.unitIndex;
   const map=new Map();
   for(const q of bay.bays)for(let along=q.start;along<q.end;along++){
    const name=id({face:q.face,fixed:q.fixed,along});assert.equal(map.has(name),false);
    map.set(name,{role:q.graphicIntent,classification:q.edgeClass});
   }
   assert.equal(map.size,from.length);
   for(const u of from)assert.deepEqual(map.get(id(u)),{role:u.role,classification:u.classification});
  }
 }
});
test('courtyard and external-wall classifications are never merged',()=>{
 const b=report.buildings.find(b=>b.program==='apartment');
 assert.ok(b.facadeFloors.some(l=>l.bayReview.bays.some(q=>q.edgeClass==='ENCLOSED_VOID_EDGE')));
 assert.ok(b.facadeFloors.some(l=>l.bayReview.bays.some(q=>q.edgeClass==='OUTER_FOOTPRINT_EDGE')));
});
test('all graphic bays are explicitly display-only with zero production modules',()=>{
 for(const b of report.buildings)for(const l of b.facadeFloors){
  assert.equal(l.bayReview.productionModuleCount,0);assert.equal(l.bayReview.windowCutouts,0);
  assert.ok(l.bayReview.bays.every(x=>!x.approved&&x.material===null&&x.designStatus==='SCHEMATIC_BAY_NOT_PRODUCTION_MODULE'));
 }
});
test('bay splitting supports independent widths without modifying B49',()=>{
 const l=input.b49.buildings[0].surfaceAtlas[0];
 const a=bayLayout(l,1),b=bayLayout(l,8);
 assert.equal(a.sourceVisualUnits,b.sourceVisualUnits);assert.ok(a.bays.length>=b.bays.length);
 assert.deepEqual(input.b49.buildings[0].surfaceAtlas[0],l);
});
test('bay width rejects invalid negative fractional and overlong options',()=>{
 const l=input.b49.buildings[0].surfaceAtlas[0];
 for(const n of [-1,0,1.5,13,NaN])invalid(()=>bayLayout(l,n),'BAY_INPUT');
});
test('bay classifier rejects a duplicate unit record',()=>{
 const l=clone(input.b49.buildings[0].surfaceAtlas[0]);l.facade.unitIndex.push(clone(l.facade.unitIndex[0]));
 invalid(()=>bayLayout(l),'BAY_UNIT');
});
test('bay classifier rejects role drift from source ribbon',()=>{
 const l=clone(input.b49.buildings[0].surfaceAtlas[0]);
 l.facade.unitIndex[0].role='WINDOW_VISUAL_ONLY';
 invalid(()=>bayLayout(l),'BAY_DRIFT');
});
test('bay classifier rejects ribbon holes',()=>{
 const l=clone(input.b49.buildings[0].surfaceAtlas[0]);l.facade.ribbons[0].zones[0].start++;
 invalid(()=>bayLayout(l),'BAY_ZONE');
});
test('entrance recommended preview accounts for exactly original graphic collisions',()=>{
 let overlap=0;
 for(let i=0;i<report.buildings.length;i++){
  const e=report.buildings[i].entranceGraphicStudy,src=input.b49.buildings[i];
  assert.equal(e.inputOptions,src.entranceReview.alternatives.length);
  assert.equal(e.previewOverlay.length,src.entranceReview.referenceFront.nominalWidth);
  assert.ok(e.rankedAlternatives.every(a=>a.approved===false));
  assert.ok(e.rankedAlternatives.every((a,j)=>j===0||a.reviewScore>=e.rankedAlternatives[j-1].reviewScore));
  overlap+=e.previewOverlay.filter(x=>x.originalRole!=='UNASSIGNED_FACADE_EDGE').length;
 }
 assert.equal(overlap,report.totals.entrancePreviewGraphicOverlaps);
});
test('entrance graphic overlay leaves source first floor unchanged',()=>{
 const b=input.b49.buildings[0],original=JSON.stringify(b.surfaceAtlas[0]);
 const e=entranceDesignReview(b.entranceReview,b.surfaceAtlas[0]);
 assert.equal(JSON.stringify(b.surfaceAtlas[0]),original);
 assert.equal(e.actualDoorInstalled,false);assert.equal(e.architecturalEgressVerified,false);
});
test('entrance ranking rejects B49 candidate conflict tampering',()=>{
 const b=clone(input.b49.buildings[0]);b.entranceReview.alternatives[0].visualMarkerOverlap.windowVisualOnly++;
 invalid(()=>entranceDesignReview(b.entranceReview,b.surfaceAtlas[0]),'ENTRY_CONFLICT_DRIFT');
});
test('entrance ranking rejects duplicate options',()=>{
 const b=clone(input.b49.buildings[0]);b.entranceReview.alternatives.push(clone(b.entranceReview.alternatives[0]));
 invalid(()=>entranceDesignReview(b.entranceReview,b.surfaceAtlas[0]),'DUPLICATE_ENTRY');
});
test('roof preview options never claim approved physical construction',()=>{
 for(const b of report.buildings){
  const r=b.roofGraphicStudy;assert.equal(r.actualRoofModuleEmitted,false);
  assert.equal(r.supportVerified,false);assert.equal(r.roofAccessVerified,false);
  assert.equal(r.alternativeCount,r.rankedOptions.length);
  assert.deepEqual(r.preferredHorizontalPreview,r.rankedOptions[0]);
 }
});
test('roof preview rejects approved changes',()=>{
 const b=clone(input.b49.buildings[0]);b.roofTopReview.alternatives[0].approved=true;
 invalid(()=>roofDesignReview(b.roofTopReview),'ROOF_OPTION');
});
test('roof preview rejects duplicate horizontal candidates',()=>{
 const b=clone(input.b49.buildings[0]);b.roofTopReview.alternatives.push(clone(b.roofTopReview.alternatives[0]));
 invalid(()=>roofDesignReview(b.roofTopReview),'ROOF_DUPLICATE');
});
test('vertical graphic continuity accounts for every adjacent role pair',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const v=report.buildings[i].verticalGraphicStudy;
  assert.equal(v.reviewTransitions.length,v.changedGraphicPairs);
  assert.equal(v.joinsPhysicallyVerified,false);
  assert.deepEqual(v,verticalGraphicReview(input.b49.buildings[i].surfaceAtlas));
 }
});
test('vertical review rejects repeated floor levels',()=>{
 const b=clone(input.b49.buildings[0]);b.surfaceAtlas[1].level=b.surfaceAtlas[0].level;
 invalid(()=>verticalGraphicReview(b.surfaceAtlas),'VERTICAL_LEVEL');
});
test('interior doorway references retain not-verified status',()=>{
 const total=report.buildings.reduce((n,b)=>n+b.internalInterfaceReference.nominalDoorHints,0);
 assert.equal(total,input.b49.totals.nominalInteriorDoorHints);
 assert.ok(report.buildings.every(b=>b.internalInterfaceReference.actualDoorsVerified===false&&b.internalInterfaceReference.actualStairsVerified===false));
});
test('deterministic B50 regeneration is byte stable against report',()=>{
 assert.deepEqual(compile(),report);assert.equal(verifyB50(report,input.b49,input.b48,input.b47,input.b46,input.b45,input.structure,input.main,input.evidence),true);
});
test('safety validator blocks mutated readiness execution and M4 gate',()=>{
 for(const [name,fn] of [['readiness',r=>r.readiness='PREPARED'],['operations',r=>r.BuildPlan.operations.push({})],['gate',r=>r.blockers.M4Gates[0].status='PASS']]){
  const r=clone(report);fn(r);invalid(()=>validateSafety(r),'SAFETY');
 }
});
test('B50 report digest detects modified schematic output',()=>{
 const r=clone(report);r.buildings[0].facadeFloors[0].bayReview.bays[0].width++;
 invalid(()=>verifyB50(r,input.b49,input.b48,input.b47,input.b46,input.b45,input.structure,input.main,input.evidence),'REPORT_HASH');
});
test('production-module flags are rejected even if attacker recomputes hash',()=>{
 const r=clone(report);r.buildings[0].productionFacadeEmissions=1;
 invalid(()=>verifyB50(r,input.b49,input.b48,input.b47,input.b46,input.b45,input.structure,input.main,input.evidence),'OUTPUT_UNSAFE');
});
test('roof preview rejects a candidate shifted beyond its source horizontal interval',()=>{
 const b=clone(input.b49.buildings[0]);
 b.roofTopReview.alternatives[0].x=b.roofTopReview.possibleHorizontalStartRange[1]+1;
 invalid(()=>roofDesignReview(b.roofTopReview),'ROOF_OPTION');
});
test('entrance preview rejects a candidate outside the source front interval',()=>{
 const b=clone(input.b49.buildings[0]);
 b.entranceReview.alternatives[0].start=b.entranceReview.referenceFront.runStart;
 b.entranceReview.alternatives[0].endInclusive=b.entranceReview.alternatives[0].start+b.entranceReview.referenceFront.nominalWidth-1;
 invalid(()=>entranceDesignReview(b.entranceReview,b.surfaceAtlas[0]),'ENTRY_OPTION');
});
