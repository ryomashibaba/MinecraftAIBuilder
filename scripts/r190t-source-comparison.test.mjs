/** Synthetic architectural comparisons; no actual model inference. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareR190TSource,renderR190TPair} from './r190t-source-comparison.mjs';
const common={schema:'minecraftaibuilder-b143-building-dsl-v1',
 id:'r190t-source-fixture',title:'Synthetic architecture study',
 brief:'Independent TEST source, not a Qwen result',designOnly:true,
 bounds:{width:24,depth:24,height:14}};
const solid=()=>({...common,id:'r190t-solid',elements:[{
 id:'block',shape:'box',mode:'add',material:'concrete',
 origin:[2,1,2],size:[20,9,20]}]});
const hollow=()=>({...common,id:'r190t-hollow',elements:[
 {id:'floor',shape:'box',mode:'add',material:'concrete',origin:[2,1,2],size:[20,1,20]},
 {id:'wall-w',shape:'box',mode:'add',material:'wood',origin:[2,2,2],size:[1,6,20]},
 {id:'wall-e',shape:'box',mode:'add',material:'wood',origin:[21,2,2],size:[1,6,20]},
 {id:'wall-n',shape:'box',mode:'add',material:'wood',origin:[2,2,2],size:[20,6,1]},
 {id:'wall-s',shape:'box',mode:'add',material:'wood',origin:[2,2,21],size:[20,6,1]},
 {id:'roof',shape:'box',mode:'add',material:'metal',origin:[2,8,2],size:[20,1,20]},
 {id:'door',shape:'box',mode:'cut',origin:[11,2,2],size:[3,4,1]}
]});
const plan={entrance:[12,2,2]};
test('T: hollow design has supported covered walkable voxels and valid entrance',()=>{
 const c=compareR190TSource({beforeDesign:solid(),afterDesign:hollow(),
  beforePlan:plan,afterPlan:plan});
 assert.equal(c.status,'DIFFERENT_FINAL_VOXEL_GEOMETRY');
 assert.equal(c.before.modelDeclaredEntranceStandable,false);
 assert.equal(c.after.modelDeclaredEntranceStandable,true);
 assert.equal(c.before.twoBlockSupportedStandablePositions,0);
 assert.ok(c.after.twoBlockSupportedStandablePositions>250);
 assert.ok(c.after.roofCoveredReachableProxy>100);
 assert.ok(c.deltas.denseLayerFraction<0);
 assert.equal(c.numericArchitecturalWinner,'NOT_ESTABLISHED');
 assert.equal(c.limitations.sawtoothRoofNotVerified,true);
 assert.equal(c.worldWrites,0);
});
test('T: identical voxels with different metadata cannot look like an improvement',()=>{
 const meta={...solid(),id:'r190t-renamed',title:'Different title'};
 const c=compareR190TSource({beforeDesign:solid(),afterDesign:meta});
 assert.equal(c.samePhysicalVoxels,true);
 assert.notEqual(c.before.sourceSha256,c.after.sourceSha256);
 assert.equal(c.deltas.twoBlockStandable,0);
});
test('T: archived source preview is independent and stamped with real source SHA',()=>{
 const root=path.dirname(fileURLToPath(import.meta.url));
 const tpl=fs.readFileSync(path.resolve(root,'../source/ai/b143-viewer-template.html'),'utf8');
 const r=renderR190TPair(solid(),hollow(),tpl);
 assert.notEqual(r.sourceHashes[0],r.sourceHashes[1]);
 assert.match(r.indexHtml,/R190T_BEFORE_3D.html/);
 assert.match(r.indexHtml,/R190T_AFTER_3D.html/);
 assert.match(r.afterHtml,/r190t-hollow/);
 assert.doesNotMatch(r.indexHtml,/<script|https?:\/\//);
});
test('T: invalid source never yields an invented voxel comparison',()=>{
 const invalid=hollow();invalid.elements.push({id:'bad',shape:'box',mode:'add',
 material:'stone',origin:[23,13,23],size:[2,2,2]});
 assert.throws(()=>compareR190TSource({beforeDesign:solid(),afterDesign:invalid}),
 /B143_/);
});
