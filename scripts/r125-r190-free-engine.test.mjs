import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileR190FreePlan,runR190FreeEngine,runR190E1ThreeUseStudy,R190_E1_STUDY_BRIEFS,R190_E1_STUDY_WINDOW_SAFETY,r190E1MassingSignature,R190_FREE_SYSTEM_PROMPT}
 from './r125-r190-free-engine.mjs';
import {parseFreeBuildArgs,runFreeBuild} from './r125-free-build.mjs';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {validR190Purpose} from '../source/ai/r190-semantic-massing.mjs';
import {diagnoseR190E1Plan,diagnoseR190E1SavedDirectory} from './r190-e1-diagnose.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const palette=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
function synthetic(){
 const p=structuredClone(R190_STATIC_SYNTHETIC_CASES[0]);
 p.site={width:52,depth:52,height:14};
 p.materials={floor:'stone',wall:'stone',roof:'wood'};
 p.glazedOpenings=[{spaceId:'living',face:'south',offset:2,baseY:5,width:2,height:2}];
 return p;
}

test('opt-in R190 routes from existing R125 command; legacy default is unchanged',()=>{
 assert.equal(parseFreeBuildArgs(['--prompt','日本語で美しい小さな複合施設を作る']).engine,'r125');
 assert.equal(parseFreeBuildArgs(['--engine','r190','--prompt','日本語で美しい小さな複合施設を作る']).engine,'r190');
 assert.throws(()=>parseFreeBuildArgs(['--engine','unsafe','--prompt','日本語で美しい小さな複合施設を作る']),/ENGINE/);
});

