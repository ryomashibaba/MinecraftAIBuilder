import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r125ResponseFormatForEndpoint} from '../source/ai/b198g-local-model-adapter.mjs';
import {prepareR125DelegatedRequest,replayR125DelegatedResponse,expandR125DelegationMap} from './r125-delegated-model-trial.mjs';
const base=()=>({schema:'minecraftaibuilder-r125-architecture-plan-v1',
 id:'delegation-synthetic',title:'Synthetic dimension study',
 brief:'Synthetic test only, not a genuine model response',
 footprint:{width:26,depth:26},levels:[{splitAxis:'z',splitPercent:50,spaces:[
  {id:'public-room',purpose:'Public shared work',access:'public',fixtures:['table']},
  {id:'staff-room',purpose:'Staff work',access:'staff',fixtures:['desk']}
 ]}],materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}});
const request=()=>({model:'qwen3:14b',stream:false,options:{temperature:0.55},
 messages:[{role:'system',content:'Existing generic instructions'},
 {role:'user',content:JSON.stringify({architecturalRequest:'小さな作業場所を作って。'})}],
 format:r125ResponseFormatForEndpoint('http://127.0.0.1:11434/v1/chat/completions').json_schema.schema});
test('real schema: optional delegation only for one floor, original request preserved',()=>{
 const b=request(),before=structuredClone(b),r=prepareR125DelegatedRequest(b);
 assert.deepEqual(b,before);assert.equal(r.messages[1].content,b.messages[1].content);
 assert.deepEqual(r.options,b.options);
 const stripped=structuredClone(r);stripped.messages[0].content=b.messages[0].content;
 for(const v of stripped.format.anyOf){
  const one=v.properties.levels.maxItems===1;
  assert.equal(Object.hasOwn(v.properties,'delegatedDimensions'),one);
  assert.equal(v.required.includes('delegatedDimensions'),false);
  delete v.properties.delegatedDimensions;
 }
 assert.deepEqual(stripped,b);
});
test('preserve actual observation restrictions and OpenAI-compatible schema',()=>{
 const b=request();for(const v of b.format.anyOf)delete v.properties.observationLink;
 b.response_format={type:'json_schema',json_schema:{strict:true,schema:b.format}};
 delete b.format;
 const r=prepareR125DelegatedRequest(b);
 for(const v of r.response_format.json_schema.schema.anyOf)
  assert.equal(Object.hasOwn(v.properties,'observationLink'),false);
 assert.equal(r.messages[1].content,b.messages[1].content);
});
test('strict response replays unchanged with real SOURCE diagnostic',()=>{
 const p=base(),raw=JSON.stringify(p);
 const r=replayR125DelegatedResponse(raw,'小さな作業場所を作って。');
 assert.equal(r.delegationSelected,false);assert.equal(r.sourceVerified,true);
 assert.equal(r.originalSha256,createHash('sha256').update(raw).digest('hex'));
});
test('genuine SOURCE replay on synthetic spatial wire with delegated footprint',()=>{
 const p=base();delete p.expression;p.id='delegation-spatial-synthetic';
 p.footprint={width:16,depth:26};
 p.levels=[{layoutMode:'spatial-tree',
 rootSpace:{id:'public-room',purpose:'Public gathering',access:'public',fixtures:['seating'],
 volume:{width:14,depth:10,roofY:8,roofForm:'gable',roofAxis:'x'}},
 attachedSpaces:[{id:'staff-room',purpose:'Private work',access:'staff',fixtures:['desk'],
 volume:{width:9,depth:8,roofY:6,roofForm:'shed',roofAxis:'z',
 attach:{to:'public-room',side:'east',shift:0}}}]}];
 p.delegatedDimensions=[{field:'footprint.width',choices:[16,30]}];
 const raw=JSON.stringify(p),r=replayR125DelegatedResponse(raw,'小さな集会所を作って。');
 assert.equal(r.delegationSelected,true);assert.equal(r.sourceVerified,true);
 assert.equal(r.wireNormalization.applied,true);
 assert.equal(r.candidate.footprint.width,30);
 assert.deepEqual(r.candidate.levels[0].spaces,[p.levels[0].rootSpace,...p.levels[0].attachedSpaces]);
 assert.equal(r.originalSha256,createHash('sha256').update(raw).digest('hex'));
 assert.equal(r.attempts.length,2);assert.equal(r.diagnostic.worldWrites,0);
});
test('invalid declaration never falls back to silent repair',()=>{
 const p=base();p.delegatedDimensions=[{field:'expression.roofProfile',choices:[1,2]}];
 assert.throws(()=>replayR125DelegatedResponse(JSON.stringify(p),'小さな建物を作って。'),/FIELD_NOT_DELEGATABLE/);
 const b=request();b.messages[1].content=JSON.stringify({architecturalRequest:'小さな建物',previousArchitecturePlan:{}});
 assert.throws(()=>prepareR125DelegatedRequest(b),/FRESH_REQUEST_REQUIRED/);
});

