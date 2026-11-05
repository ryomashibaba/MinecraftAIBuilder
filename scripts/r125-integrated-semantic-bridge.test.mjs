import test from 'node:test';
import assert from 'node:assert/strict';
import {INTEGRATED_SEMANTIC_SCHEMA,validateIntegratedSemanticIntent,
 prepareIntegratedSemanticBridge,assertAuthoredSemanticsUnchanged}
 from '../source/ai/r125-integrated-semantic-bridge.mjs';
const synthetic=()=>({
 schema:INTEGRATED_SEMANTIC_SCHEMA,id:'model-design-sample',
 concept:'Quiet reading rooms around a shared arrival hall with an outdoor loggia',
 spaces:[
  {key:'hall',purpose:'Shared arrival and group gathering',link:null},
  {key:'reading',purpose:'Quiet individual reading and study',link:{to:'hall',kind:'open'}}
 ],
 roofs:[
  {space:'hall',profile:'gable',axis:'x',rank:'primary'},
  {space:'reading',profile:'shed',axis:'z',rank:'secondary'}
 ],
 entry:{face:'south',space:'hall',intent:'A clear public arrival before private rooms'},
 shelters:[{purpose:'Sheltered approach and social pause',connectTo:'hall',edge:'south',scale:'medium',roof:'shed'}],
 features:[{space:'reading',kind:'seat',purpose:'Quiet reading seat and book ledge'}]
});
test('synthetic author intent is preserved, but it is NOT genuine B143',()=>{
 const p=synthetic(),original=JSON.stringify(p);
 const result=prepareIntegratedSemanticBridge(p);
 assert.equal(JSON.stringify(p),original);
 assert.equal(result.status,'PREPARED_SEMANTIC_HANDOFF_NOT_B143');
 assert.equal(result.realB143,'NOT_TESTED');
 assert.equal(result.reason,'PRIVATE_HOST_EXPANSION_REQUIRED');
 assert.equal(result.modelCalls,0);assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(result.BuildPlan.operations,[]);
 assertAuthoredSemanticsUnchanged(result,p);
 const changed=synthetic();changed.entry.face='north';
 assert.throws(()=>assertAuthoredSemanticsUnchanged(result,changed),
  /HOST_CHANGED_AUTHOR_CHOICES/);
});
test('author topology, roof priority and all meaning must be explicit',()=>{
 const changes=[
  p=>{p.spaces[1].link.to='missing';},
  p=>{p.roofs[1].rank='primary';},
  p=>{p.roofs.pop();},
  p=>{p.roofs[1].profile='unsupported';},
  p=>{p.entry.space='not-real';},
  p=>{p.shelters[0].connectTo='not-real';},
  p=>{p.features[0].space='not-real';},
  p=>{p.spaces[0].link={to:'hall',kind:'open'};},
  p=>{p.entry.x=10;},
  p=>{p.sourceSha256='a'.repeat(64);},
  p=>{p.spaces[1].voxelCoords=[1,2,3];},
  p=>{p.features=[];}
 ];
 for(const change of changes){const p=synthetic();change(p);
  assert.throws(()=>validateIntegratedSemanticIntent(p),/R125_INTEGRATED_SEMANTIC_/);
 }
});
test('no type-specific layouts: same contract accepts other semantic programs',()=>{
 const p=synthetic();p.id='station-candidate';
 p.concept='A clear transit-like arrival and sheltered waiting space';
 p.spaces[1].purpose='Arrival and departure waiting room';
 p.shelters.push({purpose:'Shelter for onward departure',connectTo:'reading',edge:'north',scale:'large',roof:'segmented'});
 p.features[0]={space:'hall',kind:'service',purpose:'Information and ticket service counter'};
 const out=prepareIntegratedSemanticBridge(p);
 assert.equal(out.payload.authoredChoices.shelters.length,2);
 assert.equal(out.payload.authoredChoices.features[0].purpose,'Information and ticket service counter');
 assert.equal(out.status,'PREPARED_SEMANTIC_HANDOFF_NOT_B143');
});
