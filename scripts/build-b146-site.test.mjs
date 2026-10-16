import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCHEMA,compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {reviewVoxelTopology,verifyTopology} from '../source/ai/b146-topology-review.mjs';
import {applyRevision} from '../source/ai/b144-design-revisions.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests,makeB146Bundle,renderB146Html} from './build-b146-site.mjs';

const originals=readDesigns(),r2=readRevisionRequests(),r3=readContinuations(),r4=readStructuralRequests();
function demo(components){
 return {schema:SCHEMA,id:'local-test-building',title:'架橋梁試験',brief:'未知用途の構造表現',
  bounds:{width:30,height:30,depth:30},designOnly:true,elements:components};
}
function box(id,origin,size){
 return {id,shape:'box',mode:'add',material:'stone',origin,size};
}
function beam(id,start,end,thickness=1){
 return {id,shape:'beam',mode:'add',material:'metal',start,end,thickness};
}
test('a true diagonal beam is category-free, 3D, bounded and deterministic',()=>{
 const d=demo([box('anchor',[4,3,4],[6,4,6]),beam('brace',[7,6,7],[20,20,17],2)]);
 assert.equal(validateDesign(d),true);
 const result=compileDesign(d);
 assert.equal(verifyCompiled(d,result),true);
 assert(result.primitives.some(p=>p[0]>=15&&p[1]>=15&&p[2]>=11),'must span diagonal');
 assert.equal(result.BuildPlan.operations.length,0);
 assert.equal(result.worldContacts,0);
});
test('reject beam outside local bounds, invalid endpoints, huge thickness and hostile keys',()=>{
 const base=demo([beam('probe',[7,7,7],[15,18,18],1)]);
 assert(validateDesign(base));
 for(const patch of [
  {thickness:7},{end:[7,7,7]},{end:[29,29,29]},{start:[0,0,0]},
  {worldCoordinates:[1,2,3]},{command:'setblock'},{material:'minecraft:command_block'}]){
  const d=structuredClone(base);
  Object.assign(d.elements[0],patch);
  assert.throws(()=>compileDesign(d),/B143_/);
 }
});
test('local face connectivity flags detached geometry but never certifies physical strength',()=>{
 const d=demo([box('base',[2,2,2],[5,3,5]),box('floating',[20,20,20],[3,3,3])]);
 const scene=compileDesign(d),review=reviewVoxelTopology(scene);
 assert(review.detachedComponents>=1);
 assert(review.detachedCells>=27);
 assert(review.anchoredCells>=75);
 assert(review.exposedOverhangCandidates>=9);
 assert.equal(review.physicalLoadPathCertified,false);
 assert.equal(review.structuralStabilityCertified,false);
 assert.equal(review.constructionApproved,false);
 assert.equal(review.worldWrites,0);
 assert(verifyTopology(scene,review));
 const forged={...review,detachedCells:0};
 assert.equal(verifyTopology(scene,forged),false);
});
test('B146 two-source-anchored R4 briefs include actual diagonal brace geometry',()=>{
 const docs=new Map(originals.map(x=>[x.id,x]));
 for(const seq of [r2,r3])for(const p of seq){
  const prior=docs.get(p.targetId);assert(prior);
  const revised=applyRevision(prior,p).design;docs.set(revised.id,revised);
 }
 for(const p of r4){
  const previous=docs.get(p.targetId);
  assert(previous);
  assert.equal(compileDesign(previous).sourceSha256,p.baseSourceSha256);
  const next=applyRevision(previous,p);
  assert(next.design.elements.filter(e=>e.shape==='beam').length>=3);
  assert(next.comparison.changes.totalChanged>=25);
  const stale=structuredClone(p);stale.baseSourceSha256='0'.repeat(64);
  assert.throws(()=>applyRevision(previous,stale),/B144_STALE_OR_FORGED_BASE/);
 }
});
test('eight immutable generations and structural audits compile as read-only preview',()=>{
 const before=JSON.stringify(originals);
 const b=makeB146Bundle(originals,r2,r3,r4);
 assert.equal(JSON.stringify(originals),before);
 assert.equal(b.gallery.scenes.length,8);
 assert.equal(new Set(b.gallery.geometryHashes).size,8);
 assert.equal(b.evidence.length,8);
 assert(b.evidence.every(e=>e.totalCells>0&&e.auditSha256.length===64&&
  e.physicalLoadPathCertified===false&&e.gates.every(x=>x==='BLOCKED')));
 assert.equal(b.safety.constructionApproved,false);
 assert.equal(b.safety.BuildPlan.operations.length,0);
 assert.equal(b.safety.worldCoordinates,null);
 const t=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const page=renderB146Html(b,t);
 for(const name of ['stratos-observatory-r4','canyon-data-sanctuary-r4'])
  assert(page.includes(name));
 assert(page.includes('topologyReview'));
 assert(page.includes('局所接続群'));
 assert(!page.includes('__B143_GALLERY_JSON__'));
});
test('duplicate revisions, forged targets and unsafe new shapes fail closed',()=>{
 const forged=structuredClone(r4);forged[0].targetId='other';
 assert.throws(()=>makeB146Bundle(originals,r2,r3,forged),/B146_INVALID_CHAIN_TARGET/);
 const bad=structuredClone(r4);bad[1].edits[0].element.material='command_block';
 assert.throws(()=>makeB146Bundle(originals,r2,r3,bad),/B143_MATERIAL/);
});
