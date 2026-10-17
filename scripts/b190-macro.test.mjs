import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {MAX_CELLS} from '../source/ai/b143-building-dsl.mjs';
import {buildB189} from '../source/ai/b189-skyport-annex.mjs';
import {buildB190,evaluateSourceGateway,verifyB190Report,MODEL_OFFSET,GATEWAY} from '../source/ai/b190-source-gateway.mjs';
import {buildB190Preview} from './b190-build-preview.mjs';
test('safe offline placement proves two independent original building voxel sets do not overlap',()=>{
 const p=buildB190(),r=p.report,g=p.gateway;
 assert.equal(r.mainOccupiedCells,142773);assert.equal(r.annexOccupiedCells,19152);
 assert.equal(r.genuineIndependentBuildings,2);
 assert.equal(r.original17AuthoredB143Modules,17);
 assert.equal(g.virtualIndependentSum,161925);
 assert.equal(g.modelToModelOccupiedCellCollisionCount,0);
 assert.equal(g.originalMainModelPreserved,true);
 assert.equal(g.originalAnnexModelPreserved,true);
 assert.equal(g.offset.placementSpace,'OFFLINE_REVIEW_COORDINATES');
 assert.equal(g.offset.worldPlacementAuthorized,false);
 assert.equal(r.mainMonolith160kLimitPreserved,MAX_CELLS);
 assert.equal(r.annexSeparate160kLimitPreserved,MAX_CELLS);
 assert.equal(r.neverCombinedIntoOneB143Monolith,true);
 assert(verifyB190Report(r));
});
test('all four shared-level candidate paths are checked fail-closed, no fictitious bridge success',()=>{
 const p=buildB190(),g=p.gateway,r=p.report;
 assert.equal(p.gatewayReviews.length,4);
 assert.deepEqual(p.gatewayReviews.map(q=>q.evaluatedStandingY),[73,69,65,61]);
 assert.equal(r.passedSourceConnectionOptions,2);
 assert.equal(r.rejectedSourceConnectionOptions,2);
 for(const item of p.gatewayReviews){
  assert.equal(item.modelToModelOccupiedCellCollisionCount,0);
  assert.equal(item.originalMainModelPreserved,true);
  assert.equal(item.originalAnnexModelPreserved,true);
  assert.equal(item.actualInGameWalkingCertified,false);
  assert.equal(item.actualMinecraftWorldPlacementCertified,false);
  assert.equal(item.actualTerrainAndStructuralSafetyCertified,false);
  if(item.reviewStatus==='HOLD_NO_COLLISION_FREE_SOURCE_DETOUR'){
   assert.equal(item.allBridgeStationsSourceSupported,false);
   assert.equal(item.full2wide2highStations,0);
   assert.equal(item.candidateBridgeNewCells,0);
  }else{
   assert.equal(item.reviewStatus,'SOURCE_GEOMETRY_APPROACH_VALIDATED');
   assert.equal(item.allBridgeStationsSourceSupported,true);
   assert(item.full2wide2highStations>=30);
   assert(item.candidateBridgeNewCells>10);
   assert(item.candidateBridgeNewCells<=GATEWAY.sourceOnlyMaxNewCells);
  }
  assert.match(item.newBridgeGeometrySha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(g.reviewStatus,r.gatewayReviewStatus);
 assert.equal(r.actualPlayerBridgeTraverseCertified,false);
 assert.equal(r.constructionApproved,false);
});
test('disallow unsafe, arbitrary or misrepresented offline placement parameters',()=>{
 const {parent,annex}=buildB189();
 for(const changed of [
  {...MODEL_OFFSET,sourceLocalDeltaX:1},
  {...MODEL_OFFSET,sourceLocalDeltaX:400},
  {...MODEL_OFFSET,sourceLocalDeltaY:1},
  {...MODEL_OFFSET,sourceLocalDeltaZ:8},
  {...MODEL_OFFSET,placementSpace:'MINECRAFT_WORLD'},
  {...MODEL_OFFSET,worldPlacementAuthorized:true}
 ]){
  assert.throws(()=>evaluateSourceGateway(parent.compiled,annex.compiled,changed),/B190_/);
 }
});
test('historical main/annex integrity and non-executable construction guards are strict',()=>{
 const p=buildB190(),r=p.report;
 assert.equal(r.original21SupportedMainPublicWaypoints,21);
 assert.equal(r.original30ProofBackedSourceRouteEdges,30);
 assert.equal(r.originalAnnexFiveFloors,5);
 assert.equal(r.originalAnnex190TwoWideMoves,190);
 assert.equal(r.unchangedOriginal36GalleryModels,true);
 assert.equal(r.unchangedB172ThroughB189Sources,true);
 for(const change of [
  x=>x.worldWrites=1,x=>x.worldContacts=1,x=>x.worldCoordinates=[1,2,3],
  x=>x.constructionApproved=true,x=>x.readiness='PREPARED',
  x=>x.gates[0]='PASS',x=>x.BuildPlan.operations.push({cmd:'fill'}),
  x=>x.actualMinecraftPositionDetermined=true,
  x=>x.actualPlayerBridgeTraverseCertified=true,
  x=>x.physicalCollisionAndTerrainCertified=true]){
  const fake=structuredClone(r);change(fake);
  assert.equal(verifyB190Report(fake),false);
 }
});
test('full offline five-scene review remains operable and evidence panel is local-only',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b190-'));
 try{
  const m=buildB190Preview({dir}),p=buildB190();
  assert.equal(m.viewerSceneCount,5);
  assert.equal(m.numberOfActualNew3dScenes,2);
  assert.equal(m.newConceptModelTotalOutsideHistoric36,38);
  assert.equal(m.annexReal3dCells,19152);
  assert.equal(m.gatewayStations,p.report.candidateGatewaySourceStations);
  assert.equal(m.gatewayProposalOnly,true);
  assert.equal(m.mainModelCapUnchanged,160000);
  assert.equal(m.worldWrites,0);assert.equal(m.constructionApproved,false);
  assert.equal(m.readiness,'NOT_PREPARED');
  assert.deepEqual(m.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(m.BuildPlan.operations,[]);
  const modules=JSON.parse(fs.readFileSync(path.join(dir,'B190_DESIGN_MODULES.json')));
  assert.equal(modules.modules.length,17);
  assert.equal(modules.modules[16].id,'horizon-dock-annex');
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  for(const s of ['overview','low','upper','ring'])
   assert(html.includes('id="b190-'+s+'"'));
  assert(html.includes('id="b190-gateway-proof"'));
  assert(html.includes('OFFLINE_REVIEW_COORDINATES'));
  assert(html.includes('HORIZON DOCK'));
  assert(!html.includes('fetch(')&&!html.includes('new WebSocket('));
  const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert(js);assert.doesNotThrow(()=>new vm.Script(js));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
