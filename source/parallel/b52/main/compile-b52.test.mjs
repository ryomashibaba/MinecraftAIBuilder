import test from 'node:test';
import assert from 'node:assert/strict';
import {buildB52FromSource} from './run-b52.mjs';
import {compileB52,enumerateRoofLocal,paretoFrontier,verifyB52} from './compile-b52.mjs';
const fixture=buildB52FromSource();
const {report,b51,b50,b49,b48,b47,b46,b45,structure,main,evidence}=fixture;
const inputs=[b51,b50,b49,b48,b47,b46,b45,structure,main,evidence];
const clone=v=>structuredClone(v);
const failReverify=(r)=>assert.throws(()=>verifyB52(r,...inputs),/B52_|B51_|B50_/);
const mutate=(f)=>{const r=clone(report);f(r);failReverify(r)};
const variants=report.buildings.flatMap(b=>b.variants);
test('B52 report reproducible',()=>assert.deepEqual(report,compileB52(...inputs)));
test('B52 verifier passes',()=>assert.equal(verifyB52(report,...inputs),true));
test('B51 baseline SHA is pinned',()=>assert.equal(report.provenance.b51ReportSha256,b51.reportSha256));
test('B52 target is five buildings and 30 levels',()=>assert.equal(report.totals.levels,30));
test('B52 covers 3,022 existing graphics, no mutations to B51',()=>assert.equal(report.totals.facadeVisualEdges,3022));
test('B52 all 91 entrance candidates represented',()=>assert.equal(report.totals.entranceCandidates,91));
test('B52 all 1,464 roof positions independently reviewed',()=>assert.equal(report.totals.rooftop2DCandidates,1464));
test('B52 total 15 explicit building scenarios',()=>assert.equal(report.totals.designVariants,15));
test('B52 multiple distinct positions explored',()=>assert.ok(report.totals.distinctPreviewPairs>=10));
test('B52 all three portfolio summaries are complete',()=>assert.ok(report.portfolio.every(p=>p.buildingsReviewed===5&&p.localSelections.length===5)));
test('B52 no world positions, installed modules, placement operations',()=>{
 assert.equal(report.worldCoordinates,null);assert.deepEqual(report.materialIds,[]);
 assert.equal(report.BuildPlan.operations.length,0);assert.equal(report.scans,0);
 assert.ok(variants.every(v=>!v.roofModuleInstalled&&!v.doorInstalled&&!v.approved));
});
test('B52 9 gates remain BLOCKED',()=>assert.deepEqual(report.blockers.M4Gates.map(x=>x.status),Array(9).fill('BLOCKED')));
test('B52 no production parity claimed',()=>{
 assert.equal(report.provenance.productionFacadeSourceAvailable,false);
 assert.equal(report.provenance.productionParity,'UNVERIFIED');
 assert.ok(variants.every(v=>v.productionPlannerParityVerified===false));
});
test('roof candidates agree in count/buffer with B51 per-building',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const all=enumerateRoofLocal(b51.buildings[i],b48.buildings[i],b49.buildings[i]);
  assert.equal(all.length,report.buildings[i].optionsExamined.roof2D);
  assert.equal(all.filter(x=>x.roofEdgeBufferRadius===2).length,
   b51.buildings[i].rooftopFootprint.independentlyExpanded2DEnvelope.candidatesWithTwoCellBuffer);
 }
});
test('every selected entry and roof belongs to verified local candidate sets',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const b=report.buildings[i];
  const entries=new Set(b51.buildings[i].entranceFootprint.rankedLocalFootprintCandidates.map(x=>x.start));
  const roofs=new Set(enumerateRoofLocal(b51.buildings[i],b48.buildings[i],b49.buildings[i]).map(x=>`${x.x}/${x.z}`));
  for(const v of b.variants){assert.ok(entries.has(v.entry.start));assert.ok(roofs.has(`${v.roof.x}/${v.roof.z}`));}
 }
});
test('entry collision minimization profile follows the stated priority',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const b=report.buildings[i],chosen=b.variants[0].entry;
  assert.equal(chosen.facadeGraphicOverlaps,Math.min(...b51.buildings[i].entranceFootprint.rankedLocalFootprintCandidates.map(x=>x.graphicOverlapCount)));
 }
});
test('centerline profile has minimum entry midpoint deviation',()=>{
 for(const b of report.buildings){
  const chosen=b.variants[1].entry.facadeCenterOffsetTwice;
  assert.equal(chosen,Math.min(...b.variants.map(x=>x.entry.facadeCenterOffsetTwice),
   ...b51.buildings[report.buildings.indexOf(b)].entranceFootprint.rankedLocalFootprintCandidates.map(x=>Math.abs(x.start+x.endInclusive-b49.buildings[report.buildings.indexOf(b)].entranceReview.referenceFront.runStart-b49.buildings[report.buildings.indexOf(b)].entranceReview.referenceFront.runEnd))));
 }
});
test('setback/asymmetry profile selects maximal buffer',()=>{
 for(let i=0;i<report.buildings.length;i++){
  const all=enumerateRoofLocal(b51.buildings[i],b48.buildings[i],b49.buildings[i]);
  assert.equal(report.buildings[i].variants[2].roof.roofEdgeBufferRadius,Math.max(...all.map(x=>x.roofEdgeBufferRadius)));
 }
});
test('apartment two-cell setback is not invented',()=>{
 const b=report.buildings.find(x=>x.program==='apartment');
 assert.ok(b.variants.every(v=>v.roof.roofEdgeBufferRadius<2));
 assert.ok(b.variants.every(v=>v.reviewFlags.includes('ROOF_TWO_CELL_BUFFER_UNAVAILABLE_FOR_SELECTION')));
});
test('facade graphic transitions agree with source B51',()=>{
 assert.equal(report.totals.facadeGraphicTransitions,b51.totals.changedAdjacentPairs);
 for(let i=0;i<report.buildings.length;i++){
  const r=report.buildings[i].facadeTransitionReview;
  assert.equal(Object.values(r.changesPerFace).reduce((a,b)=>a+b),r.graphicTransitionCount);
 }
});
test('Pareto frontier excludes dominated rows',()=>{
 const rows=[{benefit:1,cost:3},{benefit:2,cost:2},{benefit:1,cost:4}];
 assert.deepEqual(paretoFrontier(rows,[['benefit',1],['cost',-1]]),rows.slice(1,2));
});
test('all design variants remain unapproved',()=>assert.ok(variants.every(v=>v.localPreviewOnly===true&&v.physicalSafetyVerified===false)));
test('tampering with readiness must be rejected',()=>mutate(r=>{r.readiness='PREPARED'}));
test('tampering with deployment must be rejected',()=>mutate(r=>{r.deployment='READY'}));
test('tampering with BuildPlan must be rejected',()=>mutate(r=>{r.BuildPlan.operations.push({fake:true})}));
test('tampering with nine blocked gates must be rejected',()=>mutate(r=>{r.blockers.M4Gates[0].status='OPEN'}));
test('tampering with world coordinates must be rejected',()=>mutate(r=>{r.worldCoordinates={x:1,z:2}}));
test('tampering with material IDs must be rejected',()=>mutate(r=>{r.materialIds.push('fake')}));
test('tampering with simulated runtime/scan counts must be rejected',()=>mutate(r=>{r.scans=1}));
test('tampering with selected entry must be rejected',()=>mutate(r=>{r.buildings[0].variants[0].entry.start++}));
test('tampering with selected roof must be rejected',()=>mutate(r=>{r.buildings[0].variants[0].roof.x++}));
test('tampering with source evidence must be rejected',()=>mutate(r=>{r.buildings[0].evidence.b48BuildingSha256='fake'}));
test('tampering with actual module emission must be rejected',()=>mutate(r=>{r.buildings[0].variants[0].roofModuleInstalled=true}));
test('tampering with graphic rhythm must be rejected',()=>mutate(r=>{r.buildings[0].facadeTransitionReview.graphicTransitionCount++}));
test('tampering with report digest must be rejected',()=>mutate(r=>{r.reportSha256='deadbeef'}));
test('tampering B51 input cannot pass compile',()=>{
 const changed=clone(b51);changed.buildings[0].id='tampered';
 assert.throws(()=>compileB52(changed,...inputs.slice(1)),/B51_|B52_/);
});
test('tampering B48 roof input cannot pass compile',()=>{
 const changed=clone(b48);changed.buildings[0].levels.at(-1).canonical.roofRectangles[0].width=1;
 assert.throws(()=>compileB52(b51,b50,b49,changed,...inputs.slice(4)),/B48_|B51_|B52_|B50_/);
});
