import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BLOCKER_INDEX,extractR106TableUnit,reflowR106SourceTable,
 buildR106ReadingTableReflowStudy}
 from './b198zr106-reading-table-doorway-reflow.mjs';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const topKind='right_R87_READING_TABLE_NOT_OCCUPANCY',
 sideKind='right_R87_TABLE_SIDE';
const nodeSet={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
const tri=(a,b,c,kind)=>({a,b,c,kind});
test('R106 quick: isolate seven actual table facets; clearance requires real change',()=>{
 const m0=[.54,0,-.1],m1=[.572,0,-.1],e0=[.543,0,.1],e1=[.569,0,.1];
 const base=Array.from({length:4692},()=>tri([2,-3,-1],[3,-3,-1],[2,-3,1],'unrelated_original'));
 base[4100]=tri(m0,m1,e1,'right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED');
 base[4101]=tri(m0,e1,e0,'right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED');
 base[4102]=tri([.35,0,-.25],[.85,0,-.25],[.85,0,.25],'right_reading_terrace');
 base[4103]=tri([.35,0,-.25],[.85,0,.25],[.35,0,.25],'right_reading_terrace');
 const t=[[.53,.025,-.11],[.58,.025,-.11],[.555,.025,.11]];
 const low=t.map(p=>[p[0],0,p[2]]);
 const group=[tri(...t,topKind)];
 for(let i=0;i<3;i++){
  const j=(i+1)%3;
  group.push(tri(low[i],low[j],t[j],sideKind),
   tri(low[i],t[j],t[i],sideKind));
 }
 base.splice(BLOCKER_INDEX,7,...group);
 const unit=extractR106TableUnit(base);
 assert.equal(unit.faces.length,7);
 assert.equal(unit.sourceIndices[0],BLOCKER_INDEX);
 assert.deepEqual(unit.sourceIndices.at(-1),BLOCKER_INDEX+6);
 assert.throws(()=>extractR106TableUnit(base,BLOCKER_INDEX+1),/R87_SEVEN_FURNITURE_TRIANGLES_CHANGED/);
 const fake={sourceFaces:base,faces:base,report:{
  sourceR98ExactPrefix:true,sourceR98MeshSHA256:sha(base),
  actualR91OverheadFirstHit:{
   sourceTriangle:BLOCKER_INDEX,sourceKind:topKind,intersection:[.556,.025,0]},
  originalR91Screen:{coverageComplete:true}
 }};
 const study=reflowR106SourceTable(fake),r=study.report;
 assert.equal(r.targetedHistoricSourceTriangleIndices.length,7);
 assert.equal(r.sourceR98Sha256,sha(base));
 assert.equal(r.historicR98RetainedSeparately,true);
 assert.equal(r.onlyOneSevenTriangleR87TableTargeted,true);
 assert.equal(r.beforeRoute.coverageComplete,true);
 assert(r.beforeRoute.overhead>0);
 assert(r.afterRoute.overhead<r.beforeRoute.overhead);
 assert.equal(r.afterRoute.floor,0);
 assert.equal(r.afterRoute.lateral,0);
 assert.notEqual(r.activeR106Sha256,r.sourceR105Sha256);
 assert(['SUPPORTED_R87_TABLE_RELOCATED_HEADROOM_GAIN_ART_HOLD',
  'ONE_OBSTRUCTING_R87_TABLE_WITHHELD_HEADROOM_GAIN_ART_HOLD'].includes(r.correctionMode));
 assert.equal(r.personVolumeAndContinuousWalkingCertified,false);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R106 real source: one table unit reflow, original 4692 faces preserved separately',()=>{
 const study=buildR106ReadingTableReflowStudy(nodeSet),r=study.report;
 assert.equal(r.targetedOriginalFurnitureKind,topKind);
 assert.equal(r.targetedHistoricSourceTriangleIndices.length,7);
 assert.equal(r.historicR98SourceFaces.length,4692);
 assert.equal(r.historicR98RetainedSeparately,true);
 assert.equal(r.restOfReadingProgramUnchanged,true);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.architecturalAesthetics,'NOT_REVIEWED');
 assert.equal(r.noArtificialRoofOrFloorGenerated,true);
 assert.equal(r.sourceTableRemovedFromR106Only,r.activeR106Sha256!==r.sourceR105Sha256);
 assert(r.beforeRoute.overhead>0);
 if(r.sourceTableRemovedFromR106Only){
  assert(r.afterRoute.overhead<r.beforeRoute.overhead);
  assert(r.afterRoute.floor<=r.beforeRoute.floor);
  assert(r.afterRoute.lateral<=r.beforeRoute.lateral);
 }
 console.log('R106_READING_TABLE_SOURCE_REFLOW',JSON.stringify({
  collisionIndex:r.targetedHistoricSourceTriangleIndices,
  prior:r.beforeRoute,after:r.afterRoute,mode:r.correctionMode,
  moved:r.sourceFurnitureRelocatedTo,
  originalR98Sha:r.sourceR98Sha256,
  candidateCount:r.candidateDisplacements.length,
  validMoves:r.candidateDisplacements.filter(x=>
   x.improvesHeadroomWithoutOtherProbeRegression).map(x=>[x.dx,x.dz])
 }));
});
