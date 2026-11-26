import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturePlan,SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {buildR125BlockExpression,makeR125BlockComparisonTemplate,prepareR125BlockPaletteRequest} from '../source/ai/r125-block-expression.mjs';
import {buildR125RoofSurface,verifyR125RoofSurface,r125HalfMask,r125PartialReviewFaces,makeR125RoofSurfaceTemplate} from '../source/ai/r125-roof-surface.mjs';
import {validateR125RoofSurface} from '../source/ai/r125-roof-surface-contract.mjs';
const standard={schema:SCHEMA,id:'surface-ridge',title:'Synthetic',brief:'Not genuine inference',footprint:{width:24,depth:24},
 levels:[{splitAxis:'x',splitPercent:50,spaces:[{id:'first-room',purpose:'public room',access:'public'},{id:'other-room',purpose:'shared room',access:'shared'}]}],
 materials:{floor:'wood',wall:'stone',roof:'wood'},
 expression:{setbackSide:'none',setbackDepth:0,roofProfile:'ridge',roofAxis:'x',facadeLanguage:'plain',roofVolume:'raised',ridgeProfile:'tapered'}};
const spatial={...standard,id:'surface-spatial',levels:[{layoutMode:'spatial-tree',spaces:[
 {id:'first-room',purpose:'public room',access:'public',volume:{width:10,depth:10,roofY:7,roofForm:'gable',roofAxis:'x'}},
 {id:'other-room',purpose:'shared room',access:'shared',volume:{width:10,depth:10,roofY:8,roofForm:'shed',roofAxis:'z',attach:{to:'first-room',side:'east',shift:0}}}]}]};
delete spatial.expression;
const argsFor=(base,mode,opts)=>{const p={...base,blockPalette:{roof:'spruce_planks'},roofSurface:mode},a=compileArchitecturePlan(base,opts),b=compileArchitecturePlan(p,opts);
 assert.deepEqual(a.design,b.design);assert.deepEqual(a.compiled,b.compiled);
 return {design:b.design,scene:b.compiled,palette:p.blockPalette,origin:'CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED',originalRaw:JSON.stringify(p)}};
for(const p of [standard,spatial])test(p.id+' actual compiled roof shape overlay',()=>{
 const args=argsFor(p,'stairs-and-slabs',p===standard?{entrancePlacement:'source-accessible'}:{});
 const exp=buildR125BlockExpression(args),s=buildR125RoofSurface(args,exp);
 assert.ok(s.counts.stairs>0);assert.ok(s.counts.slabs>0);
 assert.ok(s.rows.every(r=>exp.rows.some(v=>v.slice(0,3).join(',')===r.at.join(',')&&v[5]==='roof')));
 assert.ok(s.rows.filter(r=>r.kind==='stairs').every(r=>r.block==='spruce_stairs'&&['x+','x-','z+','z-'].includes(r.highSide)));
 assert.ok(s.rows.filter(r=>r.kind==='slab').every(r=>r.block==='spruce_slab'&&r.highSide===null));
 assert.equal(s.frozenSourceChanged,false);assert.equal(s.BuildPlan.operations.length,0);
 assert.equal(verifyR125RoofSurface(args,exp,s),true);
 s.rows[0].highSide='forged';assert.equal(verifyR125RoofSurface(args,exp,s),false);
});
test('flat roof slabs, no stair invention; unsupported material fails',()=>{
 const p={...standard,expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'plain'}};
 const args=argsFor(p,'slabs',{entrancePlacement:'source-accessible'});
 const s=buildR125RoofSurface(args,buildR125BlockExpression(args));assert.ok(s.counts.slabs>0);assert.equal(s.counts.stairs,0);
 assert.throws(()=>validateR125RoofSurface({roofSurface:'stairs',blockPalette:{roof:'white_concrete'}}),/CONTRACT/);
 assert.throws(()=>validateR125RoofSurface({roofSurface:'stairs'}),/CONTRACT/);
});
test('half-block masks, all four high sides, exact coordinate transform',()=>{
 assert.equal(r125HalfMask(null).length,8);assert.equal(r125HalfMask({kind:'slab'}).length,4);
 for(const side of ['x+','x-','z+','z-']){
  const m=r125HalfMask({kind:'stairs',highSide:side});assert.equal(m.length,6);
  const index=side[0]==='x'?0:2;
  assert.ok(m.filter(p=>p[1]===1).every(p=>p[index]===(side[1]==='+'?1:0)));
 }
 const p=[2,3,4,0,0],f=r125PartialReviewFaces([p],{'2,3,4':{kind:'slab'}},.6,.5);
 assert.ok(f.length>0);assert.ok(f.every(v=>v.cell.join(',')===p.join(',')&&v.vertices.every(q=>q[1]>=3&&q[1]<=3.5)));
});
test('optional grammar keeps user input and required keys unchanged',()=>{
 const body={messages:[{role:'system',content:'base'},{role:'user',content:'original'}],format:{anyOf:[{properties:{id:{type:'string'}},required:['id']}]}};
 const next=prepareR125BlockPaletteRequest(body);assert.deepEqual(next.format.anyOf[0].properties.roofSurface.enum,['stairs','stairs-and-slabs','slabs']);
 assert.deepEqual(next.format.anyOf[0].required,['id']);assert.equal(next.messages[1].content,'original');
});
