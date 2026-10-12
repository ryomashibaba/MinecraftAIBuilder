import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildB74} from './run-b74.mjs';
import {createOfflinePlanner} from './b74-vm-runner.mjs';
import {inspectB73Sources,sha} from '../../b73/main/b73-asset-contract.mjs';
import {buildB72} from '../../b72/main/run-b72.mjs';
import {preflightProductionPlan} from '../../b72/main/compile-b72.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const runtime=path.join(here,'runtime_evidence');
const manifest=JSON.parse(fs.readFileSync(path.join(runtime,'B72_DEPENDENCY_MANIFEST.json')));
const once=buildB74();
const blocked=()=>once;
test('30 original source pins and import graph',()=>{
 const a=inspectB73Sources(runtime,manifest);
 assert.equal(a.pinnedSourceCount,30);assert.deepEqual(a.staticESMClosureMissing,[]);
});
test('six uploaded catalog assets verified and block list still missing',async()=>{
 const r=await blocked();assert.equal(r.source.catalogSixVerified,true);assert.equal(r.source.blockListState,'MISSING');
});
test('missing real catalog cannot masquerade as Planner success',async()=>{
 const r=await blocked();assert.equal(r.summary.productionPlannerBuildingsRun,0);assert.equal(r.status,'BLOCKED_OFFICIAL_BLOCKS_MISSING');
});
test('always nine blocked gates, no build operations',async()=>{
 const r=await blocked();assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.gates.length,9);
 assert.ok(r.gates.every(x=>x.status==='BLOCKED'));assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.BuildPlan.commandCount,0);
});
test('tampered official catalog is rejected rather than executed',async()=>{
 const file=path.join(runtime,'catalog/sources/Blocks.md');
 try {fs.writeFileSync(file,'| minecraft:stone | |\n');await assert.rejects(buildB74(),/BLOCKS_SHA256_OR_TYPE/);}finally{fs.rmSync(file,{force:true});}
});
test('diagnostic ONLY: production JavaScript actually evaluates 5 candidate plans with derived fixture, never approval',async()=>{
 const file=path.join(runtime,'catalog/sources/Blocks.md');
 const edu=JSON.parse(fs.readFileSync(path.join(runtime,'catalog/education.json')));
 const sem=JSON.parse(fs.readFileSync(path.join(runtime,'catalog/semantic.json')));
 const ids=new Set(edu.records.map(x=>x.id).filter(x=>typeof x==='string'));
 Object.keys(sem).forEach(x=>ids.add('minecraft:'+x));
 const state=(s)=>s.endsWith('_stairs')?'minecraft:corner, upside_down_bit, weirdo_direction':s.endsWith('_slab')?'minecraft:vertical_half':s.endsWith('_trapdoor')?'direction, open_bit, upside_down_bit':s.endsWith('_door')?'door_hinge_bit, minecraft:cardinal_direction, open_bit, upper_block_bit':'';
 // Marker prevents accidental classification as pinned official Blocks.md.
 fs.writeFileSync(file,'# NONOFFICIAL DIAGNOSTIC FIXTURE\n'+[...ids].sort().map(x=>`| ${x} | ${state(x)} |`).join('\n')+'\n');
 try{
  const r=await createOfflinePlanner(runtime,manifest);
  const {report,b66}=buildB72(); const c=[];
  for(const j of report.jobs){const plan=r.makePlan(j.createBuildingPlanInputCandidate);c.push({id:j.id,compare:preflightProductionPlan(plan,j,b66),ops:plan.operations.length});}
  assert.equal(c.length,5);assert.ok(c.every(x=>x.ops>0));
  assert.equal(c.filter(x=>x.compare.footprintParity==='FOOTPRINT_CELLS_MATCH_NOT_FULL_RUNTIME_PARITY').length,1);
  await assert.rejects(buildB74(),/BLOCKS_SHA256_OR_TYPE/);
 }finally{fs.rmSync(file,{force:true});}
});
