import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDesign,SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {buildR125BlockExpression,verifyR125BlockExpression,resolveR125FinalOwners,
 validateR125BlockPalette,prepareR125BlockPaletteRequest,makeR125BlockComparisonTemplate} from '../source/ai/r125-block-expression.mjs';
const box=(id,mode,material,origin,size,repeat)=>({id,shape:'box',mode,...(mode==='add'?{material}:{}),origin,size,...(repeat?{repeat}:{})});
const design={schema:SCHEMA,id:'v38-test',title:'Synthetic',brief:'Not a model work',bounds:{width:12,height:12,depth:12},designOnly:true,elements:[
 box('floor-0','add','wood',[1,1,1],[10,1,10]),
 box('l0-front','add','wood',[1,2,1],[10,4,1]),
 box('roof','add','wood',[1,6,1],[10,1,10]),
 box('l0-fin-2','add','wood',[2,2,1],[1,3,1],{count:3,offset:[2,0,0]}),
 box('door','cut',null,[3,2,1],[2,3,1]),
 box('l0-window-front-glass','add','glass',[4,3,1],[1,1,1]),
 box('fx-l0-z0-i0-top','add','wood',[2,2,4],[3,1,1]),
 box('fx-l0-z0-i0-leg','add','metal',[2,2,5],[1,1,1]),
 box('unknown','add','wood',[5,2,5],[1,1,1]),
 box('light','add','glow',[5,3,5],[1,1,1])
]};
const scene=compileDesign(design),args={design,scene,palette:{floor:'birch_planks',wall:'stone_bricks',roof:'deepslate_tiles',trim:'quartz_block',furniture:'spruce_planks'}};
const by=(packet,x,y,z)=>packet.rows.find(r=>r[0]===x&&r[1]===y&&r[2]===z);
test('exact same-material ownership, repeat, cut and re-add',()=>{
 const owners=resolveR125FinalOwners(design,scene);
 const at=(x,y,z)=>owners[scene.primitives.findIndex(p=>p[0]===x&&p[1]===y&&p[2]===z)];
 assert.equal(at(2,2,1),'l0-fin-2');assert.equal(at(6,2,1),'l0-fin-2');
 assert.equal(at(3,2,1),undefined);assert.equal(at(4,3,1),'l0-window-front-glass');
 assert.equal(at(2,1,1),'floor-0');
});
test('real B143 unchanged, distinct roles, protected glass glow metal and unknown',()=>{
 const before=JSON.stringify(scene),p=buildR125BlockExpression(args);
 assert.equal(JSON.stringify(scene),before);assert.equal(p.rows.length,scene.primitives.length);
 assert.deepEqual(p.rows.map(r=>r.slice(0,4)),scene.primitives.map(r=>r.slice(0,4)));
 assert.equal(by(p,1,1,1)[6],'birch_planks');assert.equal(by(p,1,2,1)[6],'stone_bricks');
 assert.equal(by(p,1,6,1)[6],'deepslate_tiles');assert.equal(by(p,2,2,1)[6],'quartz_block');
 assert.equal(by(p,2,2,4)[6],'spruce_planks');
 for(const xyz of [[4,3,1],[2,2,5],[5,2,5],[5,3,5]])assert.equal(by(p,...xyz)[6],null);
 assert.equal(p.sourceSha256,scene.sourceSha256);assert.equal(p.geometrySha256,scene.geometrySha256);
 assert.equal(p.status,'ALL_SELECTED_ROLES_MAPPED');assert.equal(p.BuildPlan.operations.length,0);
 assert.equal(Object.values(p.blockCounts).reduce((a,b)=>a+b,0),p.rows.length);
 assert.equal(verifyR125BlockExpression(args,p),true);
 p.rows[0][6]='sandstone';assert.equal(verifyR125BlockExpression(args,p),false);
});
test('reject unsafe or unknown blocks and forged scene',()=>{
 for(const p of [{roof:'sand'},{floor:'oak_stairs'},{wall:'glass'},{furniture:'stone_bricks'},{fake:'stone'},{}])
  assert.throws(()=>validateR125BlockPalette(p));
 const corrupt=JSON.parse(JSON.stringify(scene));corrupt.primitives[0][0]++;
 assert.throws(()=>buildR125BlockExpression({...args,scene:corrupt}),/SOURCE_MISMATCH/);
});
test('raw selection must match and unused roles are explicit',()=>{
 const a={...args,palette:{roof:'stone'},origin:'CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED',originalRaw:'{"blockPalette":{"roof":"stone"}}'};
 assert.equal(buildR125BlockExpression(a).origin,a.origin);
 assert.throws(()=>buildR125BlockExpression({...a,palette:{roof:'sandstone'}}),/RAW_PALETTE_MISMATCH/);
 const d={...design,elements:[design.elements[0]]},s=compileDesign(d);
 assert.deepEqual(buildR125BlockExpression({design:d,scene:s,palette:{trim:'stone'}}).unusedRoles,['trim']);
});
test('opt-in grammar preserves the original request and viewer toggles the same cells',()=>{
 const original={messages:[{role:'system',content:'base'},{role:'user',content:'雪山'}],format:{anyOf:[{properties:{id:{type:'string'}},required:['id']}]}};
 const next=prepareR125BlockPaletteRequest(original);
 assert.equal(next.messages[1].content,original.messages[1].content);
 assert.equal(Object.hasOwn(original.format.anyOf[0].properties,'blockPalette'),false);
 assert.equal(next.format.anyOf[0].properties.blockPalette.additionalProperties,false);
 assert.deepEqual(next.format.anyOf[0].required,['id']);
 const t='<div id="materialToggles"></div>const palette={};const color=palette[m]||"#aabbcc",height=1;function drawSoon(){}';
 const p=buildR125BlockExpression(args),html=makeR125BlockComparisonTemplate(t,args,p);
 assert.ok(html.includes('v38Colors'));assert.ok(html.includes('v38Blocks'));assert.ok(html.includes('palette[m]'));
});
