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
  assert.equal(result.interactive3D.length,2);
  const dashboard=fs.readFileSync(path.join(root,'AB',result.artDashboard.file),'utf8');
  assert.equal(createHash('sha256').update(dashboard).digest('hex'),
   result.artDashboard.sha256);
  assert(dashboard.includes('B143_BASELINE_INTERACTIVE_3D.html'));
  assert(dashboard.includes('B143_COMPACT_INTERACTIVE_3D.html'));
  for(const view of result.interactive3D){
   const html=fs.readFileSync(path.join(root,'AB',view.file),'utf8');
   assert(html.includes('minecraftaibuilder-b143-gallery-v1'));
   assert(html.includes(view.sourceSha256));
   assert.equal(createHash('sha256').update(html).digest('hex'),view.sha256);
  }
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

test('compact sawtooth lowers the B143 crest and leaves the author bytes unchanged',()=>{
 const p={schema:'minecraftaibuilder-r125-architecture-plan-v1',
  id:'compact-roof-study',title:'A practical sea observatory',
  brief:'A working observatory with laboratory and visitor space',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'lab-room',purpose:'Water analysis'},
   {id:'visitor-room',purpose:'Read sample results'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'sawtooth',roofAxis:'x',facadeLanguage:'plain',roofVolume:'raised'}};
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-roof-compact-'));
 try{
  const raw=path.join(root,'ORIGINAL.txt'),original=JSON.stringify(p);
  fs.writeFileSync(raw,original);
  const result=compareR125RoofRibbon({rawFile:raw,outDir:path.join(root,'A_B'),
   massing:'compact-sawtooth'});
  assert.equal(fs.readFileSync(raw,'utf8'),original);
  assert.equal(result.originalEdited,false);
  assert.equal(result.roofCrestY.after,result.roofCrestY.before-1);
  assert(result.unchangedUnderRoofVoxels>200);
  assert.equal(result.belowRoofGeometryAndMaterialIdentical,true);
  assert(result.added+result.removed>0);
  assert.notEqual(result.sourceSha256Before,result.sourceSha256After);
  assert.equal(result.modelCalls,0);
  assert.equal(result.worldWrites,0);
  assert(fs.statSync(result.image).size>5000);
  assert.throws(()=>compareR125RoofRibbon({rawFile:raw,
   outDir:path.join(root,'BAD'),massing:'extreme'}),/MASSING_MODE/);
  const packet=compareR125RoofRibbon({rawFile:raw,
   outDir:path.join(root,'EDUCATION_AB'),massing:'compact-sawtooth',education:true});
  assert.equal(packet.education.packets.length,2);
  assert(packet.unchangedUnderRoofVoxels>200);
  assert.equal(packet.education.worldExecution,'NOT_TESTED');
  assert.equal(packet.sourceSha256Before,packet.education.packets[0].sourceSha256);
  assert.equal(packet.sourceSha256After,packet.education.packets[1].sourceSha256);
  for(const row of packet.education.packets){
   const code=fs.readFileSync(path.join(root,'EDUCATION_AB',row.codeFile),'utf8');
   const report=JSON.parse(fs.readFileSync(path.join(root,'EDUCATION_AB',row.reportFile),'utf8'));
   assert.equal(createHash('sha256').update(code).digest('hex'),row.makecodeSourceSha256);
   assert.equal(report.sourceSha256,row.sourceSha256);
   assert.equal(report.materialMode,'STRICT_USER_ATTESTED');
   assert.equal(report.movementProbeEmbedded,true);
   assert.equal(row.movementProbeEmbedded,true);
   assert(code.includes('player.onChat("mabwhere"'));
   assert(code.includes('player.onChat("mabwalk"'));
   assert.equal(report.actualEducationExecution,'NOT_TESTED');
   assert.equal(report.worldWrites,0);
   assert.equal(report.programExecuted,false);
   assert(code.includes('player.onChat("mabbuild"'));
   assert(code.includes('player.onChat("mabverify"'));
  }
  // Both roof directions use the identical generic HOST rule, without
  // extra Qwen calls or modifying the previous x-axis author original.
  const axisZ={...p,id:'compact-roof-axis-z',
   expression:{...p.expression,roofAxis:'z'}};
  const zRaw=path.join(root,'Z_ORIGINAL.txt');
  const zOriginal=JSON.stringify(axisZ);
  fs.writeFileSync(zRaw,zOriginal);
  const z=compareR125RoofRibbon({rawFile:zRaw,outDir:path.join(root,'Z_AB'),
   massing:'compact-sawtooth'});
  assert.equal(fs.readFileSync(zRaw,'utf8'),zOriginal);
  assert.equal(z.roofCrestY.after,z.roofCrestY.before-1);
  assert.equal(z.belowRoofGeometryAndMaterialIdentical,true);
  assert(z.unchangedUnderRoofVoxels>200);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
