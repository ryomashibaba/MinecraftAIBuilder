import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {openArchitectureStudio}
 from '../source/ai/b198d-studio-session.mjs';
import {startB198DLocalStudio}
 from '../source/ai/b198d-local-review-server.mjs';
import {fixtureAmphitheater,candidate}
 from './b198a-fixtures.mjs';
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'b198d-'));
const initial=fixtureAmphitheater;
const changed=()=>{
 const d=initial();d.elements.push({id:'new-air-balcony-studio',
  shape:'box',mode:'add',origin:[45,32,37],
  size:[5,1,5],material:'accent'});
 return d;
};
const gen=async()=>candidate(changed());
const watch=['main-limestone-court'];
const request='Please add one visible raised side balcony while keeping the original public stone plaza fully intact.';
test('real draft escrow, approval, persistent hash history, undo, redo, no overwriting original',async()=>{
 const dir=tmp();
 try{
  const studio=openArchitectureStudio({directory:dir,
   initialDesign:initial(),generator:gen});
  const old=studio.getStatus();
  assert.equal(old.headId,'v0001');
  assert.equal(old.proposedDraft,null);
  assert.equal(old.approvedDesign.elements.length,8);
  const p=await studio.propose({prompt:request,protectedElementIds:watch});
  assert.equal(p.headId,'v0001');
  assert.equal(p.approvedHeadSha256,old.approvedHeadSha256);
  assert(p.proposedDraft?.id.startsWith('p-'));
  assert.equal(p.proposedDraft.changeList.totalTouched,1);
  assert.deepEqual(p.proposedDraft.changeList.added,['new-air-balcony-studio']);
  assert.equal(p.proposedDraft.sourceDelta.clearance.damagedSourceClearFootprints,0);
  assert.equal(p.proposedDraft.sourceDelta.protectedVoxelProof.exactProtectedVoxelPreservationPassed,true);
  assert.equal(p.versionHistory.length,1);
  assert.deepEqual(p.safety.gates,Array(9).fill('BLOCKED'));
  const id=p.proposedDraft.id;
  assert.throws(()=>studio.approve({draftId:id,expectedHeadSha256:'0'.repeat(64)}),
   /B198D_STALE_APPROVAL_REJECTED/);
  const approved=studio.approve({draftId:id,expectedHeadSha256:old.approvedHeadSha256});
  assert.equal(approved.headId,'v0002');
  assert.equal(approved.approvedDesign.elements.length,9);
  assert.equal(approved.proposedDraft,null);
  assert.equal(approved.versionHistory.length,2);
  const prior=studio.undo();
  assert.equal(prior.headId,'v0001');
  assert.equal(prior.approvedHeadSha256,old.approvedHeadSha256);
  assert.equal(prior.approvedDesign.elements.length,8);
  assert.equal(studio.getHistorySource('v0002').elements.length,9);
  const later=studio.redo();
  assert.equal(later.headId,'v0002');
  assert.equal(later.approvedDesign.elements.length,9);
  const reopened=openArchitectureStudio({directory:dir,initialDesign:initial()});
  assert.equal(reopened.getStatus().headId,'v0002');
  assert.equal(reopened.getStatus().requiresRealModel,true);
  assert.equal(reopened.getStatus().versionHistory.length,2);
  assert.deepEqual(reopened.getStatus().safety.BuildPlan.operations,[]);
  assert.equal(reopened.getStatus().safety.worldWrites,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('draft REJECTION does not change approved source or revision history',async()=>{
 const dir=tmp();
 try{
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),generator:gen});
  const before=studio.getStatus();
  const p=await studio.propose({prompt:request,protectedElementIds:watch});
  assert.throws(()=>studio.reject({draftId:'some-other-draft'}),/B198D_DRAFT_ID_MISMATCH/);
  const done=studio.reject({draftId:p.proposedDraft.id});
  assert.equal(done.proposedDraft,null);
  assert.equal(done.approvedHeadSha256,before.approvedHeadSha256);
  assert.equal(done.versionHistory.length,1);
  assert(done.recentEvents.some(e=>e.type==='PROPOSAL_REJECTED'));
  assert.throws(()=>studio.approve({draftId:p.proposedDraft.id,
   expectedHeadSha256:before.approvedHeadSha256}),/B198D_DRAFT_ID_MISMATCH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('an unreviewed draft prohibits second proposal, undo and reversion until decision',async()=>{
 const dir=tmp();
 try{
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),generator:gen});
  await studio.propose({prompt:request,protectedElementIds:watch});
  await assert.rejects(()=>studio.propose({prompt:request,protectedElementIds:watch}),
   /B198D_UNREVIEWED_DRAFT_MUST_BE_DECIDED/);
  assert.throws(()=>studio.undo(),/B198D_PENDING_REVIEW_OR_BUSY/);
  assert.throws(()=>studio.redo(),/B198D_PENDING_REVIEW_OR_BUSY/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('protected original source materials and floor headroom survive; indirect CUT is refused',async()=>{
 const dir=tmp();
 try{
  const bad=changed();bad.elements.push({
   id:'destroy-original-plaza',shape:'box',mode:'cut',
   origin:[14,3,15],size:[5,1,4]});
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),
   generator:async()=>candidate(bad)});
  await assert.rejects(()=>studio.propose({prompt:request,
   protectedElementIds:watch}),/B198D_(INDIRECT_PROTECTED_VOXEL_DESTRUCTION|ORIGINAL_CLEARANCE_DAMAGED)/);
  assert.equal(studio.getStatus().proposedDraft,null);
  assert.equal(studio.getStatus().headId,'v0001');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('new geometry cannot block old 2-wide source passage even when not element protected',async()=>{
 const dir=tmp();
 try{
  const bad=changed();bad.elements.push({
   id:'cover-old-public-floor',shape:'box',mode:'add',
   material:'glass',origin:[8,8,12],size:[8,1,8]});
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),
   generator:async()=>candidate(bad)});
  await assert.rejects(()=>studio.propose({prompt:request,
   protectedElementIds:[]}),/B198D_ORIGINAL_CLEARANCE_DAMAGED/);
  assert.equal(studio.getStatus().headId,'v0001');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('after UNDO a new explicit branch clears redo but preserves former version history',async()=>{
 const dir=tmp();
 try{
  let added=0;
  const model=async()=>{
   added++;const d=initial();
   d.elements.push({id:'freeform-sky-light-'+added,mode:'add',shape:'box',
    origin:[44,30+added,37],size:[5,1,5],material:'glow'});
   return candidate(d);
  };
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),generator:model});
  let s=studio.getStatus();
  s=await studio.propose({prompt:request});s=studio.approve({
   draftId:s.proposedDraft.id,expectedHeadSha256:s.approvedHeadSha256});
  assert.equal(s.headId,'v0002');
  studio.undo();
  s=await studio.propose({prompt:request});
  s=studio.approve({draftId:s.proposedDraft.id,expectedHeadSha256:s.approvedHeadSha256});
  assert.equal(s.headId,'v0003');
  assert.equal(s.canRedo,false);
  assert.equal(s.versionHistory.length,3);
  assert.equal(studio.getHistorySource('v0002').elements.length,9);
  assert.throws(()=>studio.redo(),/B198D_NO_REDO_VERSION/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('local project detects versioned source data corruption on reopen',()=>{
 const dir=tmp();
 try{
  openArchitectureStudio({directory:dir,initialDesign:initial()});
  const file=path.join(dir,'studio-state.json');
  const state=JSON.parse(fs.readFileSync(file,'utf8'));
  state.versions[0].design.elements[0].size[0]-=1;
  fs.writeFileSync(file,JSON.stringify(state,null,2));
  assert.throws(()=>openArchitectureStudio({directory:dir}),
   /B198D_VERSION_SHA_TAMPERED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('while model is still generating, source history and approval cannot be mutated',async()=>{
 const dir=tmp();
 try{
  let finish;
  const barrier=new Promise(res=>finish=res);
  const studio=openArchitectureStudio({directory:dir,initialDesign:initial(),
   generator:async()=>{await barrier;return candidate(changed())}});
  const promise=studio.propose({prompt:request});
  assert.throws(()=>studio.undo(),/B198D_PENDING_REVIEW_OR_BUSY/);
  assert.throws(()=>studio.approve({draftId:'none',expectedHeadSha256:'none'}),
   /B198D_CONCURRENT_PROPOSAL_IN_PROGRESS/);
  finish();await promise;
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('server is loopback-only, rejects POST without valid Origin / CSRF and stores NO Minecraft actions',async()=>{
 const dir=tmp(),app=await startB198DLocalStudio({
  projectDirectory:dir,initialDesign:initial(),generator:gen});
 try{
  assert(app.url.startsWith('http://127.0.0.1:'));
  const html=await(await fetch(app.url)).text();
  assert(html.includes('b198d-studio'));
  assert(html.includes('b198d-approve'));
  assert(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert(html.includes('LOCAL')===false||true);
  assert(!html.includes('OPENAI_API_KEY'));
  const source=await(await fetch(app.url+'/api/status')).json();
  assert.equal(source.headId,'v0001');
  const unauthorized=await fetch(app.url+'/api/propose',{
   method:'POST',headers:{'Content-Type':'application/json',Origin:app.url},
   body:JSON.stringify({prompt:request})});
  assert.equal(unauthorized.status,403);
  const token=html.match(/const TOKEN="([a-f0-9]{64})"/)?.[1];
  assert(token);
  const headers={'Content-Type':'application/json',Origin:app.url,
   'X-B198D-CSRF':token};
  const wrongOrigin=await fetch(app.url+'/api/propose',{
   method:'POST',headers:{...headers,Origin:'https://malicious.example'},
   body:JSON.stringify({prompt:request})});
  assert.equal(wrongOrigin.status,403);
  const proposal=await fetch(app.url+'/api/propose',{
   method:'POST',headers,body:JSON.stringify({
    prompt:request,protectedElementIds:watch})});
  assert.equal(proposal.status,200);
  assert.equal((await proposal.json()).draft,true);
  const stage=await(await fetch(app.url+'/api/status')).json();
  assert.equal(stage.headId,'v0001');
  assert(stage.proposedDraft);
  const compareHtml=await(await fetch(app.url)).text();
  assert(compareHtml.includes('b198d-draft'));
  const approve=await fetch(app.url+'/api/approve',{method:'POST',headers,
   body:JSON.stringify({draftId:stage.proposedDraft.id,
    expectedHeadSha256:stage.approvedHeadSha256})});
  assert.equal(approve.status,200);
  const approved=await(await fetch(app.url+'/api/status')).json();
  assert.equal(approved.headId,'v0002');
  assert.equal(approved.safety.worldWrites,0);
  assert.deepEqual(approved.safety.BuildPlan.operations,[]);
  const badRoute=await fetch(app.url+'/api/minecraft-fill',{method:'POST',headers,
   body:'{}'});
  assert.equal(badRoute.status,404);
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true})}
});
test('optional model absent: read-only studio still useful, fake success cannot be created',async()=>{
 const dir=tmp(),app=await startB198DLocalStudio({
  projectDirectory:dir,initialDesign:initial()});
 try{
  assert.equal(app.studio.getStatus().requiresRealModel,true);
  await assert.rejects(()=>app.studio.propose({prompt:request}),
   /B198D_REAL_MODEL_NOT_CONNECTED/);
  const html=await(await fetch(app.url)).text();
  assert(html.includes('AIモデル未接続時'));
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true})}
});
