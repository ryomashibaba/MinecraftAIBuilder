import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {r125ElementRole} from '../source/ai/r125-block-expression.mjs';
const plan={schema:SCHEMA,id:'hip-mixed-massing',title:'Synthetic mixed roof composition',brief:'Synthetic test, not model output',materials:{floor:'wood',wall:'concrete',roof:'stone'},rooms:[
 {id:'public-room',purpose:'Public room',width:12,depth:12,roofY:8,roofForm:'hip',roofAxis:'x'},
 {id:'other-room',purpose:'Shared room',width:9,depth:10,roofY:6,roofForm:'shed',roofAxis:'z',attach:{to:'public-room',side:'east',shift:0}}
]};
test('actual four-sided hip and shed compile without changing lower volume or routes',()=>{
 const flat=structuredClone(plan);delete flat.rooms[0].roofForm;delete flat.rooms[0].roofAxis;
 const old=compileSpatialComposition(flat),b=compileSpatialComposition(plan);
 assert.ok(verifyCompiled(b.design,b.compiled));
 assert.equal(b.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const low=x=>x.compiled.primitives.filter(p=>p[1]<8);
 assert.deepEqual(low(old),low(b));
 assert.equal(b.layout.rooms[0].roofForm,'hip');
 const hip=b.design.elements.filter(e=>e.id.startsWith('space-0-roof-hip-'));
 assert.ok(hip.length>=13);
 assert.ok(hip.every(e=>r125ElementRole(e)===(e.material==='stone'?'roof':'wall')));
 assert.ok(b.compiled.primitives.some(p=>p[1]===10&&MATERIALS[p[3]]==='stone'));
 assert.deepEqual(b.BuildPlan.operations,[]);assert.deepEqual(b.gates,Array(9).fill('BLOCKED'));
});
test('unsupported hip span rejected rather than replaced',()=>{
 const p=structuredClone(plan);p.rooms[0].depth=8;
 assert.throws(()=>compileSpatialComposition(p),/R125_HIP_SPAN/);
});
test('hip supported in both axes and original flat output unchanged',()=>{
 const p=structuredClone(plan);p.rooms[0].roofAxis='z';
 assert.equal(compileSpatialComposition(p).sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 const f=structuredClone(plan);delete f.rooms[0].roofForm;delete f.rooms[0].roofAxis;
 assert.deepEqual(compileSpatialComposition(f),compileSpatialComposition(f));
});
