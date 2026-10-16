import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeVerticalCandidates} from '../source/ai/b150-vertical-candidates.mjs';
import {analyzeClearance,verifyClearance} from '../source/ai/b151-clearance-review.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign,makeB151Bundle,renderB151Html} from './build-b151-site.mjs';
const box=(id,origin,size)=>({id,shape:'box',mode:'add',material:'stone',origin,size});
const small=e=>({schema:SCHEMA,id:'test-gallery-clearance',title:'Gallery',
 brief:'Geometry only',bounds:{width:20,height:16,depth:20},designOnly:true,elements:e});
const endpoints={entrance:[5,3,3],destinations:[{id:'end',at:[5,3,8]}]};
test('three-wide real corridor is rejected for five-wide clearance',()=>{
 const scene=compileDesign(small([box('platform',[4,2,3],[3,1,6])]));
 const v=analyzeVerticalCandidates(scene,endpoints);
 const result=analyzeClearance(scene,v,{minWidth:5});
 assert.equal(v.routes[0].status,'PASS_FLAT_GEOMETRY');
 assert.equal(result.routes[0].widthStatus,'BELOW_REQUESTED_WIDTH');
 assert.equal(result.routes[0].minCrossSectionWidth,3);
 assert(result.routes[0].narrowPointCount>0);
 assert(verifyClearance(scene,v,{minWidth:5},result));
 assert.equal(result.stairsCertified,false);
 assert.equal(result.worldContacts,0);
});
test('five-wide corridor produces a positive geometry-only width result',()=>{
 const scene=compileDesign(small([box('platform',[3,2,3],[5,1,6])]));
 const v=analyzeVerticalCandidates(scene,endpoints);
 const result=analyzeClearance(scene,v,{minWidth:5});
 assert.equal(result.routes[0].widthStatus,'PASS_WIDTH_GEOMETRY');
 assert.equal(result.routes[0].narrowPointCount,0);
 assert(result.routes[0].minCrossSectionWidth,5);
 assert.equal(result.constructionApproved,false);
});
test('floor component count is geometric, not an inferred number of rooms',()=>{
 const s=compileDesign(small([
  box('first-floor',[3,2,3],[4,1,6]),
  box('isolated-floor',[12,5,12],[3,1,3])]));
 const v=analyzeVerticalCandidates(s,endpoints);
 const r=analyzeClearance(s,v,{minWidth:4});
 assert.equal(r.flatComponentCount,2);
 assert(r.otherFlatCells>0);
 assert.equal(r.largestFlatComponents.length,2);
 assert(!('certifiedRoomCount'in r));
});
test('stale vertical proof, forged gates and unsafe geometry fail closed',()=>{
 const s=compileDesign(small([box('platform',[3,2,3],[5,1,6])]));
 const v=analyzeVerticalCandidates(s,endpoints);
 const r=analyzeClearance(s,v);
 const modified=structuredClone(r);modified.constructionApproved=true;
 assert.equal(verifyClearance(s,v,{},modified),false);
 assert.throws(()=>analyzeClearance(s,{...v,geometrySha256:'0'.repeat(64)}),/B151_INVALID_VERTICAL_SOURCE/);
 assert.throws(()=>analyzeClearance({...s,worldContacts:1},v),/B151_INVALID_SCENE/);
 assert.throws(()=>analyzeClearance(s,v,{minWidth:100}),/B151_WIDTH_PARAMETERS/);
});
test('original 13 models remain and R3 widens the real gallery to >=5',()=>{
 const old=readDesigns(),r1=readInteriorDesign(),r2=readUpperDesign(),r3=readWideDesign();
 const unchanged=JSON.stringify([old,r1,r2]);
 const b=makeB151Bundle(old,readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),r1,r2,r3);
 assert.equal(JSON.stringify([old,r1,r2]),unchanged);
 assert.equal(b.gallery.scenes.length,14);
 assert.equal(b.gallery.scenes[12].id,'stratos-observatory-interior-r2');
 assert.equal(b.gallery.scenes[13].id,'stratos-observatory-interior-r3');
 assert(b.oldWidth.routes[2].narrowPointCount>0);
 assert.equal(b.newWidth.routes[2].narrowPointCount,0);
 assert(b.newWidth.routes[2].minCrossSectionWidth>=5);
 assert.equal(b.newPath.routes[2].status,'STEP_CANDIDATE_ONLY');
 assert.equal(b.gallery.safety.minecraftWrites,0);
 assert.equal(b.newWidth.BuildPlan.operations.length,0);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB151Html(b,template);
 for(const needle of ['id="b151-route"','id="b151-overlay"','id="b151-status"',
  'index=13;select.value="13";setScene()','NOT_PREPARED'])
  assert(html.includes(needle),'Missing '+needle);
 assert(!html.includes('fetch('));
});
