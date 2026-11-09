import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
import {selectB105AndB111JointCandidate} from './b111-b105-joint-anchor-candidate.mjs';
const hotel=()=>({level:1,roomId:'S005',roomRectangle:{x:19,z:3,width:10,depth:4},
 doorInterior:{x:20,z:5},sourceFixtureAnchors:[{x:27,y:6,z:4},{x:26,y:6,z:4}],
 furniture:[{fixtureIndex:0,role:'bed',anchor:{x:27,z:4},
 footprint:[{x:27,z:4},{x:27,z:5}]},
 {fixtureIndex:1,role:'bed',anchor:{x:26,z:4},
 footprint:[{x:26,z:4},{x:25,z:4}]}]});
test('joint candidate preserves full B105 1-wide AND connected B111 2x2 on 10x4 hotel example',()=>{
 const r=hotel(),s=JSON.stringify(r);
 const result=selectB105AndB111JointCandidate(r);
 assert.equal(result.status,'UNADOPTED_JOINT_B105_B111_SOURCE_ONLY');
 assert.equal(result.totalAnchorShift,2);
 assert.equal(result.maxAnchorShift,1);
 assert.equal(result.passes,1);
 const candidate=r.furniture.map((f,i)=>({...f,
  anchor:result.fixtureChanges[i].researchAnchor,
  footprint:result.fixtureChanges[i].researchFootprint}));
 assert.equal(auditRoomTwoWide({...r,furniture:candidate}).status,'2W_PROXY_CLEAR');
 assert.equal(JSON.stringify(r),s);
 assert.equal(result.worldWrites,0);
});
test('reject manipulated B110 original anchor',()=>{
 const room=hotel();room.sourceFixtureAnchors[1].x++;
 assert.throws(()=>selectB105AndB111JointCandidate(room),/SOURCE_CONTRACT/);
});
