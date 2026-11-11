/**
 * Independent regression on an already-PUBLIC, user-reported real Qwen plan.
 * Never calls a model/network/world; never modifies the public original.
 * Exactly the existing frozen R125/B143 compiler and its pinned real fixture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runExternalAuthorOffline} from './mab-external-author-offline.mjs';

const fixture=fileURLToPath(new URL('../fixtures/r125-qwen14b-residential-2024a.json',import.meta.url));
const cli=fileURLToPath(new URL('./mab-external-author-offline.mjs',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
function withUnmodifiedPublicCopy(callback){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mab-external-qwen-'));
 const input=path.join(folder,'public-qwen-original.json');
 const source=fs.readFileSync(fixture);
 try{
  fs.copyFileSync(fixture,input);
  return callback({input,originalBytes:source});
 }finally{
  assert.equal(hash(fs.readFileSync(fixture)),hash(source),
   'original public Qwen fixture must never be changed');
  fs.rmSync(folder,{recursive:true,force:true});
 }
}
test('public real Qwen14B plan through External Author returns EXACT frozen R125/B143 SOURCE',()=>{
 withUnmodifiedPublicCopy(({input,originalBytes})=>{
  const actual=runExternalAuthorOffline({input,contract:'r125'});
  assert.equal(actual.status,'R125_SOURCE_CANDIDATE_ART_AND_WORLD_HOLD');
  assert.equal(actual.originalRawSha256,hash(originalBytes));
  assert.equal(hash(fs.readFileSync(input)),hash(originalBytes));
  assert.equal(actual.occupiedVoxels,2620);
  assert.equal(actual.sourceSha256,
   '4ca2edf2eb066f2f0eecd7dfdc4a710a1e69bc7196c5f85c65483caaa0d9fbd1');
  assert.equal(actual.geometrySha256,
   '0fc0db6814e105db62da272abb1235cce9d77d4950eab2a0e91d940283201a2e');
  assert.equal(actual.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(actual.sourceAuthorship,'EXTERNAL_AUTHOR_NOT_INDEPENDENTLY_ATTESTED');
  assert.equal(actual.gateCP1,'HOLD');
  assert.equal(actual.humanArt,'NOT_REVIEWED');
  assert.equal(actual.minecraftWalking,'NOT_TESTED');
  assert.equal(actual.readiness,'NOT_PREPARED');
  assert.equal(actual.allNineConstructionGatesBlocked,true);
  assert.equal(actual.BuildPlanOperations,0);
  assert.equal(actual.constructionApproved,false);
  assert.equal(actual.executionAllowed,false);
  assert.equal(actual.originalEdited,false);
  assert.equal(actual.modelCalls,0);
  assert.equal(actual.networkCalls,0);
  assert.equal(actual.worldContacts,0);
  assert.equal(actual.worldWrites,0);
 });
});
test('existing public ORIGINAL inside repository is refused as new external author',()=>{
 assert.throws(()=>runExternalAuthorOffline({input:fixture,contract:'r125'}),
  /MAB_EXTERNAL_IR_INPUT_INSIDE_PUBLIC_REPO/);
});
test('schema mismatch CLI outputs HOLD category only, never a private path or design text',()=>{
 withUnmodifiedPublicCopy(({input})=>{
  const result=spawnSync(process.execPath,[cli,'--contract','v6','--input',input],{
   encoding:'utf8',timeout:30000
  });
  assert.equal(result.status,2);
  assert.equal(result.stdout,'');
  const reply=JSON.parse(result.stderr.trim());
  assert.deepEqual(reply,{status:'HOLD',code:'MAB_EXTERNAL_IR_IR_SCHEMA_MISMATCH',
   modelCalls:0,networkCalls:0,worldWrites:0});
  assert.equal(result.stderr.includes(input),false);
  assert.equal(result.stderr.includes('Lumina Residence'),false);
 });
});
