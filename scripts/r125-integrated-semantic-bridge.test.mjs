import test from 'node:test';
import assert from 'node:assert/strict';
import {INTEGRATED_SEMANTIC_SCHEMA,validateIntegratedSemanticIntent,
 prepareIntegratedSemanticBridge,assertAuthoredSemanticsUnchanged,
 projectIntegratedSemanticOperations,executeIntegratedSemanticBridge}
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
test('PRIVATE operation plan projects every authored choice without geometry defaults',()=>{
 const raw=synthetic(),snapshot=JSON.stringify(raw);
 const {operations,operationSha256}=projectIntegratedSemanticOperations(raw);
 assert.equal(operations.length,8);
 assert.deepEqual(operations.map(o=>o.type),
  ['CONCEPT','SPACE','SPACE','ROOF','ROOF','ENTRY','SHELTER','FEATURE']);
 assert.equal(operations[0].id,raw.id);
 assert.equal(operations[0].concept,raw.concept);
 assert.deepEqual(operations[2].link,{to:'hall',kind:'open'});
 assert.equal(operations[3].profile,'gable');
 assert.equal(operations[5].face,'south');
 assert.equal(operations[6].roof,'shed');
 assert.equal(operations[7].kind,'seat');
 assert.equal(JSON.stringify(raw),snapshot);
 const ready=prepareIntegratedSemanticBridge(raw);
 assert.deepEqual(ready.payload.operations,operations);
 assert.equal(ready.payload.operationSha256,operationSha256);
 assert.equal(ready.realB143,'NOT_TESTED');
 const tampered=prepareIntegratedSemanticBridge(raw);
 tampered.payload.operations[3].profile='flat';
 assert.throws(()=>assertAuthoredSemanticsUnchanged(tampered,raw),
  /OPERATION_PLAN_TAMPERED/);
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

// Injected transport/product only: no claim to execute the PRIVATE engine in CI.
import {compileDesign,SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {createIntegratedSpatialHost} from '../source/ai/r125-integrated-spatial-host.mjs';
function injectedHost(change=()=>{}){
 return {
  expand:p=>({authorEcho:p.authoredChoices,operations:p.operations}),
  derive:e=>{
   const design={schema:SCHEMA,id:'synthetic-boundary',title:'Injected boundary product',
    brief:'Synthetic B143 contract fixture, no semantic or art certification',
    designOnly:true,bounds:{width:8,height:8,depth:8},elements:[
     {id:'floor',shape:'box',mode:'add',material:'stone',origin:[0,1,0],size:[8,1,8]}]};
   const r={design,compiled:compileDesign(design),readiness:'NOT_PREPARED',
    constructionApproved:false,executionAllowed:false,worldContacts:0,worldWrites:0,
    gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
   change(r,e);return r;
  }
 };
}
test('bound PRIVATE executor recompiles source and every voxel; it never certifies meaning or ART',async()=>{
 const a=synthetic(),snapshot=JSON.stringify(a);
 const r=await executeIntegratedSemanticBridge(a,injectedHost());
 assert.equal(r.status,'GENUINE_B143_CANDIDATE');
 assert.equal(r.realB143,'RECOMPILED_SHA_MATCH');
 assert.equal(r.semanticFulfillment,'NOT_CERTIFIED');
 assert.equal(r.provenance,'CALLER_SUPPLIED_UNATTESTED');
 assert.equal(r.art,'ART_HOLD');assert.equal(r.modelCalls,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(JSON.stringify(a),snapshot);
 assert.equal((await executeIntegratedSemanticBridge(a,{})).reason,'PRIVATE_HOST_NOT_BOUND');
});
test('host rejection, semantic mutation, voxel tampering and unsafe products HOLD without leaking PRIVATE text',async()=>{
 const hosts=[
  {expand:()=>{throw Error('PRIVATE sensitive path and text');},derive:()=>{}},
  injectedHost((r,e)=>{e.authorEcho.entry.face='north';}),
  injectedHost(r=>{r.compiled.primitives[0][0]++;}),
  injectedHost(r=>{r.compiled.geometrySha256='0'.repeat(64);}),
  injectedHost(r=>{r.worldWrites=1;}),
  injectedHost(r=>{r.executionAllowed=true;}),
  injectedHost(r=>{r.gates[0]='PASS';}),
  injectedHost(r=>{r.BuildPlan.operations.push({type:'unsafe'});})
 ];
 for(const host of hosts){const r=await executeIntegratedSemanticBridge(synthetic(),host);
  assert.equal(r.status,'HOLD');assert.equal(r.reason,'PRIVATE_HOST_REJECTED');
  assert.equal(r.worldWrites,0);assert.equal(r.realB143,'NOT_TESTED');
  assert(!('privateProduct' in r));assert(!JSON.stringify(r).includes('sensitive'));
 }
});

function supportedSpatialAuthor(){
 const a=synthetic();a.roofs.forEach(r=>r.profile='shed');
 a.shelters[0].roof='flat';return a;
}
test('common HOST mechanically expands author topology, actual door walls, fixtures and independent roof sections',()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('PRIVATE engine not available in public CI');}});
 const a=supportedSpatialAuthor();
 const expand=a=>host.expand(prepareIntegratedSemanticBridge(a).payload);
 const open=expand(a);
 assert.deepEqual(open.authorEcho,a);assert.equal(open.intent.spaces.length,a.spaces.length);
 assert.equal(open.intent.partitions.length,0);
 assert.equal(open.intent.architecture.roofSections.length,a.roofs.length);
 assert.equal(open.intent.architecture.shelters.length,a.shelters.length);
 assert.equal(open.intent.fixtures.length,a.features.length);
 assert.equal(open.journal.length,projectIntegratedSemanticOperations(a).operations.length);
 a.spaces[1].link.kind='door';
 const door=expand(a);assert.equal(door.intent.partitions.length,1);
 assert(door.intent.joins.some(j=>j.spaces.includes('reading')&&j.openingId!==null));
 a.features[0].kind='storage';const storage=expand(a);
 assert.notDeepEqual(storage.intent.fixtures[0].parts,door.intent.fixtures[0].parts);
 // The host has a procedural support-floor seed, never a historical model source.
 assert.equal(storage.provenance,'PROCEDURAL_HOST_SOURCE_SEED_NOT_HISTORICAL_SOURCE');
 assert.equal(storage.base.compiled.primitives.filter(c=>c[1]===1).length,120);
});
test('parent choice moves the physical space; unsupported engine capabilities HOLD without replacement',async()=>{
 const host=createIntegratedSpatialHost({deriveIntegratedShell:()=>{throw Error('NO_PRIVATE_ENGINE');}});
 const a=supportedSpatialAuthor();
 a.spaces.push({key:'workshop',purpose:'Public hands-on practical work',link:{to:'reading',kind:'door'}});
 a.roofs.push({space:'workshop',profile:'shed',axis:'x',rank:'subordinate'});
 const before=host.expand(prepareIntegratedSemanticBridge(a).payload);
 a.spaces[2].link.to='hall';
 const after=host.expand(prepareIntegratedSemanticBridge(a).payload);
 assert.notDeepEqual(before.intent.spaces[2].rect,after.intent.spaces[2].rect);
 for(const change of [a=>a.roofs[0].profile='gable',a=>a.entry.face='east',
  a=>a.shelters[0].roof='shed',a=>a.shelters=[]]){
  const b=supportedSpatialAuthor();change(b);
  const result=await executeIntegratedSemanticBridge(b,host);
  assert.equal(result.status,'HOLD');assert(!result.privateProduct);
 }
 assert.throws(()=>createIntegratedSpatialHost(),/EXISTING_ENGINE_REQUIRED/);
});
