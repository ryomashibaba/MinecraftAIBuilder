import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compactB143Cuboids,exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {compileR190BNAssembly} from '../source/ai/r190bn-spatial-assembly.mjs';
import {twoLevelReadingProbe} from './fixtures/r190bn-spatial-assemblies.mjs';

const d={schema:'minecraftaibuilder-b143-building-dsl-v1',id:'pilot-house',
 title:'small pilot',brief:'Simple authored structure only, not model output',
 bounds:{width:20,height:10,depth:20},designOnly:true,elements:[
 {id:'floor',shape:'box',mode:'add',material:'stone',origin:[1,0,1],size:[9,1,8]},
 {id:'west-wall',shape:'box',mode:'add',material:'wood',origin:[1,1,1],size:[1,4,8]},
 {id:'east-wall',shape:'box',mode:'add',material:'wood',origin:[9,1,1],size:[1,4,8]},
 {id:'glazing',shape:'box',mode:'add',material:'glass',origin:[1,2,3],size:[1,2,2]}]};
test('exact greedy cuboid tiling is voxel-identical, no material overlap or phantom cells',()=>{
 const scene=compileDesign(d),cuboids=compactB143Cuboids(scene),reconstructed=new Map();
 for(const [x,y,z,X,Y,Z,m] of cuboids)
  for(let i=x;i<=X;i++)for(let j=y;j<=Y;j++)for(let k=z;k<=Z;k++){
   const key=[i,j,k].join(',');
   assert.equal(reconstructed.has(key),false,'overlapping cuboids');
   reconstructed.set(key,m);
  }
 const expected=new Map(scene.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
 assert.deepEqual(reconstructed,expected);
 assert(cuboids.length<scene.primitives.length);
});
test('export is offline only; game writing requires separate explicit chat and backup',()=>{
 const scene=compileDesign(d),x=exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true,provenance:'USER_AUTHORED'});
 assert.equal(x.plannedVoxelCount,scene.primitives.length);
 assert.equal(x.actualEducationExecution,'NOT_TESTED');
 assert.equal(x.worldWrites,0);assert.equal(x.worldContacts,0);
 assert.equal(x.readiness,'NOT_PREPARED');assert.equal(x.gates.length,9);
 assert.match(x.code,/player.onChat\("mabbuild"/);
 assert.match(x.code,/blocks.testForBlock\(AIR/);
 assert.match(x.code,/FillOperation\.Keep/);
 assert.match(x.code,/mabverify/);
 assert.match(x.code,/mabBuilt = true/);
 assert.match(x.code,/mabAnchor = player.position\(\)/);
 assert.equal(x.code.includes('FillOperation.Replace'),false);
});
test('same source/geometry has deterministic export and tampered source is rejected',()=>{
 const scene=compileDesign(d);
 const a=exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true}),b=exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true});
 assert.equal(a.makecodeSourceSha256,b.makecodeSourceSha256);
 const bad=structuredClone(scene);bad.primitives[0][3]=99;
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true:bad}),/SOURCE_GEOMETRY_SHA_MISMATCH/);
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true,originOffset:[0,0,0]}),/ORIGIN_OFFSET/);
});
test('grounding a raised source preserves its geometry while placing its lowest layer at ground level',()=>{
 const raised=structuredClone(d);
 for(const element of raised.elements) element.origin[1]++;
 const scene=compileDesign(raised);
 const packet=exportB143EducationMakeCode({design:raised,scene,groundLowestLayer:true,legacyStoneFallback:true});
 assert.equal(packet.sourceVerticalOffset,-1);
 assert.equal(packet.bounds.height,raised.bounds.height-1);
 const rows=JSON.parse(packet.code.match(/let mabRows: number\[\]\[\] = (.*)/)[1]);
 assert.equal(Math.min(...rows.map(row=>row[1])),0);
 assert.equal(packet.geometrySha256,scene.geometrySha256);
});
test('a second chat cannot move the anchor or start a build during preflight',()=>{
 const code=exportB143EducationMakeCode({design:d,scene,legacyStoneFallback:true:compileDesign(d)}).code
  .replace(/: number\[\]\[\]|: number\[\]|: string\[\]|: number|: Position/g,'');
 const handlers={}, messages=[], fills=[];
 let playerX=0, attempted=false;
 const player={position:()=>({x:playerX,y:0,z:0}),onChat:(name,fn)=>{handlers[name]=fn},say:s=>messages.push(s)};
 const blocks={blockByName:s=>s,testForBlock:(_block,p)=>{
  if(!attempted){attempted=true;playerX=100;handlers.mabset();handlers.mabbuild();}
  return p.y>=0;
 },fill:(_block,a,b)=>fills.push([a,b])};
 vm.runInNewContext(code,{player,blocks,AIR:'air',FillOperation:{Keep:0},
  pos:(x,y,z)=>({x,y,z}),positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}});
 handlers.mabset();handlers.mabbuild();
 assert(fills.length>0);
 assert(fills.every(([a,b])=>a.x<100&&b.x<100));
 assert(messages.some(s=>s.includes('operation in progress')));
 assert(messages.some(s=>s.includes('busy, not set, or already attempted')));
});
test('existing BN genuinely compiled multi-storey scene exports without making a world claim',()=>{
 const q=twoLevelReadingProbe();
 const result=compileR190BNAssembly(q.original,{originalBrief:q.brief,authorship:'SYNTHETIC_TEST_FIXTURE'});
 assert.equal(result.status,'SOURCE_SPACE_AND_ROUTE_PROXIES_PRESENT_ART_HOLD');
 const x=exportB143EducationMakeCode({design:result.proposal.design,scene:result.compiled,provenance:'SYNTHETIC_TEST_FIXTURE',legacyStoneFallback:true});
 assert.equal(x.plannedVoxelCount,result.compiled.primitives.length);
 assert(x.plannedCuboids>10);assert(x.code.length<180000);
 assert.equal(x.programExecuted,false);
});


test('strict default holds unverified wood instead of substituting stone',()=>{
 const scene=compileDesign(d);
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene}),/UNVERIFIED_MATERIAL_WOOD/);
});
test('verified profile preserves source material identities and per-material counts',()=>{
 const scene=compileDesign(d);
 const verifiedPalette={schema:'r125-education-user-verified-palette-v1',edition:'Minecraft Education',
  version:'26.33',blocks:{
  wood:{blockName:'oak_planks',evidence:'copy world MakeCode probe screenshot PASS'},
  accent:{blockName:'unused_accent',evidence:'copy world MakeCode probe screenshot PASS'}}};
 const result=exportB143EducationMakeCode({design:d,scene,verifiedPalette});
 assert.equal(result.materialMode,'STRICT_USER_ATTESTED');
 assert.equal(result.materialMapping[4],'oak_planks');
 assert.equal(result.plannedMaterialCounts.wood,scene.stats.layerCounts.wood);
 assert.equal(Object.values(result.plannedBlockCounts).reduce((a,b)=>a+b,0),scene.primitives.length);
 assert.match(result.code,/mabMaterials\[4\] = blocks.blockByName\("oak_planks"\)/);
 assert.doesNotMatch(result.code,/blockByName\("unused_accent"\)/);
 assert.match(result.code,/matchedCounts\[r\[6\]\]\+\+/);
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene,verifiedPalette:{
  ...verifiedPalette,blocks:{wood:{blockName:'stone',evidence:'copy world test PASS'}}}}),/MATERIAL_COLLISION/);
});
