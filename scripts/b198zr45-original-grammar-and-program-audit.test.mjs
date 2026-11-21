import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R45_CORRECTIVE_GUIDE,R45_CORRECTIVE_GUIDE_SHA256,
 inspectR45Original}
 from '../source/ai/b198zr45-original-grammar-and-program-audit.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const nestedBox=(id,mode,origin,size,material)=>({
 id,shape:{origin,size},mode,...(material?{material}:{})});
test('R45 guide is flat-source and point-specific, without fixed architecture template',()=>{
 assert.equal(sha(R45_CORRECTIVE_GUIDE),R45_CORRECTIVE_GUIDE_SHA256);
 for(const s of ['"shape":"box"','shape MUST be a string',
   'entrance MUST be one coordinate array','headroom MUST be the integer',
   'complete bookshelf','protectedVoid','2-3 blocks',
   'EXACT top-level keys','Japanese brief']){
  assert(R45_CORRECTIVE_GUIDE.includes(s),s);
 }
 assert(!R45_CORRECTIVE_GUIDE.includes('z=44'));
 assert(!R45_CORRECTIVE_GUIDE.includes('always make a library'));
});
test('R45 inspects synthetic R44-style malformed grammar and clashes without repairs',()=>{
 const p=r32Courtyard();
 const shelf=nestedBox('shelf','add',[6,2,6],[2,2,2],'wood');
 const clear=nestedBox('clear-shelf','cut',[6,2,6],[2,2,2]);
 p.design.elements.splice(2,0,shelf,clear);
 p.design.elements.push(nestedBox('glow-late','add',[6,1,6],[1,1,1],'glow'));
 p.spatialPlan.entrance={origin:[7,1,2],size:[3,3,2]};
 p.spatialPlan.headroom={origin:[7,1,2],size:[3,3,2]};
 const original=structuredClone(p),raw=JSON.stringify(p);
 const r=inspectR45Original(raw);
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.elementCount,p.design.elements.length);
 assert.equal(r.status,'HOLD_AUTHORED_GRAMMAR_OR_PROGRAM_MISTAKES');
 assert.equal(r.nestedShapeObjectCount,3);
 assert.equal(r.invalidShapeTypeCount,3);
 assert.equal(r.entrancePointSyntaxValid,false);
 assert.equal(r.headroomSyntaxValid,false);
 assert.equal(r.boxElementsErasedByLaterCuts,1);
 assert.equal(r.laterAddDeclaredVoidBoxIntersections,1);
 const shelfIssue=r.issues.find(x=>
  x.kind==='COMPLETE_AUTHORED_BOX_REMOVAL_IN_INTENDED_ORDER');
 assert(shelfIssue.affected.some(x=>x.sourceElementId==='shelf'&&
  x.laterCutId==='clear-shelf'&&x.authoredBoxVolume===8));
 assert.equal(r.finalVoxelGeometryCertified,false);
 assert.equal(r.evidenceFromFinalVoxelCompiler,false);
 assert.equal(r.originalUnmodified,true);
 assert.deepEqual(p,original);
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R45 rejects CUT material separately, without silently omitting it',()=>{
 const p=r32Courtyard(),cut=p.design.elements.find(x=>x.mode==='cut');
 cut.material='glass';
 const raw=JSON.stringify(p);
 const r=inspectR45Original(raw);
 assert.equal(r.illegalCutMaterialCount,1);
 assert(r.issues.some(x=>x.kind==='CUT_MATERIAL_FORBIDDEN'));
 assert.equal(JSON.parse(raw).design.elements.find(x=>x.mode==='cut').material,'glass');
});
test('R45 does not claim source shape or aesthetics if no obvious pattern exists',()=>{
 const p=r32Courtyard(),r=inspectR45Original(JSON.stringify(p));
 assert.equal(r.status,'ADVISORY_NO_OBVIOUS_SOURCE_PATTERNS_FOUND_NOT_CERTIFIED');
 assert.equal(r.invalidShapeTypeCount,0);
 assert.equal(r.boxElementsErasedByLaterCuts,0);
 assert.equal(r.laterAddDeclaredVoidBoxIntersections,0);
 assert.equal(r.actualUsableRoutesCertified,false);
 assert.equal(r.humanAestheticQualityCertified,false);
 assert.equal(r.originalQwenPerformanceImprovementProven,false);
});
test('R45 preserves failed/truncated original and holds instead of repair',()=>{
 const raw='{"design":';
 const r=inspectR45Original(raw);
 assert.equal(r.status,'HOLD_INVALID_JSON');
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.originalUnmodified,true);
 assert.equal(r.noAutoRepair,true);
 assert.equal(r.modelCalls,0);
});
