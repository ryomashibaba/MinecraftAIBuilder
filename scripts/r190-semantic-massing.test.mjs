import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan,
 auditR190SourceRoutes,exploreR190SemanticPlan,R190_LAYOUT_STRATEGIES}
 from '../source/ai/r190-semantic-massing.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';

import {R190_STATIC_SYNTHETIC_CASES as cases,
 R190_COURT_STATIC_SYNTHETIC_CASE as court,
 R190_FACETED_STATIC_SYNTHETIC_CASE as faceted} from './r190-semantic-fixtures.mjs';

test('R190 synthetic programs: B143 source, 2-wide access and safe world gates',()=>{
 const signatures=[];
 for(const input of cases){
  const snapshot=JSON.stringify(input);
  assert.equal(validateR190SemanticPlan(input),true);
  const r=compileR190SemanticPlan(input);
  assert.equal(JSON.stringify(input),snapshot);
  assert.ok(verifyCompiled(r.design,r.compiled));
  assert.equal(r.audit.witnesses.length,input.spaces.length);
  assert.equal(r.audit.allProgramSpacesReachable,true);
  assert.ok(r.audit.sourceWalkingPads>30);
  assert.equal(r.layout.portals.length,input.spaces.length-1);
  assert.equal(r.design.elements.filter(x=>x.shape==='box'&&x.mode==='cut').length,
   input.spaces.length);
  assert.ok(r.compiled.primitives.length>1000);
  assert.equal(r.modelAuthorship,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(r.art,'ART_HOLD');
  assert.equal(r.readiness,'NOT_PREPARED');
  assert.equal(r.constructionApproved,false);
  assert.equal(r.executionAllowed,false);
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.equal(r.worldWrites,0);
  signatures.push(r.compiled.geometrySha256);
 }
 assert.equal(new Set(signatures).size,3);
});
test('R190 rejects cycles, infeasible plots, and untrusted world commands',()=>{
 const cyclic=structuredClone(cases[0]);
 cyclic.spaces[1].parentId='storage';
 cyclic.spaces[3].parentId='sleeping';
 assert.throws(()=>compileR190SemanticPlan(cyclic),/R190_SEMANTIC_CYCLE/);
 const impossible=structuredClone(cases[0]);
 impossible.site.width=24;impossible.site.depth=24;
 assert.throws(()=>compileR190SemanticPlan(impossible),/NO_FEASIBLE_SPATIAL_LAYOUT/);
 const injection=structuredClone(cases[0]);
 injection.worldCommand='/fill 0 0 0 1 1 1 stone';
 assert.throws(()=>compileR190SemanticPlan(injection),/R190_SEMANTIC_FIELDS/);
});
test('R190 rejects stale mutated compiled voxel source',()=>{
 const r=compileR190SemanticPlan(cases[0]);
 r.compiled.primitives=r.compiled.primitives.slice(1);
 assert.equal(verifyCompiled(r.design,r.compiled),false);
});

test('R190 Phase B explores three distinct source placements per synthetic use',()=>{
 const all=[];
 for(const plan of cases){
  const before=JSON.stringify(plan),result=exploreR190SemanticPlan(plan);
  assert.equal(JSON.stringify(plan),before);
  assert.equal(result.conceptsIndependentlyDesigned,false);
  assert.equal(result.actualLocalModelCalls,0);
  assert.equal(result.provenance,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(result.art,'ART_HOLD');
  assert.equal(result.candidates.length,3);
  assert.deepEqual(result.candidates.map(x=>x.layout.strategy),R190_LAYOUT_STRATEGIES);
  const layouts=new Set();
  for(const c of result.candidates){
   assert.equal(c.layout.sourcePlanSha256,result.inputSha256);
   assert.ok(verifyCompiled(c.design,c.compiled));
   assert.equal(c.audit.allProgramSpacesReachable,true);
   assert.equal(c.layout.portals.length,plan.spaces.length-1);
   for(const s of plan.spaces){
    const a=c.layout.spaces.find(x=>x.id===s.id);
    assert.deepEqual([a.w,a.d,a.h],[s.width,s.depth,s.height]);
    assert.equal(a.parentId,s.parentId);
    assert.equal(a.side,s.side);
   }
   const root=c.layout.spaces.find(s=>s.id===plan.entrySpaceId);
   const fingerprint=c.layout.spaces.map(s=>
    [s.id,s.x-root.x,s.z-root.z,s.w,s.d,s.h].join(':')).join('|');
   assert.ok(!layouts.has(fingerprint));
   layouts.add(fingerprint);
   assert.equal(c.art,'ART_HOLD');
   assert.equal(c.readiness,'NOT_PREPARED');
   assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
   assert.deepEqual(c.BuildPlan.operations,[]);
   assert.equal(c.worldWrites,0);assert.equal(c.worldContacts,0);
   all.push(c.compiled.geometrySha256);
  }
 }
 assert.equal(new Set(all).size,9);
 assert.throws(()=>compileR190SemanticPlan(cases[0],
  {layoutStrategy:'override-world'}),/R190_SEMANTIC_LAYOUT_STRATEGY/);
});

test('R190-C: a first-class court changes mass, true sky and connected usable rooms',()=>{
 const saved=JSON.stringify(court),ex=exploreR190SemanticPlan(court);
 assert.equal(JSON.stringify(court),saved);
 assert.equal(ex.candidates.length,3);assert.equal(ex.actualLocalModelCalls,0);
 const shapes=new Set();
 for(const c of ex.candidates){
  assert.ok(verifyCompiled(c.design,c.compiled));
  assert.equal(c.audit.outdoorCourtCount,1);
  assert.equal(c.audit.verifiedOpenSkyColumns,144);
  assert.equal(c.audit.witnesses.length,4);
  assert.equal(c.layout.portals.length,3);
  assert.equal(c.audit.allProgramSpacesReachable,true);
  assert.ok(c.audit.sourceWalkingPads>50);
  assert.ok(!c.design.elements.some(e=>e.id==='arrival-roof'||e.id==='arrival-west'||e.id==='entry-cut'));
  assert.equal(c.modelAuthorship,'CALLER_PROVIDED_IR_UNVERIFIED');
  assert.equal(c.art,'ART_HOLD');assert.equal(c.readiness,'NOT_PREPARED');
  assert.equal(c.constructionApproved,false);assert.equal(c.executionAllowed,false);
  assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.BuildPlan.operations,[]);
  assert.equal(c.worldWrites,0);assert.equal(c.worldContacts,0);
  shapes.add(c.compiled.geometrySha256);
 }
 assert.equal(shapes.size,3);
});
test('R190-C: invalid role or a covered court fails closed',()=>{
 for(const role of ['world-write','build','arbitrary']){
  const bad=structuredClone(court);bad.spaces[0].spatialRole=role;
  assert.throws(()=>compileR190SemanticPlan(bad),/R190_SEMANTIC_SPACE/);
 }
 const tooMany=structuredClone(court);
 tooMany.spaces[1].spatialRole='open-court';
 assert.throws(()=>compileR190SemanticPlan(tooMany),/COURT_BUDGET/);
 const c=compileR190SemanticPlan(court),pos=c.layout.spaces.find(s=>s.id==='arrival');
 const modified=structuredClone(c.design);
 modified.elements.push({id:'unauthorized-court-cover',shape:'box',mode:'add',
  material:'concrete',origin:[pos.x+3,6,pos.z+3],size:[3,1,3]});
 const compiled=compileDesign(modified);
 assert.ok(verifyCompiled(modified,compiled));
 assert.throws(()=>auditR190SourceRoutes(c.inputPlan,c.layout,modified,compiled),
  /COURT_SKY_OBSTRUCTED_arrival/);
});

test('R190-D: genuine model-selectable faceted envelope has real floor, roof, and routes',()=>{
 const original=JSON.stringify(faceted),variants=exploreR190SemanticPlan(faceted);
 assert.equal(JSON.stringify(faceted),original);
 assert.equal(variants.candidates.length,3);
 assert.equal(variants.actualLocalModelCalls,0);
 assert.equal(variants.provenance,'CALLER_PROVIDED_IR_UNVERIFIED');
 const shapes=new Set();
 for(const c of variants.candidates){
  assert.ok(verifyCompiled(c.design,c.compiled));
  assert.equal(c.audit.allProgramSpacesReachable,true);
  assert.equal(c.audit.outdoorCourtCount,1);
  assert.equal(c.audit.verifiedOpenSkyColumns,144);
  assert.equal(c.audit.witnesses.length,4);
  assert.equal(c.audit.facetedEnvelope.spaceId,'public-hall');
  assert.equal(c.audit.facetedEnvelope.face,'south');
  assert.equal(c.audit.facetedEnvelope.missingRoofCornerColumns,12);
  assert.ok(c.audit.facetedEnvelope.occupiedRoofColumns>100);
  assert.ok(c.design.elements.some(e=>e.id==='public-hall-facet-roof-core'));
  assert.ok(!c.design.elements.some(e=>e.id==='public-hall-roof'));
  assert.equal(c.art,'ART_HOLD');
  assert.equal(c.constructionApproved,false);
  assert.equal(c.executionAllowed,false);
  assert.equal(c.readiness,'NOT_PREPARED');
  assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(c.BuildPlan.operations,[]);
  assert.equal(c.worldWrites,0);
  assert.equal(c.worldContacts,0);
  shapes.add(c.compiled.geometrySha256);
 }
 assert.equal(shapes.size,3);
});
test('R190-D: rejects unknown face, incompatible dimensions, and covered faceted void',()=>{
 for(const face of ['north-west','/fill','around']){
  const invalid=structuredClone(faceted);
  invalid.formIntent.face=face;
  assert.throws(()=>compileR190SemanticPlan(invalid),/FORM_INTENT/);
 }
 const invalid=structuredClone(faceted);
 invalid.formIntent.spaceId='arrival';
 assert.throws(()=>compileR190SemanticPlan(invalid),/FORM_SPACE/);
 const small=structuredClone(faceted);
 small.formIntent.cornerInset=3;
 small.spaces.find(s=>s.id==='public-hall').width=10;
 assert.throws(()=>compileR190SemanticPlan(small),/FACET_CANNOT_FIT/);
 const built=compileR190SemanticPlan(faceted),
  room=built.layout.spaces.find(s=>s.id==='public-hall');
 const obstructed=structuredClone(built.design);
 obstructed.elements.push({id:'hostile-facet-cover',shape:'box',
  mode:'add',material:'metal',origin:[room.x,room.h,room.z],size:[3,1,1]});
 const compiled=compileDesign(obstructed);
 assert.ok(verifyCompiled(obstructed,compiled));
 assert.throws(()=>auditR190SourceRoutes(
  built.inputPlan,built.layout,obstructed,compiled),
  /FACET_NOT_TRULY_OPEN/);
});

test('R190-K model-authored sawtooth roof builds real raised interior and solid gables',()=>{
 const a=structuredClone(cases[1]);
 a.roofFormIntent={spaceId:'showroom',profile:'sawtooth',axis:'x',rise:4,toothWidth:5};
 const before=JSON.stringify(a);
 const r=compileR190SemanticPlan(a),roof=r.audit.roofForm;
 assert.equal(JSON.stringify(a),before);
 assert.equal(r.design.elements.some(e=>e.id==='showroom-roof'),false);
 assert.equal(r.design.elements.filter(e=>e.id.startsWith('showroom-roof-strip-')).length,17);
 assert.equal(roof.profile,'sawtooth');
 assert.equal(roof.achievedRise,4);
 assert(roof.raisedOpenInteriorColumns>0);
 assert.equal(roof.verifiedPhysicalEndGables,true);
 assert(roof.sourceHeightProfile.some((v,i)=>i>0&&v<roof.sourceHeightProfile[i-1]));
 assert.equal(r.audit.allProgramSpacesReachable,true);
 assert.ok(verifyCompiled(r.design,r.compiled));
 assert.equal(r.art,'ART_HOLD');assert.equal(r.minecraftPlayerWalking,'NOT_TESTED');
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 const altered=structuredClone(r.design);
 const strip=altered.elements.find(e=>e.id==='showroom-roof-strip-3');
 strip.origin[1]-=2;
 assert.throws(()=>auditR190SourceRoutes(a,r.layout,altered,compileDesign(altered)),
  /ROOF_PROFILE_MISSING|ROOF_SECTION_AIR_OR_STEP_SEAL_MISMATCH/);
});
test('R190-K model-selected ridge and shed produce different genuine B143 silhouettes',()=>{
 const shapes=[];
 for(const profile of ['ridge','shed']){
  const p=structuredClone(cases[2]);
  p.roofFormIntent={spaceId:'analysis',profile,axis:'z',rise:3};
  const r=compileR190SemanticPlan(p);
  assert.equal(r.audit.roofForm.profile,profile);
  assert.equal(r.audit.roofForm.achievedRise,3);
  assert.equal(r.audit.roofForm.sourceHeightProfile.at(0),0);
  assert.ok(r.audit.roofForm.raisedOpenInteriorColumns>0);
  assert.equal(r.audit.allProgramSpacesReachable,true);
  shapes.push(r.compiled.geometrySha256);
 }
 assert.equal(new Set(shapes).size,2);
});
test('R190-K invalid or inferred roof, roof leaks and shape injections HOLD',()=>{
 for(const form of [
  {spaceId:'showroom',profile:'sawtooth',axis:'x',rise:4},
  {spaceId:'showroom',profile:'ridge',axis:'x',rise:4,toothWidth:5},
  {spaceId:'showroom',profile:'world-write',axis:'x',rise:4},
  {spaceId:'showroom',profile:'ridge',axis:'y',rise:4},
  {spaceId:'showroom',profile:'sawtooth',axis:'x',rise:4,toothWidth:10},
  {spaceId:'showroom',profile:'sawtooth',axis:'x',rise:4,toothWidth:2},
  {spaceId:'showroom',profile:'ridge',axis:'x',rise:30},
  {spaceId:'nonexistent',profile:'shed',axis:'x',rise:3}
 ]){
  const p=structuredClone(cases[1]);p.roofFormIntent=form;
  assert.throws(()=>compileR190SemanticPlan(p),/R190_SEMANTIC_ROOF_/);
 }
 const cover=structuredClone(faceted);
 cover.roofFormIntent={spaceId:'public-hall',profile:'shed',axis:'x',rise:2};
 assert.throws(()=>compileR190SemanticPlan(cover),/ROOF_SPACE/);
 const p=structuredClone(cases[1]);
 p.roofFormIntent={spaceId:'showroom',profile:'ridge',axis:'x',rise:4};
 const r=compileR190SemanticPlan(p);
 const damaged=structuredClone(r.design);
 damaged.elements.push({id:'invalid-underside-cover',shape:'box',mode:'add',
  material:'metal',origin:[r.layout.spaces[0].x+7,10,r.layout.spaces[0].z+6],size:[1,1,1]});
 const comp=compileDesign(damaged);
 assert.throws(()=>auditR190SourceRoutes(p,r.layout,damaged,comp),
  /ROOF_SECTION_AIR_OR_STEP_SEAL_MISMATCH/);
});


test('R190-L model-authored non-tree room links become real two-wide B143 passages',()=>{
 const p=structuredClone(cases[0]);
 p.id='r190-model-shortcut';
 p.spaces=[
  {id:'arrival',purpose:'Shared community arrival',width:12,depth:12,height:8,
   parentId:null,side:null,privacy:'public'},
  {id:'making',purpose:'Hands-on workshop',width:12,depth:12,height:8,
   parentId:'arrival',side:'east',privacy:'shared'},
  {id:'storage',purpose:'Materials staging area',width:12,depth:12,height:8,
   parentId:'arrival',side:'north',privacy:'private'}
 ];
 p.entrySpaceId='arrival';
 p.crossConnections=[['making','storage']];
 const before=JSON.stringify(p),result=compileR190SemanticPlan(p);
 assert.equal(JSON.stringify(p),before);
 assert.equal(result.layout.portals.length,3);
 assert.equal(result.audit.nonTreePortalCount,1);
 assert.equal(result.audit.nonTreePhysicalWalkableTwoWide,true);
 assert.equal(result.audit.crossConnections.length,1);
 assert.equal(result.audit.allProgramSpacesReachable,true);
 const real=result.layout.portals.find(x=>x.kind==='cross');
 assert.ok(real);assert.deepEqual([real.a,real.b],['making','storage']);
 assert.equal(result.audit.crossConnections[0].realSourceAirVerified,true);
 assert.ok(verifyCompiled(result.design,result.compiled));
 assert.equal(result.art,'ART_HOLD');
 assert.equal(result.readiness,'NOT_PREPARED');
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert.equal(result.worldContacts,0);assert.equal(result.worldWrites,0);
 const source=structuredClone(result.design);
 const index=result.layout.portals.findIndex(x=>x.kind==='cross');
 source.elements.splice(source.elements.findIndex(x=>x.id==='adjacency-'+index),1);
 const tampered=compileDesign(source);
 assert.throws(()=>auditR190SourceRoutes(p,result.layout,source,tampered),
  /PHYSICAL_DOOR_BLOCKED|CROSS_PORTAL_NOT_TWO_WIDE_REACHABLE/);
 const legacy=structuredClone(p);delete legacy.crossConnections;
 const base=compileR190SemanticPlan(legacy);
 assert.equal(base.layout.portals.length,2);
 assert.notEqual(base.compiled.geometrySha256,result.compiled.geometrySha256);
});
test('R190-L impossible direct links and invalid/duplicated links fail closed',()=>{
 const p=structuredClone(cases[0]);
 p.id='r190-unreachable-shortcut';
 p.entrySpaceId='arrival';
 p.spaces=[
  {id:'arrival',purpose:'Central arrival',width:12,depth:12,height:8,
   parentId:null,side:null,privacy:'public'},
  {id:'left-wing',purpose:'Western work area',width:12,depth:12,height:8,
   parentId:'arrival',side:'west',privacy:'shared'},
  {id:'right-wing',purpose:'Eastern work area',width:12,depth:12,height:8,
   parentId:'arrival',side:'east',privacy:'shared'}
 ];
 p.crossConnections=[['left-wing','right-wing']];
 assert.throws(()=>compileR190SemanticPlan(p),/NO_FEASIBLE_SPATIAL_LAYOUT/);
 const parent=structuredClone(p);parent.crossConnections=[['arrival','left-wing']];
 assert.throws(()=>compileR190SemanticPlan(parent),/CROSS_CONNECTION_IS_TREE_EDGE/);
 const duplicate=structuredClone(p);
 duplicate.crossConnections=[['left-wing','right-wing'],['right-wing','left-wing']];
 assert.throws(()=>compileR190SemanticPlan(duplicate),/CROSS_CONNECTION_DUPLICATE/);
 const unknown=structuredClone(p);unknown.crossConnections=[['left-wing','/fill']];
 assert.throws(()=>compileR190SemanticPlan(unknown),/CROSS_CONNECTION_PAIR/);
 const self=structuredClone(p);self.crossConnections=[['left-wing','left-wing']];
 assert.throws(()=>compileR190SemanticPlan(self),/CROSS_CONNECTION_PAIR/);
 const injected=structuredClone(p);injected.crossConnections=[['left-wing','right-wing']];
 injected.worldCommand='/fill';
 assert.throws(()=>compileR190SemanticPlan(injected),/R190_SEMANTIC_FIELDS/);
});

test('R190-P physical model-selected exterior glazing is real glass and does not alter old model geometry',()=>{
 const plan=structuredClone(cases[1]);
 plan.glazedOpenings=[{spaceId:'showroom',face:'south',offset:3,baseY:6,width:4,height:3}];
 const snapshot=JSON.stringify(plan),r=compileR190SemanticPlan(plan);
 assert.equal(JSON.stringify(plan),snapshot);
 assert.ok(verifyCompiled(r.design,r.compiled));
 assert.equal(r.compiled.stats.layerCounts.glass,12);
 assert.equal(r.audit.realGlazingCells,12);
 assert.equal(r.audit.glazedOpenings[0].daylightSimulation,'NOT_PERFORMED');
 assert.equal(r.audit.allProgramSpacesReachable,true);
 assert.equal(r.worldWrites,0);assert.equal(r.worldContacts,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 const base=structuredClone(plan);delete base.glazedOpenings;
 const old=compileR190SemanticPlan(base);
 assert.equal(old.compiled.stats.layerCounts.glass,0);
 assert.notEqual(old.compiled.geometrySha256,r.compiled.geometrySha256);
});
test('R190-P glazing fails closed for injected attributes and invalid windows',()=>{
 const plan=structuredClone(cases[1]),good={
  spaceId:'showroom',face:'south',offset:3,baseY:6,width:4,height:3
 };
 plan.glazedOpenings=[good];
 assert.equal(validateR190SemanticPlan(plan),true);
 const injected=structuredClone(plan);injected.glazedOpenings[0].command='/setblock';
 assert.throws(()=>compileR190SemanticPlan(injected),/GLAZING_FIELDS/);
 const corner=structuredClone(plan);corner.glazedOpenings[0].offset=0;
 assert.throws(()=>compileR190SemanticPlan(corner),/GLAZING_OUT_OF_WALL/);
 const door=structuredClone(plan);door.glazedOpenings[0].baseY=3;
 assert.throws(()=>compileR190SemanticPlan(door),/GLAZING_OUT_OF_WALL/);
 const duplicate=structuredClone(plan);duplicate.glazedOpenings.push(good);
 assert.throws(()=>compileR190SemanticPlan(duplicate),/GLAZING_DUPLICATE/);
 const wrongRoom=structuredClone(plan);wrongRoom.glazedOpenings[0].spaceId='missing-room';
 assert.throws(()=>compileR190SemanticPlan(wrongRoom),/GLAZING_ROOM_UNSUPPORTED/);
 const bogus=structuredClone(plan);bogus.glazedOpenings=[];
 assert.throws(()=>compileR190SemanticPlan(bogus),/GLAZING_COUNT/);
 const internal=structuredClone(plan);internal.glazedOpenings[0].face='north';
 assert.throws(()=>compileR190SemanticPlan(internal),
  /GLAZING_NOT_EXTERIOR|GLAZING_AIR_BLOCKED|GLAZING_NOT_REAL_CUT/);
});
