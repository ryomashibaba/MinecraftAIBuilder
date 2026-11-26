import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturePlan,SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {buildR125BlockExpression,prepareR125BlockPaletteRequest} from '../source/ai/r125-block-expression.mjs';
import {auditR125SourceRoutes} from '../source/ai/r125-source-routes.mjs';
const standard={schema:SCHEMA,id:'relief-test',title:'Synthetic relief',brief:'Not a model response',footprint:{width:24,depth:24},levels:[{splitAxis:'x',splitPercent:50,spaces:[{id:'first-room',purpose:'public room',access:'public'},{id:'other-room',purpose:'shared room',access:'shared'}]}],materials:{floor:'wood',wall:'stone',roof:'wood'}};
const spatial={...standard,id:'relief-spatial',levels:[{layoutMode:'spatial-tree',spaces:[{id:'first-room',purpose:'public room',access:'public',volume:{width:10,depth:10,roofY:7}},{id:'other-room',purpose:'shared room',access:'shared',volume:{width:10,depth:10,roofY:8,attach:{to:'first-room',side:'east',shift:0}}}]}]};
const options=p=>p===standard?{entrancePlacement:'source-accessible'}:{};
for(const p of [standard,spatial])for(const mode of ['pilasters','framed-bays'])test(p.id+' '+mode+' actual B143 relief',()=>{
 const a=compileArchitecturePlan(p,options(p)),b=compileArchitecturePlan({...p,wallRelief:mode},options(p));
 const final=new Map(b.compiled.primitives.map(v=>[v.slice(0,3).join(','),v]));
 for(const v of a.compiled.primitives)assert.deepEqual(final.get(v.slice(0,3).join(',')),v);
 assert.ok(b.wallRelief.addedCells>0);assert.equal(b.wallRelief.existingCellsChanged,0);
 assert.equal(b.compiled.primitives.length-a.compiled.primitives.length,b.wallRelief.addedCells);
 assert.equal(auditR125SourceRoutes(b).status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.ok(verifyCompiled(b.design,b.compiled));assert.equal(b.compiled.BuildPlan.operations.length,0);
 const packet=buildR125BlockExpression({design:b.design,scene:b.compiled,palette:{trim:'quartz_block'}});
 assert.equal(packet.rows.filter(r=>r[4].startsWith('wall-relief-')&&r[6]==='quartz_block').length,b.wallRelief.addedCells);
 if(mode==='framed-bays')assert.ok(b.wallRelief.faces.every(f=>f.elementIds.some(id=>id.endsWith('-band'))));
});
test('window and wall relief combined, never overwrite existing parts',()=>{
 const a=compileArchitecturePlan({...standard,windowRelief:'hoods'},options(standard));
 const b=compileArchitecturePlan({...standard,windowRelief:'hoods',wallRelief:'pilasters'},options(standard));
 assert.ok(b.windowRelief.addedCells>0);assert.ok(b.wallRelief.addedCells>0);
 const at=new Map(b.compiled.primitives.map(v=>[v.slice(0,3).join(','),v]));
 for(const v of a.compiled.primitives)assert.deepEqual(at.get(v.slice(0,3).join(',')),v);
 assert.equal(b.wallRelief.baselineGeometrySha256,a.geometrySha256);
});
test('opt-in only, schema, invalid selection and old entry failure',()=>{
 const a=compileArchitecturePlan(standard),b=compileArchitecturePlan({...standard});
 assert.deepEqual(a.compiled,b.compiled);assert.equal(a.wallRelief,undefined);
 assert.throws(()=>compileArchitecturePlan({...standard,wallRelief:'bogus'}),/WALL_RELIEF_MODE/);
 assert.throws(()=>compileArchitecturePlan({...standard,wallRelief:'pilasters'}),/WALL_RELIEF_SOURCE_CLEARANCE/);
 const body={messages:[{role:'system',content:'base'},{role:'user',content:'original'}],format:{anyOf:[{properties:{id:{type:'string'}},required:['id']}]}};
 const out=prepareR125BlockPaletteRequest(body);
 assert.deepEqual(out.format.anyOf[0].properties.wallRelief.enum,['pilasters','framed-bays']);
 assert.deepEqual(out.format.anyOf[0].required,['id']);assert.equal(out.messages[1].content,'original');
});
