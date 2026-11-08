import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {studyR190AG,r190AGSemanticProjection} from '../source/ai/r190ag-integrated-proposals.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {r190GlazingCells,auditR190SourceRoutes,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {jointWindowFixture,featuredFixture,plainFixtures} from './r190ag-synthetic-fixtures.mjs';
import {writeR190AGComparison} from './r190ag-offline-comparison.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
const checkSafe=r=>{
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.equal(r.art,'ART_HOLD');assert.equal(r.proposalApproved,false);assert.equal(r.proposalAutoApplied,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));assert.deepEqual(r.BuildPlan.operations,[]);
};
test('AG solves AF overlapping choices jointly without changing authored intent or baseline',()=>{
 const p=jointWindowFixture(),raw=JSON.stringify(p),r=studyR190AG(raw);
 assert.equal(JSON.stringify(p),raw);assert.equal(r.report.originalRawSha256,createHash('sha256').update(raw).digest('hex'));
 assert.equal(r.report.afComparison.status,'HOLD_DAYLIGHT_JOINT_PROPOSAL');
 assert.equal(r.report.status,'HOLD_PROPOSALS_REQUIRE_SEPARATE_REVIEW');
 assert(r.proposals.length>0,JSON.stringify(r.report));
 for(const {baseline,trial} of r.proposals){
  assert.equal(baseline.audit.realGlazingCells,0);assert.equal(trial.audit.realGlazingCells,12);
  assert.equal(verifyCompiled(trial.design,trial.compiled),true);
  const {sourcePlanSha256:beforeSha,...beforeLayout}=baseline.layout;
  const {sourcePlanSha256:afterSha,...afterLayout}=trial.layout;
  assert.notEqual(beforeSha,afterSha);assert.deepEqual(beforeLayout,afterLayout);
  assert.equal(trial.audit.roofForm.profile,'sawtooth');
  const windows=trial.inputPlan.glazedOpenings;
  assert.notDeepEqual(windows[0],windows[1]);
  const cells=windows.flatMap(g=>r190GlazingCells(trial.layout.spaces.find(s=>s.id===g.spaceId),g));
  assert.equal(new Set(cells.map(q=>[q.x,q.y,q.z].join(','))).size,12);
  windows.forEach((g,i)=>assert.deepEqual({spaceId:g.spaceId,face:g.face,width:g.width,height:g.height},p.daylightIntents[i]));
 }
 assert.equal(r.baseline.compiled.geometrySha256,r.report.afComparison.originalNoGlassGeometrySha256);
 checkSafe(r.report);
});
test('AG integrates real court, faceted wing, roof, glass and connected routes',()=>{
 const r=studyR190AG(JSON.stringify(featuredFixture()));
 assert(r.proposals.length>0,JSON.stringify(r.report));
 for(const {baseline,trial} of r.proposals){
  assert.equal(trial.audit.realGlazingCells,6);assert.equal(trial.audit.outdoorCourtCount,1);
  assert.equal(trial.audit.verifiedOpenSkyColumns,144);
  assert.equal(trial.audit.facetedEnvelope.missingRoofCornerColumns,12);
  assert.equal(trial.audit.roofForm.profile,'sawtooth');
  assert.equal(trial.audit.allProgramSpacesReachable,true);
  assert.deepEqual(trial.inputPlan.formIntent,baseline.inputPlan.formIntent);
  assert.deepEqual(trial.inputPlan.roofFormIntent,baseline.inputPlan.roofFormIntent);
  assert.equal(auditR190SourceRoutes(trial.inputPlan,trial.layout,trial.design,trial.compiled).allProgramSpacesReachable,true);
 }
 checkSafe(r.report);
});
test('AG does not invent optional features for three unrelated plain programs',()=>{
 const hashes=[];
 for(const p of plainFixtures()){
  const r=studyR190AG(JSON.stringify(p));
  assert.equal(r.report.status,'PROVISIONAL_BASELINE_ONLY_ART_HOLD');
  assert.equal(r.proposals.length,0);assert.equal(r.baseline.audit.realGlazingCells,0);
  assert.equal(r.baseline.audit.roofForm,null);assert.equal(r.baseline.audit.facetedEnvelope,null);
  hashes.push(r.baseline.compiled.geometrySha256);checkSafe(r.report);
 }
 assert.equal(new Set(hashes).size,3);
});
test('infeasible sizes, crowded glazing and entry sill remain HOLD without resizing or deleting intent',()=>{
 const small=jointWindowFixture();small.children[0].height=8;
 small.daylightIntents[0].height=4;
 const entry=plainFixtures()[0];entry.daylightIntents=[{spaceId:entry.root.id,face:'south',width:6,height:2}];
 const crowd=jointWindowFixture();crowd.children[0].width=7;crowd.children[0].height=8;
 crowd.daylightIntents=[0,1].map(()=>({spaceId:'workshop',face:'north',width:3,height:2}));
 for(const p of [small,entry,crowd]){
  const raw=JSON.stringify(p),r=studyR190AG(raw);
  assert.equal(r.proposals.length,0,JSON.stringify(r.report));
  assert.equal(r.report.status,'HOLD_NO_INTEGRATED_PROPOSAL');
  assert.equal(JSON.stringify(p),raw);checkSafe(r.report);
 }
});
test('a shared centered facade stays rejected while a separately shifted layout can expose real exterior',()=>{
 const p=jointWindowFixture();p.daylightIntents=[{spaceId:'workshop',face:'south',width:3,height:2}];
 const r=studyR190AG(JSON.stringify(p));
 assert.equal(r.report.afComparison.status,'HOLD_DAYLIGHT_NO_VERIFIED_EXTERIOR');
 assert.equal(r.report.alternatives[0].status,'HOLD_NO_JOINT_CANDIDATE_WITHIN_FIXED_LAYOUT');
 assert(r.proposals.length>0);
 assert(r.proposals.every(x=>x.strategy!=='centered'));
 checkSafe(r.report);
});
test('bounded search explicitly HOLDs instead of claiming physical impossibility',()=>{
 const r=studyR190AG(JSON.stringify(jointWindowFixture()),{maxSearchStates:1});
 assert.equal(r.proposals.length,0);
 assert(r.report.alternatives.every(x=>x.status==='HOLD_SEARCH_BUDGET_EXHAUSTED'));
 assert.equal(studyR190AG('{}',{maxSearchStates:0}).report.error,'R190AG_SEARCH_BUDGET');
});
test('bad root relations, duplicate links, unknown model fields and unsupported vertical claims rejected',()=>{
 for(const mutate of [p=>p.root.side=null,p=>p.additionalPassages=[[p.root.id,p.children[0].id]],
  p=>p.storeys=2,p=>p.worldCommand='/fill',p=>p.children[0].parentId='unknown-room']){
  const p=jointWindowFixture();mutate(p);const r=studyR190AG(JSON.stringify(p));
  assert.equal(r.proposals.length,0);assert.equal(r.baseline,null);
  assert.equal(r.report.status,'HOLD_INVALID_INTENT');checkSafe(r.report);
 }
 for(const raw of [null,'{','x'.repeat(120001)])assert.equal(studyR190AG(raw).report.status,'HOLD_INVALID_INTENT');
});
test('root normalization preserves all program, form, materials and extra passage values',()=>{
 const p=featuredFixture(),before=JSON.stringify(p),mapped=r190AGSemanticProjection(p);
 const [root,...children]=mapped.spaces;delete root.parentId;delete root.side;
 assert.deepEqual(root,p.root);assert.deepEqual(children,p.children);
 for(const k of ['site','materials','formIntent','roofFormIntent'])assert.deepEqual(mapped[k],p[k]);
 assert.equal(JSON.stringify(p),before);
});
test('AG retains requested non-tree two-wide passage jointly with roof and exterior glazing',()=>{
 const p=plainFixtures()[0];
 const room=(id,parentId,side)=>({id,purpose:'Synthetic independent room',width:12,depth:12,height:8,
  privacy:'public',spatialRole:'enclosed',...(parentId?{parentId,side}:{})});
 p.root=room('arrival');p.children=[room('making','arrival','east'),room('storage','arrival','north')];
 p.additionalPassages=[['making','storage']];
 p.roofFormIntent={spaceId:'arrival',profile:'shed',axis:'x',rise:2};
 p.daylightIntents=[{spaceId:'making',face:'east',width:3,height:2}];
 const r=studyR190AG(JSON.stringify(p));
 assert(r.proposals.length>0,JSON.stringify(r.report));
 for(const {trial} of r.proposals){
  assert.deepEqual(trial.inputPlan.crossConnections,p.additionalPassages);
  assert.equal(trial.audit.nonTreePortalCount,1);
  assert.equal(trial.audit.nonTreePhysicalWalkableTwoWide,true);
  assert.equal(trial.audit.realGlazingCells,6);assert.equal(trial.audit.roofForm.profile,'shed');
 }
 checkSafe(r.report);
});
test('exported synthetic 3D source matches proposal SHA and refuses overwrite',t=>{
 const scratch=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'r190ag-artifact-test-')));
 t.after(()=>{
  assert.equal(path.dirname(scratch),fs.realpathSync.native(os.tmpdir()));
  assert(path.basename(scratch).startsWith('r190ag-artifact-test-'));
  fs.rmSync(scratch,{recursive:true,force:true});
 });
 const out=path.join(scratch,'new-comparison'),r=writeR190AGComparison(out);
 assert.deepEqual(r.proposalCounts,[0,0,0,3,3]);
 const summary=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
 for(const s of summary.studies)for(const a of s.comparison.ag.alternatives.filter(x=>x.proposal)){
  const dir=path.join(out,s.case),name=a.strategy+'-UNAPPROVED-glass';
  const design=JSON.parse(fs.readFileSync(path.join(dir,name+'.b143.json'),'utf8'));
  const compiled=compileDesign(design);
  assert.equal(compiled.geometrySha256,a.proposal.hostDerivedGeometrySha256);
  const html=fs.readFileSync(path.join(dir,name+'.html'),'utf8');
  assert(html.includes('R190-AG SYNTHETIC / '+name+' / UNAPPROVED / ART HOLD'));
  assert(html.includes(a.proposal.hostDerivedGeometrySha256));
  for(const side of ['front','rear','west','east','roof'])assert(fs.statSync(path.join(dir,name+'-'+side+'.svg')).size>100);
 }
 const original=fs.readFileSync(path.join(out,'SUMMARY.json'));
 assert.throws(()=>writeR190AGComparison(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 assert.deepEqual(fs.readFileSync(path.join(out,'SUMMARY.json')),original);
});


