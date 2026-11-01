import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {makeMaterialProbe,makeMaterialBatchProbe,DEFAULT_MATERIAL_BATCH} from './r125-material-probe.mjs';
test('unsafe candidate names refused',()=>{
 for(const n of ['air','water','lava','fire','tnt','some-bad-name','oak_planks");fill('])
  assert.throws(()=>makeMaterialProbe(n),/INVALID_BLOCK/);
});
test('candidate resolves only on explicit one-shot chat',()=>{
 const handlers={},said=[],fills=[];
 let resolved=0,placed=false;
 const player={position:()=>({x:0,y:0,z:0}),onChat:(n,fn)=>handlers[n]=fn,say:s=>said.push(s)};
 const blocks={blockByName:n=>{resolved++;return n},testForBlock:(b,p)=>{
  if(b==='air')return p.y===0&&!placed;
  return b==='oak_planks'&&p.y===0&&placed;
 },fill:(b,p)=>{fills.push([b,p]);placed=true}};
 vm.runInNewContext(makeMaterialProbe('oak_planks').code,{player,blocks,AIR:'air',
  FillOperation:{Keep:0},pos:(x,y,z)=>({x,y,z}),
  positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}});
 assert.equal(resolved,0);
 handlers.mabprobe();handlers.mabprobe();
 assert.equal(resolved,1);assert.equal(fills.length,1);
 assert(said.some(s=>s.includes('PROBE MATCH')));
});
test('unknown block name produces no world write',()=>{
 const handlers={};let writes=0;
 const player={position:()=>({x:0,y:0,z:0}),onChat:(n,fn)=>handlers[n]=fn,say:()=>{}};
 const blocks={blockByName:()=>{throw Error('UNKNOWN')},
  testForBlock:(b,p)=>b==='air'&&p.y===0,fill:()=>writes++};
 vm.runInNewContext(makeMaterialProbe('oak_planks').code,{player,blocks,AIR:'air',
  FillOperation:{Keep:0},pos:(x,y,z)=>({x,y,z}),
  positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}});
 assert.throws(()=>handlers.mabprobe(),/UNKNOWN/);
 assert.equal(writes,0);
});

test('candidate resolving to AIR must not produce false positive match',()=>{
 const handlers={},said=[];
 const player={position:()=>({x:0,y:0,z:0}),onChat:(n,f)=>handlers[n]=f,say:s=>said.push(s)};
 const blocks={blockByName:()=> 'air',testForBlock:(b,p)=>b==='air'&&p.y===0,
  fill:()=>{}};
 vm.runInNewContext(makeMaterialProbe('oak_planks').code,{player,blocks,AIR:'air',
  FillOperation:{Keep:0},pos:(x,y,z)=>({x,y,z}),
  positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}});
 handlers.mabprobe();
 assert.equal(said.some(s=>s.includes('PROBE MATCH')),false);
 assert(said.some(s=>s.includes('HOLD')));
});

test('single-material probe accepts mb while preserving mabprobe compatibility and one-shot lock',()=>{
 const handlers={},said=[],placed=[];
 const blocks={blockByName:x=>x,testForBlock:(block,p)=>block==='air'?!placed.length:placed.length>0,
  fill:(block,p)=>placed.push(block)};
 const context={player:{position:()=>({x:0,y:0,z:0}),onChat:(n,f)=>handlers[n]=f,say:s=>said.push(s)},
  blocks,AIR:'air',FillOperation:{Keep:0},pos:(x,y,z)=>({x,y,z}),
  positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}};
 // Use a faithful testForBlock implementation for empty target and solid support.
 context.blocks.testForBlock=(block,p)=>block==='air'?p.y===0&&!placed.length:
  (block==='stone'?p.y===0&&placed.length>0:false);
 vm.runInNewContext(makeMaterialProbe('stone').code,context);
 assert.equal(typeof handlers.mb,'function');
 assert.equal(typeof handlers.mabprobe,'function');
 handlers.mb();handlers.mabprobe();
 assert.equal(placed.length,1);
 assert(said.some(s=>s.includes('PROBE MATCH')));
 assert(said.some(s=>s.includes('already attempted')));
});
test('batch contract rejects unsafe, duplicates, or more than eight blocks',()=>{
 assert.equal(DEFAULT_MATERIAL_BATCH.length,8);
 for(const names of [[],['air'],['stone','stone'],
  Array(9).fill('stone'),['stone','minecraft:command_block']])
  assert.throws(()=>makeMaterialBatchProbe(names),/BATCH_CONTRACT/);
});
function batchHarness(names,{occupiedAt=null,badName=null,alias=false}={}){
 const handlers={},messages=[],fills=[],materialAt=new Map(),calls=[];
 const player={position:()=>({x:50,y:70,z:50}),
  onChat:(name,handler)=>handlers[name]=handler,say:s=>messages.push(s)};
 const blocks={
  blockByName:name=>{
   calls.push(name);
   if(name===badName)throw Error('UNSUPPORTED_BLOCK_NAME');
   return alias?'stone':name;
  },
  testForBlock:(name,p)=>{
   const key=[p.x,p.y,p.z].join(',');
   if(name==='air')return p.y===69?false:
    (!materialAt.has(key)&&!(occupiedAt===p.x));
   return materialAt.get(key)===name;
  },
  fill:(name,p)=>{fills.push({name,x:p.x,y:p.y,z:p.z});
   materialAt.set([p.x,p.y,p.z].join(','),name);}
 };
 vm.runInNewContext(makeMaterialBatchProbe(names).code,{
  player,blocks,AIR:'air',FillOperation:{Keep:0},
  pos:(x,y,z)=>({x,y,z}),
  positions:{add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})}
 });
 return {handlers,messages,fills,calls};
}
test('mb batch places one of each and reports matching material names, no calls before chat',()=>{
 const p=batchHarness(['gray_concrete','black_concrete','spruce_planks']);
 assert.equal(p.fills.length,0);
 assert.equal(p.calls.length,0);
 p.handlers.mb();
 assert.equal(p.calls.length,3);
 assert.equal(p.fills.length,3);
 assert.deepEqual(p.fills.map(x=>x.x),[58,60,62]);
 assert.deepEqual(p.fills.map(x=>x.name),['gray_concrete','black_concrete','spruce_planks']);
 assert(p.messages.some(x=>x.includes('3/3 matching')));
 p.handlers.mb();
 assert.equal(p.fills.length,3);
 assert(p.messages.some(x=>x.includes('already attempted')));
});
test('mb all-or-nothing: occupied region stops before resolving material or writing',()=>{
 const p=batchHarness(['gray_concrete','black_concrete'],{occupiedAt:60});
 p.handlers.mb();
 assert.equal(p.fills.length,0);
 assert.equal(p.calls.length,0);
 assert(p.messages.some(x=>x.includes('zero writes')));
});
test('mb all-or-nothing: unsupported name fails before first world write',()=>{
 const p=batchHarness(['gray_concrete','unknown_block'],{badName:'unknown_block'});
 assert.throws(()=>p.handlers.mb(),/UNSUPPORTED_BLOCK_NAME/);
 assert.equal(p.fills.length,0);
 assert.equal(p.calls.length,2);
});
test('mb rejects silent alias to a previously resolved block before writing',()=>{
 const p=batchHarness(['gray_concrete','black_concrete'],{alias:true});
 p.handlers.mb();
 assert.equal(p.fills.length,0);
 assert(p.messages.some(x=>x.includes('duplicate block ID')));
});
