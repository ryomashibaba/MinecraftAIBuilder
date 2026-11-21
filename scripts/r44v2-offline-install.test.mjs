import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {installR44V2,loadManifest,blobSha} from '../tools/r44-v2-offline/install.mjs';
import {prepareR44V2Fixture} from './r44v2-prepare-git-fixture.mjs';
import {inspectR44PinnedPaths} from './r44-pinned-path-audit.mjs';
const scratch=fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(),'R44v2 long isolated offline fixture ')));
const fixture=prepareR44V2Fixture(path.join(scratch,'bundle'));
const m=loadManifest();
const opts=(name)=>({baseDir:path.join(fixture,'base'),overlayDir:path.join(fixture,'overlay'),outDir:path.join(scratch,'R44V2_OFFLINE_'+name)});
const snapshot=dir=>{
 const result={};function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){
  const q=path.join(p,d.name);if(d.isDirectory())walk(q);else result[path.relative(dir,q)]=blobSha(fs.readFileSync(q));
 }}walk(dir);return result;
};
test.after(()=>{
 // Only this exact mkdtemp root is removed. Never follow links or user paths.
 assert.equal(path.dirname(scratch),fs.realpathSync.native(os.tmpdir()));
 assert(path.basename(scratch).startsWith('R44v2 long isolated offline fixture '));
 fs.rmSync(scratch,{recursive:true,force:true});
});
test('immutable historical installers and exact manifest agree: 37 + 10 - 1 = 46',()=>{
 const r=inspectR44PinnedPaths();assert.equal(r.r44RequiredCount,46);
 const sources=['tools/r16-mini/INSTALL_R16_MINI.ps1','tools/r24-future/INSTALL_R24_OFFLINE_ONLY.ps1','tools/r44-approved/INSTALL_R44_SOURCE_ONLY.ps1'];
 const pins=sources.map(f=>[...fs.readFileSync(f,'utf8').matchAll(/@\{Path='([^']+)';\s*Sha='([a-f0-9]{40})'/g)].map(x=>({path:x[1],sha:x[2]})));
 const base=new Map(pins[0].map(p=>[p.path,p.sha]));for(const p of pins[1])base.set(p.path,p.sha);
 const final=new Map(base);for(const p of pins[2])final.set(p.path,p.sha);
 assert.deepEqual(m.base.map(p=>[p.path,p.sha]),[...base]);
 assert.deepEqual(m.final.map(p=>[p.path,p.sha]),[...final]);
 assert.deepEqual(m.overlay.map(p=>[p.path,p.sha]),pins[2].map(p=>[p.path,p.sha]));
});
test('exact historical blobs stage offline without altering inputs, approvals or source execution',()=>{
 const before=snapshot(fixture),o=opts('normal'),r=installR44V2(o);
 assert.equal(r.fileCount,46);assert.equal(Object.keys(snapshot(o.outDir)).length,46);
 assert.deepEqual(snapshot(fixture),before);
 assert.equal(r.installedSourcesExecuted,false);assert.equal(r.approvalsReadOrWritten,false);
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));assert.deepEqual(r.BuildPlan.operations,[]);
 assert.throws(()=>installR44V2(o),/OUTPUT_EXISTS/);
});
test('unknown, missing, mutated and duplicate overlay files fail BEFORE output creation',()=>{
 for(const mode of ['extra','missing','tamper','duplicate']){
  const altered=path.join(scratch,'altered-'+mode);fs.cpSync(opts('').overlayDir,altered,{recursive:true});
  const victim=path.join(altered,...m.overlay[0].path.split('/'));
  if(mode==='extra')fs.writeFileSync(path.join(altered,'unknown.txt'),'unexpected');
  if(mode==='missing')fs.unlinkSync(victim);
  if(mode==='tamper')fs.appendFileSync(victim,'tampered');
  if(mode==='duplicate')fs.copyFileSync(victim,path.join(altered,'duplicate.mjs'));
  const o={...opts(mode),overlayDir:altered};
  assert.throws(()=>installR44V2(o),/EXACT_INVENTORY|EXACT_PATH|BLOB_SHA/);
  assert.equal(fs.existsSync(o.outDir),false);
 }
});
test('existing protected records and output nested in input are untouched',()=>{
 const o=opts('protected');fs.mkdirSync(o.outDir);
 for(const f of ['APPROVAL.json','consumed.lock','MODEL_RESPONSE_ORIGINAL.txt'])fs.writeFileSync(path.join(o.outDir,f),'must remain');
 const before=snapshot(o.outDir);assert.throws(()=>installR44V2(o),/OUTPUT_EXISTS/);
 assert.deepEqual(snapshot(o.outDir),before);
 assert.throws(()=>installR44V2({...opts('nested'),outDir:path.join(opts('').baseDir,'R44V2_OFFLINE_nested')}),/OUTPUT_NOT_ISOLATED/);
});
test('symbolic links, junctions and hardlinks cannot smuggle extra source',()=>{
 const altered=path.join(scratch,'linked');fs.cpSync(opts('').overlayDir,altered,{recursive:true});
 const victim=path.join(altered,...m.overlay[0].path.split('/'));
 const saved=path.join(scratch,'saved-source');fs.copyFileSync(victim,saved);fs.unlinkSync(victim);fs.linkSync(saved,victim);
 assert.throws(()=>installR44V2({...opts('hardlink'),overlayDir:altered}),/UNSAFE_FILE/);
 fs.unlinkSync(victim);fs.copyFileSync(saved,victim);
 fs.symlinkSync(opts('').baseDir,path.join(altered,'junction'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>installR44V2({...opts('junction'),overlayDir:altered}),/LINK_REJECTED/);
});
test('case alias cannot silently replace a signed path',()=>{
 const altered=path.join(scratch,'case-alias');fs.cpSync(opts('').overlayDir,altered,{recursive:true});
 const p=m.overlay[0].path,old=path.join(altered,...p.split('/')),changed=path.join(path.dirname(old),path.basename(old).toUpperCase());
 const bytes=fs.readFileSync(old);fs.unlinkSync(old);fs.writeFileSync(changed,bytes);
 assert.throws(()=>installR44V2({...opts('case'),overlayDir:altered}),/EXACT_PATH/);
});
test('tampered manifest fails before reading inputs or creating output',()=>{
 const tool=path.join(scratch,'altered-tool');fs.mkdirSync(tool);
 fs.copyFileSync('tools/r44-v2-offline/install.mjs',path.join(tool,'install.mjs'));
 fs.copyFileSync('tools/r44-v2-offline/manifest.json',path.join(tool,'manifest.json'));
 fs.appendFileSync(path.join(tool,'manifest.json'),' ');
 const o=opts('manifest');
 const r=spawnSync(process.execPath,[path.join(tool,'install.mjs'),'--base',o.baseDir,'--overlay',o.overlayDir,'--out',o.outDir],{encoding:'utf8',windowsHide:true});
 assert.equal(r.status,2);assert.match(r.stderr,/MANIFEST_INTEGRITY/);
 assert.equal(fs.existsSync(o.outDir),false);
});
test('actual Windows 8.3 alias and canonical paths produce identical 46 pinned files',{skip:process.platform!=='win32'},()=>{
 const probe=path.join(scratch,'shortpath.ps1');
 fs.writeFileSync(probe,'param([string]$Folder)\n$f=New-Object -ComObject Scripting.FileSystemObject\n$f.GetFolder($Folder).ShortPath\n');
 const ps=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',probe,fixture],{encoding:'utf8',windowsHide:true});
 assert.equal(ps.status,0,ps.stderr);
 const short=ps.stdout.trim();assert(short&&fs.existsSync(short));
 // Report if 8.3 aliases are disabled; never call a same-path test alias proof.
 assert.notEqual(short.toLowerCase(),fs.realpathSync.native(fixture).toLowerCase(),'8.3 unavailable: alias proof not established');
 const o={...opts('short'),baseDir:path.join(short,'base'),overlayDir:path.join(short,'overlay')};
 const r=installR44V2(o);assert.equal(r.fileCount,46);
 assert.deepEqual(snapshot(o.outDir),snapshot(opts('normal').outDir));
 console.log('R44V2_ACTUAL_SHORT_PATH_PROOF',JSON.stringify({shortPath:short,canonicalPath:fs.realpathSync.native(fixture),fileCount:r.fileCount,modelCalls:0,worldContacts:0}));
 // Exercise the new PS5.1 entry point, never any old CMD/consent launcher.
 const wrapper=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',
  path.resolve('tools/r44-v2-offline/INSTALL_R44_V2_OFFLINE.ps1'),'-Base',o.baseDir,'-Overlay',o.overlayDir,'-Out',opts('wrapper').outDir],{encoding:'utf8',windowsHide:true});
 assert.equal(wrapper.status,0,wrapper.stdout+wrapper.stderr);
 assert.deepEqual(snapshot(opts('wrapper').outDir),snapshot(o.outDir));
});
