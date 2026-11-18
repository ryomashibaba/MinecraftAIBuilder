import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {saveR125SpatialArt} from './r125-v11-spatial-art.mjs';
import {saveR125FinishAB} from './r125-v11-finish-art-ab.mjs';
import {detailR125Envelope} from '../source/ai/r125-spatial-detail.mjs';
import {inspectR125SavedRoomUse} from './r125-v11-room-use-diagnosis.mjs';
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


test('opt-in activity layout groups authored stations without adding new roles',()=>{
 const p={schema:SCHEMA,id:'host-activity-layout',
  title:'Public exhibit with shared work',
  brief:'A public gallery and shared work room, independently accessible',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'public-gallery',purpose:'public gallery',access:'public',
    fixtures:['display','counter']},
   {id:'shared-work',purpose:'shared workshop',access:'shared',
    fixtures:['workbench','storage']}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'}};
 const raw=JSON.stringify(p);
 const baseline=diagnoseR125ArchitecturePlanOriginal(raw,{
  hostDetail:'spatial-v1'});
 const revised=diagnoseR125ArchitecturePlanOriginal(raw,{
  hostDetail:'spatial-v1',fixtureArt:'activity-layout'});
 assert.equal(baseline.sourceVerified,true,baseline.compilerReason);
 assert.equal(revised.sourceVerified,true,revised.compilerReason);
 assert.equal(revised.originalSha256,baseline.originalSha256);
 assert.equal(revised.modelChosenFixtures,baseline.modelChosenFixtures);
 assert.ok(revised.modelChosenFixtures>=4);
 assert.notEqual(revised.sourceSha256,baseline.sourceSha256,
  'activity layout should change station positions for open rooms');
 assert.equal(revised.worldWrites,0);
 assert.equal(revised.modelCalls,0);
 assert.equal(revised.sourceDesign.designOnly,true);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-activity-layout-'));
 try{
  const rawPath=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  const sourcePath=path.join(dir,'B143_SOURCE_REVIEW_ONLY.json');
  fs.writeFileSync(rawPath,raw);
  fs.writeFileSync(sourcePath,JSON.stringify(
   diagnoseR125ArchitecturePlanOriginal(raw).sourceDesign));
  const output=saveR125SpatialArt({rawPath,sourcePath,
   outDir:path.join(dir,'activity-review'),fixtureArt:'activity-layout'});
  assert.equal(output.policy.fixtureArt,'activity-layout');
  assert.equal(output.modelAuthoredFixtureCount,output.derivedFixtureCount);
  assert.equal(output.modelCalls,0);
  assert.equal(output.worldWrites,0);
  assert.deepEqual(output.BuildPlan.operations,[]);
  assert.equal(output.nineWorldGates.filter(x=>x==='BLOCKED').length,9);
  assert.equal(fs.existsSync(path.join(dir,'activity-review',output.photo)),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('saved-Qwen room use diagnosis: exact source, authored station counts, no world IO',()=>{
 const original={schema:SCHEMA,id:'generic-room-audit',
  title:'Community exhibition and workshop',
  brief:'A public exhibition beside a shared creative workroom',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'gallery-zone',purpose:'public display',access:'public',
    fixtures:['display','counter']},
   {id:'workroom-zone',purpose:'shared fabrication',access:'shared',
    fixtures:['workbench','storage']}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'}};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-room-use-evidence-'));
 try{
  const raw=JSON.stringify(original),rawPath=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  const sourcePath=path.join(dir,'B143_SOURCE_REVIEW_ONLY.json');
  fs.writeFileSync(rawPath,raw);
  const baseline=diagnoseR125ArchitecturePlanOriginal(raw);
  assert.equal(baseline.sourceVerified,true,baseline.compilerReason);
  fs.writeFileSync(sourcePath,JSON.stringify(baseline.sourceDesign));
  const out=path.join(dir,'room-use');
  const r=inspectR125SavedRoomUse({rawPath,sourcePath,outDir:out});
  assert.equal(r.status,'SOURCE_VERIFIED_ROOM_USE_ART_HOLD');
  assert.equal(r.authoredRooms,2);
  assert.equal(r.modelAuthoredStationCount,4);
  assert.equal(r.rooms.length,2);
  assert.equal(r.rooms.every(x=>x.authoredStationCount===2),true);
  assert.equal(r.variants.length,2);
  assert.equal(r.variants.every(x=>x.sourceVerified&&x.authoredStationsPreserved),true);
  assert.equal(r.worldWrites,0);
  assert.equal(r.modelCalls,0);
  assert.deepEqual(r.BuildPlan.operations,[]);
  assert.equal(r.nineWorldGates.filter(x=>x==='BLOCKED').length,9);
  assert.equal(fs.readFileSync(rawPath,'utf8'),raw);
  assert.ok(fs.existsSync(path.join(out,'ROOM_USE_REPORT.json')));
  assert.throws(()=>inspectR125SavedRoomUse({
   rawPath,sourcePath,outDir:out}),/FRESH_PRIVATE_OUTPUT_REQUIRED/);
  const forged=path.join(dir,'FORGED_SOURCE.json');
  fs.writeFileSync(forged,JSON.stringify({...baseline.sourceDesign,
   title:'not original'}));
  assert.throws(()=>inspectR125SavedRoomUse({
   rawPath,sourcePath:forged,outDir:path.join(dir,'forged-report')}),
   /BASELINE_SHA_OR_WORLD_GUARD/);
  assert.equal(fs.existsSync(path.join(dir,'forged-report')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('V11 integrated HOST room-quality A/B emits eight-view real B143 preview',()=>{
 const p={schema:SCHEMA,id:'integrated-quality-review',title:'Shared workshop gallery',
  brief:'A shared creative workroom and public exhibition hall',
  footprint:{width:30,depth:30},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'work-room',purpose:'creative fabrication',access:'shared',
    fixtures:['workbench','storage']},
   {id:'public-gallery',purpose:'visitor display',access:'public',
    fixtures:['display','seating'],daylight:'wide-bay'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'}};
 const raw=JSON.stringify(p);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-integrated-quality-'));
 try{
  const rawPath=path.join(dir,'MODEL_RESPONSE_ORIGINAL.txt');
  const sourcePath=path.join(dir,'B143_SOURCE_REVIEW_ONLY.json');
  fs.writeFileSync(rawPath,raw);
  const baseline=diagnoseR125ArchitecturePlanOriginal(raw);
  assert.equal(baseline.sourceVerified,true,baseline.compilerReason);
  fs.writeFileSync(sourcePath,JSON.stringify(baseline.sourceDesign));
  const outDir=path.join(dir,'integrated-ab');
  const result=saveR125FinishAB({rawPath,sourcePath,outDir,integrated:true});
  assert.equal(result.originalAuthorUnchanged,true);
  assert.equal(fs.readFileSync(rawPath,'utf8'),raw);
  assert.equal(result.policy.fixtureForm,'room-scale-v1');
  assert.equal(result.verifiedEquipmentCount,4);
  assert.ok(result.roomScaleReview?.changes.length>0);
  assert.equal(result.spatialFacadeReview?.status,
   'SOURCE_CONNECTED_DAYLIGHT_BAYS',JSON.stringify(result.spatialFacadeReview));
  assert.ok(result.spatialFacadeReview.articulatedWindowCount>0);
  assert.ok(result.spatialFacadeReview.changedVoxels>0);
  assert.ok(result.spatialDetail);
  assert.ok(fs.existsSync(path.join(outDir,result.photo)));
  assert.equal(result.art,'HUMAN_REVIEW_REQUIRED_NOT_ACCEPTED');
  assert.equal(result.worldWrites,0);
  assert.deepEqual(result.nineWorldGates,Array(9).fill('BLOCKED'));
  const v2=saveR125FinishAB({rawPath,sourcePath,
   outDir:path.join(dir,'integrated-v2-ab'),integrated:true,
   fixtureForm:'room-scale-v2'});
  assert.equal(v2.policy.fixtureForm,'room-scale-v2');
  assert.equal(v2.originalAuthorUnchanged,true);
  assert.ok(v2.roomScaleReview?.changes.length>0);
  assert.equal(v2.verifiedEquipmentCount,result.verifiedEquipmentCount);
  assert.notEqual(v2.candidateSourceSha256,result.candidateSourceSha256);
  assert.equal(v2.worldWrites,0);
  assert.deepEqual(v2.nineWorldGates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('integrated room-scale HOST extends an authored oven as oven geometry',()=>{
 const p={schema:SCHEMA,id:'authored-oven-room-scale',
  title:'Shared food workshop',
  brief:'A staff managed kitchen with an oven for baking',
  footprint:{width:24,depth:24},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'staff-kitchen',purpose:'shared baking workspace',access:'staff',
    fixtures:['oven'],fixtureScale:'expanded'},
   {id:'staff-prep',purpose:'staff preparation',access:'staff'}]},
   {splitAxis:'x',splitPercent:50,spaces:[
    {id:'staff-office',purpose:'staff office',access:'staff'},
    {id:'staff-storage',purpose:'staff storage',access:'staff'}]}],
  materials:{floor:'wood',wall:'concrete',roof:'stone'},
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'x',roofVolume:'raised',facadeLanguage:'fins'}};
 const raw=JSON.stringify(p);
 const result=diagnoseR125ArchitecturePlanOriginal(raw,{
  hostDetail:'spatial-v1',fixtureArt:'activity-layout',
  fixtureForm:'room-scale-v1'});
 assert.equal(result.sourceVerified,true,result.compilerReason);
 assert.equal(result.originalSha256,
  diagnoseR125ArchitecturePlanOriginal(raw).originalSha256);
 assert.equal(result.modelChosenFixtures,1);
 assert.ok(result.roomScaleReview.changes.some(x=>x.kind==='oven'));
 assert.equal(result.roomScaleReview.skipped.some(x=>x.reason==='UNSUPPORTED_ROLE'),false);
 const ids=result.sourceDesign.elements.map(x=>x.id);
 assert.ok(ids.some(id=>id.startsWith('host-scale-fx-l0-z0-i0-oven-face')));
 assert.ok(ids.some(id=>id.startsWith('host-scale-fx-l0-z0-i0-oven-hood')));
 assert.equal(result.worldWrites,0);
 assert.equal(result.modelCalls,0);
 assert.deepEqual(compileDesign(result.sourceDesign).BuildPlan.operations,[]);
});
