import test from 'node:test';
import assert from 'node:assert/strict';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {compileCompactModelIntent,COMPACT_SCHEMA}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {RANKED_SCHEMA,translateRankedExteriorIntent,
 compileRankedExteriorIntent,RANKED_SYSTEM_PROMPT}
 from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
function author(){
 const src=makeV4DCompactSynthetic();
 src.schema=RANKED_SCHEMA;
 for(const [i,s] of src.spaces.entries()){
  const ranked=i===0?['west','east','south','north']:
   i===1?['east','west','south','north']:null;
  delete s.windowSide;
  s.windowPriority=s.kind==='sky'?null:ranked;
 }
 return src;
}
test('ranked authored glazing resolves only to previously AUTHORIZED exterior directions, with later-child wall included',()=>{
 const src=author(),frozen=structuredClone(src);
 const interpreted=translateRankedExteriorIntent(src);
 assert.deepEqual(src,frozen);
 assert.equal(interpreted.chosenWindowFaces.length,2);
 assert.deepEqual(interpreted.chosenWindowFaces.map(v=>[v.spaceIndex,v.selectedSide,v.authoredRank]),
  [[0,'east',2],[1,'west',2]]);
 assert(interpreted.chosenWindowFaces[0].excludedNonExteriorDirections.includes('west'));
 assert(interpreted.chosenWindowFaces[0].excludedNonExteriorDirections.includes('south'));
 assert(interpreted.chosenWindowFaces[1].excludedNonExteriorDirections.includes('east'));
 assert.equal(interpreted.autoRepairPerformed,false);
 assert.equal(interpreted.modelAuthoredAllPreferences,true);
 const result=compileRankedExteriorIntent(src);
 assert.equal(result.b143.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert(result.b143.sourceRoutes.zones.every(v=>v.reachedFromEntrance));
 assert(result.b143.sourceRoutes.featureAccess.every(v=>v.reachableFromEntrance));
 assert.equal(result.worldWrites,0);
 assert.equal(result.constructionApproved,false);
 assert.equal(result.executionAllowed,false);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.equal(result.humanArt,'NOT_REVIEWED');
 assert.notEqual(result.b143.geometrySha256,null);
});
test('changing MODEL preference order preserves B143 geometry when the selected exterior side remains the same',()=>{
 const src=author(),modified=structuredClone(src);
 modified.spaces[0].windowPriority=['east','west','south','north'];
 const a=compileRankedExteriorIntent(src);
 const b=compileRankedExteriorIntent(modified);
 assert.equal(a.chosenWindowFaces[0].selectedSide,'east');
 assert.equal(b.chosenWindowFaces[0].selectedSide,'east');
 assert.equal(a.chosenWindowFaces[0].authoredRank,2);
 assert.equal(b.chosenWindowFaces[0].authoredRank,1);
 assert.equal(a.b143.geometrySha256,b.b143.geometrySha256);
 assert.notEqual(a.rankedAuthorSha256,b.rankedAuthorSha256);
 const c=structuredClone(src);
 c.spaces[0].windowPriority=['north','south','west','east'];
 assert.equal(compileRankedExteriorIntent(c).chosenWindowFaces[0].selectedSide,'east');
 assert.equal(compileRankedExteriorIntent(c).chosenWindowFaces[0].authoredRank,4);
});
test('ranked grammar rejects fake glazing without silently moving windows',()=>{
 const src=author(); const bad=[];
 const vary=f=>{const x=structuredClone(src);f(x);bad.push(x);};
 vary(x=>x.schema='something-else');
 vary(x=>x.spaces[0].windowPriority=['east','east','south','north']);
 vary(x=>x.spaces[0].windowPriority=['east']);
 vary(x=>x.spaces[0].windowPriority=['north','east','south','northeast']);
 vary(x=>{x.spaces[0].windowPriority=null;});
 vary(x=>{x.spaces[2].windowPriority=['north','south','east','west'];});
 vary(x=>{x.spaces[1].windowSide='east';});
 vary(x=>{delete x.spaces[0].windowPriority;});
 vary(x=>{x.spaces[1].attach.to='unknown-author-parent';});
 vary(x=>{x.spaces[1].width=0;});
 for(const x of bad){
  assert.throws(()=>compileRankedExteriorIntent(x),/R125_/);
 }
 assert.equal(src.schema,RANKED_SCHEMA);
 assert.equal(compileCompactModelIntent(makeV4DCompactSynthetic()).worldWrites,0);
});
test('V4E opt-in does not alter the old V4D frozen author contract or pretend to have real model evidence',()=>{
 const old=makeV4DCompactSynthetic();
 assert.equal(old.schema,COMPACT_SCHEMA);
 assert.equal(compileCompactModelIntent(old).modelIdentity,'NOT_ATTESTED');
 assert(RANKED_SYSTEM_PROMPT.includes('FIRST option'));
 assert(RANKED_SYSTEM_PROMPT.includes('NEVER choose an unlisted option'));
 const ranked=compileRankedExteriorIntent(author());
 assert.equal(ranked.modelIdentity,'NOT_ATTESTED');
 assert.equal(ranked.modelSizeOrMacMemoryTested,false);
 assert.equal(ranked.sourceProvenance,'RANKED_AUTHOR_USER_OR_LLM_UNATTESTED');
});

test('V4E one POST with injected fake transport stays TEST_DOUBLE but gives true B143 and zero world writes',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {runV4DLocalAuthor,parseV4DLocalAuthorArgs}
  =await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4e-optin-'));
 const study=path.join(folder,'study'),replay=path.join(folder,'replay');
 const raw=JSON.stringify(author()),calls=[];
 const fetcher=async(url,opt)=>{
  calls.push({url,method:opt?.method});
  if(opt?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  if(opt?.method==='POST')return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]
  })};
  throw Error('UNEXPECTED_TEST_CALL');
 };
 try{
  const parsed=parseV4DLocalAuthorArgs(['--ranked-windows','--model','qwen3:14b',
   '--out',study,'--prompt','An original culture facility with interior and courtyard.']);
  assert.equal(parsed.rankedWindows,true);
  assert.equal(parsed.compact,false);
  assert.throws(()=>parseV4DLocalAuthorArgs(['--compact','--ranked-windows',
   '--model','qwen3:14b','--out',study]),/ONLY_ONE_AUTHOR_MODE/);
  const r=await runV4DLocalAuthor({...parsed},{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_TEST_DOUBLE_NOT_REAL_MODEL',r.reason);
  assert.equal(r.authorContract,RANKED_SCHEMA);
  assert.equal(r.modelCalls,1);
  assert.equal(r.worldWrites,0);
  assert.equal(calls.filter(x=>x.method==='POST').length,1);
  const original=JSON.parse(fs.readFileSync(path.join(study,'AUTHOR_INTENT_ORIGINAL.json'),'utf8'));
  assert.deepEqual(original,author());
  assert(fs.existsSync(path.join(study,'RANKED_GLAZING_RESOLUTION.json')));
  const receipt=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(receipt.authorContract,RANKED_SCHEMA);
  assert.equal(receipt.sourceCandidateVerified,true);
  assert.equal(receipt.explicitlyInjectedTestResponse,true);
  const count=calls.length;
  const rerun=replayPrivateV4D(study,replay);
  assert.equal(count,calls.length);
  assert.equal(rerun.status,'HOLD_TEST_DOUBLE_REPLAY_ONLY');
  assert.equal(rerun.originalCompilerHashesMatch,true);
  assert.equal(rerun.additionalModelCalls,0);
  assert.equal(rerun.worldWrites,0);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('V4E malformed original preference remains HOLD with safe diagnostic and zero replay calls',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const {runV4DLocalAuthor}=await import('./r125-v4d-local-architect.mjs');
 const {replayPrivateV4D}=await import('./r125-v4d-replay-private.mjs');
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v4e-invalid-'));
 const study=path.join(folder,'study'),replay=path.join(folder,'replay');
 const faulty=author();
 faulty.spaces[0].windowPriority=['east','east','north','west'];
 const calls=[],raw=JSON.stringify(faulty);
 const fetcher=async(url,opt)=>{
  calls.push(opt?.method);
  if(opt?.method==='GET')return {ok:true,status:200,
   text:async()=>JSON.stringify({models:[{name:'qwen3:14b'}]})};
  return {ok:true,status:200,text:async()=>JSON.stringify({
   model:'qwen3:14b',choices:[{finish_reason:'stop',message:{content:raw}}]
  })};
 };
 try{
  const r=await runV4DLocalAuthor({
   model:'qwen3:14b',outDir:study,rankedWindows:true,
   prompt:'An original public architecture research building.'
  },{fetcher,timeoutMs:15000});
  assert.equal(r.status,'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR');
  assert.equal(r.modelCalls,1);
  const receipt=JSON.parse(fs.readFileSync(path.join(study,'REVIEW_SUMMARY_SHAREABLE.json'),'utf8'));
  assert.equal(receipt.failureCategory,'RANKED_AUTHOR_EXTERIOR_INVALID');
  const before=calls.length;
  const replayed=replayPrivateV4D(study,replay);
  assert.equal(replayed.status,'HOLD_REPLAY_SOURCE_REJECTED');
  assert.equal(replayed.additionalModelCalls,0);
  assert.equal(calls.length,before);
  const diag=JSON.parse(fs.readFileSync(path.join(replay,'AUTHOR_SOURCE_DIAGNOSTIC.json'),'utf8'));
  assert(diag.issues.some(v=>v.code==='RANKED_WINDOW_PRIORITY_INVALID'));
  assert.equal(replayed.worldWrites,0);
  assert(!fs.existsSync(path.join(replay,'index.html')));
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
