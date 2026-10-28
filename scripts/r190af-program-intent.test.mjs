/** Offline AF shape and consent boundary: synthetic fixtures only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {R190_STATIC_SYNTHETIC_CASES}
 from './r190-semantic-fixtures.mjs';
import {inspectR190AFIntent,R190AF_INTENT_SCHEMA}
 from '../source/ai/r190af-program-intent.mjs';
const make=(src=R190_STATIC_SYNTHETIC_CASES[1])=>{
 const p=structuredClone(src);const [root,...children]=p.spaces;
 delete root.parentId;delete root.side;
 return {schema:R190AF_INTENT_SCHEMA,id:p.id,title:p.title,
  brief:p.brief,site:p.site,root:{...root,spatialRole:'enclosed'},
  children:children.map(s=>({...s,spatialRole:'enclosed'})),
  materials:p.materials};
};
test('AF handles three independent building programs with distinct root object',()=>{
 for(const src of R190_STATIC_SYNTHETIC_CASES){
  const p=make(src),raw=JSON.stringify(p),r=inspectR190AFIntent(raw);
  assert.equal(JSON.stringify(p),raw);
  assert.equal(r.status,'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL',r.error);
  assert.equal(r.sourcePreview.roomCount,p.children.length+1);
  assert.equal(r.sourcePreview.allProgramSpacesReachable,true);
  assert.equal(r.sourcePreview.noAutomaticWindowPlacement,true);
  assert.equal(r.windowOptions.length,0);
  assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
  assert.equal(r.humanArchitectureQuality,'ART_HOLD');
  assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 }
});
test('AF root cannot accidentally have side or parentId, even if null',()=>{
 for(const field of ['side','parentId']){
  const p=make();p.root[field]=null;
  const r=inspectR190AFIntent(JSON.stringify(p));
  assert.equal(r.status,'HOLD_INVALID_PROGRAM_INTENT');
  assert.match(r.error,/R190AF_ROOM_SHAPE/);
 }
});
test('AF daylight is an intent, not an auto-generated or certified window',()=>{
 const p=make();p.daylightIntents=[{spaceId:p.children[0].id,face:'east',
  width:3,height:2}];
 const before=JSON.stringify(p),r=inspectR190AFIntent(before);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.status,'HOLD_WINDOW_PROPOSAL_REQUIRES_APPROVAL',r.error);
 assert.equal(r.windowOptions.length,1);
 assert.equal(r.windowOptions[0].proposedOnly.baseY,5);
 assert.equal(r.windowOptions[0].approvalRequired,true);
 assert.equal(r.sourcePreview.geometryGeneratedWithoutDaylight,true);
 assert.equal(r.sourcePreview.noAutomaticWindowPlacement,true);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
});
test('AF impossible daylight intent stays HOLD with explicit available ranges',()=>{
 const p=make();p.children[0].height=8;
 p.daylightIntents=[{spaceId:p.children[0].id,face:'east',width:4,height:4}];
 const r=inspectR190AFIntent(JSON.stringify(p));
 assert.equal(r.status,'HOLD_DAYLIGHT_INTENT_INFEASIBLE',r.error);
 assert.equal(r.windowOptions[0].proposedOnly,null);
 assert.equal(r.windowOptions[0].feasibleBaseYRange,null);
 assert.equal(r.sourcePreview.geometryGeneratedWithoutDaylight,true);
 assert.equal(r.constructionApproved,false);
});
test('AF rejects redundant tree links and unknown relation without reinterpretation',()=>{
 const p=make();p.additionalPassages=[[p.root.id,p.children[0].id]];
 const a=inspectR190AFIntent(JSON.stringify(p));
 assert.equal(a.status,'HOLD_INVALID_PROGRAM_INTENT');
 assert.match(a.error,/R190AF_PASSAGE_DUPLICATES_TREE/);
 const q=make();q.children[0].parentId='ghost-room';
 const b=inspectR190AFIntent(JSON.stringify(q));
 assert.equal(b.status,'HOLD_INVALID_PROGRAM_INTENT');
 assert.match(b.error,/R190AF_PARENT_UNKNOWN/);
});
test('AF rejects malformed JSON, model world commands and unsolved physical site',()=>{
 assert.equal(inspectR190AFIntent('{').status,'HOLD_INVALID_PROGRAM_INTENT');
 const p=make();p.MinecraftCommand='/fill';assert.match(
  inspectR190AFIntent(JSON.stringify(p)).error,/R190AF_FIELDS/);
 const n=make();n.site.width=24;n.site.depth=24;
 assert.equal(inspectR190AFIntent(JSON.stringify(n)).status,
  'HOLD_INVALID_PROGRAM_INTENT');
});
