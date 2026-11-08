import test from 'node:test';
import assert from 'node:assert/strict';
import {findR109LocalFloorDatum,buildR109RealFloorReferencedStudy}
 from './b198zr109-realfloor-referenced-r91-route.mjs';
const T=(a,b,c,kind)=>({a,b,c,kind});
const floor='right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R109 quick: only exact existing floor layers provide bounded foot datum',()=>{
 const a=[0,.012,0],b=[1,.012,0],c=[0,.012,1];
 const ground=T(a,b,c,'right_reading_terrace');
 const top=T([0,.019,0],[1,.019,0],[0,.019,1],floor);
 const unrelated=T([0,.03,0],[1,.03,0],[0,.03,1],'right_R87_READING_TABLE_NOT_OCCUPANCY');
 const p=[.2,.010,.2];
 const q=findR109LocalFloorDatum([ground,top,unrelated],p);
 assert.equal(q.kind,floor);
 assert.equal(q.sourceTriangle,1);
 assert.equal(q.proposedFootY,.022);
 assert.equal(findR109LocalFloorDatum([unrelated],p),null);
 assert.equal(findR109LocalFloorDatum([ground],[5,.01,5]),null);
 assert.throws(()=>findR109LocalFloorDatum([],[NaN,0,0]),/FINITE_ACTUAL/);
});
test('R109 real: compare exact R94 and R87 floor hits without moving a source triangle',()=>{
 const report=buildR109RealFloorReferencedStudy(nodes);
 assert.equal(report.sourceGeometryChanged,false);
 assert.equal(report.originalFacesRetainedByteForByte,true);
 assert.equal(report.overheadBefore,2);
 assert.deepEqual(report.sourceHitKinds,[
  'right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE',
  'right_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE'
 ]);
 assert.equal(report.lanes.length,5);
 assert.equal(report.safety.readiness,'NOT_PREPARED');
 assert.deepEqual(report.safety.BuildPlan.operations,[]);
 assert.equal(report.artQuality,'NOT_REVIEWED');
 assert.equal(report.realWorldHumanWalkingCertified,false);
 assert(report.conditionalProxyOverheadAfter<=report.overheadBefore);
 for(const lane of report.lanes)if(lane.accepted){
  assert(lane.exactFloorUnderProposedRoute);
  assert(lane.candidate.overhead<lane.previous.overhead);
  assert(lane.candidate.floor<=lane.previous.floor);
  assert(lane.candidate.lateral<=lane.previous.lateral);
 }
 console.log('R109_REAL_SOURCE_FOOT_DATUM',JSON.stringify({
  conclusion:report.conclusion,old:report.overheadBefore,
  conditional:report.conditionalProxyOverheadAfter,
  accepted:report.verifiedFloorDatumLanes,
  lanes:report.lanes.map(x=>({o:x.offset,reason:x.reason,
   proposed:x.proposed,accepted:x.accepted,
   old:x.previous,new:x.candidate,grade:x.grade,
   surfaces:x.sourceFloorAtEnds?.map(t=>t?.kind)||[]}))
 }));
});
