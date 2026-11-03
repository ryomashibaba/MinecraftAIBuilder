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
test('changing MODEL preference order changes actual glazing and B143 geometry without modifying topology',()=>{
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
 assert(RANKED_SYSTEM_PROMPT.includes('NO'));
 const ranked=compileRankedExteriorIntent(author());
 assert.equal(ranked.modelIdentity,'NOT_ATTESTED');
 assert.equal(ranked.modelSizeOrMacMemoryTested,false);
 assert.equal(ranked.sourceProvenance,'RANKED_AUTHOR_USER_OR_LLM_UNATTESTED');
});
