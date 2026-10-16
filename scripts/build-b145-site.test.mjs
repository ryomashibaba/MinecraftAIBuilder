import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign,validateDesign,verifyCompiled,SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {applyRevision} from '../source/ai/b144-design-revisions.mjs';
import {readContinuations,makeB145Bundle,renderB145Html} from './build-b145-site.mjs';

const original=readDesigns(),r2=readRevisionRequests(),r3=readContinuations();
const baseById=new Map(original.map(d=>[d.id,d]));
const r2ById=new Map(r2.map(p=>[p.revisionId,applyRevision(baseById.get(p.targetId),p).design]));
test('torus ring compiles as an actual hollow circular voxel region',()=>{
 const d={schema:SCHEMA,id:'torus-test',title:'環状ゲート',brief:'ドームではない中空リング',
  bounds:{width:40,height:40,depth:40},designOnly:true,
  elements:[{id:'ring',shape:'torus',mode:'add',material:'metal',center:[20,20,20],axis:'y',
   majorRadius:11,tubeRadius:2}]};
 assert(validateDesign(d));
 const s=compileDesign(d);
 assert(verifyCompiled(d,s)&&s.primitives.length>150);
 assert(!s.primitives.some(p=>p[0]===20&&p[1]===20&&p[2]===20),
  'center of ring must stay hollow');
 assert(s.primitives.some(p=>p[0]===31&&p[1]===20&&p[2]===20));
 assert.equal(s.worldContacts,0);assert.equal(s.BuildPlan.operations.length,0);
});
test('reject malformed torus sizes, bounds, work, unknown and code injection',()=>{
 const element={id:'ring',shape:'torus',mode:'add',material:'glass',center:[12,12,12],
  axis:'y',majorRadius:7,tubeRadius:2};
 const base={schema:SCHEMA,id:'ring-test',title:'環状',brief:'試験',
  bounds:{width:30,height:30,depth:30},designOnly:true,elements:[element]};
 assert(validateDesign(base));
 for(const edit of [
  {majorRadius:1},{tubeRadius:8},{center:[0,0,0]},{axis:'time'},
  {material:'minecraft:command_block'},{commands:['setblock']},{origin:[1,2,3]}]){
  const d=structuredClone(base);Object.assign(d.elements[0],edit);
  assert.throws(()=>compileDesign(d),/B143_/);
 }
 const invalid=structuredClone(base);invalid.worldCoordinates=[10,10,10];
 assert.throws(()=>compileDesign(invalid),/B143_/);
});
test('ChatGPT R3 requests exactly match the pinned, immutable B144 R2 source',()=>{
 const originals=JSON.stringify(original),second=JSON.stringify([...r2ById.values()]);
 for(const proposal of r3){
  const parent=r2ById.get(proposal.targetId);assert(parent,'R2 parent must exist');
  const parentShape=compileDesign(parent);
  assert.equal(parentShape.sourceSha256,proposal.baseSourceSha256);
  const next=applyRevision(parent,proposal);
  assert(next.design.elements.some(e=>e.shape==='torus'));
  assert(next.comparison.changes.totalChanged>50);
  assert.equal(next.comparison.worldContacts,0);
  const wrong=structuredClone(proposal);wrong.baseSourceSha256='f'.repeat(64);
  assert.throws(()=>applyRevision(parent,wrong),/B144_STALE_OR_FORGED_BASE/);
 }
 assert.equal(JSON.stringify(original),originals);
 assert.equal(JSON.stringify([...r2ById.values()]),second);
});
test('6 multi-turn models and entire revision history form a new site',()=>{
 const models=makeB145Bundle(original,r2,r3);
 assert.equal(models.gallery.scenes.length,6);
 assert.equal(models.changes.length,2);
 assert.equal(new Set(models.gallery.geometryHashes).size,6);
 assert(models.gallery.scenes.filter(s=>s.id.endsWith('-r3')).every(s=>s.stats.designOperations.some(x=>x.element.includes('ring')||x.element.includes('arc')||x.element.includes('halo'))));
 assert.equal(models.gallery.safety.minecraftWrites,0);
 assert.equal(models.gallery.safety.original15BuildingSafetyGates,'9 BLOCKED');
 const t=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB145Html(models,t);
 for(const id of ['stratos-observatory-r3','canyon-data-sanctuary-r3'])assert(html.includes(id));
 assert(html.includes('B145 / MULTI-TURN ARCHITECTURE'));
 assert(!html.includes('__B143_GALLERY_JSON__')&&!html.includes('fetch('));
});
test('forged, duplicate and unknown history entries fail closed',()=>{
 const forged=structuredClone(r3);forged[0].edits.push({action:'execute',target:'x'});
 assert.throws(()=>makeB145Bundle(original,r2,forged),/B144_UNKNOWN_ACTION/);
 const dup=[...r3,r3[0]];
 assert.throws(()=>makeB145Bundle(original,r2,dup),/B145_UNRECOGNIZED_OR_DUPLICATE_R2_TARGET/);
});
