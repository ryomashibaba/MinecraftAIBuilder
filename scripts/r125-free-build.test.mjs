import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseFreeBuildArgs,runFreeBuild} from './r125-free-build.mjs';

test('free-build CLI accepts one Japanese prompt or one saved plan without mixed modes',()=>{
 const opts=parseFreeBuildArgs(['--prompt','小さな二階建て住宅を作って','--model','qwen3:14b']);
 assert.equal(opts.model,'qwen3:14b');
 assert.equal(opts.prompt,'小さな二階建て住宅を作って');
 assert.throws(()=>parseFreeBuildArgs(['--plan','x','--prompt','foo']),/EXCLUSIVE/);
 assert.throws(()=>parseFreeBuildArgs(['--model','remote model']),/MODEL/);
 assert.throws(()=>parseFreeBuildArgs(['--prompt','短い']),/PROMPT_LENGTH/);
});

test('one model handoff creates fresh evidence but no Minecraft operation (synthetic child)',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-test-'));
 let called=0;
 try{
  const status=await runFreeBuild({model:'qwen3:14b',prompt:'日本語で自由に小さな住宅を設計',plan:null,outRoot:root},{
   child:(node,args)=>{
    called++;
    assert.equal(node,process.execPath);
    assert(args.includes('--palette'));
    assert(args.includes('--model'));
    const output=args[args.indexOf('--out')+1];
    fs.mkdirSync(path.join(output,'makecode'),{recursive:true});
    const code='// SYNTHETIC OFFLINE UNIT TEST ONLY\n';
    const codeSha=createHash('sha256').update(code).digest('hex');
    fs.writeFileSync(path.join(output,'makecode','MAKECODE_EDUCATION.ts'),code);
    fs.writeFileSync(path.join(output,'makecode','SOURCE_WALKABILITY_REVIEW.json'),JSON.stringify({
     schema:'minecraftaibuilder-r125-practical-source-review-v1',
     status:'SOURCE_ROUTE_CANDIDATE',sourceSha256:'fake-source',geometrySha256:'fake-geometry',
     circulation:{status:'SOURCE_CLEARANCE_PROBES_PASS'},
     routes:{status:'SOURCE_ROUTES_REACH_ALL_ZONES'},
     worldWrites:0,actualInGameWalking:'NOT_TESTED'
    }));
    fs.writeFileSync(path.join(output,'makecode','EXPORT_REPORT.json'),JSON.stringify({
     worldWrites:0,programExecuted:false,materialMode:'STRICT_USER_ATTESTED',
     verifiedPaletteSha256:'synthetic-palette-sha',plannedBlockCounts:{stone:2},
     plannedVoxelCount:2,makecodeSourceSha256:codeSha,
     sourceSha256:'fake-source',geometrySha256:'fake-geometry'
    }));
    return {status:0,stdout:'SYNTHETIC'};
   }});
  assert.equal(called,1);assert.equal(status.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(status.worldWrites,0);
  assert.equal(status.sourceWalkability,'SOURCE_ROUTE_CANDIDATE');
  assert.equal(status.actualMinecraftWalking,'NOT_TESTED');
  assert.equal(fs.existsSync(status.sourceWalkabilityReview),true);
  assert.equal(fs.existsSync(status.makecode),true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(status.output,'REQUEST.json'))).mode,'ONE_LOCAL_OLLAMA_REQUEST');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('unverified or failed model export is HOLD and is not fabricated as a build',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-hold-'));
 try{
  const result=await runFreeBuild({model:'qwen3:14b',prompt:'確認できない未知の建築材を要求',plan:null,outRoot:root},{
   child:()=>({status:2,stderr:'HOLD_UNVERIFIED_MATERIAL'})});
  assert.equal(result.status,'HOLD');
  assert.equal(result.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('REAL saved ArchitecturePlan produces true 3-material MakeCode without any LLM or world call',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-free-build-real-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'reader-station',
  title:'Reading and storage house',brief:'One-storey reading room with storage, door and windows',
  footprint:{width:18,depth:18},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'reading-area',purpose:'Reading tables and circulation area'},
   {id:'storage-zone',purpose:'Book and document storage area'}]}],
  materials:{floor:'wood',wall:'stone',roof:'wood'}};
 try{
  const input=path.join(root,'SOURCE_ARCHITECTURE_PLAN.json');
  fs.writeFileSync(input,JSON.stringify(plan)+'\n');
  const status=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,outRoot:path.join(root,'outputs')});
  assert.equal(status.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(status.worldWrites,0);
  assert(status.plannedVoxelCount>400);
  assert(status.plannedBlockCounts.oak_planks>0);
  assert(status.plannedBlockCounts.stone>0);
  assert(status.plannedBlockCounts.glass>0);
  assert.equal(fs.existsSync(status.makecode),true);
  const sourceReview=JSON.parse(fs.readFileSync(status.sourceWalkabilityReview,'utf8'));
  assert.equal(sourceReview.status,'SOURCE_ROUTE_CANDIDATE');
  assert.equal(sourceReview.circulation.status,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(sourceReview.routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(sourceReview.routes.zones.length,2);
  assert(sourceReview.routes.zones.every(z=>z.reachedFromEntrance===true));
  assert.equal(sourceReview.actualInGameWalking,'NOT_TESTED');
  assert.equal(sourceReview.worldWrites,0);
  const code=fs.readFileSync(status.makecode,'utf8');
  assert.match(code,/blocks\.blockByName\("oak_planks"\)/);
  assert.match(code,/player\.onChat\("mabbuild"/);
  assert.match(code,/player\.onChat\("mabverify"/);
  assert.equal(createHash('sha256').update(code).digest('hex'),status.makecodeSourceSha256);
  const req=JSON.parse(fs.readFileSync(path.join(status.output,'REQUEST.json'),'utf8'));
  assert.equal(req.mode,'SAVED_PLAN');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('user-attested iron_block supports genuine B143 metal roof without a model request',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-metal-proven-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'metal-station',
  title:'Metal roof station',brief:'Tiny generic station with explicitly required metal roof',
  footprint:{width:18,depth:18},
  levels:[{splitAxis:'z',splitPercent:40,spaces:[
   {id:'customer-zone',purpose:'Waiting area for guests'},
   {id:'service-zone',purpose:'Service counter and equipment'}]}],
  materials:{floor:'stone',wall:'stone',roof:'metal'}};
 try{
  const input=path.join(root,'ORIGINAL.json');fs.writeFileSync(input,JSON.stringify(plan));
  const status=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,outRoot:path.join(root,'outputs')});
  assert.equal(status.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(status.worldWrites,0);
  assert.equal(status.sourceWalkability,'SOURCE_ROUTE_CANDIDATE');
  assert((status.plannedBlockCounts.iron_block??0)>0);
  const report=JSON.parse(fs.readFileSync(path.join(path.dirname(status.makecode),'EXPORT_REPORT.json'),'utf8'));
  assert.equal(report.materialMode,'STRICT_USER_ATTESTED');
  assert.equal(report.actualEducationExecution,'NOT_TESTED');
  assert.equal(report.constructionApproved,false);
  assert(report.usedMaterials.some(x=>x.material==='metal'&&x.blockName==='iron_block'));
  const code=fs.readFileSync(status.makecode,'utf8');
  assert.match(code,/blocks\.blockByName\("iron_block"\)/);
  assert.equal(createHash('sha256').update(code).digest('hex'),status.makecodeSourceSha256);
  assert.deepEqual(JSON.parse(fs.readFileSync(input,'utf8')),plan);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('R125 saved one-storey retail screen uses iron_block and verified materials without changing AI plan',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-iron-screen-proven-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'store-with-screen',
  title:'Retail store with employee back area',brief:'Model authored a functional shop and an external metal screen',
  footprint:{width:24,depth:28},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'front-retail-space',purpose:'Customer retail zone'},
   {id:'back-employee-space',purpose:'Staff work area'}]}],
  materials:{floor:'wood',wall:'stone',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'screen'}};
 try{
  const input=path.join(root,'SOURCE_ARCHITECTURE_PLAN.json');
  fs.writeFileSync(input,JSON.stringify(plan));
  const result=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,
   outRoot:path.join(root,'outputs')});
  assert.equal(result.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(result.sourceWalkability,'SOURCE_ROUTE_CANDIDATE');
  assert.equal(result.worldWrites,0);
  assert.equal(result.actualMinecraftWalking,'NOT_TESTED');
  assert.equal(result.humanArt,'NOT_REVIEWED');
  for(const name of ['iron_block','white_concrete','oak_planks','stone','glass'])
   assert((result.plannedBlockCounts[name]??0)>0,'Missing genuine material '+name);
  const review=JSON.parse(fs.readFileSync(result.sourceWalkabilityReview,'utf8'));
  assert.equal(review.routes.status,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert(review.routes.zones.every(zone=>zone.reachedFromEntrance));
  assert.equal(review.routes.zones.length,2);
  const exportReport=JSON.parse(fs.readFileSync(path.join(path.dirname(result.makecode),'EXPORT_REPORT.json'),'utf8'));
  assert.equal(Object.values(exportReport.plannedBlockCounts).reduce((a,b)=>a+b,0),result.plannedVoxelCount);
  assert.equal(exportReport.actualEducationExecution,'NOT_TESTED');
  assert.equal(exportReport.worldWrites,0);
  assert.equal(exportReport.art,'ART_HOLD');
  assert.deepEqual(JSON.parse(fs.readFileSync(input,'utf8')),plan);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('strict palette still HOLDs an unverified accent despite iron_block and concrete being known',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-unverified-accent-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'accent-shop',
  title:'Shop with expressive fins',brief:'Shop with visible facade fins and two rooms',
  footprint:{width:24,depth:28},
  levels:[{splitAxis:'x',splitPercent:50,spaces:[
   {id:'front-shop',purpose:'Customer retail area'},
   {id:'back-office',purpose:'Staff work area'}]}],
  materials:{floor:'wood',wall:'stone',roof:'concrete'},
  expression:{setbackSide:'none',setbackDepth:0,roofProfile:'flat',roofAxis:'x',facadeLanguage:'fins'}};
 try{
  const input=path.join(root,'PLAN.json');fs.writeFileSync(input,JSON.stringify(plan));
  const result=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:input,
   outRoot:path.join(root,'outputs')});
  assert.equal(result.status,'HOLD');
  assert.equal(result.errorCode,'R125_EDUCATION_EXPORT_UNVERIFIED_MATERIAL_ACCENT');
  assert.equal(result.worldWrites,0);
  assert.equal(result.modelRequestsAllowed,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R125 produces no construction-ready status when mandatory source walkability review is missing',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-missing-source-review-'));
 try{
  const status=await runFreeBuild({model:'qwen3:14b',prompt:'未知用途でも部屋に入れる建物',outRoot:root},{
   child:(node,args)=>{
    const dir=args[args.indexOf('--out')+1],target=path.join(dir,'makecode');
    fs.mkdirSync(target,{recursive:true});
    const code='// NO AUDIT, NEVER RECOMMEND BUILD\n';
    fs.writeFileSync(path.join(target,'MAKECODE_EDUCATION.ts'),code);
    fs.writeFileSync(path.join(target,'EXPORT_REPORT.json'),JSON.stringify({
     worldWrites:0,programExecuted:false,materialMode:'STRICT_USER_ATTESTED',
     verifiedPaletteSha256:'synthetic',plannedBlockCounts:{stone:1},
     plannedVoxelCount:1,makecodeSourceSha256:createHash('sha256').update(code).digest('hex'),
     sourceSha256:'unreviewed',geometrySha256:'unreviewed'
    }));
    return {status:0,stdout:'synthetic missing review'};
   }});
  assert.equal(status.status,'HOLD_OFFLINE_REPORT');
  assert.equal(status.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('verified white_concrete supports AI-authored generic concrete roof without modifying plan',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r125-white-concrete-proven-'));
 const plan={schema:'minecraftaibuilder-r125-architecture-plan-v1',id:'stone-wood-concrete-store',
  title:'Retail and employee rooms',brief:'Generic independent model-authored materials proof',
  footprint:{width:18,depth:18},levels:[{splitAxis:'x',splitPercent:50,
   spaces:[{id:'shop-front',purpose:'Front retail sales'},
    {id:'shop-back',purpose:'Employee storage'}]}],
  materials:{floor:'wood',wall:'stone',roof:'concrete'}};
 try{
  const source=path.join(root,'PLAN.json');
  fs.writeFileSync(source,JSON.stringify(plan));
  const result=await runFreeBuild({model:'qwen3:14b',prompt:null,plan:source,
   outRoot:path.join(root,'outputs')});
  assert.equal(result.status,'MAKECODE_READY_HUMAN_REVIEW_REQUIRED');
  assert.equal(result.worldWrites,0);
  assert.equal(result.sourceWalkability,'SOURCE_ROUTE_CANDIDATE');
  assert((result.plannedBlockCounts.white_concrete??0)>0);
  assert((result.plannedBlockCounts.oak_planks??0)>0);
  assert((result.plannedBlockCounts.stone??0)>0);
  const code=fs.readFileSync(result.makecode,'utf8');
  assert.match(code,/blocks\.blockByName\("white_concrete"\)/);
  assert.match(code,/blocks\.blockByName\("oak_planks"\)/);
  assert.deepEqual(JSON.parse(fs.readFileSync(source,'utf8')),plan);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
