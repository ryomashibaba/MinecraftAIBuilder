import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runB198Cli} from './b198a-architect.mjs';
import {candidate,fixtureLighthouse} from './b198a-fixtures.mjs';
const adapter=async()=>candidate(fixtureLighthouse());
test('real CLI source-only output contains playable offline 3D viewport, audited B143 JSON and exact SHA',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'b198a-cli-'));
 try{
  const dest=path.join(root,'free-design');
  const x=await runB198Cli({args:['--prompt','Make a futuristic glass observatory tower with upper dome',
   '--model','test-mock-adapter','--out',dest],adapter});
  assert.equal(x.liveInferenceVerified,false);
  assert.equal(x.sourceOnly,true);assert.equal(x.humanReviewRequired,true);
  assert(x.actualOccupiedVoxels>1000);
  assert(fs.existsSync(path.join(dest,'index.html')));
  const proof=JSON.parse(fs.readFileSync(path.join(dest,'source-proof.json'),'utf8'));
  const source=JSON.parse(fs.readFileSync(path.join(dest,'source-design.json'),'utf8'));
  assert.equal(proof.review.sourceSha256,x.outputSourceSha256);
  assert.equal(source.id,'glass-observatory-tower');
  assert.deepEqual(proof.review.safety.gates,Array(9).fill('BLOCKED'));
  assert.equal(proof.review.safety.worldWrites,0);
  const html=fs.readFileSync(path.join(dest,'index.html'),'utf8');
  assert(html.includes('minecraftaibuilder-b143-gallery-v1'));
  assert(!html.includes('fetch('));
  // Output must not be silently overwritten: no user-owned file loss.
  await assert.rejects(()=>runB198Cli({
   args:['--prompt','Create a tall glass structure that is fun to view',
    '--model','test-mock-adapter','--out',dest],adapter}),/B198A_CLI_OUTPUT_DIRECTORY_ALREADY_EXISTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('CLI receives explicit source revision and protects original file; never writes Minecraft',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'b198a-revision-'));
 try{
  const base=fixtureLighthouse(),saved=path.join(root,'base.json');
  fs.writeFileSync(saved,JSON.stringify(base,null,2));
  const changed=structuredClone(base);changed.elements[5].radii[0]=11;
  const dest=path.join(root,'revised');
  const a=await runB198Cli({args:['--prompt','Make the glass observing crown slightly narrower but keep the stone platform',
    '--model','test-mock-adapter','--base',saved,'--protect','ground-granite-base','--out',dest],
    adapter:async()=>candidate(changed)});
  assert.equal(a.sourceOnly,true);
  const proof=JSON.parse(fs.readFileSync(path.join(dest,'source-proof.json'),'utf8'));
  assert.equal(proof.review.action,'revision');
  assert.deepEqual(proof.review.revisionDiff.changed,['planetarium-transparent-crown']);
  assert.deepEqual(JSON.parse(fs.readFileSync(saved,'utf8')),base);
  assert.equal(proof.export.safety.BuildPlan.operations.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
