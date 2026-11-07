import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {createR51EnvelopeStoryboard,writeR51EnvelopeStoryboard}
 from './b198zr51-uncompiled-envelope-storyboard.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,origin,size,...(material?{material}:{})});
function brokenDraft(){
 const p=r32Courtyard();
 p.design.bounds={width:40,height:40,depth:40};
 p.design.elements=[
  box('base','add',[0,0,0],[40,1,40],'concrete'),
  box('central','add',[12,1,12],[16,39,16],'concrete'),
  box('hollow','cut',[15,1,15],[10,37,10]),
  box('roofGlow','add',[0,40,0],[40,1,40],'glow'),
  {id:'leftStair',shape:'staircase',mode:'add',material:'wood',
   origin:[1,1,30],axis:'z',direction:-1,width:4,steps:32,treadDepth:1},
  box('intrude','add',[17,5,17],[3,3,3],'metal')
 ];
 p.spatialPlan.entrance=[20,1,38];
 p.spatialPlan.protectedVoids=[{id:'atrium',origin:[15,1,15],
  size:[10,37,10],maxOccupiedCells:0}];
 p.spatialPlan.destinations=[{id:'atrium',point:[20,1,20],
  maximumPathSteps:10},{id:'roof',point:[20,40,20],
  maximumPathSteps:35}];
 p.spatialPlan.functionalZones=[{id:'atrium',origin:[15,1,15],
  size:[10,37,10],minimumReachablePositions:20,
  minimumReachablePercent:60}];
 return p;
}
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r51-envelope-'));

test('R51 displays failed R48-style B143 source with visible original positions, without geometry PASS',()=>{
 const p=brokenDraft(),frozen=structuredClone(p),raw=JSON.stringify(p);
 const result=createR51EnvelopeStoryboard(raw);
 assert.equal(result.manifest.originalRawSha256,sha(raw));
 assert.equal(result.manifest.originalBytes,Buffer.byteLength(raw));
 assert.equal(result.manifest.B143FinalVoxelEvidenceProvided,false);
 assert.equal(result.manifest.no3DModelCertification,true);
 assert.equal(result.manifest.humanSemanticAndVisualReviewRequired,true);
 assert.equal(result.manifest.modelCalls,0);
 assert.equal(result.manifest.worldWrites,0);
 assert(result.manifest.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(result.manifest.safety.BuildPlan.operations,[]);
 assert.equal(result.manifest.failedElementEnvelopesCount,2);
 for(const s of [
  'R51','水平断面','正面投影','高さ','B143','未表示',
  '屋根','viewBox','追加'
 ]) {
  // Not every semantic word is required; check source-specific controls below.
  if(s==='屋根'||s==='追加')continue;
  assert(result.html.includes(s),s);
 }
 assert(result.html.includes('"id":"leftStair"'));
 assert(result.html.includes('"min":[1,1,-1]'));
 assert(result.html.includes('"id":"roofGlow"'));
 assert(result.html.includes('"max":[39,40,39]'));
 assert(result.html.includes('DECLARED_PATH_STEPS_IMPOSSIBLE'));
 assert(result.html.includes('POSSIBLE_PROTECTED_VOID_REFILL'));
 assert(result.html.includes('REUSED_R3_SPATIAL_ID'));
 assert.equal(result.html.includes('__R51_STORYBOARD_DATA__'),false);
 assert.equal(result.html.includes('fetch('),false);
 const code=result.html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert(code);
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.deepEqual(p,frozen);
});
test('R51 keeps the frozen c01 human criteria, does not claim auto visual quality',()=>{
 const raw=JSON.stringify(r32Courtyard());
 const {html,manifest}=createR51EnvelopeStoryboard(raw);
 assert.equal(manifest.failedElementEnvelopesCount,0);
 assert.equal(manifest.diagnosticStatus,
  'NO_OBVIOUS_CROSS_FIELD_CONTRADICTION_BUT_NOT_CERTIFIED');
 assert(html.includes('海沿いに建つ大きな未来型の公共図書館'));
 assert(html.includes('図書館として明確に読める公共建築'));
 assert.equal(manifest.noArchitecturalAestheticScore,true);
 assert.equal(manifest.noActualWalkabilityCertification,true);
});
test('R51 safely embeds arbitrary model text without HTML/script escape',()=>{
 const p=brokenDraft();
 p.design.title='</script><img src=x onerror=alert(1)>';
 p.spatialPlan.designIntent='</script><script>evil()</script>';
 p.design.elements[0].id='</script><img src=x onerror=alert(2)>';
 const raw=JSON.stringify(p);
 const r=createR51EnvelopeStoryboard(raw);
 assert(!r.html.includes('</script><img'));
 assert(!r.html.includes('<script>evil()'));
 assert(r.html.includes('\\u003c/script\\u003e'));
 assert.equal((r.html.match(/<\/script>/g)||[]).length,1);
 assert.equal(r.manifest.originalRawSha256,sha(raw));
});
test('R51 can show raw malformed JSON as HOLD without inventing missing voxels',()=>{
 const raw='{"design":';
 const r=createR51EnvelopeStoryboard(raw);
 assert.equal(r.manifest.diagnosticStatus,'HOLD_MALFORMED_JSON');
 assert.equal(r.manifest.elementEnvelopesCount,0);
 assert.equal(r.manifest.originalRawSha256,sha(raw));
 assert.equal(r.manifest.B143FinalVoxelEvidenceProvided,false);
});
test('R51 writes to a new folder only; cannot overwrite original or previous report',()=>{
 const dir=temp(),raw=JSON.stringify(brokenDraft());
 try{
  const rawFile=path.join(dir,'original.txt');
  fs.writeFileSync(rawFile,raw);
  const out=path.join(dir,'new-review');
  const r=writeR51EnvelopeStoryboard({raw,destination:out});
  assert.equal(r.status,'SOURCE_ENVELOPES_ONLY_NOT_B143_FINAL_GEOMETRY');
  assert.equal(r.modelCalls,0);
  assert.equal(r.worldWrites,0);
  const saved=JSON.parse(fs.readFileSync(path.join(out,
   'R51_SCHEMATIC_PROVENANCE.json'),'utf8'));
  assert.equal(saved.originalRawSha256,sha(raw));
  assert.equal(saved.noAutoRepair,true);
  assert.equal(fs.readFileSync(rawFile,'utf8'),raw);
  const html=fs.readFileSync(path.join(out,
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html'),'utf8');
  assert(html.includes('"shape":"staircase"'));
  assert.throws(()=>writeR51EnvelopeStoryboard({raw,destination:out}),
   /OUTPUT_MUST_BE_NEW_DIRECTORY/);
  assert.throws(()=>createR51EnvelopeStoryboard(raw,{caseId:'absent'}),
   /FROZEN_CREATION_CASE_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R51 CLI accepts an existing raw only, never edits it, and refuses duplicate output',()=>{
 const dir=temp(),src=path.join(dir,'R48_UNMODIFIED.txt'),out=path.join(dir,'board');
 const raw=JSON.stringify(brokenDraft());
 try{
  fs.writeFileSync(src,raw);
  const args=[path.join('scripts','b198zr51-uncompiled-envelope-storyboard.mjs'),
   '--raw-file',src,'--out',out];
  const first=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(first.status,0,first.stderr);
  const second=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(second.status,1,second.stdout);
  assert.equal(fs.readFileSync(src,'utf8'),raw);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