test('compact contract: map fields are mode-specific and baseline is implicit',()=>{
 const body=prepareR125DelegatedRequest(request());
 const one=body.format.anyOf.find(v=>v.properties.expression&&v.properties.levels.maxItems===1);
 const map=one.properties.delegatedDimensions;
 assert.equal(map.type,'object');assert.equal(map.additionalProperties,false);
 assert.deepEqual(Object.keys(map.properties),['width','depth','split','secondary']);
 const spatial=body.format.anyOf[0].properties.delegatedDimensions;
 assert.ok(spatial.properties.r1Shift);assert.equal(spatial.properties.split,undefined);
 const p=base();p.levels[0].splitPercent=40;
 const expanded=expandR125DelegationMap(p,{split:[30,55],width:[26,30,30]});
 assert.deepEqual(expanded.delegated,[
  {field:'levels.0.splitPercent',choices:[40,30,55]},
  {field:'footprint.width',choices:[26,30]}]);
 assert.equal(expanded.redundancies.length,2);
 assert.throws(()=>expandR125DelegationMap(p,{secondary:[50]}),/DELEGATION_MAP_FIELD_ABSENT/);
 assert.throws(()=>expandR125DelegationMap(p,{r0Width:[12]}),/DELEGATION_MAP_FIELD/);
 assert.throws(()=>expandR125DelegationMap(p,{width:[33]}),/DELEGATION_MAP_VALUES/);
});
test('compact map real SOURCE baseline preserves original author values',()=>{
 const p=base(),raw=JSON.stringify({...p,delegatedDimensions:{width:[28,30],split:[45,55]}});
 const r=replayR125DelegatedResponse(raw,'小さな作業場所を作って。');
 assert.equal(r.delegationContract.format,'compact-map');
 assert.equal(r.sourceVerified,true);assert.equal(r.attempts.length,1);
 assert.deepEqual(r.candidate,p);assert.deepEqual(r.changes,[]);
 assert.equal(r.originalSha256,createHash('sha256').update(raw).digest('hex'));
});
test('compact map real spatial SOURCE recovery without duplicate baseline',()=>{
 const p=base();delete p.expression;p.id='delegation-spatial-map';
 p.footprint={width:16,depth:26};
 p.levels=[{layoutMode:'spatial-tree',
 rootSpace:{id:'public-room',purpose:'Public gathering',access:'public',fixtures:['seating'],
 volume:{width:14,depth:10,roofY:8,roofForm:'gable',roofAxis:'x'}},
 attachedSpaces:[{id:'staff-room',purpose:'Private work',access:'staff',fixtures:['desk'],
 volume:{width:9,depth:8,roofY:6,roofForm:'shed',roofAxis:'z',
 attach:{to:'public-room',side:'east',shift:0}}}]}];
 const raw=JSON.stringify({...p,delegatedDimensions:{width:[30]}});
 const r=replayR125DelegatedResponse(raw,'小さな集会所を作って。');
 assert.equal(r.sourceVerified,true);assert.equal(r.attempts.length,2);
 assert.deepEqual(r.changes,[{field:'footprint.width',from:16,to:30}]);
 assert.deepEqual(r.candidate.levels[0].spaces,[p.levels[0].rootSpace,...p.levels[0].attachedSpaces]);
 assert.equal(r.originalSha256,createHash('sha256').update(raw).digest('hex'));
});
