import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

test('E1 result folder launch passes report parent as one safely quoted Windows Explorer argument',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'e1 result folder '));
 try{
  const report=path.join(folder,'E1_REVISION_REPORT.json');
  fs.writeFileSync(report,'{}');
  const launched=[];
  const child={on(name,callback){launched.push({event:name,callback});return this;},
   unref(){launched.push({unref:true});}};
  const result=openE1ResultFolder(report,{
   platform:'win32',launch:(exe,args,options)=>{
    launched.push({exe,args,options});return child;
   }});
  assert.equal(result.attempted,true);
  assert.equal(result.folder,folder);
  assert.equal(launched[0].exe,'explorer.exe');
  assert.deepEqual(launched[0].args,[folder]);
  assert.equal(launched[0].options.shell,false);
  assert.equal(launched[0].options.detached,true);
  assert.equal(launched.at(-1).unref,true);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('E1 never opens GUI on non-Windows or disabled or before report exists',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-no-open-'));
 try{
  const report=path.join(root,'E1_TWO_STAGE_REPORT.json');
  const launch=()=>{throw Error('Launcher should never execute');};
  assert.equal(openE1ResultFolder(report,{platform:'win32',launch}).reason,'REPORT_NOT_FOUND');
  fs.writeFileSync(report,'{}');
  assert.equal(openE1ResultFolder(report,{platform:'linux',launch}).reason,'NON_WINDOWS');
  assert.equal(openE1ResultFolder(report,{platform:'win32',enabled:false,launch}).reason,'DISABLED');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('A Windows Explorer launch error cannot corrupt result or turn SOURCE into success',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'e1-launch-fail-'));
 try{
  const report=path.join(root,'E1_STUDY_REPORT.json');
  const raw='{"status":"SOURCE_INCOMPLETE_HOLD","worldWrites":0}';
  fs.writeFileSync(report,raw);
  const errors=[];
  const r=openE1ResultFolder(report,{
   platform:'win32',warn:v=>errors.push(v),
   launch:()=>{throw Error('mock explorer unavailable');}});
  assert.equal(r.attempted,false);
  assert.equal(r.reason,'EXPLORER_LAUNCH_FAILED');
  assert.equal(errors.length,1);
  assert.equal(fs.readFileSync(report,'utf8'),raw);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
