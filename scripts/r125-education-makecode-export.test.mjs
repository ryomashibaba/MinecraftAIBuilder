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
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene:bad,legacyStoneFallback:true}),/SOURCE_GEOMETRY_SHA_MISMATCH/);
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
 const code=exportB143EducationMakeCode({design:d,scene:compileDesign(d),legacyStoneFallback:true}).code
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

test('large B143 canvas exports exact occupied envelope while retaining original SHA',()=>{
 const big=structuredClone(d);
 big.bounds={width:80,height:22,depth:80};
 for(const e of big.elements)e.origin=[e.origin[0]+31,e.origin[1]+1,e.origin[2]+36];
 const scene=compileDesign(big),locked=structuredClone(scene);
 assert.throws(()=>exportB143EducationMakeCode({design:big,scene,
  groundLowestLayer:true,legacyStoneFallback:true}),/PILOT_SIZE/);
 const out=exportB143EducationMakeCode({design:big,scene,
  groundLowestLayer:true,tightVoxelEnvelope:true,legacyStoneFallback:true});
 assert.equal(out.geometrySha256,scene.geometrySha256);
 assert.equal(out.sourceSha256,scene.sourceSha256);
 assert.equal(out.envelopeTranslation,'EXACT_OCCUPIED_B143_VOXELS_ONLY');
 assert.deepEqual(out.sourceHorizontalOffset,[-32,-37]);
 assert.equal(out.sourceVerticalOffset,-1);
 assert.equal(out.bounds.width,9);
 assert.equal(out.bounds.depth,8);
 assert.equal(out.bounds.height,5);
 const rows=JSON.parse(out.code.match(/let mabRows: number\[\]\[\] = (.*)/)[1]);
 assert(rows.every(r=>r[0]>=0&&r[2]>=0&&r[3]<out.bounds.width&&
  r[5]<out.bounds.depth&&r[1]>=0&&r[4]<out.bounds.height));
 assert.equal(rows.reduce((n,r)=>n+(r[3]-r[0]+1)*(r[4]-r[1]+1)*(r[5]-r[2]+1),0),
  scene.primitives.length);
 assert.deepEqual(scene,locked);
 assert.equal(out.worldWrites,0);
 assert.equal(out.constructionApproved,false);
 assert.equal(out.actualEducationExecution,'NOT_TESTED');
 assert.deepEqual(out.BuildPlan.operations,[]);
});
test('opt-in tight envelope requires grounding to protect support preflight',()=>{
 assert.throws(()=>exportB143EducationMakeCode({design:d,scene:compileDesign(d),
  tightVoxelEnvelope:true,legacyStoneFallback:true}),/GROUND_OPTION/);
});

test('footprint preflight checks interior air and every support before any fill',()=>{
 const sparse={schema:d.schema,id:'sparse-clearance',title:'sparse clearance',
  brief:'Offline safety regression',bounds:{width:100,height:30,depth:100},designOnly:true,
  elements:[{id:'floor',shape:'box',mode:'add',material:'stone',origin:[10,2,10],size:[3,1,3]},
   {id:'roof',shape:'box',mode:'add',material:'stone',origin:[10,8,10],size:[3,1,3]},
   {id:'far',shape:'box',mode:'add',material:'stone',origin:[90,2,90],size:[1,1,1]}]};
 const scene=compileDesign(sparse),before=structuredClone(scene);
 const options={design:sparse,scene,groundLowestLayer:true,tightVoxelEnvelope:true};
 assert.throws(()=>exportB143EducationMakeCode(options),/PILOT_SIZE/);
 const out=exportB143EducationMakeCode({...options,columnClearance:true});
 assert.equal(out.clearanceCells,64);assert.equal(out.supportCells,10);
 assert.deepEqual(out.bounds,{width:81,height:7,depth:81});
 assert.equal(out.sourceSha256,scene.sourceSha256);
 assert.equal(out.geometrySha256,scene.geometrySha256);
 const code=out.code.replace(/: number\[\]\[\]|: number\[\]|: number|: Position/g,'');
 function run(obstruction){
  const handlers={},fills=[],checked=[];
  const expected=new Map(scene.primitives.map(([x,y,z,m])=>[[x-10+8,y-2,z-10+8].join(','),m]));
  const player={position:()=>({x:0,y:0,z:0}),onChat:(n,f)=>handlers[n]=f,say:()=>{}};
  const blocks={blockByName:s=>s,testForBlock:(_block,p)=>{
   const k=[p.x,p.y,p.z].join(',');checked.push(k);
   return p.y>=0?k!==obstruction:k===obstruction;
  },fill:(material,a,b)=>{
   assert.equal(checked.length,74,'all clearance and support reads precede first fill');
   for(let x=a.x;x<=b.x;x++)for(let y=a.y;y<=b.y;y++)for(let z=a.z;z<=b.z;z++){
    const k=[x,y,z].join(',');assert(expected.has(k),'no phantom placement');fills.push(k);
   }
  }};
  vm.runInNewContext(code,{player,blocks,AIR:'air',FillOperation:{Keep:0},
   pos:(x,y,z)=>({x,y,z}),positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}});
  handlers.mabset();handlers.mabbuild();return {fills,checked,expected};
 }
 // Interior air under the roof, highest occupied roof, and missing support.
 for(const blocked of ['9,3,9','9,6,9','9,-1,9'])assert.equal(run(blocked).fills.length,0);
 const ok=run(null);assert.equal(ok.fills.length,scene.primitives.length);
 assert.deepEqual(new Set(ok.fills),new Set(ok.expected.keys()));
 assert(ok.checked.includes('9,3,9'));assert(!ok.checked.includes('50,0,50'));
 assert.deepEqual(scene,before);assert.equal(out.constructionApproved,false);
 assert.throws(()=>exportB143EducationMakeCode({design:sparse,scene,columnClearance:true}),/GROUND_OPTION/);
});

test('footprint mode preserves the 40000-cell clearance limit',()=>{
 const large={schema:d.schema,id:'tall-clearance',title:'tall clearance',
  brief:'Safety budget regression',bounds:{width:50,height:30,depth:50},designOnly:true,
  elements:[{id:'roof',shape:'box',mode:'add',material:'stone',origin:[0,29,0],size:[50,1,50]},
   {id:'base',shape:'box',mode:'add',material:'stone',origin:[0,0,0],size:[1,1,1]}]};
 assert.throws(()=>exportB143EducationMakeCode({design:large,scene:compileDesign(large),
  groundLowestLayer:true,tightVoxelEnvelope:true,columnClearance:true}),/PILOT_SIZE/);
});
