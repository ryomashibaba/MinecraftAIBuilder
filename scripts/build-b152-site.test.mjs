import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from '../source/ai/b152-footprint-review.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign,makeB152Bundle,renderB152Html,FOOTPRINT_WAYPOINTS} from './build-b152-site.mjs';
const box=(id,origin,size,mode='add')=>({id,shape:'box',mode,
 ...(mode==='add'?{material:'stone'}:{}),origin,size});
const demo=elements=>({
 schema:SCHEMA,id:'footprint-fixture',title:'Footprint Fixture',
 brief:'Offline local cell geometry only',bounds:{width:24,height:18,depth:24},
 designOnly:true,elements
});
test('a one-cell-wide floor is never promoted to a two-by-two walkable route',()=>{
 const s=compileDesign(demo([box('narrow',[4,2,4],[1,1,10])]));
 const p={start:[4,3,4],destinations:[{id:'end',at:[4,3,12]}],width:2,depth:2};
 const r=analyzeFootprint(s,p);
 assert.equal(r.targets[0].status,'INVALID_START_FOOTPRINT');
 assert.equal(r.targets[0].path.length,0);
 assert.equal(r.playerCollisionCertified,false);
 assert.equal(r.worldContacts,0);
});
test('supported L-shaped platform allows cardinal corner turn without diagonal shortcuts',()=>{
 const s=compileDesign(demo([
  box('vertical',[4,2,4],[4,1,10]),
  box('horizontal',[4,2,10],[12,1,4])
 ]));
 const p={start:[5,3,5],destinations:[{id:'turn-end',at:[12,3,11]}]};
 const r=analyzeFootprint(s,p);
 assert.equal(r.targets[0].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert(r.targets[0].steps>=10);
 assert(r.targets[0].path.every((t,i,a)=>i===0||(
  t[1]===a[i-1][1]&&Math.abs(t[0]-a[i-1][0])+Math.abs(t[2]-a[i-1][2])===1
 )));
 assert.equal(verifyFootprint(s,p,r),true);
 assert.equal(r.stairsCertified,false);
});
test('solid headroom blocks the entire placement, even when the floor width is sufficient',()=>{
 const s=compileDesign(demo([
  box('floor',[4,2,4],[7,1,7]),
  box('overhead',[4,4,4],[7,1,7])
 ]));
 const r=analyzeFootprint(s,{start:[5,3,5],destinations:[{id:'end',at:[9,3,9]}]});
 assert.equal(r.targets[0].status,'INVALID_START_FOOTPRINT');
});
test('blockage and stale safety fields fail source verification',()=>{
 const s=compileDesign(demo([box('floor',[4,2,4],[8,1,8])]));
 const p={start:[4,3,4],destinations:[{id:'end',at:[10,3,10]}]};
 const r=analyzeFootprint(s,p),forged=structuredClone(r);
 forged.targets[0].path[0]=[5,3,4];
 assert.equal(verifyFootprint(s,p,forged),false);
 assert.throws(()=>analyzeFootprint({...s,worldContacts:1},p),/B152_INVALID_SCENE/);
 assert.throws(()=>analyzeFootprint(s,{...p,width:100}),/B152_FOOTPRINT_SIZE_OR_BUDGET/);
 const allowed=analyzeFootprint(s,{...p,maxNodes:1});
 assert(allowed.targets[0].status==='UNKNOWN_SEARCH_LIMIT'||allowed.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY');
});
test('actual immutable R4 adds a newly reachable observation gallery to R3',()=>{
 const designs=readDesigns(),r1=readInteriorDesign(),r2=readUpperDesign(),
  r3=readWideDesign(),r4=readLoopDesign();
 const frozen=JSON.stringify([designs,r1,r2,r3]);
 const b=makeB152Bundle(designs,readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),r1,r2,r3,r4);
 assert.equal(JSON.stringify([designs,r1,r2,r3]),frozen);
 assert.equal(b.gallery.scenes.length,15);
 assert.equal(b.gallery.scenes[13].id,'stratos-observatory-interior-r3');
 assert.equal(b.gallery.scenes[14].id,'stratos-observatory-interior-r4');
 assert.equal(b.oldFootprint.targets[2].status,'INVALID_GOAL_FOOTPRINT');
 assert.equal(b.newFootprint.targets[2].status,'PASS_FLAT_FOOTPRINT_GEOMETRY');
 assert(b.newFootprint.targets[2].steps>=10);
 assert(b.newFootprint.targets[2].path.some(p=>p[0]>42&&p[2]>25));
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.newFootprint.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB152Html(b,template);
 for(const needle of ['id="b152-target"','id="b152-show-footprint"','id="b152-status"',
  'PASS_FLAT_FOOTPRINT_GEOMETRY','index=14;select.value="14";setScene()','NOT_PREPARED'])
  assert(html.includes(needle),'missing '+needle);
 assert(!html.includes('fetch('));
});
