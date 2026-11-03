import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {SCHEMA,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {buildFiveGenreReview,inspectPreservedFiveGenreSources,
 projectExactSourceVoxels,deriveCrossGenreLimits} from './r125-five-genre-source-comparison.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const write=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const plan=i=>({
 schema:SCHEMA,id:'five-genre-fixture-'+i,
 title:'Entire functional architecture source '+i,
 brief:'Distinct connected rooms expressing multiple architectural programs',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},
 rooms:[
  {id:'entry',purpose:'Entrance and public functional room',
   width:12,depth:10,roofY:6+i%3},
  {id:'support',purpose:'Enclosed supporting functional room',
   width:9,depth:i===4?6:8,roofY:7+i%2,
   attach:{to:'entry',side:i%2?'south':'east',shift:0}}
 ]});
function setup(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'mab-five-compare-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const study=path.join(base,'r125-cross-genre-original');
 const diagnostic=path.join(base,'saved-diagnostic');
 fs.mkdirSync(study);fs.mkdirSync(diagnostic);
 const cases=[],diags=[],recovered=[];
 for(const [i,g] of GENRES.entries()){
  const folder=path.join(study,'cases',g.id);fs.mkdirSync(folder,{recursive:true});
  const original=plan(i),raw=JSON.stringify(original),product=compileSpatialComposition(original);
  const oldGeom=i===4?null:product.geometrySha256;
  const oldStatus=i===4?'HOLD_MODEL_IR_INVALID':'SOURCE_AND_3D_READY_ART_HOLD';
  const row={id:g.id,genre:g.genre,status:oldStatus,rawSha256:hash(raw),
   geometrySha256:oldGeom,sourceSha256:i===4?undefined:product.sourceSha256};
  write(folder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  write(folder,'CASE_REPORT.json',row);
  cases.push(row);
  diags.push({id:g.id,genre:g.genre,originalStatus:oldStatus,
   originalRawSha256:hash(raw),rawIntegrity:'SHA256_MATCHED',
   replayedGeometrySha256:product.geometrySha256,
   sourceReplay:i===4?'OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY':
    'MATCHED_SAVED_GEOMETRY'});
  if(i===4)recovered.push({id:g.id,genre:g.genre,
   geometrySha256:product.geometrySha256,sourceSha256:product.sourceSha256,
   sourceRoutes:'SOURCE_ROUTES_REACH_ALL_ZONES',originalFailureStillRecorded:true});
 }
 const original={
  schema:'r125-local-cross-genre-study-v1',model:'qwen3:14b',
  modelCalls:5,testInjectionPresent:false,status:'HOLD_GENRE_BATCH_PARTIAL',
  cases,analysis:{sourceCompiled:4}
 };
 write(study,'CROSS_GENRE_REPORT.json',original);
 const originalReport=fs.readFileSync(path.join(study,'CROSS_GENRE_REPORT.json'),'utf8');
 const diag={schema:'r125-saved-cross-genre-offline-diagnostic-v1',
  originalStatus:original.status,originalStudyPath:fs.realpathSync(study),
  originalReportSha256:hash(originalReport),
  reInferenceCalls:0,cases:diags,recoveredSourceCandidates:recovered,
  originalCompiledCount:4};
 write(diagnostic,'DIAGNOSTIC_REPORT.json',diag);
 return {study,diagnosticFile:path.join(diagnostic,'DIAGNOSTIC_REPORT.json'),
  output:path.join(base,'comparison'),base};
}
test('five frozen model originals produce uniform-scale, honest source-only comparison and 5 separate 3D viewers',t=>{
 const f=setup(t);
 const report=buildFiveGenreReview({studyDir:f.study,
  diagnosticReportFile:f.diagnosticFile,outDir:f.output});
 assert.equal(report.status,'FIVE_SOURCE_REPLAYED_HUMAN_ART_HOLD');
 assert.equal(report.cases.length,5);
 assert.equal(report.sourceModels,5);
 assert.equal(report.modelInferenceCalls,0);
 assert.equal(report.worldWrites,0);
 assert.equal(report.recoveredFromHistoricalHold,undefined);
 assert.equal(report.retainedOriginalSuccessfulModels,4);
 assert.equal(report.offlineRecoveredModels,1);
 assert.equal(report.reviewedArchitectureArt,'NOT_REVIEWED');
 assert.equal(report.minecraftWalking,'NOT_TESTED');
 assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 assert.equal(report.cases.filter(c=>c.recoveredFromHistoricalHold).length,1);
 assert.equal(report.cases[4].originalStatus,'HOLD_MODEL_IR_INVALID');
 assert(report.cases.every(c=>c.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'));
 assert.equal(new Set(report.cases.map(c=>c.geometrySha256)).size,5);
 assert(report.sharedCompilerConstraints.every(x=>x.observed));
 const html=fs.readFileSync(path.join(f.output,'index.html'),'utf8');
 assert.equal((html.match(/<svg /g)||[]).length,15);
 assert.equal((html.match(/真正3Dビューを開く/g)||[]).length,5);
 assert(html.includes('全5棟で同じ1ブロック縮尺'));
 for(const g of GENRES)
  assert(fs.existsSync(path.join(f.output,'cases',g.id,'index.html')));
 assert(!fs.existsSync(path.join(f.output,'MAKECODE_EDUCATION.ts')));
 assert(!fs.existsSync(path.join(f.output,'MODEL_RESPONSE_ORIGINAL.txt')));
 assert.throws(()=>buildFiveGenreReview({studyDir:f.study,
  diagnosticReportFile:f.diagnosticFile,outDir:f.output}),/OUTPUT_PATH/);
});
test('source projection is actual B143 voxel projection, NOT invented illustrations',()=>{
 const product=compileSpatialComposition(plan(0));
 for(const view of ['front','side','top']){
  const svg=projectExactSourceVoxels(product.compiled,view,product.design.bounds);
  assert(svg.startsWith('<svg'));
  assert(svg.includes('EXACT B143 voxel'));
  assert(svg.includes('<rect x='));
 }
 assert(deriveCrossGenreLimits([{product}]).every(x=>x.observed));
});
test('tampered Qwen original fails closed before comparison artifact writes',t=>{
 const f=setup(t);
 const damaged=path.join(f.study,'cases','station','MODEL_RESPONSE_ORIGINAL.txt');
 fs.appendFileSync(damaged,' ');
 assert.throws(()=>inspectPreservedFiveGenreSources({studyDir:f.study,
  diagnosticReportFile:f.diagnosticFile}),/MODEL_ORIGINAL_SHA_station/);
 assert.equal(fs.existsSync(f.output),false);
});
test('wrong prior diagnostic report cannot be mixed with existing model evidence',t=>{
 const f=setup(t);
 const doc=JSON.parse(fs.readFileSync(f.diagnosticFile,'utf8'));
 doc.originalReportSha256='0'.repeat(64);
 fs.writeFileSync(f.diagnosticFile,JSON.stringify(doc));
 assert.throws(()=>buildFiveGenreReview({studyDir:f.study,
  diagnosticReportFile:f.diagnosticFile,outDir:f.output}),/SOURCE_REPORT_PROVENANCE/);
 assert.equal(fs.existsSync(f.output),false);
});
