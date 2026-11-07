import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Importing R146 used to fail BEFORE its first line could run:
// ReferenceError: Cannot access 'RELATIONAL_INSTRUCTIONS' before initialization
// because R134 built its prompt while R139 -> R135 -> R134 was still loading.
// These are real FRESH Node processes, NOT node --check (which misses TDZ).
const refs=[
 'r146-replay-saved-qwen.mjs',
 'r139-relational-model.mjs',
 'r134-fresh-model-pilot.mjs',
 'r141-local-graph-evidence.mjs'
].map(name=>new URL('./'+name,import.meta.url).href);

test('R147 all entry points import in fresh Node processes without ESM initialization errors',()=>{
 for(const ref of refs){
  const script='await import('+JSON.stringify(ref)+');';
  const result=spawnSync(process.execPath,
   ['--input-type=module','--eval',script],
   {encoding:'utf8',timeout:25000});
  assert.equal(result.status,0,
   'Node ESM initialization failed: '+ref+'\n'+
   (result.stderr??'')+'\n'+(result.error?.message??''));
  assert.equal((result.stdout??'').trim(),'');
 }
});

test('R147 both opposite parser import orders are safe in independent Node processes',()=>{
 for(const order of [refs,[...refs].reverse()]){
  const script='for(const url of '+JSON.stringify(order)+')await import(url);';
  const result=spawnSync(process.execPath,
   ['--input-type=module','--eval',script],
   {encoding:'utf8',timeout:25000});
  assert.equal(result.status,0,
   'Order-dependent ESM TDZ error: '+JSON.stringify(order)+'\n'+
   (result.stderr??'')+'\n'+(result.error?.message??''));
 }
});
