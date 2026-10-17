import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCollisionWorld,createFixture,planFractionalWalk,
 actualStairRegion,runCollisionLab,verifyCollisionLab}
 from '../source/ai/b168-fractional-collision-lab.mjs';
import {buildInterlevelNetwork} from '../source/ai/b166-interlevel-network.mjs';
import {readDopplerR0} from './build-b160-site.mjs';

test('fractional AABB fixtures distinguish half-height, full-height, low ceiling and solid barriers',()=>{
 const fixtures=['half-step','full-step','low-ceiling','lateral-wall'].map(createFixture);
 const got=fixtures.map(f=>planFractionalWalk(f.world,f.start,f.goal));
 assert.deepEqual(got.map(x=>x.reachable),[true,false,false,false]);
 assert.equal(got[0].moves,10);
 assert.equal(got[0].profile.width,2);
 assert.equal(got[0].profile.depth,2);
 assert.equal(got[0].profile.maxStepHeight,.5);
 for(const r of got){
  assert.equal(r.physicsCertified,false);
  assert.equal(r.actualMinecraftCollisionCertified,false);
  assert.equal(r.wholeBodySupportCertified,false);
  assert.match(r.sourceGeometrySha256,/^[0-9a-f]{64}$/);
 }
 assert.equal(got[1].status,'NO_SIMPLIFIED_AABB_ROUTE');
 assert.equal(got[2].status,'INVALID_ENDPOINT_SUPPORT_OR_HEADROOM');
 assert.equal(got[3].status,'NO_SIMPLIFIED_AABB_ROUTE');
 const full=fixtures[1];
 const allowed=planFractionalWalk(full.world,full.start,full.goal,
  {maxStepHeight:1});
 assert.equal(allowed.reachable,true);
 assert(allowed.path.every(v=>v.length===3));
});
test('malformed AABB shapes, disallowed actor sizes and fake half-step locations fail closed',()=>{
 assert.throws(()=>createCollisionWorld([[0,0,0,1,0,1]],
  {region:{x:[0,2],y:[0,2],z:[0,2]}}),/B168_INVALID_BOXES/);
 const f=createFixture('half-step');
 assert.throws(()=>planFractionalWalk(f.world,f.start,f.goal,
  {width:0}),/B168_INVALID_PROFILE/);
 assert.throws(()=>planFractionalWalk(f.world,
  [1.25,1,0],f.goal),/B168_INVALID_ENDPOINTS/);
 const p=planFractionalWalk(f.world,f.start,f.goal);
 assert.equal(p.reachable,true);
 const copy=structuredClone(p);
 copy.actualMinecraftCollisionCertified=true;
 assert.equal(copy.actualMinecraftCollisionCertified,true);
 assert.equal(p.actualMinecraftCollisionCertified,false);
});
test('B166 original has NO half-block geometry; review only the exact source-authored stair cells',()=>{
 const d=readDopplerR0(),frozen=JSON.stringify(d);
 const b=buildInterlevelNetwork(d);
 const regions=['north','south'].map(wing=>actualStairRegion(b.compiled,wing));
 assert.equal(JSON.stringify(d),frozen);
 assert.equal(regions.length,2);
 assert(regions.every(r=>r.world.boxes.length>300));
 assert.deepEqual(regions.map(r=>r.start),[[30,19,15],[79,19,73]]);
 assert.deepEqual(regions.map(r=>r.goal),[[30,26,30],[79,26,88]]);
 assert(regions.every(r=>r.world.boxes.every(v=>v.every(Number.isInteger))));
 const lab=runCollisionLab(d),p=lab.report;
 assert.equal(JSON.stringify(d),frozen);
 assert.equal(p.actualMinecraftCollisionCertified,false);
 assert.equal(p.exactMovementPhysicsCertified,false);
 assert.equal(p.minecraftHalfBlockShapesLoaded,false);
 assert.equal(p.halfSlabFixturesOnly,true);
 assert.equal(p.originalB166ModelUnchanged,true);
 assert.equal(p.constructionApproved,false);
 assert.equal(p.worldContacts,0);
 assert.equal(p.BuildPlan.operations.length,0);
 assert(p.gates.every(x=>x==='BLOCKED'));
 assert(verifyCollisionLab(d,p));
 const forged=structuredClone(p);
 forged.actualMinecraftCollisionCertified=true;
 assert.equal(verifyCollisionLab(d,forged),false);
});
