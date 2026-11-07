/** Windows-only alias probe, no Ollama calls, no Minecraft operations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const cmd=path.join(process.cwd(),'scripts','r44-windows-stage-path-diagnostic.ps1');
test('isolated Windows source root is inspected read-only; missing roots rejected',()=>{
 if(process.platform!=='win32')return;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r44-path-probe-'));
 try{
  const dest=path.join(dir,'source','ai');
  fs.mkdirSync(dest,{recursive:true});
  const file=path.join(dest,'b198s-native-ollama-source.mjs');
  fs.writeFileSync(file,'no model');
  const a=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass',
    '-File',cmd,'-Base',dir],{encoding:'utf8',timeout:20000});
  assert.equal(a.status,0,a.stderr);
  const info=JSON.parse(a.stdout);
  assert.equal(info.enumeratedFiles,1);
  assert.equal(info.canonicalOverlayMatchCount,1);
  assert.equal(info.modelCalls,0);assert.equal(info.worldWrites,0);
  assert.equal(fs.readFileSync(file,'utf8'),'no model');
  const invalid=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy',
    'Bypass','-File',cmd,'-Base',path.join(dir,'not-here')],
    {encoding:'utf8',timeout:20000});
  assert.notEqual(invalid.status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
