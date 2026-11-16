import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compareR125RoofRibbon} from './r125-roof-ribbon-ab.mjs';

test('same genuine-compatible author bytes produce offline B143 roof A/B with material-only changes',()=>{
 const p={schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'tide-ab-study',title:'A practical sea observatory',
  brief:'Visitors see a laboratory and the results of the water tests',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'laboratory',purpose:'Water analysis'},
   {id:'visitor',purpose:'Read visible test results'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'sawtooth',roofAxis:'x',
   facadeLanguage:'plain',roofVolume:'raised'}};
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-roof-ab-'));
 try{
  const original=JSON.stringify(p),raw=path.join(root,'ORIGINAL.txt');
  fs.writeFileSync(raw,original);
  const result=compareR125RoofRibbon({rawFile:raw,outDir:path.join(root,'AB')});
  assert.equal(fs.readFileSync(raw,'utf8'),original);
  assert.equal(result.originalSha256,createHash('sha256').update(original).digest('hex'));
  assert.equal(result.originalEdited,false);
  assert(result.changedMaterial>0);
  assert.notEqual(result.sourceSha256Before,result.sourceSha256After);
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.minecraftWalking,'NOT_TESTED');
  assert(fs.statSync(result.image).size>5000);
  assert.throws(()=>compareR125RoofRibbon({rawFile:raw,outDir:path.join(root,'AB')}),
   /INPUT_MISSING_OR_OUTPUT_EXISTS/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('art A/B rejects non-sawtooth model before writing output',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-roof-hold-'));
 try{
  const raw=path.join(root,'original.json'),out=path.join(root,'OUT');
  fs.writeFileSync(raw,JSON.stringify({expression:{roofProfile:'flat'}}));
  assert.throws(()=>compareR125RoofRibbon({rawFile:raw,outDir:out}),
   /REQUIRES_RAISED_SAWTOOTH/);
  assert.equal(fs.existsSync(out),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
