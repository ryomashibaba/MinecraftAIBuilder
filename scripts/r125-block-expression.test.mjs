import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign,SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {buildR125BlockExpression,verifyR125BlockExpression,resolveR125FinalOwners,
 validateR125BlockPalette,prepareR125BlockPaletteRequest,makeR125BlockComparisonTemplate,r125ReviewFaces,r125ReviewPattern} from '../source/ai/r125-block-expression.mjs';
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

test('real conventional and spatial R125 compile with and without authored palette, same B143 bytes',()=>{
 const schema='minecraftaibuilder-r125-architecture-plan-v1';
 const standard={schema,id:'corner-shop',title:'An original small building',
  brief:'Independent spatial program, not a genre template',footprint:{width:18,depth:18},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'area-0a',purpose:'customer area'},{id:'area-0b',purpose:'stockroom'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'}};
 const spatial={schema,id:'spatial-satellite-workshop',title:'Public satellite workshop',
  brief:'A public exhibit and record desk view satellite assembly and inspection.',
  footprint:{width:26,depth:22},
  levels:[{layoutMode:'spatial-tree',spaces:[
   {id:'gallery-room',purpose:'Public exhibit and visitor reception',access:'public',fixtures:['display','desk'],
    volume:{width:10,depth:8,roofY:7}},
   {id:'assembly-room',purpose:'Staff satellite assembly and parts storage',access:'staff',
    fixtures:['storage','assembly-table'],fixtureArrangement:'focal-island',
    volume:{width:10,depth:8,roofY:9,attach:{to:'gallery-room',side:'east',shift:0}}},
   {id:'inspection-room',purpose:'Staff quality inspection',access:'staff',fixtures:['inspection-stand'],
    volume:{width:7,depth:8,roofY:7,attach:{to:'assembly-room',side:'south',shift:0}}}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  observationLink:{viewerSpaceId:'gallery-room',workSpaceId:'assembly-room'}};
 for(const original of [standard,spatial]){
  const palette={floor:'birch_planks',wall:'stone_bricks',roof:'deepslate_tiles',
   ...(original===spatial?{furniture:'spruce_planks'}:{})};
  const before=compileArchitecturePlan(original),after=compileArchitecturePlan({...original,blockPalette:palette});
  assert.deepEqual(after.design,before.design);
  assert.deepEqual(after.compiled,before.compiled);
  assert.equal(after.worldWrites,0);
  const packet=buildR125BlockExpression({design:after.design,scene:after.compiled,palette});
  assert.equal(packet.status,'ALL_SELECTED_ROLES_MAPPED');
  assert.equal(packet.occupiedVoxels,original===spatial?876:796);
  assert.equal(packet.geometrySha256,before.compiled.geometrySha256);
  if(original===spatial)assert.equal(after.sourceRoutes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
 }
});
test('real gallery comparison uses the original template and exact source',()=>{
 const template=readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const gallery=compileB143Gallery([design]),packet=buildR125BlockExpression(args);
 const html=renderB143Html(gallery,makeR125BlockComparisonTemplate(template,args,packet));
 assert.ok(html.includes('v38Colors'));
 assert.ok(html.includes('v38Blocks'));
 assert.ok(html.includes(scene.geometrySha256));
 assert.ok(!html.includes('__B143_GALLERY_JSON__'));
 assert.equal(gallery.safety.constructionApproved,false);
});

test('model-selected window frame and shelf finish preserve exact geometry and protect other glass',()=>{
 const d={...design,elements:[
  box('l0-front','add','wood',[1,2,1],[8,4,1]),
  box('l0-window-front-cut','cut',null,[3,3,1],[2,2,1]),
  box('l0-window-front-glass','add','glass',[3,3,1],[2,2,1]),
  box('fx-l0-z0-i0-bottom-shelf','add','metal',[2,2,4],[3,1,1]),
  box('fx-l0-z0-i0-shelf-object','add','accent',[3,3,4],[1,1,1]),
  box('fx-l0-z0-i1-glass','add','glass',[2,3,5],[2,1,1]),
  box('l0-divider','add','wood',[2,2,6],[6,4,1])
 ]};
 const s=compileDesign(d),a={design:d,scene:s,palette:{wall:'spruce_planks',windowFrame:'quartz_block',storage:'bookshelf'}};
 const p=buildR125BlockExpression(a);
 assert.equal(p.coverage.windowFrame.selected,8);
 assert.equal(p.coverage.storage.selected,4);
 assert.equal(by(p,3,3,1)[6],null);
 assert.equal(by(p,2,3,1)[6],'quartz_block');
 assert.equal(by(p,2,2,6)[6],'spruce_planks');
 assert.equal(by(p,3,2,4)[6],'bookshelf');
 assert.deepEqual(p.rows.map(r=>r.slice(0,4)),s.primitives.map(r=>r.slice(0,4)));
 assert.equal(verifyR125BlockExpression(a,p),true);
 assert.throws(()=>validateR125BlockPalette({wall:'bookshelf'}));
});
test('face culling uses correct camera octants and actual visible occupancy',()=>{
 const a=[1,1,1,0,0],b=[2,1,1,0,0];
 const q=r125ReviewFaces([a,b],Math.PI/4,.6);
 assert.equal(q.length,5);
 assert.equal(q.some(f=>f.cell===a&&f.normal[0]===1),false);
 assert.equal(q.some(f=>f.cell===b&&f.normal[0]===1),true);
 const reverse=r125ReviewFaces([a,b],-3*Math.PI/4,.6);
 assert.equal(reverse.some(f=>f.cell===a&&f.normal[0]===-1),true);
 assert.equal(reverse.some(f=>f.cell===b&&f.normal[0]===-1),false);
 assert.equal(r125ReviewFaces([a],Math.PI/4,.6).length,3);
 assert.ok(r125ReviewPattern('oak_planks','top').length>0);
 assert.ok(r125ReviewPattern('bookshelf','x').length>0);
 assert.deepEqual(r125ReviewPattern('white_concrete','top'),[]);
});
