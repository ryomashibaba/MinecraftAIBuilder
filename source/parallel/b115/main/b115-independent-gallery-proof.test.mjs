import test from 'node:test';
import assert from 'node:assert/strict';
import {checkB115Footprint} from './b115-independent-gallery-proof.mjs';
const p=(x,z)=>({x,z}),key=q=>q.x+','+q.z;
function scenario(){
 const footprint=[];for(let x=6;x<=10;x++)for(let z=5;z<=6;z++)footprint.push(p(x,z));
 const walk=new Set([key(p(10,5)),key(p(10,6))]),allowed=new Set();
 for(let x=0;x<20;x++)for(let z=0;z<20;z++)allowed.add(key(p(x,z)));
 return {plan:{status:'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',landing:[p(5,5),p(5,6)],startAnchor:p(6,5),goalAnchor:p(9,5),fullFootprintCells:footprint,addedCells:footprint.filter(q=>!walk.has(key(q)))},walk,allowed};
}
test('independent 2x2 connectivity and exact source-gallery delta',()=>{
 const s=scenario(),r=checkB115Footprint(s.plan,{allowed:s.allowed,walk:s.walk,ascent:{dx:1,dz:0},upper:true});
 assert.equal(r.status,'SOURCE_CONSTRAINED_TOPOLOGY_PASS');
 assert.equal(r.twoWideTopologyVerified,true);assert.equal(r.physicalWalkabilityCertified,false);
});
test('reject disconnected additions, invalid goal, wrong starting landing and duplicate cells',()=>{
 const s=scenario(),q=s.plan;
 const cases=[
 [{...q,fullFootprintCells:[...q.fullFootprintCells,p(18,18)]},'UNREACHABLE_EXTRA_FOOTPRINT_CELLS'],
 [{...q,addedCells:[...q.addedCells,p(1,1)]},'ADDITION_OUTSIDE_FOOTPRINT'],
 [{...q,goalAnchor:p(16,16)},'GOAL_SQUARE_MISSING'],
 [{...q,startAnchor:p(5,5)},'START_ANCHOR_NOT_AT_LANDING_EXIT'],
 [{...q,landing:[p(5,5),p(5,7)]},'LANDING_NOT_TWO_ADJACENT_CELLS'],
 [{...q,fullFootprintCells:[...q.fullFootprintCells,q.fullFootprintCells[0]]},'DUPLICATE_FOOTPRINT_CELL']
 ];
 for(const [bad,code]of cases){const x=checkB115Footprint(bad,{allowed:s.allowed,walk:s.walk,ascent:{dx:1,dz:0},upper:true});assert(x.errors.includes(code),code)}
});
test('reject protected floor and isolated fake gallery, never claim physical certification',()=>{
 const s=scenario(),blocked=new Set(s.allowed);blocked.delete(key(p(8,5)));
 assert(checkB115Footprint(s.plan,{allowed:blocked,walk:s.walk}).errors.includes('FOOTPRINT_NOT_IN_ALLOWED_MASK'));
 const disconnected=new Set([key(p(17,17)),key(p(17,18))]);
 assert(checkB115Footprint(s.plan,{allowed:s.allowed,walk:disconnected}).errors.includes('GOAL_NOT_TWO_WIDE_CONNECTED_TO_SOURCE_GALLERY'));
 const local=checkB115Footprint(s.plan);
 assert.equal(local.status,'LOCAL_TOPOLOGY_ONLY');assert.equal(local.sourceAllowedMaskVerified,false);
 assert.equal(local.sourceGalleryTerminalVerified,false);assert.equal(local.physicalWalkabilityCertified,false);
});
