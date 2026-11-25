import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveR125DelegatedDimensions as resolve} from './r125-delegated-dimensions-study.mjs';
import {diagnoseR125ArchitecturePlanOriginal as diagnose} from './r125-offline-replay.mjs';
const evalSource=p=>diagnose(JSON.stringify(p));
const base=()=>({schema:'minecraftaibuilder-r125-architecture-plan-v1',
 id:'delegation-synthetic',title:'Synthetic dimension study',
 brief:'Synthetic test only, not a genuine model response',
 footprint:{width:26,depth:26},
 levels:[{splitAxis:'z',splitPercent:50,spaces:[
  {id:'public-room',purpose:'Public shared work',access:'public',fixtures:['table']},
  {id:'staff-room',purpose:'Staff work',access:'staff',fixtures:['desk']}
 ]}],materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',
  roofAxis:'x',facadeLanguage:'plain'}});
const diag=(pass=false)=>({status:pass?'B143_SOURCE_CANDIDATE_ART_HOLD':'HOLD_FUNCTIONAL_SOURCE',
 sourceVerified:pass,worldWrites:0,worldContacts:0,worldGates:Array(9).fill('BLOCKED'),
 constructionApproved:false,executionAllowed:false,modelCalls:0,originalEdited:false,
 structuralComposition:{status:'NOT_REQUIRED'}});
test('coupled dimension search preserves every undelegated field',()=>{
 const plan=base(),author={plan,delegated:[
  {field:'footprint.width',choices:[26,30]},
  {field:'levels.0.splitPercent',choices:[50,60]}]};
 const before=structuredClone(author);
 const r=resolve(author,p=>diag(p.footprint.width===30&&p.levels[0].splitPercent===60));
 assert.equal(r.status,'DELEGATED_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.attempts.length,4);assert.equal(r.changes.length,2);
 assert.deepEqual(author,before);
 const restored=structuredClone(r.candidate);restored.footprint.width=26;
 restored.levels[0].splitPercent=50;assert.deepEqual(restored,plan);
 const short=resolve(author,()=>diag(false),{maxCandidates:2});
 assert.equal(short.budgetExhausted,true);assert.equal(short.candidate,null);
});
test('reject author drift, undeclared fields and unsafe diagnostic',()=>{
 const plan=base(),author={plan,delegated:[{field:'footprint.width',choices:[26,30]}]};
 assert.throws(()=>resolve(author,p=>{p.expression.roofProfile='ridge';return diag(true)}),/AUTHOR_DRIFT/);
 assert.throws(()=>resolve({plan,delegated:[{field:'expression.roofProfile',choices:['flat','ridge']}]},()=>diag(true)),/FIELD_NOT_DELEGATABLE/);
 assert.throws(()=>resolve(author,()=>({...diag(true),worldWrites:1})),/INVALID_DIAGNOSTIC/);
 assert.throws(()=>resolve({plan,delegated:[{field:'footprint.width',choices:[26,33]}]},()=>diag(true)),/VALUES/);
});
test('real R125 replay: preserve passing conventional baseline',()=>{
 const plan=base(),before=structuredClone(plan);
 const r=resolve({plan,delegated:[{field:'footprint.width',choices:[26,30]}]},evalSource);
 assert.equal(r.status,'DELEGATED_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.attempts.length,1);assert.deepEqual(r.candidate,plan);
 assert.equal(r.diagnostic.sourceVerified,true);assert.deepEqual(plan,before);
 assert.equal(r.diagnostic.geometrySha256,evalSource(plan).geometrySha256);
});
test('real R125 replay: delegated site resolves authored gable wing footprint',()=>{
 const plan=base();delete plan.expression;
 plan.id='delegation-spatial-synthetic';plan.footprint={width:16,depth:26};
 plan.levels=[{layoutMode:'spatial-tree',spaces:[
  {id:'public-room',purpose:'Public gathering',access:'public',fixtures:['seating'],
   volume:{width:14,depth:10,roofY:8,roofForm:'gable',roofAxis:'x'}},
  {id:'staff-room',purpose:'Private work',access:'staff',fixtures:['desk'],
   volume:{width:9,depth:8,roofY:6,roofForm:'shed',roofAxis:'z',
    attach:{to:'public-room',side:'east',shift:0}}}
 ]}];
 const before=structuredClone(plan);
 const r=resolve({plan,delegated:[{field:'footprint.width',choices:[16,30]}]},evalSource);
 assert.equal(r.attempts[0].reason,'R125_PLAN_SPATIAL_VOLUMES_EXCEED_FOOTPRINT');
 assert.equal(r.status,'DELEGATED_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.candidate.footprint.width,30);
 assert.deepEqual(r.candidate.levels,plan.levels);assert.deepEqual(plan,before);
 assert.equal(r.diagnostic.sourceVerified,true);
 assert.equal(r.diagnostic.worldWrites,0);
});
