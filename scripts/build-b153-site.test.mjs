import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeTransitionEnvelopes,verifyTransitionEnvelopes} from '../source/ai/b153-transition-envelopes.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign,makeB153Bundle,renderB153Html} from './build-b153-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'stone',origin,size});
const design=elements=>({schema:SCHEMA,id:'step-clearance-test',title:'Step Test',
 brief:'Offline geometry only',bounds:{width:24,height:18,depth:24},
 designOnly:true,elements});
const corridor=design([box('lower',[4,2,4],[4,1,3]),
 box('upper',[4,3,7],[4,1,7])]);
test('single-cell full voxel route distinguishes flat segments from uncertified ascent',()=>{
 const scene=compileDesign(corridor);
 const p={start:[5,3,5],destinations:[{id:'upper',at:[5,4,11]}],
  width:1,depth:1};
 const r=analyzeTransitionEnvelopes(scene,p);
 assert.equal(r.routes[0].status,'VERTICAL_CANDIDATE_UNCERTIFIED');
 assert.equal(r.routes[0].stepCandidateCount,1);
 assert.equal(r.routes[0].transitions[0].verifiedMinecraftMotion,false);
 assert.equal(r.jumpCertified,false);
 assert(verifyTransitionEnvelopes(scene,p,r));
});
test('two-by-two body cannot be promoted to a single-cell-rise route across an abrupt ledge',()=>{
 const scene=compileDesign(corridor),p={start:[5,3,5],
  destinations:[{id:'upper',at:[5,4,11]}],width:2,depth:2};
 const r=analyzeTransitionEnvelopes(scene,p);
 assert.equal(r.routes[0].status,'NO_PROVEN_GEOMETRIC_CONNECTION');
 assert.equal(r.routes[0].path.length,0);
 assert(r.fittingAnchors>0);
 assert.equal(r.stairsCertified,false);
 assert.equal(r.constructionApproved,false);
});
test('headroom and floor support must be independently present at every occupied cell',()=>{
 const blocked=compileDesign(design([
  box('lower',[4,2,4],[4,1,3]),box('upper',[4,3,7],[4,1,7]),
  box('overhead',[4,5,8],[4,1,5])
 ]));
 const p={start:[5,3,5],destinations:[{id:'goal',at:[5,4,10]}]};
 const r=analyzeTransitionEnvelopes(blocked,p);
 assert.equal(r.routes[0].status,'INVALID_DESTINATION_ENVELOPE');
});
test('tampered route witnesses, world writes, and invalid search budget fail closed',()=>{
 const scene=compileDesign(corridor),p={start:[5,3,5],
  destinations:[{id:'upper',at:[5,4,11]}]};
 const r=analyzeTransitionEnvelopes(scene,p),forged=structuredClone(r);
 forged.routes[0].transitions[0].verifiedMinecraftMotion=true;
 assert.equal(verifyTransitionEnvelopes(scene,p,forged),false);
 assert.throws(()=>analyzeTransitionEnvelopes({...scene,worldContacts:1},p),/B153_UNSAFE_SCENE/);
 assert.throws(()=>analyzeTransitionEnvelopes(scene,{...p,maxNodes:160001}),/B153_LIMITS/);
});
test('R5 really adds a sky terrace, retains all 15 history models, and reports unverified steps',()=>{
 const designs=readDesigns(),r1=readInteriorDesign(),r2=readUpperDesign(),
  r3=readWideDesign(),r4=readLoopDesign(),r5=readSkyDesign();
 const saved=JSON.stringify([designs,r1,r2,r3,r4]);
 const b=makeB153Bundle(designs,readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),r1,r2,r3,r4,r5);
 assert.equal(JSON.stringify([designs,r1,r2,r3,r4]),saved);
 assert.equal(b.gallery.scenes.length,16);
 assert.equal(b.gallery.scenes[14].id,'stratos-observatory-interior-r4');
 assert.equal(b.gallery.scenes[15].id,'stratos-observatory-interior-r5');
 assert.equal(b.oldSingle.routes[0].status,'INVALID_DESTINATION_ENVELOPE');
 assert.equal(b.newSingle.routes[0].status,'VERTICAL_CANDIDATE_UNCERTIFIED');
 assert(b.newSingle.routes[0].stepCandidateCount>=4);
 assert.equal(b.newLarge.routes[0].status,'NO_PROVEN_GEOMETRIC_CONNECTION');
 assert.equal(b.newSingle.stairsCertified,false);
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.newLarge.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB153Html(b,template);
 for(const needle of ['id="b153-size"','id="b153-status"','id="b153-show-route"',
  'index=15;select.value="15";setScene()','NOT_PREPARED'])
  assert(html.includes(needle),'missing '+needle);
 assert(!html.includes('fetch('));
});