test('AH contrastive audit exposes metadata-only purpose/privacy without changing real voxels',()=>{
 const a=plainFixtures()[0],b=structuredClone(a);
 b.root.purpose='Visitor-oriented interpretation hall';
 b.root.privacy=a.root.privacy==='private'?'public':'private';
 const original=studyR190AG(JSON.stringify(a));
 const changed=studyR190AG(JSON.stringify(b));
 assert(original.baseline&&changed.baseline);
 assert.equal(original.baseline.compiled.geometrySha256,
  changed.baseline.compiled.geometrySha256,
  'Changing only purpose/privacy must not be mistaken for a physical design change');
 assert.deepEqual(original.report.alternatives[0].programMeaningAudit.originalRoomPurposes[0],
  {id:a.root.id,purpose:a.root.purpose});
 assert.deepEqual(changed.report.alternatives[0].programMeaningAudit.originalRoomPurposes[0],
  {id:b.root.id,purpose:b.root.purpose});
 assert.equal(changed.report.alternatives[0].programMeaningAudit.geometryExpressesPurpose,
  'NOT_CERTIFIED');
 assert.equal(changed.report.alternatives[0].programMeaningAudit.functionalPrivacyCertified,false);
 checkSafe(original.report);checkSafe(changed.report);
});

test('bounded second solver layout preserves model-authored geometry requirements and source routes',()=>{
 const p=jointWindowFixture(),raw=JSON.stringify(p),mapped=r190AGSemanticProjection(p);
 const first=compileR190SemanticPlan(mapped,{layoutStrategy:'centered',layoutVariantIndex:0});
 const second=compileR190SemanticPlan(mapped,{layoutStrategy:'centered',layoutVariantIndex:1});
 assert.notDeepEqual(first.layout.spaces.map(s=>[s.x,s.z]),
  second.layout.spaces.map(s=>[s.x,s.z]));
 assert.equal(first.audit.allProgramSpacesReachable,true);
 assert.equal(second.audit.allProgramSpacesReachable,true);
 assert.equal(verifyCompiled(second.design,second.compiled),true);
 const expanded=studyR190AG(raw,{maxLayoutVariantsPerStrategy:2});
 assert.equal(expanded.report.maxLayoutVariantsPerStrategy,2);
 assert.equal(expanded.report.layoutVariationCompleteness,'BOUNDED_NOT_EXHAUSTIVE');
 assert(expanded.report.alternatives.some(x=>x.layoutVariantIndex===1&&x.baselineGeometrySha256));
 assert(expanded.proposals.length>=studyR190AG(raw).proposals.length);
 assert.equal(JSON.stringify(p),raw);
 assert.deepEqual(expanded.report.alternatives.slice(0,1).map(x=>x.strategy),['centered']);
 checkSafe(expanded.report);
 assert.equal(studyR190AG(raw,{maxLayoutVariantsPerStrategy:5}).report.error,'R190AG_SEARCH_BUDGET');
});

