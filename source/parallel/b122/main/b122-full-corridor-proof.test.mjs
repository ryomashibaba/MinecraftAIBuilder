import test from 'node:test';
import assert from 'node:assert/strict';
import {auditB122TwoWideNetwork,auditB122FullRoute} from './b122-full-corridor-proof.mjs';
const p=(x,z)=>({x,z}),k=p=>p.x+','+p.z;
function example(){
 const cells=[];for(let x=3;x<=7;x++)for(let z=4;z<=5;z++)cells.push(p(x,z));
 const sourceWalk=new Set(['7,4','7,5']);
 const stage=new Set(['4,4','4,5']);
 return {candidate:{start:p(3,4),goal:p(6,4),routeFootprint:cells,
   addedCells:cells.filter(q=>!sourceWalk.has(k(q)))},
  landing:[p(2,4),p(2,5)],side:'LOWER',level:0,
  floor:{footprintRows:Array(12).fill('1'.repeat(12)),rooms:[]},
  cores:[],sourceWalk,stagedWalk:stage,
  removedStaged:new Set(['4,4','4,5']),
  otherStairCells:new Set(),apertureCells:new Set(),solidVoxels:[],
  foreignTreads:[],foreignSupports:[]};
}
test('independent full-length two-wide path to protected source root is not a physical certificate',()=>{
 const r=auditB122FullRoute(example());
 assert.equal(r.status,'NO_DETECTED_CONFLICT_IN_SCOPED_PROXIES',JSON.stringify(r.issueCodes));
 assert.equal(r.routeFootprintCells,10);assert.equal(r.newRouteCells,8);
 assert.equal(r.removableB114Cells,2);
 assert.equal(r.actualEducationCollisionCertified,false);
 assert.equal(r.realFloorSupportCertified,false);
 assert.equal(r.rootToAllOtherStairsCertified,false);
});
test('full corridor catches a protected room and a displaced staged aperture',()=>{
 const a=example();a.floor.rooms=[{x:5,z:4,width:1,depth:1}];
 assert(auditB122FullRoute(a).issueCodes.includes('CORRIDOR_OVER_PROTECTED_ROOM'));
 const b=example();b.apertureCells.add('5,5');
 assert(auditB122FullRoute(b).issueCodes.includes('CORRIDOR_OVER_STAGED_APERTURE'));
});
test('full two-block headroom scan detects B105 static wall on interior segment',()=>{
 const a=example();a.solidVoxels=[{x:5,y:2,z:5,kind:'WALL_PROXY'}];
 assert(auditB122FullRoute(a).issueCodes.includes('FULL_CORRIDOR_B105_HEADROOM_CLASH'));
});
test('protect other stair tread and support boxes throughout corridor, not just landing',()=>{
 const a=example();a.foreignSupports=[{x:4.5,y:1,z:4,width:.2,height:2,depth:.5}];
 assert(auditB122FullRoute(a).issueCodes.includes('FULL_CORRIDOR_FOREIGN_STAIR_SUPPORT_OR_TREAD_CLASH'));
});
test('reject orphan route cell and terminal not rooted to original source',()=>{
 const a=example();a.candidate={...a.candidate,routeFootprint:[...a.candidate.routeFootprint,p(10,10)]};
 assert(auditB122FullRoute(a).issueCodes.includes('STRANDED_ROUTE_CELLS'));
 const b=example();b.sourceWalk=new Set(['10,10','10,11']);
 assert(auditB122FullRoute(b).issueCodes.includes('GOAL_NOT_ROOTED_TO_PROTECTED_SOURCE_GALLERY'));
});
test('staged reservations cannot revoke an immutable source cell',()=>{
 const a=example();a.stagedWalk.add('7,4');a.removedStaged.add('7,4');
 assert.throws(()=>auditB122FullRoute(a),/B122_SOURCE_CELL_REMOVAL_FORBIDDEN/);
});
test('staged network compares rooted 2-wide reachability before and after plan',()=>{
 const source=new Set(['0,0','0,1','1,0','1,1']);
 const stage=new Set(['2,0','2,1','3,0','3,1']);
 const base=auditB122TwoWideNetwork({sourceWalk:source,stagedWalk:stage});
 const after=auditB122TwoWideNetwork({sourceWalk:source,stagedWalk:stage,
  removedStaged:new Set(['2,0'])});
 assert(base.rootReachedStagedCells>after.rootReachedStagedCells);
 assert(after.networkIsReadOnly&&after.rootConnectivityProvedForAllOriginalStairs===false);
});
