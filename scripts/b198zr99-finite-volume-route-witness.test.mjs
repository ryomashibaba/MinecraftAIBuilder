import test from 'node:test';
import assert from 'node:assert/strict';
import {PROXY,screenR99FiniteRoute,buildR99FiniteVolumeStudy}
 from './b198zr99-finite-volume-route-witness.mjs';

const quad=(y,kind)=>[
 {kind,a:[-2,y,-2],b:[2,y,-2],c:[2,y,2]},
 {kind,a:[-2,y,-2],b:[2,y,2],c:[-2,y,2]}
];
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[-.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],[.68,.64,.73],
  [.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R99 quick: 3 lateral floor/overhead rays distinguish true source surfaces and missing floor',()=>{
 const route=[[-.5,0,0],[.5,0,0]],floor=quad(0,'supported_floor');
 const pass=screenR99FiniteRoute(floor,route);
 assert.equal(pass.witnessCounts.floor,0);
 assert.equal(pass.witnessCounts.overhead,0);
 assert.equal(pass.witnessCounts.lateral,0);
 assert.equal(pass.finite3DSweepCertified,false);
 assert.equal(pass.humanBodyVolumeCertified,false);
 const blocked=screenR99FiniteRoute([...floor,...quad(.075,'source_roof')],route);
 assert(blocked.witnessCounts.overhead>0);
 assert(blocked.examples.some(w=>w.observed.some(q=>q.class==='overhead'&&q.kind==='source_roof')));
 const unsupported=screenR99FiniteRoute(floor,route.map(p=>[p[0],p[1],3]));
 assert(unsupported.witnessCounts.floor>0);
 assert.throws(()=>screenR99FiniteRoute([],route),/ACTUAL_SOURCE_TRIANGLES_REQUIRED/);
 assert.throws(()=>screenR99FiniteRoute(floor,[[0,0,0]]),/VALID_LIMITED_3D_ROUTE_REQUIRED/);
 assert(PROXY.halfWidth>0&&PROXY.height>PROXY.halfWidth);
});
test('R99 full: eight distinct goals screened against actual R98 source triangle mesh (not certified)',()=>{
 const result=buildR99FiniteVolumeStudy(nodes),r=result.results;
 assert.equal(r.sourceR98TriangleCount,4692);
 assert.match(r.originalR98MeshSha256,/^[a-f0-9]{64}$/);
 assert.equal(r.screenedDestinations,8);
 assert.equal(r.readingRooms,7);
 assert.equal(r.loungeGraphIncluded,true);
 assert.equal(r.routes.filter(x=>x.tier===null).length,1);
 assert.deepEqual(new Set(r.routes.map(x=>x.id)).size,8);
 assert(r.routes.every(x=>x.stationCount>0&&x.routeNodes>=2));
 assert.equal(r.actual3DTriangleIntersections,true);
 assert.equal(r.certifiedAccessibleDestinations,0);
 assert.equal(r.pathCollisionFreeCertification,false);
 assert.equal(r.currentArchitecturalStatus,'HOLD_REQUIRES_VALIDATED_FUNCTIONAL_REDESIGN');
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.worldContacts,0);
 assert.equal(r.safety.gates.length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