test('authored public route rather than private transit creates different real source layout',()=>{
 const p=plainFixtures()[0];
 p.site={width:64,depth:64,height:24};
 const room=(id,purpose,privacy,parentId,side)=>({
  id,purpose,width:12,depth:12,height:8,privacy,spatialRole:'enclosed',
  ...(parentId?{parentId,side}:{})
 });
 p.root=room('arrival','Entry hall','public');
 p.children=[room('staff','Private service room','private','arrival','east'),
  room('gallery','Public exhibition room','public','staff','east')];
 const blocked=studyR190AG(JSON.stringify(p));
 assert.equal(blocked.baseline.audit.allProgramSpacesReachable,true);
 assert.deepEqual(blocked.report.alternatives[0].programMeaningAudit.publicSharedAccess.needsReview,['gallery']);
 const revised=structuredClone(p);
 revised.children[1].parentId='arrival';
 revised.children[1].side='west';
 const open=studyR190AG(JSON.stringify(revised));
 assert.equal(open.baseline.audit.allProgramSpacesReachable,true);
 assert.deepEqual(open.report.alternatives[0].programMeaningAudit.publicSharedAccess.needsReview,[]);
 assert.notEqual(blocked.baseline.compiled.geometrySha256,open.baseline.compiled.geometrySha256);
 assert.equal(verifyCompiled(open.baseline.design,open.baseline.compiled),true);
 // This improvement is from an explicitly authored relation, not a host rewrite.
 assert.deepEqual(p.children[1],room('gallery','Public exhibition room','public','staff','east'));
 checkSafe(blocked.report);checkSafe(open.report);
});

