import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturePlan,SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildR125BlockExpression,prepareR125BlockPaletteRequest} from '../source/ai/r125-block-expression.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
const standard={schema:SCHEMA,id:'relief-test',title:'Synthetic relief',brief:'Not a model response',footprint:{width:24,depth:24},levels:[{splitAxis:'x',splitPercent:50,spaces:[{id:'first-room',purpose:'public room',access:'public'},{id:'other-room',purpose:'shared room',access:'shared'}]}],materials:{floor:'wood',wall:'stone',roof:'wood'}};
const spatial={...standard,id:'relief-spatial',levels:[{layoutMode:'spatial-tree',spaces:[{id:'first-room',purpose:'public room',access:'public',volume:{width:10,depth:10,roofY:7}},{id:'other-room',purpose:'shared room',access:'shared',volume:{width:10,depth:10,roofY:8,attach:{to:'first-room',side:'east',shift:0}}}]}]};
const options=p=>p===standard?{entrancePlacement:'source-accessible'}:{};
for(const p of [standard,spatial])for(const mode of ['hoods','surrounds'])test(p.id+' '+mode+' real source extension',()=>{
 const a=compileArchitecturePlan(p,options(p)),b=compileArchitecturePlan({...p,windowRelief:mode},options(p));
 const at=new Map(b.compiled.primitives.map(v=>[v.slice(0,3).join(','),v]));
 for(const v of a.compiled.primitives)assert.deepEqual(at.get(v.slice(0,3).join(',')),v);
 assert.ok(b.windowRelief.addedCells>0);
 assert.equal(b.compiled.primitives.length-a.compiled.primitives.length,b.windowRelief.addedCells);
 assert.equal(b.windowRelief.existingCellsChanged,0);
 assert.ok(verifyCompiled(b.design,b.compiled));
 assert.equal(auditR125SourceRoutes(b).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(b.compiled.BuildPlan.operations.length,0);
 const packet=buildR125BlockExpression({design:b.design,scene:b.compiled,palette:{windowFrame:'quartz_block'}});
 assert.ok(packet.coverage.windowFrame.selected>=b.windowRelief.addedCells);
 assert.ok(packet.rows.filter(r=>r[4].startsWith('relief-window-')).every(r=>r[6]==='quartz_block'));
});
test('legacy geometry remains unchanged; invalid relief rejected; schema opt-in',()=>{
 const a=compileArchitecturePlan(standard),b=compileArchitecturePlan({...standard});
 assert.deepEqual(a.compiled,b.compiled);
 assert.equal(a.windowRelief,undefined);
 assert.throws(()=>compileArchitecturePlan({...standard,windowRelief:'unknown'}),/WINDOW_RELIEF_MODE/);
 const body={messages:[{role:'system',content:'base'},{role:'user',content:'original'}],format:{anyOf:[{properties:{id:{type:'string'}},required:['id']}]}};
 const out=prepareR125BlockPaletteRequest(body);
 assert.deepEqual(out.format.anyOf[0].properties.windowRelief.enum,['hoods','surrounds']);
 assert.deepEqual(out.format.anyOf[0].required,['id']);
 assert.equal(out.messages[1].content,'original');
});
test('relief never masks baseline entry failure',()=>{
 assert.equal(auditR125SourceRoutes(compileArchitecturePlan(standard)).status,'HOLD_SOURCE_ROUTES');
 assert.throws(()=>compileArchitecturePlan({...standard,windowRelief:'hoods'}),/WINDOW_RELIEF_SOURCE_CLEARANCE/);
});
