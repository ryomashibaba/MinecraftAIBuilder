import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildR190PGlazingComparison} from './r190p-glazing-comparison.mjs';
test('P synthetic B143 identical-program comparison preserves provenance and exports real glass',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190p-'));
 const dir=path.join(root,'proof');
 try{
  const result=buildR190PGlazingComparison({out:dir});
  assert.equal(result.syntheticAuthoring,true);
  assert.equal(result.genuineModelRun,false);
  assert.equal(result.modelAuthoredGlazingInThisTest,false);
  assert.equal(result.actualLocalModelCalls,0);
  assert.equal(result.originalRoomProgramPreserved,true);
  assert.equal(result.trueGlazingCells,12);
  assert.equal(result.worldContacts,0);assert.equal(result.worldWrites,0);
  assert.equal(result.readiness,'NOT_PREPARED');
  assert.equal(result.art,'ART_HOLD');
  assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
  const html=fs.readFileSync(path.join(dir,
   'R190P_SYNTHETIC_WINDOW_COMPARISON_3D.html'),'utf8');
  assert.match(html,/r190p-synthetic-glazed-shop/);
  assert.match(html,/r190-shop/);
  assert.match(html,/作者未認証/);
  const before=JSON.parse(fs.readFileSync(path.join(dir,
   'R190P_NO_GLAZING_B143.json'),'utf8'));
  const after=JSON.parse(fs.readFileSync(path.join(dir,
   'R190P_MODEL_SHAPED_GLAZING_B143.json'),'utf8'));
  assert.deepEqual(before.elements.filter(x=>x.mode==='cut').length+2,
   after.elements.filter(x=>x.mode==='cut').length+1);
  assert.equal(after.elements.some(x=>x.id==='glazing-glass-0'&&x.material==='glass'),true);
  for(const dirName of ['front','rear','west','east','roof']){
   for(const variant of ['NO_GLAZING','MODEL_SHAPED_GLAZING']){
    assert.match(fs.readFileSync(path.join(dir,
     'R190P_'+variant+'_'+dirName+'.svg'),'utf8'),/<svg/);
   }
  }
  assert.throws(()=>buildR190PGlazingComparison({out:dir}),/REFUSE_EXISTING/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
