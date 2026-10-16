import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeVerticalCandidates,verifyVerticalCandidates} from '../source/ai/b150-vertical-candidates.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign,makeB150Bundle,renderB150Html,WAYPOINTS} from './build-b150-site.mjs';
const box=(id,origin,size)=>({id,mode:'add',shape:'box',material:'stone',origin,size});
const demo=elements=>({
 schema:SCHEMA,id:'test-stair-candidates',title:'候補テスト',brief:'絶対に施工しない。',
 bounds:{width:18,height:18,depth:18},designOnly:true,elements});
test('adjacent supported flat route is geometric only, not world certified',()=>{
 const scene=compileDesign(demo([box('floor',[2,2,2],[7,1,3])]));
 const args={entrance:[3,3,3],destinations:[{id:'other',at:[7,3,3]}]};
 const r=analyzeVerticalCandidates(scene,args);
 assert.equal(r.routes[0].status,'PASS_FLAT_GEOMETRY');
 assert.equal(r.routes[0].stepCandidateCount,0);
 assert.equal(r.routes[0].physicalMovementCertified,false);
 assert(verifyVerticalCandidates(scene,args,r));
});
test('two-step ascent is a candidate and never a proven staircase',()=>{
 const scene=compileDesign(demo([
  box('base',[2,2,2],[2,1,3]),box('step1',[4,3,2],[1,1,3]),
  box('step2',[5,4,2],[1,1,3])]));
 const args={entrance:[3,3,3],destinations:[{id:'upstairs',at:[5,5,3]}]};
 const r=analyzeVerticalCandidates(scene,args);
 assert.equal(r.routes[0].status,'STEP_CANDIDATE_ONLY');
 assert.equal(r.routes[0].stepCandidateCount,2);
 assert(r.routes[0].stepTransitions.every(x=>x.verifiedMinecraftMotion===false));
 assert.equal(r.stairsCertified,false);
 assert.equal(r.constructionApproved,false);
});
test('blocking feet or head invalidates candidate and prevents invented path',()=>{
 const scene=compileDesign(demo([box('floor',[2,2,2],[5,1,3]),
  box('low-roof',[3,4,3],[2,1,1])]));
 const r=analyzeVerticalCandidates(scene,
  {entrance:[3,3,3],destinations:[{id:'blocked',at:[6,3,3]}]});
 assert.equal(r.routes[0].status,'INVALID_ENTRANCE');
 assert.equal(r.routes[0].path.length,0);
});
test('forged safety or altered hash cannot pass source verification',()=>{
 const scene=compileDesign(demo([box('floor',[2,2,2],[5,1,3])]));
 const args={entrance:[3,3,3],destinations:[{id:'other',at:[6,3,3]}]};
 const report=analyzeVerticalCandidates(scene,args);
 const forged=structuredClone(report);forged.stairsCertified=true;
 assert.equal(verifyVerticalCandidates(scene,args,forged),false);
 assert.throws(()=>analyzeVerticalCandidates({...scene,worldContacts:1},args),/B150_UNSAFE/);
 assert.throws(()=>analyzeVerticalCandidates(scene,{...args,maxNodes:999999}),/B150_INVALID_LIMIT/);
});
test('real immutable R2 opens the upper deck from R1, but ascent stays uncertified',()=>{
 const originals=readDesigns(),r1=readInteriorDesign(),r2=readUpperDesign();
 const previous=JSON.stringify([originals,r1]);
 const b=makeB150Bundle(originals,readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),r1,r2);
 assert.equal(JSON.stringify([originals,r1]),previous);
 assert.equal(b.gallery.scenes.length,13);
 assert.equal(b.gallery.scenes[12].id,'stratos-observatory-interior-r2');
 assert.equal(b.newPath.routes[0].status,'PASS_FLAT_GEOMETRY');
 assert.equal(b.newPath.routes[1].status,'STEP_CANDIDATE_ONLY');
 assert.equal(b.newPath.routes[2].status,'STEP_CANDIDATE_ONLY');
 assert(b.newPath.routes[2].stepCandidateCount>=3);
 assert(b.newPath.routes[2].path.some(p=>p.join()==='40,11,17'));
 assert(b.newPath.routes[2].path.some(p=>p.join()==='40,12,18'));
 assert(b.newPath.routes[2].path.some(p=>p.join()==='40,13,19'));
 assert(b.oldPath.routes[2].status!=='STEP_CANDIDATE_ONLY');
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.newPath.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB150Html(b,template);
 for(const token of ['id="b150-route"','id="b150-overlay"','STEP_CANDIDATE_ONLY',
  'index=12;select.value="12";setScene()','NOT_PREPARED'])
  assert(html.includes(token),'missing '+token);
 assert(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'));
});
