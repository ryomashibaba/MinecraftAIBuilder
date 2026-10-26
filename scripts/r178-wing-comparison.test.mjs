import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeR178SyntheticReply,buildR178WingComparisons,
 saveR178WingComparisons} from './r178-wing-comparison.mjs';
import {parseR178CourtyardReply,validateR178WingReply}
 from '../source/ai/r178-wing-courtyard.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
const base={
 id:'r178-host-unit',title:'Physical courtyard office',
 footprint:{width:32,depth:32},
 materials:{floor:'stone',wall:'concrete',roof:'metal'},
 layout:{axis:'z',spaces:[
  {id:'studio',purpose:'Working area',weight:4},
  {id:'quiet',purpose:'Quiet area',weight:3},
  {id:'library',purpose:'Reference materials',weight:2},
  {id:'storage',purpose:'Equipment storage',weight:1}
 ]},
 form:{roofProfile:'flat',facadeLanguage:'plain'},
 objects:[
  {id:'desk',zoneId:'studio',role:'work-surface',corner:'near-left'},
  {id:'chair',zoneId:'quiet',role:'seating',corner:'far-right'},
  {id:'shelf',zoneId:'library',role:'storage-rack',corner:'near-left'},
  {id:'tools',zoneId:'storage',role:'equipment-bank',corner:'far-right'}
 ],
 relations:{entryFacingZoneId:'studio',
  directAdjacencies:[['studio','quiet'],['library','storage']]},
 architecture:{schema:'minecraftaibuilder-r178-wing-court-ir-v1',
  westWing:['studio','quiet'],eastWing:['library','storage'],
  roofYs:{west:9,east:12},bridge:'front'}
};
const request={naturalLanguageBrief:'Synthetic test courtyard'};
const clone=x=>structuredClone(x);
const parse=x=>parseR178CourtyardReply(JSON.stringify(x),request);

test('R178 independently builds two physical wings, a roofless usable court and direct door pairs',()=>{
 const review=buildR178WingComparisons();
 assert.equal(review.NOT_REAL_MODEL_EVIDENCE,true);
 assert.equal(review.syntheticCases,3);
 assert.equal(review.realModelCalls,0);
 assert.equal(review.worldWrites,0);
 for(const {result:p,audit} of review.cases){
  assert.ok(verifyCompiled(p.design,p.compiled));
  assert.equal(p.program[0].zones.length,4);
  assert.equal(p.r178WingEvidence.legacyR168FourRoomGridUsed,false);
  assert.equal(p.r178WingEvidence.originalR134StripUsed,false);
  assert.deepEqual(p.r178WingEvidence.wingRoomAssignment.west.length,2);
  assert.deepEqual(p.r178WingEvidence.wingRoomAssignment.east.length,2);
  assert.equal(p.placements.length,4);
  assert.equal(p.r178WingEvidence.courtyardUnroofed,true);
  assert.equal(p.r178WingEvidence.courtWalkSourceSupported,true);
  assert.equal(audit.separatedRoomWings,2);
  assert.equal(audit.modelRequestedDirectDoors,2);
  assert.equal(audit.actualPhysicalSharedWallDoors,2);
  assert.equal(p.sourceRouteAudit.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.ok(p.sourceRouteAudit.zones.every(z=>z.reachedFromEntrance));
  assert.ok(p.sourceRouteAudit.featureAccess.every(z=>z.reachableFromEntrance));
  assert.ok(p.design.elements.length<=160);
  assert.equal(p.readiness,'NOT_PREPARED');
  assert.equal(p.executionAllowed,false);
  assert.equal(p.constructionApproved,false);
  assert.equal(p.worldWrites,0);
  assert.equal(p.worldContacts,0);
  assert.deepEqual(p.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(p.BuildPlan.operations,[]);
 }
});

test('R178 caller composition cannot be silently retargeted to fit an invalid adjacency or wing assignment',()=>{
 const correct=parse(base);
 assert.ok(correct.rawSourceString.includes('studio'));
 assert.equal(correct.modelAuthenticity,'CALLER_PROVIDED_UNVERIFIED');
 assert.ok(correct.originalRawSha256);
 assert.equal(correct.designOnlySource.r178WingEvidence.geometryAuthorship,
  'HOST_COMPILED_FROM_EXPLICIT_WING_IR');
 const wrongPair=clone(base);
 wrongPair.relations.directAdjacencies=[['studio','library']];
 assert.throws(()=>parse(wrongPair),/R178_WING_COURT_DIRECT_MODEL_PAIR_MUST_SHARE_REAL_WING_WALL/);
 const duplicate=clone(base);
 duplicate.architecture.eastWing[0]='studio';
 assert.throws(()=>parse(duplicate),/R178_WING_COURT_WING_ROOM_ASSIGNMENT/);
 const impossible=clone(base);
 impossible.architecture.bridge='middle';
 assert.throws(()=>parse(impossible),/R178_WING_COURT_WING_COMPOSITION_IR/);
 const tooSmall=clone(base);
 tooSmall.footprint.width=27;
 assert.throws(()=>parse(tooSmall),/R178_WING_COURT_FIRST_PILOT_NEEDS_30_TO_32_AND_FOUR_ACTUAL_ROOMS/);
 const irregular=clone(base);
 irregular.architecture.roofYs.west=14;
 assert.throws(()=>validateR178WingReply(JSON.stringify(irregular),request),
  /R178_WING_COURT_WING_COMPOSITION_IR/);
 const extra=clone(base);
 extra.architecture.worldCoordinates=[0,0,0];
 assert.throws(()=>parse(extra),/R178_WING_COURT_WING_COMPOSITION_IR/);
});

test('R178 creates three source-only 3D previews and 15 true voxel elevations without overwriting',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r178-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const out=path.join(dir,'source-review');
 const report=saveR178WingComparisons(out);
 assert.equal(report.cases.length,3);
 assert.equal(report.NOT_REAL_MODEL_EVIDENCE,true);
 assert.ok(fs.readFileSync(path.join(out,'index.html'),'utf8')
  .includes('静的な合成入力'));
 for(const id of ['home','shop','laboratory']){
  assert.ok(fs.existsSync(path.join(out,id+'.html')));
  for(const view of ['front','rear','east','west','roof']){
   const contents=fs.readFileSync(path.join(out,id+'-'+view+'.svg'),'utf8');
   assert.ok(contents.startsWith('<svg'),id+' '+view);
  }
 }
 assert.throws(()=>saveR178WingComparisons(out),/R178_COURTYARD_PILOT_NEW_OUTPUT_DIR_REQUIRED/);
});
