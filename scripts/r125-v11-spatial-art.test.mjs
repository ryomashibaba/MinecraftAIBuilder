import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveR125SpatialArt} from './r125-v11-spatial-art.mjs';
import {detailR125Envelope} from '../source/ai/r125-spatial-detail.mjs';
test('offline saved author: real recessed volume, SHA integrity and world gates',()=>{
 const p={schema:SCHEMA,id:'real-entry-study',title:'A public activity building',
  brief:'A building with a public exhibit and shared creative workshop',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'z',splitPercent:50,spaces:[
   {id:'exhibit-room',purpose:'public exhibit',access:'public'},
   {id:'shared-room',purpose:'shared work',access:'shared'}]},
   {splitAxis:'x',splitPercent:50,spaces:[
    {id:'upper-exhibit',purpose:'public views',access:'public'},
    {id:'upper-study',purpose:'shared study',access:'shared'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'}};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-spatial-art-'));
 try{
  const raw=JSON.stringify(p),rawPath=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  fs.writeFileSync(rawPath,raw);
  const baseline=diagnoseR125ArchitecturePlanOriginal(raw);
  assert.equal(baseline.sourceVerified,true,baseline.compilerReason);
  const sourcePath=path.join(dir,'B143_SOURCE_REVIEW_ONLY.json');
  fs.writeFileSync(sourcePath,JSON.stringify(baseline.sourceDesign));
  const outDir=path.join(dir,'review');
  const r=saveR125SpatialArt({rawPath,sourcePath,outDir});
  assert.equal(r.status,'SOURCE_VERIFIED_HOST_DERIVED_ART_HOLD');
  assert.equal(r.originalUnchanged,true);
  assert.equal(fs.readFileSync(rawPath,'utf8'),raw);
  assert.notEqual(r.baselineSourceSha256,r.derivedSourceSha256);
  assert.ok(r.structuralDifference.added+r.structuralDifference.removed>0);
  assert.equal(r.modelAuthoredFixtureCount,r.derivedFixtureCount);
  assert.equal(r.worldWrites,0);
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.equal(r.nineWorldGates.filter(x=>x==='BLOCKED').length,9);
  assert.ok(fs.existsSync(path.join(outDir,r.photo)));
  assert.throws(()=>saveR125SpatialArt({rawPath,sourcePath,outDir}),
   /FRESH_PRIVATE_OUTPUT_REQUIRED/);
  const forged=path.join(dir,'forged.json');
  fs.writeFileSync(forged,JSON.stringify({...baseline.sourceDesign,title:'not original'}));
  assert.throws(()=>saveR125SpatialArt({rawPath,sourcePath:forged,
   outDir:path.join(dir,'no-output')}),/BASELINE_SHA_GUARD/);
  assert.equal(fs.existsSync(path.join(dir,'no-output')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('spatial HOST: narrow authored entry gets exterior covered threshold, not a destructive stair cut',()=>{
 const entry={id:'exterior-entrance',shape:'box',mode:'cut',
  origin:[5,2,1],size:[2,3,1]};
 const elements=[entry];
 const plan={footprint:{width:24,depth:24},levels:[{},{}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{facadeLanguage:'fins',roofProfile:'ridge',roofOverhang:'one-block'}};
 const program=[{zones:[{range:{x:[2,11],z:[2,11]}}]}];
 const result=detailR125Envelope(elements,plan,program);
 assert.equal(result.massing,'covered-threshold-fallback');
 assert.equal(result.owner,'HOST');
 assert.equal(result.authorPlanEdited,false);
 assert.deepEqual(result.originalEntry,[5,2,1]);
 assert.equal(result.recessedEntry,null);
 assert.deepEqual(entry.origin,[5,2,1]);
 assert.ok(elements.some(e=>e.id==='detail-covered-entry-canopy'));
 assert.ok(elements.some(e=>e.id==='detail-covered-entry-landing'));
 assert.equal(elements.filter(e=>e.mode==='cut').length,1);
 const additions=elements.filter(e=>e.mode==='add');
 // The two equivalent piers may be represented losslessly by one B143
 // repeated box. Count actual boxes, not serialized elements.
 assert.ok(additions.reduce((n,e)=>n+(e.repeat?.count??1),0)>=4);
 assert.ok(additions.every(e=>e.origin[2]===0&&e.size[2]===1&&
  (e.repeat?.offset?.[2]??0)===0));
 assert.ok(additions.every(e=>e.origin[1]+e.size[1]<=6));
 assert.equal(result.worldWrites,0);
});
