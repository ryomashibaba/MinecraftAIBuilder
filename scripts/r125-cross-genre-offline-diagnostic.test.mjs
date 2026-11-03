import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SCHEMA,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {GENRES} from './r125-cross-genre-pilot.mjs';
import {inspectSpatialPlanFields,diagnoseSavedGenreBatch}
 from './r125-cross-genre-offline-diagnostic.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const plan=i=>({schema:SCHEMA,id:'diagnostic-case-'+i,
 title:'Independent functional architecture '+i,
 brief:'Distinct usable room relationships without arbitrary Minecraft commands',
 materials:{floor:'wood',wall:'concrete',roof:'stone'},rooms:[
  {id:'arrival',purpose:'Arrival and visitor functional area',
   width:12,depth:10,roofY:6+i%3},
  {id:'support',purpose:'Distinct enclosed support room for building use',
   width:9,depth:8,roofY:7+i%3,
   attach:{to:'arrival',side:i%2?'south':'east',shift:0}}
 ]});
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2));
test('field diagnostics identify exact invalid room keys, height and invalid parent without making repairs',()=>{
 const p=plan(0);
 p.rooms[1].roofY=11;
 p.rooms[1].extraField='model output';
 p.rooms[1].attach.to='missing';
 const before=JSON.stringify(p);
 const issues=inspectSpatialPlanFields(p);
 assert.deepEqual(issues.filter(x=>x.code==='ROOF_HEIGHT_OUT_OF_RANGE')
  .map(x=>x.path),['plan.rooms[1].roofY']);
 assert(issues.some(x=>x.path==='plan.rooms[1].extraField'));
 assert(issues.some(x=>x.code==='PARENT_NOT_PREVIOUS_ROOM'));
 assert.equal(JSON.stringify(p),before);
});
test('saved five-genre batch is diagnosed offline and existing 4 PASS shapes are pinned',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-offline-genre-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const study=path.join(root,'study');fs.mkdirSync(study);
 const rows=[];
 for(const [i,g] of GENRES.entries()){
  const p=plan(i),folder=path.join(study,'cases',g.id);
  fs.mkdirSync(folder,{recursive:true});
  if(i===4)p.rooms[1].roofY=12;
  const raw=JSON.stringify(p);
  const product=i<4?compileSpatialComposition(p):null;
  const row={id:g.id,genre:g.genre,status:i<4?
   'SOURCE_AND_3D_READY_ART_HOLD':'HOLD_MODEL_IR_INVALID',
   rawSha256:sha(raw),geometrySha256:product?.geometrySha256??null,
   sourceVoxelCount:product?.compiled.primitives.length??null};
  write(folder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  write(folder,'CASE_REPORT.json',row);rows.push(row);
 }
 write(study,'CROSS_GENRE_REPORT.json',{
  schema:'r125-local-cross-genre-study-v1',model:'qwen3:14b',
  modelCalls:5,testInjectionPresent:false,
  status:'HOLD_GENRE_BATCH_PARTIAL',cases:rows,
  analysis:{sourceCompiled:4}
 });
 const out=path.join(root,'diagnosis');
 const result=diagnoseSavedGenreBatch({studyDir:study,outDir:out});
 assert.equal(result.inspectedCases,5);
 assert.equal(result.originalCompiledCount,4);
 assert.equal(result.reInferenceCalls,0);
 assert.equal(result.worldWrites,0);
 assert(result.cases.slice(0,4).every(x=>x.sourceReplay==='MATCHED_SAVED_GEOMETRY'));
 assert.equal(result.cases[4].sourceReplay,'HOLD_ORIGINAL_IR');
 assert.deepEqual(result.cases[4].issues.filter(x=>x.code==='ROOF_HEIGHT_OUT_OF_RANGE')
  .map(x=>x.path),['plan.rooms[1].roofY']);
 assert(fs.existsSync(path.join(out,'DIAGNOSTIC_REPORT.json')));
 assert.throws(()=>diagnoseSavedGenreBatch({studyDir:study,outDir:out}),/PATHS/);
});
test('never accept altered model raw whose SHA does not match stored model evidence',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-offline-tamper-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const study=path.join(root,'study');fs.mkdirSync(study);
 const rows=[];
 for(const [i,g] of GENRES.entries()){
  const folder=path.join(study,'cases',g.id);fs.mkdirSync(folder,{recursive:true});
  const raw=JSON.stringify(plan(i)),p=compileSpatialComposition(plan(i));
  const row={id:g.id,genre:g.genre,status:'SOURCE_AND_3D_READY_ART_HOLD',
   rawSha256:sha(raw),geometrySha256:p.geometrySha256};
  write(folder,'MODEL_RESPONSE_ORIGINAL.txt',i===4?'{}':raw);
  write(folder,'CASE_REPORT.json',row);rows.push(row);
 }
 write(study,'CROSS_GENRE_REPORT.json',{
  schema:'r125-local-cross-genre-study-v1',model:'qwen3:14b',
  testInjectionPresent:false,modelCalls:5,cases:rows,
  status:'FIVE_GENRES_SOURCE_READY_ART_HOLD',analysis:{sourceCompiled:5}
 });
 const out=path.join(root,'diagnosis');
 assert.throws(()=>diagnoseSavedGenreBatch({studyDir:study,outDir:out}),
  /RAW_INTEGRITY_station/);
 assert.equal(fs.existsSync(out),false);
});

