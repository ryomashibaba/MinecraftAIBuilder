import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {makeEducationMaterialProbe,MATERIAL_PROBES} from './r125-education-material-probe.mjs';

test('generates deterministic 10-sample MakeCode code, never creates a verified palette',()=>{
 const s=makeEducationMaterialProbe();
 assert.equal(s,makeEducationMaterialProbe());
 assert.equal(MATERIAL_PROBES.length,10);
 assert.ok(s.includes('blocks.blockByName(mabNames[i])'));
 assert.ok(s.includes('player.onChat("mabmat"'));
 assert.ok(s.includes('API PASS alone is NOT verification'));
 assert.equal(s.includes('r125-education-user-verified-palette-v1'),false);
 assert.equal(s.includes('FillOperation.Replace'),false);
 assert.ok(s.indexOf('if (!blocks.testForBlock(AIR, target)')<s.indexOf('let placed = blocks.place'));
});
test('does not write on program load and refuses all samples if one position is occupied',()=>{
 const src=makeEducationMaterialProbe().replace(/: string\[\]/g,'');
 const callbacks={},placed=[],messages=[];
 const player={position:()=>({x:0,y:0,z:0}),onChat:(n,f)=>callbacks[n]=f,say:s=>messages.push(s)};
 let dirty=6;
 const blocks={blockByName:name=>name,place:(id,p)=>{placed.push({id,p});return true},
  testForBlock:(id,p)=>id==='air'?p.y===0&&p.x!==8+dirty:p.y===-1};
 const pos=(x,y,z)=>({x,y,z}),positions={add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z})};
 vm.runInNewContext(src,{player,blocks,pos,positions,AIR:'air'});
 assert.equal(placed.length,0);
 callbacks.mabmat();
 assert.equal(placed.length,0);
 assert.ok(messages.some(s=>s.includes('zero blocks written')));
 dirty=-1;
 callbacks.mabmat();
 assert.equal(placed.length,10);
 assert.equal(placed[0].id,'stone');
 callbacks.mabmat();
 assert.equal(placed.length,10);
 assert.ok(messages.some(s=>s.includes('already active or used')));
});
