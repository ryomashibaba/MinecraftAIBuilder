import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR190CompactProgram,R190_COMPACT_SCHEMA}
 from '../source/ai/r190-compact-program.mjs';
import {deriveR190CompactMinimumWindows,deriveR190CompactExpandedGlazingVariant,
 auditR190CompactInteriorEvidence,
 renderR190CompactAccessMapSvg}
 from '../source/ai/r190-compact-daylight.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
function sample(id,forms){
 return {schema:R190_COMPACT_SCHEMA,id,title:'Distinct building use and materials',
  brief:'Independent spatial purpose with daylight and functional rooms.',
  entranceFace:'south',materials:{floor:'wood',wall:'stone',roof:'wood'},
  spaces:[
   {id:'entrance',purpose:'Welcome and entrance',size:'balanced',proportion:'wide',
    height:'medium',parentId:null,preferredSide:null,privacy:'public',form:'plain'},
   {id:'large-room',purpose:'Primary work room',size:'generous',proportion:'long',
    height:'high',parentId:'entrance',preferredSide:'north',privacy:'shared',form:forms[0]},
   {id:'quiet-room',purpose:'Quiet functional room',size:'compact',proportion:'square',
    height:'low',parentId:'entrance',preferredSide:'east',privacy:'private',form:forms[1]}
  ]};
}
test('host-derived minimum daylight on three unrelated model programs is full real glazing not cosmetic',()=>{
 for(const [i,forms] of [['ridge','facet'],['sky-court','plain'],['facet','sky-court']].entries()){
  const p=sample('r190-daylight-synthetic-'+i,forms);
  const modelOriginal=JSON.stringify(p),base=compileR190CompactProgram(p);
  const sourceOriginal=JSON.stringify(base.hostDerivedPlan);
  const result=deriveR190CompactMinimumWindows(base);
  assert.equal(result.status,'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD');
  assert.equal(JSON.stringify(p),modelOriginal);
  assert.equal(JSON.stringify(base.hostDerivedPlan),sourceOriginal);
  assert(result.applied.length>=1);
  assert.equal(result.modelOriginalUnaffected,true);
  assert.notEqual(result.derivedGeometrySha256,result.originalGeometrySha256);
  assert(verifyCompiled(result.current.design,result.current.compiled));
  assert(result.current.audit.allProgramSpacesReachable);
  assert(result.current.audit.realGlazingCells>=4);
  assert(result.applied.every(x=>x.authorship==='HOST_DERIVED_MINIMUM_DAYLIGHT'));
  assert(result.current.inputPlan.glazedOpenings.length===result.applied.length);
  assert.equal(result.worldWrites,0);
  assert.equal(result.modelRequests,0);
  assert.equal(result.constructionApproved,false);
  assert.deepEqual(result.current.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(result.current.BuildPlan.operations,[]);
  assert.equal(result.art,'NOT_REVIEWED');
 }
});
test('daylight refuses unverifiable old source or pre-existing window changes',()=>{
 const base=compileR190CompactProgram(sample('r190-daylight-denial',['plain','plain']));
 const copied=structuredClone(base);
 copied.built.compiled.primitives[0][3]=99;
 assert.throws(()=>deriveR190CompactMinimumWindows(copied),/BASE_NOT_VERIFIED/);
 const duplicate=structuredClone(base);
 duplicate.hostDerivedPlan.glazedOpenings=[{
  spaceId:'entrance',face:'west',offset:3,baseY:5,width:2,height:2}];
 assert.throws(()=>deriveR190CompactMinimumWindows(duplicate),/BASE_ALREADY_HAS_WINDOWS/);
});

test('independent SOURCE room floor evidence retains original model, geometry and safety state',()=>{
 const base=compileR190CompactProgram(sample('r190-measured-floor',['sky-court','plain']));
 const original=JSON.stringify(base.hostDerivedPlan);
 const windowed=deriveR190CompactMinimumWindows(base);
 assert.equal(windowed.status,'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD');
 const scene=JSON.stringify(windowed.current.compiled);
 const report=auditR190CompactInteriorEvidence(windowed.current);
 assert.equal(report.geometrySha256,windowed.derivedGeometrySha256);
 assert.equal(report.status,'MEASURED_SOURCE_ONLY_NO_FUNCTION_OR_ART_APPROVAL');
 assert.equal(report.rooms.length,3);
 assert(report.rooms.every(x=>x.supportedClearFloorCells>0&&
  x.twoByTwoSupportedClearPads>0&&x.clearFloorFraction<=1&&
  x.reachableTwoWidePadsFromEntrance>=1&&
  x.reachableTwoWidePadsFromEntrance<=x.twoByTwoSupportedClearPads&&
  x.disconnectedTwoWidePads===x.twoByTwoSupportedClearPads-x.reachableTwoWidePadsFromEntrance&&
  x.reachableTwoWidePadFraction>0&&x.reachableTwoWidePadFraction<=1&&
  x.connectedEntranceWitness.length===3));
 assert.equal(report.sourceRouteIndependentlyRechecked,true);
 assert.deepEqual(report.roomsWithDisconnectedTwoWidePads,
  report.rooms.filter(x=>x.disconnectedTwoWidePads>0).map(x=>x.spaceId));
 assert.equal(report.actualMinecraftWalking,'NOT_TESTED');
 assert.equal(report.worldWrites,0);
 const svg=renderR190CompactAccessMapSvg(windowed.current);
 assert.match(svg,/^<svg /);
 assert.match(svg,/data-kind="reachable-pad"/);
 assert.match(svg,/data-kind="entry-witness"/);
 assert(svg.includes(report.geometrySha256));
 assert.doesNotMatch(svg,/<script|<foreignObject|\s(?:href|src)\s*=|url\s*\(/i);
 assert.equal(renderR190CompactAccessMapSvg(windowed.current),svg);
 assert.equal(report.constructionApproved,false);
 assert.equal(JSON.stringify(base.hostDerivedPlan),original);
 assert.equal(JSON.stringify(windowed.current.compiled),scene);
 const fakeRoute=structuredClone(windowed.current);
 fakeRoute.audit.witnesses[0].reachableTwoWideSourceCell=[0,2,0];
 assert.throws(()=>auditR190CompactInteriorEvidence(fakeRoute),
  /INTERIOR_ROUTE_RECEIPT_MISMATCH/);
 const broken=structuredClone(windowed.current);
 broken.compiled.primitives.pop();
 assert.throws(()=>auditR190CompactInteriorEvidence(broken),/INTERIOR_UNVERIFIED_SOURCE/);
});

test('HOST expanded real-glass candidate preserves model, original scene and safety',()=>{
 const program=sample('r190-glazing-expanded',['plain','ridge']);
 const frozen=JSON.stringify(program),base=compileR190CompactProgram(program);
 const minimum=deriveR190CompactMinimumWindows(base);
 const oldScene=JSON.stringify(minimum.current.compiled);
 const oldPlan=JSON.stringify(minimum.plan);
 const variant=deriveR190CompactExpandedGlazingVariant(minimum);
 assert.equal(variant.status,'HOST_DERIVED_LARGER_WINDOWS_ART_HOLD');
 assert(variant.expandedGlassCells>variant.originalGlassCells);
 assert.notEqual(variant.expandedGeometrySha256,variant.minimumWindowGeometrySha256);
 assert.equal(variant.modelCalls,0);
 assert.equal(variant.worldWrites,0);
 assert.equal(variant.constructionApproved,false);
 assert(variant.accepted.every(x=>x.authorship==='HOST_DERIVED_NOT_MODEL'));
 assert(verifyCompiled(variant.current.design,variant.current.compiled));
 assert(variant.current.audit.allProgramSpacesReachable);
 assert.equal(JSON.stringify(program),frozen);
 assert.equal(JSON.stringify(minimum.plan),oldPlan);
 assert.equal(JSON.stringify(minimum.current.compiled),oldScene);
 const corrupted=structuredClone(minimum);
 corrupted.current.compiled.primitives.pop();
 assert.throws(()=>deriveR190CompactExpandedGlazingVariant(corrupted),
  /GLAZING_VARIANT_BASE_INVALID/);
});

test('MODEL daylight size and preferred face become genuine checked B143 windows, not decorative paint',()=>{
 const p=sample('r190-authored-facade',['plain','plain']);
 p.daylightIntent=[{spaceId:'entrance',preferredFace:'west',scale:'balanced'},
  {spaceId:'large-room',preferredFace:'north',scale:'generous'}];
 const frozen=JSON.stringify(p),base=compileR190CompactProgram(p);
 const windows=deriveR190CompactMinimumWindows(base);
 assert.equal(windows.status,'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD');
 assert.equal(JSON.stringify(p),frozen);
 assert.equal(windows.originalGeometrySha256,base.built.compiled.geometrySha256);
 const authored=windows.applied.filter(x=>x.modelDaylightIntent);
 assert.equal(authored.length,2);
 assert(authored.every(x=>x.authorship==='MODEL_DAYLIGHT_INTENT_HOST_GEOMETRY'));
 assert(authored.every(x=>typeof x.requestedFaceSatisfied==='boolean'&&
  typeof x.requestedScaleSatisfied==='boolean'));
 assert(authored.some(x=>x.width*x.height>4));
 assert.equal(windows.plan.glazedOpenings.length,windows.applied.length);
 assert(verifyCompiled(windows.current.design,windows.current.compiled));
 assert(windows.current.audit.allProgramSpacesReachable);
 assert.equal(windows.current.worldWrites,0);
 assert.deepEqual(windows.current.gates,Array(9).fill('BLOCKED'));
 const interior=auditR190CompactInteriorEvidence(windows.current);
 assert(interior.rooms.every(x=>x.reachableTwoWidePadsFromEntrance>0));
 assert.equal(interior.actualMinecraftWalking,'NOT_TESTED');
});

test('R190 model daylight authorship hash and source-plan receipt are not forgeable',()=>{
 const original=compileR190CompactProgram(sample('r190-daylight-authentication',['plain','plain']));
 const forged=structuredClone(original);
 forged.modelProgram.daylightIntent=[{spaceId:'entrance',preferredFace:'north',scale:'generous'}];
 assert.throws(()=>deriveR190CompactMinimumWindows(forged),
  /MODEL_INTENT_PROVENANCE_MISMATCH/);
 const substituted=structuredClone(original);
 substituted.hostDerivedPlan.spaces[0].width+=1;
 assert.throws(()=>deriveR190CompactMinimumWindows(substituted),
  /BASE_PLAN_RECEIPT_MISMATCH/);
});