test('saved depth-6 station-like plan is replayed as a NEW offline SOURCE 3D, preserving original historical HOLD',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-station-replay-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const study=path.join(root,'study');fs.mkdirSync(study);
 const rows=[];
 for(const [i,g] of GENRES.entries()){
  const original=plan(i);
  if(i===4)original.rooms[1].depth=6;
  const raw=JSON.stringify(original);
  const folder=path.join(study,'cases',g.id);
  fs.mkdirSync(folder,{recursive:true});
  const previous=i<4?compileSpatialComposition(original):null;
  const row={id:g.id,genre:g.genre,status:i<4?
   'SOURCE_AND_3D_READY_ART_HOLD':'HOLD_MODEL_IR_INVALID',
   rawSha256:sha(raw),geometrySha256:previous?.geometrySha256??null};
  write(folder,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  write(folder,'CASE_REPORT.json',row);
  rows.push(row);
 }
 write(study,'CROSS_GENRE_REPORT.json',{
  schema:'r125-local-cross-genre-study-v1',model:'qwen3:14b',
  testInjectionPresent:false,modelCalls:5,cases:rows,
  status:'HOLD_GENRE_BATCH_PARTIAL',analysis:{sourceCompiled:4}
 });
 const output=path.join(root,'diagnostic');
 const result=diagnoseSavedGenreBatch({studyDir:study,outDir:output});
 assert.equal(result.originalCompiledCount,4);
 assert.equal(result.reInferenceCalls,0);
 assert.equal(result.worldWrites,0);
 assert.equal(result.recoveredSourceCandidates.length,1);
 assert.equal(result.recoveredSourceCandidates[0].id,'station');
 assert.equal(result.recoveredSourceCandidates[0].sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(result.cases[4].originalStatus,'HOLD_MODEL_IR_INVALID');
 assert.equal(result.cases[4].rawIntegrity,'SHA256_MATCHED');
 assert.equal(result.cases[4].sourceReplay,
  'OFFLINE_SOURCE_NOW_COMPILED_NOT_ORIGINAL_QWEN_RETRY');
 assert(result.cases.slice(0,4).every(c=>c.sourceReplay==='MATCHED_SAVED_GEOMETRY'));
 const recovered=path.join(output,'recovered-station');
 assert(fs.existsSync(path.join(recovered,'index.html')));
 assert(fs.existsSync(path.join(recovered,'B143_SOURCE.json')));
 assert(fs.existsSync(path.join(recovered,'SOURCE_ROUTES.json')));
 assert(!fs.existsSync(path.join(output,'MAKECODE_EDUCATION.ts')));
 assert.equal(fs.readFileSync(path.join(study,'cases','station',
  'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),JSON.stringify({...plan(4),
   rooms:[plan(4).rooms[0],{...plan(4).rooms[1],depth:6}]}));
});
test('shared diagnostic field contract permits minimum six but rejects five without silent coercion',()=>{
 const valid=plan(4); valid.rooms[1].depth=6;
 assert.deepEqual(inspectSpatialPlanFields(valid),[]);
 const invalid=structuredClone(valid);invalid.rooms[1].depth=5;
 assert.deepEqual(inspectSpatialPlanFields(invalid)
  .filter(x=>x.code==='DIMENSION_OUT_OF_RANGE')
  .map(x=>x.path),['plan.rooms[1].depth']);
});