test('SYNTHETIC R190 distinct connected volumes -> B143 -> audited strict 3-material offline MakeCode',()=>{
 const plan=synthetic(),before=JSON.stringify(plan);
 const {result,packet}=compileR190FreePlan(plan,{
  palette:JSON.parse(fs.readFileSync(palette,'utf8')),
  provenance:'SYNTHETIC_TEST_FIXTURE'
 });
 assert.equal(JSON.stringify(plan),before);
 assert.equal(result.layout.spaces.length,4);
 assert.equal(result.layout.portals.length,3);
 assert.equal(result.audit.allProgramSpacesReachable,true);
 assert.ok(result.audit.glazedOpenings.length>0);
 assert.equal(packet.materialMode,'STRICT_USER_ATTESTED');
 assert.ok(packet.plannedBlockCounts.stone>0);
 assert.ok(packet.plannedBlockCounts.oak_planks>0);
 assert.ok(packet.plannedBlockCounts.glass>0);
 assert.match(packet.code,/player\.onChat\("mabbuild"/);
 assert.match(packet.code,/player\.onChat\("mabverify"/);
 assert.equal(packet.worldWrites,0);
 assert.equal(packet.constructionApproved,false);
});

test('saved SYNTHETIC design, zero model calls, source SHA and offline export all persisted',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r125-r190-free-'));
 try{
  const plan=synthetic();
  const raw=JSON.stringify(plan)+'\n',input=path.join(temp,'input.json');
  fs.writeFileSync(input,raw);
  const result=await runR190FreeEngine({planFile:input,
   outDir:path.join(temp,'out'),paletteFile:palette});
  assert.equal(result.status,'SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED',result.reason);
  assert.equal(result.modelRequests,0);
  assert.equal(result.originalResponseSha256,sha(raw));
  assert.equal(result.worldWrites,0);
  const report=JSON.parse(fs.readFileSync(path.join(temp,'out','makecode','EXPORT_REPORT.json'),'utf8'));
  const code=fs.readFileSync(path.join(temp,'out','makecode','MAKECODE_EDUCATION.ts'));
  assert.equal(sha(code),report.makecodeSourceSha256);
  assert.equal(report.worldWrites,0);
  assert.equal(report.programExecuted,false);
  assert.equal(report.readiness,'NOT_PREPARED');
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
  assert.equal(fs.existsSync(path.join(temp,'out','model','index.html')),true);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('unverified materials and implicit/no windows are HOLD, never silently repaired',()=>{
 const verified=JSON.parse(fs.readFileSync(palette,'utf8'));
 const metal=synthetic();metal.materials.roof='metal';
 assert.throws(()=>compileR190FreePlan(metal,{palette:verified}),/UNVERIFIED_MATERIAL_METAL/);
 const missing=synthetic();delete missing.glazedOpenings;
 assert.throws(()=>compileR190FreePlan(missing,{palette:verified}),/EXPLICIT_MODEL_WINDOWS_REQUIRED/);
});

test('SYNTHETIC two model-chosen roof sections produce two independently audited physical volumes',()=>{
 const p=synthetic(),base=compileR190FreePlan(p,{
  palette:JSON.parse(fs.readFileSync(palette,'utf8')),provenance:'SYNTHETIC_TEST_FIXTURE'
 });
 p.roofFormIntents=[
  {spaceId:'living',profile:'ridge',axis:'x',rise:2},
  {spaceId:'cooking',profile:'shed',axis:'z',rise:3}
 ];
 const before=JSON.stringify(p);
 const {result,packet}=compileR190FreePlan(p,{
  palette:JSON.parse(fs.readFileSync(palette,'utf8')),provenance:'SYNTHETIC_TEST_FIXTURE'
 });
 assert.equal(JSON.stringify(p),before);
 assert.deepEqual(result.audit.roofForms.map(r=>[r.spaceId,r.profile,r.achievedRise]),
  [['living','ridge',2],['cooking','shed',3]]);
 assert.equal(result.audit.roofForms.every(r=>r.raisedOpenInteriorColumns>0),true);
 assert.notEqual(result.compiled.geometrySha256,base.result.compiled.geometrySha256);
 assert.equal(result.audit.allProgramSpacesReachable,true);
 assert.equal(packet.worldWrites,0);
 assert.equal(packet.programExecuted,false);
 assert.equal(result.art,'ART_HOLD');
});

test('duplicate, conflicting and unfit roof sections fail closed, with no model repair',()=>{
 const paletteData=JSON.parse(fs.readFileSync(palette,'utf8'));
 for(const [edit,reason] of [
  [p=>p.roofFormIntents[1]={...p.roofFormIntents[0]},'DUPLICATE_ROOF_SPACE'],
  [p=>p.roofFormIntents.push({...p.roofFormIntents[0]}),'ROOF_FORM_INTENTS'],
  [p=>p.roofFormIntent={...p.roofFormIntents[0]},'ROOF_FORM_INTENTS'],
  [p=>p.roofFormIntents[1].rise=9,'ROOF_FORM'],
  [p=>p.roofFormIntents[1].spaceId='missing-space','ROOF_SPACE']
 ]){
  const p=synthetic();
  p.roofFormIntents=[
   {spaceId:'living',profile:'ridge',axis:'x',rise:2},
   {spaceId:'cooking',profile:'shed',axis:'z',rise:3}
  ];
  edit(p);
  assert.throws(()=>compileR190FreePlan(p,{
   palette:paletteData,provenance:'SYNTHETIC_TEST_FIXTURE'
  }),new RegExp('R190_SEMANTIC_'+reason));
 }
});

test('legacy free-build option still passes original R125 exporter for old saved plans',async()=>{
 const options=parseFreeBuildArgs(['--engine','r125','--model','qwen3:14b','--prompt','日本語で自由な花屋を新規設計']);
 assert.equal(options.engine,'r125');
});

test('E1 three-use runner uses three separate immutable source requests; fake never becomes real',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190-e1-study-'));
 let count=0;
 try{
  const result=await runR190E1ThreeUseStudy({outRoot:temp},{
   single:async({prompt,outDir})=>{
    assert(R190_E1_STUDY_BRIEFS.some(x=>prompt.startsWith(x.brief+'\n')));
    assert(prompt.endsWith(R190_E1_STUDY_WINDOW_SAFETY));
    count++;fs.mkdirSync(path.join(outDir,'model'),{recursive:true});
    const plan=synthetic();
    plan.spaces[0].width+=count;
    fs.writeFileSync(path.join(outDir,'model','ARCHITECTURE_PLAN.json'),JSON.stringify(plan));
    fs.writeFileSync(path.join(outDir,'model','B143_SOURCE.json'),JSON.stringify({designOnly:true}));
    fs.writeFileSync(path.join(outDir,'model','B143_SCENE.json'),JSON.stringify({
     primitives:Array.from({length:count+1},(_,i)=>[i,1,1,'stone'])
    }));
    return {status:'SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED',
     modelRequests:1,worldWrites:0,originalResponseSha256:sha(prompt),
     sourceSha256:sha('source'+count),geometrySha256:sha('geometry'+count)};
   }});
  assert.equal(count,3);
  assert.equal(result.status,'TEST_DOUBLE_ONLY');
  assert.equal(result.realModelRequests,0);
  assert.equal(result.sourceCompiledCount,3);
  assert.equal(result.distinctMassingSignatureCount,3);
  assert.equal(result.distinctVoxelOccupancyCount,3);
  assert.equal(result.worldWrites,0);
  assert.equal(fs.existsSync(path.join(result.dir,'E1_REVIEW.md')),true);
  const page=fs.readFileSync(path.join(result.dir,'E1_REVIEW.html'),'utf8');
  assert.match(page,/modern-home\/model\/index\.html/);
  assert.match(page,/flower-shop\/model\/index\.html/);
  assert.match(page,/research-lab\/model\/index\.html/);
  assert.match(page,/TEST_DOUBLE_ONLY/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('E1 local unavailability skips remaining requests without faking source geometry',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190-e1-offline-'));let count=0;
 try{
  const result=await runR190E1ThreeUseStudy({outRoot:temp},{
   single:async()=>{count++;return {status:'HOLD',reason:'R125_R190_LOCAL_MODEL_NOT_LISTED',
    modelRequests:0,worldWrites:0};}});
  assert.equal(count,1);
  assert.equal(result.status,'TEST_DOUBLE_ONLY');
  assert.equal(result.sourceCompiledCount,0);
  assert.deepEqual(result.rows.slice(1).map(r=>r.status),
   ['SKIPPED_LOCAL_MODEL_NOT_AVAILABLE','SKIPPED_LOCAL_MODEL_NOT_AVAILABLE']);
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('E1 signature treats renamed rooms, new prose and material palette as same massing',()=>{
 const p=synthetic(),q=structuredClone(p),ids=new Map(q.spaces.map((s,i)=>[s.id,'space-renamed-'+i]));
 q.id='another-name';q.title='Different words';q.brief='Different prose and uses';
 q.materials={floor:'wood',wall:'wood',roof:'stone'};
 q.spaces=q.spaces.map(s=>({...s,id:ids.get(s.id),
  parentId:s.parentId===null?null:ids.get(s.parentId),purpose:'Different room label'}));
 q.entrySpaceId=ids.get(p.entrySpaceId);
 q.glazedOpenings=q.glazedOpenings.map(g=>({...g,spaceId:ids.get(g.spaceId)}));
 assert.equal(r190E1MassingSignature(p),r190E1MassingSignature(q));
});

test('first real E1 HOLD feedback is reflected in prospective Qwen contract, without repairing responses',()=>{
 const s=R190_FREE_SYSTEM_PROMPT;
 assert.match(s,/NO underscores/);
 assert.match(s,/\^\[a-z\]\[a-z0-9-\]\{2,39\}/);
 assert.match(s,/EACH room height MUST/);
 assert.match(s,/SHARED WALLS/);
 assert.match(s,/formIntent spaceId CANNOT also appear/);
 assert.match(s,/one final JSON object/);
 const p=synthetic();
 p.id='research_lab';
 assert.throws(()=>compileR190FreePlan(p,{
  palette:JSON.parse(fs.readFileSync(palette,'utf8'))
 }),/R190_SEMANTIC_IDENTITY/);
 assert.equal(p.id,'research_lab'); // no host correction
});

test('E1 read-only original diagnostics pinpoint room field and entry-door glazing without changing source',()=>{
 const p=synthetic();const raw=JSON.stringify(p);
 p.spaces[0].height=6;
 p.spaces[1].extraInvented='incorrect';
 const entry=p.spaces[0],span=entry.width,door=Math.floor((span-2)/2);
 p.glazedOpenings=[{spaceId:p.entrySpaceId,face:'south',offset:door,baseY:5,width:2,height:2}];
 const before=JSON.stringify(p),errors=diagnoseR190E1Plan(p);
 assert(errors.some(x=>x.rule==='SPACE_HEIGHT'&&x.where.includes('spaces[0]')));
 assert(errors.some(x=>x.rule==='SPACE_UNEXPECTED_FIELD'&&x.where.includes('extraInvented')));
 assert(errors.some(x=>x.rule==='GLAZING_ENTRY_DOOR_CONFLICT'&&x.actual.door[0]===door));
 assert.equal(JSON.stringify(p),before);
 assert.notEqual(raw,before);
});

test('E1 report reader checks original SHA and writes no files or repaired plan',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'e1-diag-'));
 try{
  const p=synthetic();p.spaces[1].height=6;const raw=JSON.stringify(p);
  const modelDir=path.join(temp,'modern-home','model');
  fs.mkdirSync(modelDir,{recursive:true});
  fs.writeFileSync(path.join(modelDir,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
  const report={schema:'r190-e1-three-use-source-comparison-v1',sourceCompiledCount:0,
   rows:[
    {id:'modern-home',reason:'R190_SEMANTIC_SPACE',originalResponseSha256:sha(raw)},
    {id:'flower-shop',reason:'R190_SEMANTIC_GLAZING_ENTRY_DOOR_CONFLICT'},
    {id:'research-lab',reason:'R190_SEMANTIC_SPACE'}
   ]};
  fs.writeFileSync(path.join(temp,'E1_STUDY_REPORT.json'),JSON.stringify(report));
  const before=fs.readdirSync(modelDir),result=diagnoseR190E1SavedDirectory(temp);
  assert.equal(result.modelRequests,0);
  assert.equal(result.worldWrites,0);
  assert.equal(result.rows[0].originalSha256Verified,true);
  assert(result.rows[0].issues.some(x=>x.rule==='SPACE_HEIGHT'));
  assert.equal(result.rows[1].rawAvailable,false);
  assert.deepEqual(fs.readdirSync(modelDir),before);
  assert.equal(fs.readFileSync(path.join(modelDir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
 }finally{fs.rmSync(temp,{force:true,recursive:true});}
});

test('Natural two-character Japanese room purposes accepted, short ASCII or malformed rejected',()=>{
 const paletteData=JSON.parse(fs.readFileSync(palette,'utf8'));
 for(const purpose of ['居間','物置','受付']){
  const p=synthetic();p.spaces[0].purpose=purpose;
  assert.equal(validR190Purpose(purpose),true);
  assert.doesNotThrow(()=>compileR190FreePlan(p,{palette:paletteData,provenance:'SYNTHETIC_TEST_FIXTURE'}));
  assert.equal(diagnoseR190E1Plan(p).some(x=>x.rule==='SPACE_PURPOSE'),false);
 }
 for(const purpose of ['a','ab','12','<script>','']){
  const p=synthetic();p.spaces[0].purpose=purpose;
  assert.equal(validR190Purpose(purpose),false);
  assert.throws(()=>compileR190FreePlan(p,{palette:paletteData}),/R190_SEMANTIC_SPACE/);
 }
});

test('Diagnostic preserves unsafe 6-wide storage and overlap of centered entry door',()=>{
 const p=synthetic(),e=p.spaces.find(s=>s.id===p.entrySpaceId);
 p.spaces[2].depth=6;
 const door=Math.floor((e.width-2)/2);
 p.glazedOpenings=[{spaceId:e.id,face:'south',offset:door-3,baseY:5,width:4,height:2}];
 const before=JSON.stringify(p),issues=diagnoseR190E1Plan(p);
 assert(issues.some(x=>x.rule==='SPACE_DIMENSION'&&x.where.includes('.depth')));
 assert(issues.some(x=>x.rule==='GLAZING_ENTRY_DOOR_CONFLICT'));
 assert.equal(JSON.stringify(p),before);
});

test('Saved R190 HOLD includes field diagnoses while original JSON remains unchanged',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190-e1-hold-details-'));
 try{
  const p=synthetic();p.spaces[0].purpose='a';
  const raw=JSON.stringify(p),saved=path.join(temp,'original.json');
  fs.writeFileSync(saved,raw);
  const report=await runR190FreeEngine({planFile:saved,outDir:path.join(temp,'out'),paletteFile:palette});
  assert.equal(report.status,'HOLD');
  assert.equal(report.modelRequests,0);
  assert.equal(report.worldWrites,0);
  assert(report.validationIssues.some(x=>x.rule==='SPACE_PURPOSE'));
  assert.equal(fs.readFileSync(path.join(temp,'out','model','SAVED_PLAN_ORIGINAL.txt'),'utf8'),raw);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('E1 exposes roof-space underlying reason without silently touching authored intent',()=>{
 const p=synthetic();
 p.roofFormIntent={spaceId:'living',profile:'ridge',axis:'x',rise:2};
 p.formIntent={spaceId:'living',face:'north',cornerInset:2};
 const before=JSON.stringify(p);
 const issues=diagnoseR190E1Plan(p);
 assert(issues.some(x=>x.rule==='ROOF_FORM_FACET_CONFLICT'));
 assert.equal(JSON.stringify(p),before);
 delete p.formIntent;
 p.roofFormIntent.spaceId='no-such-room';
 assert(diagnoseR190E1Plan(p).some(x=>x.rule==='ROOF_SPACE_NOT_FOUND'));
 p.roofFormIntent.spaceId='living';
 p.spaces[0].spatialRole='open-court';
 assert(diagnoseR190E1Plan(p).some(x=>x.rule==='ROOF_OPEN_COURT_CONFLICT'));
});

test('E1 window-safety instruction is study-only, never edits model output or general R190',()=>{
 assert.match(R190_E1_STUDY_WINDOW_SAFETY,/do NOT put any glazedOpenings/);
 assert.match(R190_E1_STUDY_WINDOW_SAFETY,/not physically shared/);
 assert.match(R190_E1_STUDY_WINDOW_SAFETY,/same room as formIntent/);
 assert.doesNotMatch(R190_FREE_SYSTEM_PROMPT,/E1 architecture experiment/);
});
