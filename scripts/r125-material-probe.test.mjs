import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {makeMaterialProbe} from './r125-material-probe.mjs';
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
