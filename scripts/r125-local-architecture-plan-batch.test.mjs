import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runR125ArchitecturePlanBatch,parseR125BatchBriefs,parseR125BatchArgs,
 authoredFormFamily}
 from './r125-local-architecture-plan-batch.mjs';
import {renderR125BatchComparison} from './r125-batch-compare.mjs';

const original=fs.readFileSync(new URL(
 '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const provider=raw=>({ok:true,json:async()=>({
 choices:[{message:{content:raw},finish_reason:'stop'}]})});
const requests=[
 {id:'shop',prompt:'店舗として展示と販売の動線を明確にした独創的な小建築を設計してください。'},
 {id:'lab',prompt:'実験と記録作業を区別できる小さな研究施設を設計してください。'},
 {id:'home',prompt:'採光と生活動線を工夫した小規模な住宅を設計してください。'}
];
const input=JSON.stringify(requests);

test('batch parser preflights unique bounded original briefs',()=>{
 assert.deepEqual(parseR125BatchBriefs(input),requests);
 assert.throws(()=>parseR125BatchBriefs('[]'),/BRIEF_COUNT_1_TO_3/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],{...requests[0],id:'second'}])),/INVALID_DUPLICATE/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],{...requests[1],id:'../evil'}])),/INVALID_DUPLICATE/);
 assert.throws(()=>parseR125BatchBriefs(JSON.stringify([
  requests[0],requests[1],requests[2],requests[0]])),/BRIEF_COUNT_1_TO_3/);
 assert.deepEqual(parseR125BatchArgs(['--help']),{help:true});
 const pilotFile=fileURLToPath(new URL('./r125-v11-pilot-three.json',import.meta.url));
 const pilot=parseR125BatchBriefs(fs.readFileSync(pilotFile,'utf8'));
 assert.deepEqual(pilot.map(x=>x.id),['housing','retail','research']);
 const unknown=parseR125BatchBriefs(fs.readFileSync(
  new URL('./r125-v11-single-unknown.json',import.meta.url),'utf8'));
 assert.equal(unknown.length,1,'genuinely one local model response');
 assert.equal(unknown[0].id,'tide-observatory');
 assert(unknown[0].prompt.length>=80);
 // Function-led unknown task, not a prescripted outcome in a new design form.
 for(const preset of ['U字','L字','切妻','平屋根','ridge','rearCourt','frontCornerCut'])
  assert(!unknown[0].prompt.includes(preset));
 assert.ok(pilot.every(x=>x.prompt.length>=80));
 const args=parseR125BatchArgs(['--model','qwen3:14b',
  '--pilot-three','--out','/private/result']);
 assert.equal(args.pilotThree,true);
 assert.equal(args.briefsFile,null);
 assert.throws(()=>parseR125BatchArgs(['--model','qwen3:14b',
  '--pilot-three','--briefs','x','--out','y']),/ARGS_/);
 assert.equal(parseR125BatchArgs(['--model','qwen3:14b','--briefs',
  '/private/briefs.json','--out','/private/review']).model,'qwen3:14b');
});
test('one sequential SOURCE call per distinct brief, original files persisted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-'));
 try{
  let postCount=0,active=0,peak=0;
  const fake=async(_url,init)=>{active++;peak=Math.max(active,peak);
   const body=JSON.parse(init.body);
   assert.equal(body.reasoning_effort,'none',
    'default Ollama qwen3:14b must leave the output budget for JSON');
   assert.equal(body.max_tokens,4096);
   postCount++;const p=JSON.parse(original);
   // Different real voxel dimensions, not differing source IDs alone.
   p.footprint.width=24+(postCount-1)*2;
   active--;
   return provider(JSON.stringify(p));
  };
  const output=path.join(root,'private-batch');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output},{fetcher:fake});
  assert.equal(postCount,3);
  assert.equal(peak,1);
  assert.equal(report.attempted,3);
  assert.equal(report.planned,3);
  assert.equal(report.sourcePassCount,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REPEATED_AUTHOR_FORMS');
  assert.equal(report.geometryHashesDistinct,true);
  assert.equal(report.modelAuthoredFormFamiliesDistinct,false,
   'different dimensions are not creative differences in roof or massing');
  assert.equal(report.allSourceVerified,true);
  assert.equal(report.worldWrites,0);
  assert.equal(report.visualDiversity,'NOT_REVIEWED');
  assert.ok(report.completed.every(x=>x.modelResponsesCaptured===1));
  const savedSettings=JSON.parse(fs.readFileSync(path.join(output,
   'shop','RUN_REPORT.json'),'utf8')).requestedGenerationSettings;
  assert.equal(savedSettings.reasoningEffort,'none');
  assert.equal(savedSettings.maxOutputTokens,4096);
  assert.equal(fs.readFileSync(path.join(output,'BRIEFS_ORIGINAL.json'),'utf8'),input);
  assert.equal(fs.existsSync(path.join(output,'shop','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.equal(fs.existsSync(path.join(output,'lab','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.equal(fs.existsSync(path.join(output,'home','B143_SOURCE_3D_REVIEW_ONLY.html')),true);
  assert.ok(report.completed.every(x=>x.sourceVerified&&x.originalSha256));
  const html=fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8');
  assert.equal((html.match(/<iframe /g)||[]).length,3);
  assert.ok(html.includes('REPEATED model-authored form families'));
  assert.ok(html.includes('Human ART NOT REVIEWED'));
  assert.ok(html.includes('./home/B143_SOURCE_3D_REVIEW_ONLY.html'));
  assert.ok(report.completed.every(x=>x.authoredProgram?.length===1));
  assert.ok(html.includes('MAKECODE_EDUCATION_SOURCE_ONLY.ts'));
  assert.ok(report.completed.every(x=>x.makeCodeStatus==='OFFLINE_CODE_GENERATED_ONLY'));
  assert.ok(fs.existsSync(path.join(output,'shop','MAKECODE_EDUCATION_SOURCE_ONLY.ts')));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('non-default local provider retains its own thinking policy and never silently disables it',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-other-local-model-'));
 try{
  let body;
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',endpoint:'http://127.0.0.1:47831/v1/chat/completions',
   briefsRaw:JSON.stringify([requests[0]]),outDir:path.join(root,'other')
  },{fetcher:async(_url,init)=>{
   body=JSON.parse(init.body);return provider(original);
  }});
  assert.equal(Object.hasOwn(body,'reasoning_effort'),false);
  assert.equal(report.sourcePassCount,1);
  assert.equal(report.completed[0].modelResponsesCaptured,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,
   'other','shop','RUN_REPORT.json'),'utf8'))
   .requestedGenerationSettings.reasoningEffort,null);
  assert.equal(report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('bad source schema does NOT suppress the other two real-brief original attempts',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-stop-'));
 let calls=0;
 try{
  const output=path.join(root,'stopped');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output},
   {fetcher:async()=>{calls++;return provider('{"schema":')}});
  assert.equal(calls,3);
  assert.equal(report.attempted,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.sourcePassCount,0);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REJECTED_ARCHITECTURES');
  assert.equal(report.completed[0].modelResponsesCaptured,1);
  assert.equal(report.stopReason,null);
  assert.equal(report.allSourceVerified,false);
  assert.equal(fs.existsSync(path.join(output,'lab')),true);
  const html=fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8');
  assert.ok(html.includes('No 3D scene (HOLD)'));
  assert.ok(!html.includes('NOT ATTEMPTED: lab'));
  assert.ok(html.includes('COMPLETE_WITH_REJECTED_ARCHITECTURES'));
  assert.equal((html.match(/<iframe /g)||[]).length,0);
  assert.equal(fs.readFileSync(path.join(output,'shop',
   'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),'{"schema":');
  assert.equal(report.completed[0].failureReason,'B198G_LOCAL_PLAN_NOT_JSON');
  assert.ok(fs.existsSync(path.join(output,'shop','SOURCE_DIAGNOSIS.json')));
  assert.ok(fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8')
   .includes('B198G_LOCAL_PLAN_NOT_JSON'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('identical buildings are still recorded for ALL three briefs and marked poor diversity',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-same-'));
 let calls=0;
 try{
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:path.join(root,'same')},
   {fetcher:async()=>{calls++;return provider(original)}});
  assert.equal(calls,3);
  assert.equal(report.geometryHashesDistinct,false);
  assert.equal(report.modelAuthoredFormFamiliesDistinct,false);
  assert.equal(report.stopReason,null);
  assert.equal(report.sourcePassCount,3);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_IDENTICAL_B143_GEOMETRY');
  assert.equal(report.allSourceVerified,true);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('transport failure WITHOUT raw model content stops further POSTs',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-no-raw-stop-'));
 let calls=0;
 try{
  const out=path.join(root,'out');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:out
  },{fetcher:async()=>{calls++;return {ok:false,status:503}}});
  assert.equal(calls,1);
  assert.equal(report.attempted,1);
  assert.equal(report.originalResponseCount,0);
  assert.equal(report.stopReason,'STOP_PROVIDER_DID_NOT_RETURN_CAPTURABLE_ORIGINAL');
  assert.equal(report.experimentOutcome,'HOLD_PROVIDER_OR_INCOMPLETE');
  assert.equal(fs.existsSync(path.join(out,'lab')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('mixed invalid first and valid later proposals keep true source comparison',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-mixed-research-'));
 let calls=0;
 try{
  const out=path.join(root,'output');
  const fake=async()=>{
   calls++;
   if(calls===1)return provider('invalid-original-json');
   const plan=JSON.parse(original);
   plan.footprint.width=24+(calls-2)*2;
   return provider(JSON.stringify(plan));
  };
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:out
  },{fetcher:fake});
  assert.equal(calls,3);
  assert.equal(report.originalResponseCount,3);
  assert.equal(report.sourcePassCount,2);
  assert.equal(report.evaluatedAllBriefs,true);
  assert.equal(report.allSourceVerified,false);
  assert.equal(report.experimentOutcome,'COMPLETE_WITH_REJECTED_ARCHITECTURES');
  assert.equal(report.completed[0].sourceVerified,false);
  assert.equal(report.completed[1].sourceVerified,true);
  assert.equal(report.completed[2].sourceVerified,true);
  const html=fs.readFileSync(path.join(out,'BATCH_COMPARE_3D.html'),'utf8');
  assert.equal((html.match(/<iframe /g)||[]).length,2);
  assert.ok(html.includes('SOURCE passes 2/3'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('remote endpoints reject before creating output or calling model',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-batch-url-'));
 let requests=0;
 try{
  const output=path.join(root,'remote');
  await assert.rejects(runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output,
   endpoint:'https://api.openai.com/v1/chat/completions'
  },{fetcher:async()=>{requests++;return provider(original)}}),/B198G_LOCAL_ONLY_EXPLICIT/);
  assert.equal(requests,0);assert.equal(fs.existsSync(output),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('comparison escapes untrusted original request text',()=>{
 const html=renderR125BatchComparison([{id:'safe',prompt:'<img src=x onerror=alert(1)>'}],{
  model:'qwen3:14b',attempted:0,planned:1,allSourceVerified:false,
  modelAuthoredFormFamiliesDistinct:null,stopReason:'NOT_STARTED',completed:[]});
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!html.includes('<img src=x'));
});

test('form diversity reflects physical roof mass and not unused flat roof axis',()=>{
 const p={levels:[{splitAxis:'x',spaces:[{},{}]}],
  expression:{roofProfile:'flat',roofAxis:'x',setbackSide:'none',
   setbackDepth:0,facadeLanguage:'plain'}};
 const original=authoredFormFamily(p);
 const ignored=structuredClone(p);ignored.expression.roofAxis='z';
 assert.deepEqual(authoredFormFamily(ignored),original);
 const pitched=structuredClone(p);
 pitched.expression.roofProfile='ridge';pitched.expression.roofVolume='raised';
 assert.notDeepEqual(authoredFormFamily(pitched),original);
 const overhung=structuredClone(pitched);
 overhung.expression.roofOverhang='one-block';
 assert.notDeepEqual(authoredFormFamily(overhung),authoredFormFamily(pitched));
 const triple=structuredClone(p);triple.levels[0].spaces.push({});
 assert.notDeepEqual(authoredFormFamily(triple),original);
 const glass=structuredClone(pitched);
 glass.expression.daylightFacade='east-and-rear-bays';
 assert.notDeepEqual(authoredFormFamily(glass),authoredFormFamily(pitched));
});

test('offline three-genre source and equipment are fully visible in comparison',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-three-genre-evidence-'));
 try{
  const genres=[
   {id:'home-plan',axis:'x',purposes:['living and dining room',
    'quiet sleeping room','home working office'],
    roles:['seating','bed','desk'],roof:'ridge',
    facade:'plain',overhang:true},
   {id:'shop-plan',axis:'x',purposes:['retail customer display',
    'preparation and stock workshop'],
    roles:['display','workbench'],roof:'flat',facade:'fins'},
   {id:'lab-plan',axis:'z',purposes:['satellite assembly lab',
    'electronic device test room','record archive'],
    roles:['workbench','electronics','storage'],roof:'sawtooth',
    facade:'screen'}
  ];
  const plans=genres.map(g=>({
   schema:'minecraftaibuilder-r125-architecture-plan-v1',
   id:g.id,title:'Purpose-specific independent small building',
   brief:'Original functional layout with usable equipment and natural circulation',
   footprint:{width:30,depth:30},
   levels:[{splitAxis:g.axis,splitPercent:50,
    spaces:g.purposes.map((purpose,i)=>({
     id:g.id+'-room-'+i,purpose,fixtures:[g.roles[i]]}))}],
   materials:{floor:'wood',wall:'concrete',roof:'metal'},
   expression:{setbackSide:'none',setbackDepth:0,roofProfile:g.roof,
    roofAxis:'x',facadeLanguage:g.facade,
    ...(g.roof==='flat'?{}:{roofVolume:'raised'}),
    ...(g.overhang?{roofOverhang:'one-block'}:{})}
  }));
  let calls=0;
  const out=path.join(root,'compare');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:JSON.stringify([
    {id:'home',prompt:requests[2].prompt},
    {id:'shop',prompt:requests[0].prompt},
    {id:'lab',prompt:requests[1].prompt}
   ]),outDir:out
  },{fetcher:async()=>provider(JSON.stringify(plans[calls++]))});
  assert.equal(calls,3);
  assert.deepEqual(report.completed.map(x=>x.id),['home','shop','lab']);
  assert.equal(report.sourcePassCount,3,
   JSON.stringify(report.completed.map(x=>({id:x.id,reason:x.failureReason}))));
  assert.equal(report.modelAuthoredFormFamiliesDistinct,true);
  assert.deepEqual(report.completed.map(x=>x.authoredProgram[0].spaces.length),[3,2,3]);
  assert.deepEqual(report.completed.map(x=>x.modelChosenFixtures),[3,2,3]);
  assert.deepEqual(report.completed.map(x=>x.fixtureServiceReached),[3,2,3]);
  assert.deepEqual(report.completed.map(x=>x.fixtureServiceTotal),[3,2,3]);
  assert.ok(report.completed.every(x=>x.occupiedVoxels>0&&
   x.sourceRouteStatus==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   x.circulationStatus==='SOURCE_CLEARANCE_PROBES_PASS'));
  const page=fs.readFileSync(path.join(out,'BATCH_COMPARE_3D.html'),'utf8');
  assert.equal((page.match(/<iframe /g)||[]).length,3);
  assert.ok(page.includes('workbench')&&page.includes('electronics'));
  assert.ok(page.includes('reached service 3/3'));
  assert.ok(page.includes('reached service 2/2'));
  assert.ok(page.includes('True SOURCE evidence, not ART'));
  assert.ok(page.includes('Human ART NOT REVIEWED'));
  assert.equal(report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('real three-genre pilot automatically includes pinned archived B143 reference beside new originals',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-real-genre-compare-'));
 try{
  const pilot=fs.readFileSync(new URL('./r125-v11-pilot-three.json',
   import.meta.url),'utf8');
  const destination=path.join(root,'private-three');
  let calls=0;
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:pilot,outDir:destination
  },{fetcher:async()=>{calls++;return provider(original)}});
  assert.equal(calls,3,'archived Qwen baseline must make ZERO extra model calls');
  assert.equal(report.attempted,3);
  assert.equal(report.archivedComparison?.exactSamePrompt,false);
  assert.equal(report.archivedComparison?.baselineNewModelCalls,0);
  assert.deepEqual(report.archivedComparison.comparisonRows.map(x=>x.genre),
   ['housing','retail','research']);
  assert.deepEqual(report.archivedComparison.comparisonRows.map(x=>
   x.archivedB143Voxels),[2620,933,2936]);
  assert.deepEqual(report.archivedComparison.comparisonRows.map(x=>
   x.newB143Voxels),[1336,1336,1336]);
  assert.ok(report.archivedComparison.comparisonRows.every(x=>
   x.newSourceVerified===true&&x.archivedSelectedFixtures===0));
  const oldDir=path.join(destination,'ARCHIVED_QWEN_BASELINE');
  assert.ok(fs.readFileSync(path.join(oldDir,'index.html'),'utf8')
   .includes('minecraftaibuilder-b143-gallery-v1'));
  const saved=JSON.parse(fs.readFileSync(path.join(
   oldDir,'SAVED_3GENRE_BASELINE.json'),'utf8'));
  assert.equal(saved.newModelCalls,0);
  const html=fs.readFileSync(path.join(destination,'BATCH_COMPARE_3D.html'),'utf8');
  assert.ok(html.includes('過去3棟のB143 3Dを開く'));
  assert.ok(html.includes('同一条件のA/B試験ではありません'));
  assert.ok(html.includes('./ARCHIVED_QWEN_BASELINE/index.html'));
  assert.equal((html.match(/<iframe /g)||[]).length,4);
  assert.ok(html.includes('1336'));
  assert.equal(report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('three-genre viewer synchronizes presentation controls without changing true SOURCE or requiring extra manual clicks',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-review-controls-'));
 try{
  const output=path.join(root,'compare');
  const {report}=await runR125ArchitecturePlanBatch({
   model:'qwen3:14b',briefsRaw:input,outDir:output
  },{fetcher:async()=>provider(original)});
  assert.equal(report.completed.length,3);
  const page=fs.readFileSync(path.join(output,'BATCH_COMPARE_3D.html'),'utf8');
  assert.ok(page.includes('id="allExterior"'));
  assert.ok(page.includes('id="allInterior"'));
  assert.equal((page.match(/class="mab-review"/g)||[]).length,3);
  assert.ok(page.includes('postMessage({type:"mab-r125-review-v1",mode:selected},"*")'));
  assert.ok(page.includes('frame.addEventListener("load"'));
  assert.ok(page.includes('Rooms without authored equipment:'));
  const viewer=fs.readFileSync(path.join(output,'shop',
   'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.ok(viewer.includes('msg.type!=="mab-r125-review-v1"'));
  assert.ok(viewer.includes('event.source!==window.parent'));
  assert.ok(viewer.includes('if(msg.mode==="exterior")el("reset").click()'));
  assert.ok(viewer.includes('el("cutaway").click()'));
  assert.ok(!viewer.includes('fetch('));
  assert.equal(report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('actual cutaway controller exposes first-storey rooms beneath both flat and elevated single-storey roofs',()=>{
 const template=fs.readFileSync(new URL(
  '../source/ai/b143-viewer-template.html',import.meta.url),'utf8');
 const definition=template.match(/function interiorBand\(s\)\{[\s\S]*?\n\}/);
 assert.ok(definition,'viewer should expose a small pure floor-band decision');
 const band=vm.runInNewContext('('+definition[0]+')',{});
 assert.equal(band({levels:2,stats:{designOperations:[
  {element:'floor-0'}]}}),0,'single-storey flat roof must disappear');
 assert.equal(band({levels:3,stats:{designOperations:[
  {element:'floor-0'},{element:'roof-monitor-high'}]}}),0,
  'raised monitor is extra volume, not a second storey');
 assert.equal(band({levels:3,stats:{designOperations:[
  {element:'floor-0'},{element:'floor-1'}]}}),1,
  'actual upper floor should remain visible beneath the second roof');
 assert.equal(band({levels:1,stats:{designOperations:[]}}),0);
 assert.ok(template.includes('floor.value=interiorBand(scene())'));
 assert.ok(template.includes('el("cutaway").click()'),
  'synchronized parent interior button uses the fixed native cutaway');
});

test('model can independently vary functional T-room proportions, not merely footprint sizes',()=>{
 const p={levels:[{splitAxis:'x',splitPercent:50,spaces:[{},{},{}]}]};
 const a=authoredFormFamily(p);
 assert.equal(a.roomPartitions[0].secondary,50);
 const explicit=structuredClone(p);explicit.levels[0].secondarySplitPercent=50;
 assert.deepEqual(authoredFormFamily(explicit),a);
 const unequal=structuredClone(p);unequal.levels[0].secondarySplitPercent=35;
 assert.notDeepEqual(authoredFormFamily(unequal),a);
 const other=structuredClone(p);other.levels[0].splitPercent=40;
 assert.notDeepEqual(authoredFormFamily(other),a);
});