test('expanded multi-layout comparison exports distinct unapproved B143 scenes and receipts',t=>{
 const root=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'r190ai-export-')));
 t.after(()=>{
  assert.equal(path.dirname(root),fs.realpathSync.native(os.tmpdir()));
  assert(path.basename(root).startsWith('r190ai-export-'));
  fs.rmSync(root,{recursive:true,force:true});
 });
 const out=path.join(root,'new-unapproved');
 const result=writeR190AGComparison(out,{maxLayoutVariantsPerStrategy:2});
 assert.equal(result.maxLayoutVariantsPerStrategy,2);
 const summary=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
 assert.equal(summary.maxLayoutVariantsPerStrategy,2);
 assert(summary.studies.some(s=>s.comparison.ag.alternatives.some(a=>
  a.layoutVariantIndex===1&&a.baselineGeometrySha256)));
 for(const s of summary.studies){
  assert.equal(s.comparison.ag.proposalApproved,false);
  for(const a of s.comparison.ag.alternatives.filter(a=>a.proposal)){
   const tag=a.layoutVariantIndex>0?'-layout'+a.layoutVariantIndex:'';
   const file=path.join(out,s.case,a.strategy+tag+'-UNAPPROVED-glass.b143.json');
   const b143=JSON.parse(fs.readFileSync(file,'utf8'));
   assert.equal(compileDesign(b143).geometrySha256,a.proposal.hostDerivedGeometrySha256);
   assert(fs.statSync(file.replace('.b143.json','.html')).size>200);
  }
 }
 assert.throws(()=>writeR190AGComparison(out,{maxLayoutVariantsPerStrategy:2}),
  /NEW_ABSOLUTE_OUTPUT_REQUIRED/);
});
