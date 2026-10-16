import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileDesign,validateDesign,verifyCompiled,SCHEMA} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,verifyB143Payload,renderB143Html,extendB142Root,readDesigns} from './build-b143-site.mjs';

const minimal=()=>({schema:SCHEMA,id:'new-mars-workshop',
 title:'火星の研究アトリエ',brief:'カテゴリーを定義せずChatGPTが設計する新しい建物',
 bounds:{width:30,height:30,depth:30},designOnly:true,
 elements:[
  {id:'shell',shape:'box',mode:'add',material:'concrete',origin:[2,1,2],size:[22,17,22],shell:2},
  {id:'roof',shape:'ellipsoid',mode:'add',material:'glass',center:[13,18,13],radii:[10,7,10],shell:1},
  {id:'atrium',shape:'cylinder',mode:'cut',axis:'y',origin:[13,1,13],radius:4,length:12}
 ]});
test('unregistered purpose can produce a stable independent 3D model',()=>{
 const d=minimal(),scene=compileDesign(d);
 assert.equal(validateDesign(d),true);
 assert(scene.primitives.length>100);
 assert.equal(scene.geometrySha256,compileDesign(d).geometrySha256);
 assert.equal(verifyCompiled(d,scene),true);
 assert.equal(scene.BuildPlan.operations.length,0);
 assert.equal(scene.readiness,'NOT_PREPARED');
 assert.equal(scene.worldContacts,0);
});
test('composition is constructive: subsequent cuts remove virtual geometry only',()=>{
 const d=minimal(),a=compileDesign(d);
 d.elements.pop();
 const b=compileDesign(d);
 assert(a.primitives.length<b.primitives.length);
 assert.equal(a.stats.designOperations.at(-1).mode,'cut');
 assert(a.stats.designOperations.at(-1).removed>0);
 assert.equal(a.BuildPlan.operations.length,0);
});
test('malicious / unintended keys, unbounded work and world placement are rejected',()=>{
 const d=minimal();
 for(const [key,value] of [['worldCoordinates',[1,2,3]],['BuildPlan',{operations:[{}]}],['commands',['setblock']]]){
  const changed=structuredClone(d);changed[key]=value;
  assert.throws(()=>validateDesign(changed),/B143_TOP_LEVEL_UNKNOWN/);
 }
 const outside=minimal();outside.elements[0].origin=[29,1,2];
 assert.throws(()=>compileDesign(outside),/B143_OUTSIDE_LOCAL_BOUNDS/);
 const bad=minimal();bad.elements[0].material='minecraft:command_block';
 assert.throws(()=>compileDesign(bad),/B143_MATERIAL/);
 const badShape=minimal();badShape.elements[0].shape='javascript';
 assert.throws(()=>compileDesign(badShape),/B143_SHAPE_MODE/);
 const huge=minimal();huge.bounds={width:128,height:96,depth:128};
 huge.elements=[{id:'huge',shape:'box',mode:'add',origin:[0,0,0],size:[128,96,128],material:'stone'}];
 assert.throws(()=>compileDesign(huge),/B143_BOUNDS|B143_WORK_BUDGET|B143_VOXEL_BUDGET/);
});
test('repeated IDs and malformed or injected titles are fail-closed',()=>{
 const d=minimal();d.elements.push({...d.elements[0]});
 assert.throws(()=>validateDesign(d),/B143_ELEMENT_ID/);
 d.elements.pop();d.title='<img src=x onerror=alert(1)>';
 assert.throws(()=>validateDesign(d),/B143_TITLE_OR_BRIEF/);
});
test('two ChatGPT-authored unknown-category designs validate and are geometrically distinct',()=>{
 const ds=readDesigns(),gallery=compileB143Gallery(ds);
 assert.equal(ds.length,2);
 assert.equal(gallery.scenes.length,2);
 assert.equal(verifyB143Payload(gallery),true);
 assert.equal(gallery.safety.minecraftWrites,0);
 assert.equal(gallery.safety.original15BuildingSafetyGates,'9 BLOCKED');
 assert.notEqual(gallery.scenes[0].geometrySha256,gallery.scenes[1].geometrySha256);
 assert(gallery.scenes.every(s=>s.surface.length>50&&s.surface.length<=s.stats.voxels));
});
test('published viewer is local-only and root link is additive to B142',()=>{
 const d=readDesigns(),p=compileB143Gallery(d);
 const template=fs.readFileSync(new URL('../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const html=renderB143Html(p,template);
 assert(html.includes('stratos-observatory')&&html.includes('canyon-data-sanctuary'));
 assert(html.includes('NOT_PREPARED'));
 assert(!html.includes('__B143_GALLERY_JSON__'));
 assert(!html.includes('fetch('));
 const added=extendB142Root('<header>site</header><main>Original B142</main>');
 assert(added.includes('b143-ai-design-navigation')&&added.includes('Original B142'));
 assert.throws(()=>extendB142Root(added),/B143_B142_ROOT_UNEXPECTED/);
});
test('construction approval mutation prevents B143 publication',()=>{
 const p=compileB143Gallery(readDesigns());
 p.safety.constructionApproved=true;
 assert.equal(verifyB143Payload(p),false);
});
