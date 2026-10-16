import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {applyRevision,verifyRevision} from '../source/ai/b144-design-revisions.mjs';
import {compileB143Gallery,readDesigns} from './build-b143-site.mjs';
import {readRevisionRequests,makeB144Bundle,renderB144Html} from './build-b144-site.mjs';
const bases=readDesigns(),requests=readRevisionRequests(),byId=new Map(bases.map(x=>[x.id,x]));
const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
const change=x=>structuredClone(x);
test('ChatGPT change requests are source-pinned to exact original design',()=>{
 for(const p of requests){
  const original=byId.get(p.targetId);assert(original);
  assert.equal(compileDesign(original).sourceSha256,p.baseSourceSha256);
  assert(verifyRevision(original,p,applyRevision(original,p)));
  const stale=change(p);stale.baseSourceSha256='0'.repeat(64);
  assert.throws(()=>applyRevision(original,stale),/B144_STALE_OR_FORGED_BASE/);
 }
});
test('two independently revised structures remain separate from untouched B143 originals',()=>{
 const before=JSON.stringify(bases);
 const bundle=makeB144Bundle(bases,requests);
 assert.equal(JSON.stringify(bases),before);
 assert.equal(bundle.payload.scenes.length,4);
 assert.equal(bundle.reviews.length,2);
 assert(bundle.reviews.every(r=>r.changes.totalChanged>=25&&
  r.beforeGeometrySha256!==r.afterGeometrySha256&&
  r.constructionApproved===false&&r.worldContacts===0));
 assert.equal(bundle.payload.safety.minecraftWrites,0);
 assert(bundle.payload.safety.original15BuildingSafetyGates==='9 BLOCKED');
 assert.equal(bundle.payload.safety.BuildPlan.operations.length,0);
 assert.equal(bundle.payload.scenes.filter(s=>/-r2$/.test(s.id)).length,2);
 assert.equal(compileB143Gallery(bases).scenes.length,2);
});
test('wrong-target and conflicts are rejected without altering source',()=>{
 const base=byId.get(requests[0].targetId),bad=change(requests[0]);
 bad.targetId='another-building';
 assert.throws(()=>applyRevision(base,bad),/B144_IDENTITY/);
 const duplicate=change(requests[0]);
 duplicate.edits.push(change(duplicate.edits[0]));
 assert.throws(()=>applyRevision(base,duplicate),/B144_DUPLICATE_ELEMENT_CHANGE/);
 const unknown=change(requests[0]);
 unknown.edits[0].action='execute_minecraft_commands';
 assert.throws(()=>applyRevision(base,unknown),/B144_UNKNOWN_ACTION/);
});
test('unsafe additions and untrusted commands never enter the design grammar',()=>{
 const p=change(requests[0]),base=byId.get(p.targetId);
 p.edits.push({action:'addElement',target:'world-stuff',
  element:{id:'world-stuff',shape:'box',mode:'add',material:'minecraft:command_block',origin:[2,2,2],size:[2,2,2]}});
 assert.throws(()=>applyRevision(base,p),/B143_MATERIAL/);
 p.edits.pop();p.edits[0].commands=['setblock'];
 assert.throws(()=>applyRevision(base,p),/B144_EDIT_FIELDS/);
 const extra=change(requests[0]);extra.worldCoordinates=[12,23,34];
 assert.throws(()=>applyRevision(base,extra),/B144_PROPOSAL_FIELDS/);
});
test('non-geometric text-only edit cannot masquerade as a new design',()=>{
 const p=change(requests[0]),base=byId.get(p.targetId);
 p.edits=[{action:'setTitle',value:'別のタイトル'}];
 assert.throws(()=>applyRevision(base,p),/B144_NOT_MEANINGFUL_GEOMETRY_CHANGE/);
});
test('revision preview embeds four real compilations with requests and no fetch scripts',()=>{
 const result=makeB144Bundle(bases,requests),page=renderB144Html(result,template);
 assert(page.includes('canyon-data-sanctuary-r2'));
 assert(page.includes('stratos-observatory-r2'));
 assert(page.includes('ChatGPTへの改修指示'));
 assert(page.includes('NOT_PREPARED'));
 assert(!page.includes('__B143_GALLERY_JSON__'));
 assert(!page.includes('fetch('));
});
