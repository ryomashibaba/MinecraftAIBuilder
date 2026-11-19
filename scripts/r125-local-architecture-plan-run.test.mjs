import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inferR125ExplicitActivityRequirements}
 from '../source/ai/r125-explicit-activity-requirements.mjs';
import {createR125ArchitecturePlanLocalAdapter,R125_ARCHITECTURE_RESPONSE_SCHEMA,
 r125ResponseFormatForEndpoint}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {runR125LocalArchitecturePlan,parseR125LocalPlanArgs,
 summarizeR125InvalidSetbackOriginal}
 from './r125-local-architecture-plan-run.mjs';
import {diagnoseR125ArchitecturePlanOriginal}
 from './r125-offline-replay.mjs';

const original=fs.readFileSync(
 new URL('../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const digest=s=>createHash('sha256').update(s).digest('hex');
const provider=raw=>({ok:true,json:async()=>({
 choices:[{message:{content:raw},finish_reason:'stop'}],
 usage:{prompt_tokens:157,completion_tokens:423,total_tokens:580}})});
const prompt='未知の用途に対応し、入口・屋内動線・採光を持つ独創的な店舗を設計してください。';

test('one-shot design request highlights only literal equipment tasks, without changing authorship',async()=>{
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '職員がパンを焼くためのオーブンと手洗い設備を備える施設'),[
  {capability:'baking-heating',requiredRole:'oven'},
  {capability:'washing-basin',requiredRole:'washbasin'}
 ]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '独創的な小型パン工房の外観を設計して'),[]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  'オーブンは不要で、手洗い設備を設ける施設'),[
  {capability:'washing-basin',requiredRole:'washbasin'}
 ]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '展示台の設置は不要、事務机が必要な部屋'),[
  {capability:'records-desk',requiredRole:'desk'}
 ]);
 const breadWorkshopBrief='来場者が自分で生地をこね、焼成を見学し、手洗いを行い、完成したパンを展示できる体験型パン工房を設計してください。焼成設備は職員が管理し、来場者と職員の動線を適切に分けてください。1階・2階の選択、各室の用途、設備数、間取り、屋根、外観は独自に決めてください。2階を作る場合は明確な活動と設備を持たせ、広い空室や単調な箱型建築を避けてください。';
 assert.deepEqual(inferR125ExplicitActivityRequirements(breadWorkshopBrief),[
  {capability:'baking-heating',requiredRole:'oven'},
  {capability:'washing-basin',requiredRole:'washbasin'},
  {capability:'fabrication-bench',requiredRole:'workbench'},
  {capability:'exhibit-stand',requiredRole:'display'}
 ]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '生地をこねる作業は不要で、手洗いを行わず、パンを展示できない施設'),[]);
 const precisionBrief='市民が工房の展示を見られるようにし、技術者は部品の組立、点検、保管、記録を行います。';
 assert.deepEqual(inferR125ExplicitActivityRequirements(precisionBrief),[
  {capability:'assembly-workstation',requiredRole:'assembly-table'},
  {capability:'parts-inspection',requiredRole:'inspection-stand'},
  {capability:'parts-storage',requiredRole:'storage'},
  {capability:'exhibit-stand',requiredRole:'display'},
  {capability:'records-desk',requiredRole:'desk'}
 ],'coordinated Japanese task verbs must not disappear from the source gate');
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '部品の組立は不要で、展示台も不要。記録用の机だけ必要です。'),[
  {capability:'records-desk',requiredRole:'desk'}
 ]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '工房の外観を自由に設計してください。'),[]);
 assert.deepEqual(inferR125ExplicitActivityRequirements(
  '海辺の小型気象観測所で計測機器の点検、観測記録、試料の保管を行います。')
  .map(x=>x.requiredRole),['inspection-stand','storage','desk']);

 let requests=0,captures=0;
 const author=createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',
  fetcher:async(_url,opts)=>{
   requests++;
   const payload=JSON.parse(opts.body);
   assert.equal(payload.messages.length,2);
   assert.match(payload.messages[0].content,/AREA-BEFORE-ENVELOPE/);
   assert.match(payload.messages[0].content,/smallest useful overall footprint/);
   assert.match(payload.messages[0].content,/Never invent equipment/);
   assert.match(payload.messages[0].content,/HOST must not automatically shrink/);
   const user=JSON.parse(payload.messages[1].content);
   assert.deepEqual(user.requiredFixtureRoles,
    ['oven','washbasin','workbench','display']);
   assert.match(user.essentialTaskPlacementRule,
    /fixtures:\["assembly-table","inspection-stand"\]/);
   assert.match(user.essentialTaskPlacementRule,/fixtures 配列/);
   assert.match(user.essentialTaskPlacementRule,/fixtureScale は出力禁止/);
   assert.deepEqual(user.explicitLiteralEquipment,[
    {capability:'baking-heating',requiredRole:'oven'},
    {capability:'washing-basin',requiredRole:'washbasin'},
    {capability:'fabrication-bench',requiredRole:'workbench'},
    {capability:'exhibit-stand',requiredRole:'display'}
   ]);
   assert.equal(user.architecturalRequest,
    breadWorkshopBrief);
   assert.match(user.explicitEquipmentRule,/model-chosen room/);
   assert.equal(payload.stream,false);
   return provider(original);
  },
  onRawModelResponse:()=>{captures++;}
 });
 const result=await author({
  prompt:breadWorkshopBrief
 });
 assert.equal(requests,1);
 assert.equal(captures,1);
 assert.equal(result.originalSha256,digest(original));
 assert.equal(result.modelCalls,1);
 assert.equal(result.worldWrites,0);
 assert.equal(result.sourceVerified,false);
});

test('existing real Qwen original replays through the unchanged B143 and circulation',()=>{
 const r=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(r.originalSha256,digest(original));
 assert.equal(r.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
 assert.equal(r.sourceVerified,true);
 assert.equal(r.occupiedVoxels,1336);
 assert.equal(r.modelCalls,0);
 assert.equal(r.artStatus,'NOT_REVIEWED');
 assert.equal(r.worldWrites,0);
});

test('new R125 adapter has no direct B143 fallback, remote endpoint, or implicit POST',async()=>{
 let posts=0;
 const fake=async()=>{posts++;return provider(original);};
 for(const endpoint of [
  'https://api.openai.com/v1/chat/completions',
  'http://localhost:11434/v1/chat/completions',
  'http://127.0.0.2:11434/v1/chat/completions',
  'http://127.0.0.1:11434/unsafe'
 ])assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
   model:'qwen3:14b',endpoint,fetcher:fake,onRawModelResponse:()=>{}
  }),/B198G_LOCAL_ONLY_EXPLICIT/);
 assert.throws(()=>createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:fake
 }),/B198G_LOCAL_REQUIRED_RAW_CAPTURE_CALLBACK/);
 const captured=[];
 const author=createR125ArchitecturePlanLocalAdapter({
  model:'qwen3:14b',fetcher:async(url,opts)=>{
   posts++;
   assert.equal(url,'http://127.0.0.1:11434/v1/chat/completions');
   const request=JSON.parse(opts.body);
   assert.equal(request.response_format.type,'json_schema');
   assert.equal(request.response_format.json_schema.name,'r125_architecture_plan_v11');
   assert.equal(request.response_format.json_schema.strict,true);
   const structured=request.response_format.json_schema.schema;
   assert.deepEqual(structured,R125_ARCHITECTURE_RESPONSE_SCHEMA);
   assert.equal(structured.anyOf.length,3);
   const [oneLevel,authorSchema]=structured.anyOf;
   assert.equal(oneLevel.additionalProperties,false);
   assert.equal(oneLevel.properties.levels.minItems,1);
   assert.equal(oneLevel.properties.levels.maxItems,1);
   assert.equal(authorSchema.properties.levels.minItems,2);
   assert.equal(authorSchema.properties.levels.maxItems,2);
   assert.equal(oneLevel.properties.expression.anyOf.length,12);
   assert.ok(oneLevel.properties.expression.anyOf.every(v=>
    v.properties.setbackSide.enum.join(',')==='none'&&
    v.properties.setbackDepth.enum.join(',')==='0'),
    'one-storey author grammar must never allow an upper-storey setback');
   assert.equal(authorSchema.additionalProperties,false);
   assert.equal(authorSchema.properties.levels.items.properties.spaces.minItems,2);
   assert.equal(oneLevel.properties.levels.items.properties.spaces.maxItems,4,
    'single-storey author can choose a four-room front hub');
   assert.equal(authorSchema.properties.levels.items.properties.spaces.maxItems,3,
    'two-storey layout remains bounded to three rooms per floor');
   assert.deepEqual(authorSchema.properties.levels.items.properties.secondarySplitPercent.enum,[25,30,35,40,45,50,55,60,65,70,75]);
   assert.deepEqual(authorSchema.properties.levels.items.properties.splitPercent.enum,[30,35,40,45,50,55,60,65,70]);
   assert.equal(authorSchema.properties.levels.items.properties.rearBayPercentages.minItems,2);
   assert.equal(authorSchema.properties.levels.items.properties.rearBayPercentages.maxItems,2);
   const oneLevelShapes=oneLevel.properties.levels.items.anyOf;
   const threeRoomShape=oneLevelShapes.find(v=>
    v.properties.spaces.minItems===3);
   assert(threeRoomShape);
   assert.equal(Object.hasOwn(threeRoomShape.properties,'rearBayPercentages'),false,
    'three-room floors cannot author a four-room rear partition');
   assert.equal(Object.hasOwn(threeRoomShape.properties,'sideBayPercentages'),false);
   const rearFourRoom=oneLevelShapes.find(v=>
    v.properties.spaces.minItems===4&&v.properties.splitAxis.enum[0]==='z');
   const validRearPairs=rearFourRoom.properties.rearBayPercentages.enum;
   assert(validRearPairs.some(([a,b])=>a===35&&b===65));
   assert(!validRearPairs.some(([a,b])=>a===40&&b===45),
    'the exact narrow pair that produced an empty room is excluded');
   assert(!validRearPairs.some(([a,b])=>a===35&&b===40),
    'rear bay proportions must retain five clear blocks in the middle room');
   assert(!validRearPairs.some(([a,b])=>a===35&&b===35),
    'equal bay percentages are omitted rather than emitted as an invalid duplicate pair');
   assert.equal(Object.hasOwn(rearFourRoom.properties,'sideBayPercentages'),false);
   const twoLevelShapes=authorSchema.properties.levels.items.anyOf;
   assert.equal(twoLevelShapes.length,2);
   assert(twoLevelShapes.every(v=>v.properties.spaces.maxItems<=3&&
    !Object.hasOwn(v.properties,'rearBayPercentages')&&
    !Object.hasOwn(v.properties,'sideBayPercentages')),
    'two-storey levels cannot use a one-floor four-room bay split');
   assert.ok(!authorSchema.properties.levels.items.required.includes('secondarySplitPercent'));
   assert.deepEqual(authorSchema.properties.levels.items.properties.thirdRoomLink.enum,
    ['first-and-second']);
   assert.ok(!authorSchema.properties.levels.items.required.includes('thirdRoomLink'));
   const room=authorSchema.properties.levels.items.properties.spaces.items;
   assert.equal(room.additionalProperties,false);
   assert.deepEqual(room.properties.access.enum,['public','shared','staff']);
   assert.ok(room.required.includes('access'),
    'new Ollama-authored rooms must identify public/staff circulation');
   assert.ok(room.properties.fixtures.items.enum.includes('electronics'));
   assert.ok(room.properties.fixtures.items.enum.includes('oven'));
   assert.ok(room.properties.fixtures.items.enum.includes('service-bay'));
   assert.ok(room.properties.fixtures.items.enum.includes('teaching-board'));
   assert.equal(room.properties.fixture,undefined,
    'new local author has full equipment-role access via fixtures only');
   assert.equal(room.properties.fixtures.maxItems,5);
   assert.equal(room.properties.fixtureScale,undefined,
    'first-pass model cannot select unsafe room expansion');
   assert.ok(room.properties.daylight.enum.includes('paired-bays'),
    'the model may explicitly request two air-backed exterior windows');
   assert.equal(room.properties.fixtures.uniqueItems,undefined,
    'the Ollama schema accepts multiple author-chosen instances of one role');
   assert.deepEqual(room.properties.fixtureDetail.enum,['crafted']);
   assert.deepEqual(room.properties.fixtureArrangement.enum,['focal-island']);
   assert.equal(room.required.includes('fixtureArrangement'),false);
   assert.equal(room.required.includes('fixtureDetail'),false);
   const options=authorSchema.properties.expression.anyOf;
   assert.equal(options.length,20);
   const deep=options.filter(v=>v.properties.setbackSide.enum.includes('east')&&
    v.properties.setbackDepth.enum.includes(8));
   assert.ok(deep.length>=3);
   assert.ok(deep.every(v=>v.properties.setbackDepth.enum.join(',')==='2,3,4,6,8'));
   assert.ok(request.messages[0].content.includes('footprint.width >= 28'));
   assert.ok(request.messages[0].content.includes('footprint.depth >= 28'));
   const frontSetbacks=options.filter(v=>v.properties.setbackSide.enum.includes('front'));
   assert.equal(frontSetbacks.length,2);
   assert.ok(frontSetbacks.every(v=>
    v.properties.setbackSide.enum.join(',')==='front'&&
    v.properties.setbackDepth.enum.join(',')==='2'&&
    !Object.hasOwn(v.properties,'rearCornerCut')&&
    !Object.hasOwn(v.properties,'rearCourt')));
   assert.deepEqual(frontSetbacks.map(v=>v.properties.roofProfile.enum),
    [['flat'],['ridge','sawtooth','hip']]);
   assert.ok(request.messages[0].content.includes('street-facing upper terrace'));
   const steep=options.filter(v=>v.required.includes('ridgeProfile'));
   assert.equal(steep.length,2);
   assert.ok(steep.every(v=>
    v.properties.ridgeProfile.enum.join(',')==='steep'&&
    v.properties.roofProfile.enum.join(',')==='ridge'&&
    v.required.includes('roofVolume')&&
    !Object.hasOwn(v.properties,'rearCornerCut')));
   assert.deepEqual(room.properties.ovenHearth.enum,['accent']);
   assert.equal(room.required.includes('ovenHearth'),false);
   assert.ok(request.messages[0].content.includes('ridgeProfile:"steep"'));
   assert.ok(request.messages[0].content.includes('ovenHearth:"accent"'));
   assert.ok(request.messages[0].content.includes('fixtureArrangement:"focal-island"'));
   for(const levelVariant of structured.anyOf){
    if(!levelVariant.properties.expression)continue;
    for(const expression of levelVariant.properties.expression.anyOf){
     const isPitched=expression.properties.roofProfile.enum.some(x=>
      ['ridge','sawtooth','hip','split-monitor'].includes(x));
     if(isPitched){
      assert.ok(expression.required.includes('roofVolume'),
       'pitched roofs require model-authored raised volume');
      assert.deepEqual(expression.properties.roofVolume.enum,['raised']);
     }else{
      assert.ok(!Object.hasOwn(expression.properties,'roofVolume'),
       'flat roof should not introduce implicit raised volume');
     }
    }
   }
   const uCourt=options.filter(v=>v.required.includes('rearCourt'));
   assert.equal(uCourt.length,2);
   assert.deepEqual(uCourt.map(v=>v.properties.roofProfile.enum[0]),
    ['flat','ridge']);
   assert.equal(uCourt[0].required.includes('roofVolume'),false);
   assert.equal(uCourt[1].required.includes('roofVolume'),true);
   assert.deepEqual(uCourt[1].properties.roofVolume.enum,['raised']);
   assert.ok(uCourt.every(v=>
    v.properties.setbackSide.enum.join(',')==='none'&&
    v.properties.facadeLanguage.enum.join(',')==='plain'&&
    !Object.hasOwn(v.properties,'rearCornerCut')&&
    !Object.hasOwn(v.properties,'roofOverhang')&&
    v.properties.rearCourt.properties.alignment.enum.join(',')==='west,center,east'&&
    v.properties.rearCourt.properties.entrySide.enum.join(',')==='west,east'));
   assert.ok(request.messages[0].content.includes('rearCourt'));
   assert.ok(request.messages[0].content.includes('ridge roof with roofVolume'));
   const frontCourts=options.filter(v=>v.required.includes('frontCornerCut'));
   assert.equal(frontCourts.length,1);
   assert.deepEqual(frontCourts[0].properties.roofProfile.enum,['flat']);
   assert.deepEqual(frontCourts[0].properties.facadeLanguage.enum,['plain']);
   assert.deepEqual(frontCourts[0].properties.setbackSide.enum,['none']);
   assert.equal(frontCourts[0].properties.frontCornerCut.required.includes('access'),true);
   assert.ok(request.messages[0].content.includes('frontCornerCut'));
   assert.equal(Object.hasOwn(frontCourts[0].properties,'rearCornerCut'),false);
   assert.ok(options.every(v=>v.type==='object'&&
    v.additionalProperties===false));
   const pitchedEaves=options.filter(v=>v.required.includes('roofOverhang'));
   assert.equal(pitchedEaves.length,4);
   assert.ok(pitchedEaves.every(v=>
    v.required.includes('roofVolume')&&
    v.properties.roofOverhang.enum.join(',')==='one-block'&&
    ['ridge,sawtooth','hip'].includes(v.properties.roofProfile.enum.join(','))&&
    !Object.hasOwn(v.properties,'rearCornerCut')));
   const monitor=options.filter(v=>v.properties.roofProfile.enum.includes('split-monitor'));
   assert.equal(monitor.length,1);
   assert.deepEqual(monitor[0].properties.setbackSide.enum,['none']);
   assert.deepEqual(monitor[0].properties.setbackDepth.enum,[0]);
   assert.deepEqual(monitor[0].properties.roofAxis.enum,['x']);
   assert.ok(monitor[0].required.includes('roofVolume'));
   assert.equal(Object.hasOwn(monitor[0].properties,'rearCornerCut'),false);
   const courtyard=options.filter(v=>v.required.includes('rearCornerCut'));
   assert.equal(courtyard.length,2);
   assert.ok(courtyard.every(v=>
    v.properties.rearCornerCut.properties.width.maximum===8&&
    v.properties.rearCornerCut.properties.depth.maximum===8));
   const hipOptions=options.filter(v=>v.properties.roofProfile.enum.join(',')==='hip');
    assert.equal(hipOptions.length,4);
    assert.ok(hipOptions.every(v=>v.required.includes('roofVolume')&&
      !Object.hasOwn(v.properties,'rearCornerCut')));
    assert.ok(request.messages[0].content.includes('HIP roof'));
    assert.ok(request.messages[0].content.includes('6..8 deep/wide recess'));
   assert.ok(request.messages[0].content.includes('RAISED ridge roof'));
   assert.ok(courtyard.every(v=>
    v.properties.setbackSide.enum.join(',')==='none'));
   assert.ok(courtyard.every(v=>
    v.properties.roofProfile.enum.every(x=>x==='flat'||x==='ridge')));
   const setback=options.filter(v=>
    v.properties.setbackSide.enum.includes('east'));
   assert.equal(setback.length,6,
    'one additional author-owned steep ridge with upper setback');
   assert.ok(setback.every(v=>
    !v.properties.roofProfile.enum.includes('split-monitor')&&
    !Object.hasOwn(v.properties,'rearCornerCut')));
   assert.equal(request.stream,false);
   assert.equal(request.messages[1].role,'user');
   assert.equal(request.messages[0].content.includes('B143 elements'),true);
   assert.equal(request.messages[0].content.includes('footprint'),true);
   assert.equal(request.messages[0].content.includes('No fixed building-type template'),true);
   assert.equal(request.messages[0].content.includes('actively SELECT an expression'),true);
   assert.equal(request.messages[0].content.includes('raised roof volume'),true);
   assert.equal(request.messages[0].content.includes('ROOF-TO-FACADE PROPORTION'),true);
   assert.equal(request.messages[0].content.includes('VISUAL/WEATHER DESIGN TEST'),true);
   assert.equal(request.messages[0].content.includes('recessed-portico'),true);
   assert.ok(request.messages[0].content.includes('REAL 9-block-wide, 3-deep entrance'));
   assert.ok(request.messages[0].content.includes('splitCoordinate >= 11'));
   assert.ok(request.messages[0].content.includes('splitCoordinate <= footprint.width - 12'));
   assert.ok(request.messages[0].content.includes('plain/fins/screen instead'));
   assert.equal(request.messages[0].content.includes('ROOM-APPROPRIATE fixture'),true);
   assert.equal(request.messages[0].content.includes('REAL ROOM BUDGET'),true);
   assert.ok(request.messages[0].content.includes('thirdRoomLink:"first-and-second"'));
   assert.ok(request.messages[0].content.includes('directly from first into third'));
   assert.ok(request.messages[0].content.includes('ESSENTIAL ACTIVITY COVERAGE'));
   assert.ok(request.messages[0].content.includes('ACTIVITY-LED FLOOR PROGRAM'));
   assert.ok(request.messages[0].content.includes('mostly empty second floor'));
   assert.ok(request.messages[0].content.includes('multiple independent stations'));
   assert.ok(request.messages[0].content.indexOf('ACTIVITY-LED FLOOR PROGRAM')<
    request.messages[0].content.indexOf('footprint EXACT'));
   assert.ok(request.messages[0].content.includes('staff-only FIRST upper room'));
   assert.ok(request.messages[0].content.includes('front terrace is NOT a substitute path'));
   assert.ok(request.messages[0].content.length<=15000,
    'bounded 14B local model instructions should avoid repeated design constraints');
   assert.ok(request.messages[0].content.indexOf('ESSENTIAL ACTIVITY COVERAGE')<
    request.messages[0].content.indexOf('footprint EXACT'),
    'functional brief must be considered before geometry');
   assert.ok(request.messages[0].content.includes('bake or heat food -> oven'));
   assert.ok(request.messages[0].content.includes('broad flat-looking top'));
   assert.ok(request.messages[0].content.includes('first room occupies WEST'));
   assert.ok(request.messages[0].content.includes('first room occupies FRONT'));
   assert.ok(request.messages[0].content.includes('FRONT share of the EAST wing'));
   assert.ok(!request.messages[0].content.includes('percentage counts from the front'));
   assert.equal(request.messages[0].content.includes('3-wide control room'),true);
   assert.equal(request.messages[1].content.includes('sourceOnly'),true);
   assert.equal(opts.headers.Authorization,undefined);
   return provider(original);
  },onRawModelResponse:x=>captured.push(x)
 });
 assert.equal(posts,0);
 const out=await author({prompt});
 assert.equal(posts,1);
 assert.deepEqual(captured,[original]);
 assert.equal(out.originalSha256,digest(original));
 assert.equal(out.plan.schema,'minecraftaibuilder-r125-architecture-plan-v1');
 assert.equal(out.sourceVerified,false);
});

test('one call records raw and true SOURCE, without privately leaking raw into report',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-plan-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider(original)}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'B143_SOURCE_CANDIDATE_ART_HOLD');
  assert.equal(out.report.sourceVerified,true);
  assert.equal(out.report.originalSha256,digest(original));
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.ok(Number.isSafeInteger(out.report.modelRequestElapsedMs));
  assert.ok(out.report.modelRequestElapsedMs>=0);
  assert.deepEqual(out.report.providerReportedTokenUsage,{
   promptTokens:157,completionTokens:423,totalTokens:580});
  assert.equal(fs.readFileSync(path.join(dest,'REQUEST_ORIGINAL.txt'),'utf8'),prompt);
  assert.equal(out.report.requestSha256,digest(prompt));
  assert.deepEqual(out.report.requestedGenerationSettings,{
   temperature:0.55,responseFormat:'json_schema',
   maxOutputTokens:4096,reasoningEffort:null,timeoutMs:180000
  });
  assert.equal(out.report.nineWorldGates.length,9);
  assert.ok(out.report.nineWorldGates.every(x=>x==='BLOCKED'));
  assert.equal(out.report.artStatus,'NOT_REVIEWED');
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  const diag=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.sourceRoutes,'SOURCE_ROUTES_REACH_ALL_ZONES');
  assert.equal(diag.circulation,'SOURCE_CLEARANCE_PROBES_PASS');
  assert.equal(diag.modelAuthorshipVerified,false);
  const runText=fs.readFileSync(path.join(dest,'RUN_REPORT.json'),'utf8');
  assert.equal(runText.includes('Customer retail display and sales'),false);
  assert.ok(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')));
  const viewer=fs.readFileSync(path.join(dest,
   'B143_SOURCE_3D_REVIEW_ONLY.html'),'utf8');
  assert.ok(viewer.includes('minecraftaibuilder-b143-gallery-v1'));
  assert.ok(viewer.includes(diag.geometrySha256));
  assert.ok(viewer.includes('SOURCE全占有ボクセル'));
  assert.ok(viewer.includes('外表面セル: '));
  assert.ok(viewer.includes('｜SOURCE全占有: '));
  assert.equal(out.report.review3d,'TRUE_B143_HTML_GENERATED_ART_PENDING');
  assert.equal(out.report.makeCodeStatus,'OFFLINE_CODE_GENERATED_ONLY');
  assert.equal(typeof out.report.makeCodeSourceSha256,'string');
  const exportReport=JSON.parse(fs.readFileSync(path.join(dest,
   'MAKECODE_EXPORT_REPORT.json'),'utf8'));
  assert.equal(exportReport.status,'OFFLINE_CODE_GENERATED_ONLY');
  assert.equal(exportReport.sourceSha256,diag.sourceSha256);
  assert.equal(exportReport.geometrySha256,diag.geometrySha256);
  assert.equal(exportReport.programExecuted,false);
  assert.equal(exportReport.worldWrites,0);
  assert.deepEqual(exportReport.BuildPlan.operations,[]);
  assert.equal(exportReport.materialMode,'STRICT_USER_ATTESTED');
  const makecode=fs.readFileSync(path.join(dest,
   'MAKECODE_EDUCATION_SOURCE_ONLY.ts'),'utf8');
  assert.ok(makecode.includes('player.onChat("mabbuild"'));

 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('daylight authoring passes local adapter to true B143 3D and MakeCode',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-daylight-full-'));
 const dest=path.join(root,'result');
 const modelOriginal=JSON.parse(original);
 modelOriginal.id='authored-daylight-e2e';
 modelOriginal.levels[0].spaces[0].daylight='wide-bay';
 const raw=JSON.stringify(modelOriginal);
 let requests=0;
 try{
  const {report}=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider(raw)}});
  assert.equal(requests,1);
  assert.equal(report.sourceVerified,true);
  assert.equal(report.makeCodeStatus,'OFFLINE_CODE_GENERATED_ONLY');
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.modelChosenDaylight,1);
  assert.equal(diagnosis.daylightSourceWindows[0].kind,'wide-bay');
  assert.equal(diagnosis.daylightSourceWindows[0].outsideAirVerified,true);
  assert.equal(diagnosis.originalSha256,digest(raw));
  const exportReport=JSON.parse(fs.readFileSync(path.join(dest,'MAKECODE_EXPORT_REPORT.json'),'utf8'));
  assert.equal(exportReport.sourceSha256,diagnosis.sourceSha256);
  assert.equal(exportReport.geometrySha256,diagnosis.geometrySha256);
  assert.equal(exportReport.worldWrites,0);
  assert.equal(exportReport.programExecuted,false);
  assert.deepEqual(exportReport.BuildPlan.operations,[]);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),raw);
  assert.equal(report.artStatus,'NOT_REVIEWED');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('invalid response is captured verbatim but never repaired, re-requested or promoted',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-hold-'));
 const dest=path.join(root,'result');
 let requests=0;
 try{
  const out=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{requests++;return provider('{"schema":');}});
  assert.equal(requests,1);
  assert.equal(out.report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(out.report.modelResponsesCaptured,1);
  assert.equal(out.report.originalSha256,digest('{"schema":'));
  assert.equal(out.report.automaticRetries,0);
  assert.equal(out.report.sourceVerified,false);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),'{"schema":');
  assert.equal(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')),false);
  assert.equal(fs.existsSync(path.join(dest,'MAKECODE_EDUCATION_SOURCE_ONLY.ts')),false);
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.status,'HOLD_INVALID_ORIGINAL_JSON');
  assert.equal(diagnosis.originalEdited,false);
  assert.equal(out.report.offlineDiagnosisStatus,'HOLD_INVALID_ORIGINAL_JSON');
  assert.equal(out.report.automaticRetries,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('valid JSON invalid schema retains specific offline compiler reason without retries',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-reject-'));
 const dest=path.join(root,'invalid-plan');
 const bad=JSON.stringify({...JSON.parse(original),unexpectedAuthorKey:'unverified'});
 let calls=0;
 try{
  const {report}=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:dest
  },{fetcher:async()=>{calls++;return provider(bad)}});
  assert.equal(calls,1);
  assert.equal(report.sourceVerified,false);
  assert.equal(report.modelResponsesCaptured,1);
  assert.equal(report.automaticRetries,0);
  assert.equal(report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(report.offlineDiagnosisStatus,'HOLD_PLAN_COMPILER_OR_QA');
  assert.match(report.offlineCompilerReason,/R125_PLAN_TOP_LEVEL_FIELDS/);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),bad);
  const diagnosis=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diagnosis.status,'HOLD_PLAN_COMPILER_OR_QA');
  assert.equal(diagnosis.modelCalls,0);
  assert.equal(fs.existsSync(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json')),false);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('one-level model setback mismatch is rejected with safe original values, never silently repaired',async()=>{
 const actual=JSON.parse(original);
 actual.expression={...actual.expression,setbackSide:'east',setbackDepth:3};
 const raw=JSON.stringify(actual);
 const snapshot=raw;
 assert.deepEqual(summarizeR125InvalidSetbackOriginal(raw),{
  schema:'r125-invalid-author-setback-summary-v1',
  levelCount:1,setbackSide:'east',setbackDepth:3,
  requiredRule:'ONE_LEVEL_REQUIRES_NONE_AND_ZERO',
  originalEdited:false,modelCalls:0,worldWrites:0
 });
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-setback-hold-'));
 let posts=0;
 try{
  const result=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt,outDir:path.join(root,'one')
  },{fetcher:async()=>{posts++;return provider(raw)}});
  assert.equal(posts,1);
  assert.equal(result.report.status,'HOLD_MODEL_OR_SOURCE');
  assert.equal(result.report.reason,'R125_PLAN_EXPRESSION_SETBACK');
  assert.equal(result.report.invalidSetbackOriginal?.setbackDepth,3);
  assert.equal(result.report.invalidSetbackOriginal?.levelCount,1);
  assert.equal(result.report.originalSha256,digest(raw));
  assert.equal(result.report.automaticRetries,0);
  assert.equal(result.report.sourceVerified,false);
  assert.equal(result.report.worldWrites,0);
  assert.equal(fs.readFileSync(path.join(root,'one','MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),snapshot);
  assert.equal(fs.existsSync(path.join(root,'one','B143_SOURCE_REVIEW_ONLY.json')),false);
  assert.equal(fs.existsSync(path.join(root,'one','MAKECODE_EDUCATION_SOURCE_ONLY.ts')),false);
  const diag=JSON.parse(fs.readFileSync(path.join(root,'one','SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.status,'HOLD_PLAN_COMPILER_OR_QA');
  assert.equal(diag.compilerReason,'R125_PLAN_EXPRESSION_SETBACK');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
 const another={...actual,expression:{...actual.expression,
  setbackSide:'none',setbackDepth:3}};
 assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(another)).requiredRule,
  'ONE_LEVEL_REQUIRES_NONE_AND_ZERO');
 // The author contract already supports the REAL two-level front terrace.
 // Invalid-setback summaries must NOT misclassify its valid geometry when
 // the actual hold is unrelated (such as an infeasible ground portico).
 const front=structuredClone(actual);
 front.levels=[structuredClone(actual.levels[0]),structuredClone(actual.levels[0])];
 front.expression.setbackSide='front';front.expression.setbackDepth=2;
 assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(front)),null);
 front.expression.setbackDepth=3;
 assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(front)).requiredRule,
  'TWO_LEVELS_NONE_ZERO_EAST_REAR_TWO_THREE_FOUR_SIX_EIGHT_WIDE_OR_FRONT_TWO');
 front.expression.setbackDepth=2;
 front.levels=front.levels.slice(0,1);
 assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(front)).requiredRule,
  'ONE_LEVEL_REQUIRES_NONE_AND_ZERO');
 assert.equal(summarizeR125InvalidSetbackOriginal(original),null);
 assert.equal(summarizeR125InvalidSetbackOriginal('{not json'),null);
});
test('CLI insists on explicit model/prompt/new private path',()=>{
 assert.deepEqual(parseR125LocalPlanArgs(['--help']),{help:true});
 assert.throws(()=>parseR125LocalPlanArgs(['--model','qwen3:14b']),
  /ARGS_MODEL_PROMPT_OUT_REQUIRED/);
 assert.equal(parseR125LocalPlanArgs(['--model','qwen3:14b','--prompt',
  prompt,'--out','somewhere']).model,'qwen3:14b');
});

test('one original POST holds unmatched requested oven without correcting source',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-explicit-activity-'));
 let posts=0;
 const dest=path.join(root,'one');
 try{
  const {report}=await runR125LocalArchitecturePlan({
   model:'qwen3:14b',prompt:'小さな工房。職員は焼成設備を管理する。',
   outDir:dest
  },{fetcher:async()=>{posts++;return provider(original)}});
  assert.equal(posts,1,'no automatic retry');
  assert.equal(report.status,'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING');
  assert.equal(report.sourceVerified,false);
  assert.equal(report.makeCodeStatus,'NOT_ATTEMPTED');
  const diag=JSON.parse(fs.readFileSync(path.join(dest,'SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(diag.explicitActivityProxy.status,'HOLD_EXPLICIT_ACTIVITY_PROXY_MISSING');
  assert.deepEqual(diag.explicitActivityProxy.missing,[{
   capability:'baking-heating',requiredRole:'oven'}]);
  assert.equal(fs.readFileSync(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  assert.equal(report.worldWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});

test('deep upper setback original diagnostic matches allowed footprint-dependent AUTHOR rules',()=>{
 const author=JSON.parse(original);
 author.levels=[structuredClone(author.levels[0]),structuredClone(author.levels[0])];
 author.expression={...author.expression,setbackSide:'east',setbackDepth:8};
 author.footprint={width:32,depth:32};
 const before=JSON.stringify(author);
 for(const side of ['east','rear'])for(const depth of [6,8]){
  author.expression.setbackSide=side;author.expression.setbackDepth=depth;
  author.footprint={width:32,depth:32};
  assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(author)),null);
  author.footprint[side==='east'?'width':'depth']=27;
  const d=summarizeR125InvalidSetbackOriginal(JSON.stringify(author));
  assert.equal(d.setbackDepth,depth);
  assert.equal(d.originalEdited,false);
  assert.equal(d.worldWrites,0);
  assert.equal(d.requiredRule,
   'TWO_LEVELS_NONE_ZERO_EAST_REAR_TWO_THREE_FOUR_SIX_EIGHT_WIDE_OR_FRONT_TWO');
 }
 author.footprint={width:32,depth:32};
 author.expression.setbackSide='east';
 author.expression.setbackDepth=7;
 assert.equal(summarizeR125InvalidSetbackOriginal(JSON.stringify(author)).setbackDepth,7);
 assert.equal(author.footprint.width,32);
 assert.equal(JSON.parse(before).expression.setbackDepth,8);
});

test('spatial-tree Qwen schema requires authored per-room volumes and supports observation',()=>{
 const schema=R125_ARCHITECTURE_RESPONSE_SCHEMA;
 assert.equal(schema.anyOf.length,3);
 const spatial=schema.anyOf[2];
 assert(spatial.additionalProperties===false);
 assert.equal(Object.hasOwn(spatial.properties,'expression'),false);
 assert.equal(Object.hasOwn(spatial.properties,'entryZone'),false);
 const level=spatial.properties.levels.items;
 assert.deepEqual(level.required,['layoutMode','spaces']);
 assert.deepEqual(level.properties.layoutMode.enum,['spatial-tree']);
 const room=level.properties.spaces.items;
 assert(room.required.includes('volume'));
 assert.deepEqual(room.properties.volume.required,['width','depth','roofY']);
 assert.deepEqual(room.properties.volume.properties.width,{type:'integer',minimum:6,maximum:14});
 assert.deepEqual(room.properties.volume.properties.roofY,{type:'integer',minimum:6,maximum:10});
 assert.deepEqual(room.properties.volume.properties.attach.required,['to','side','shift']);
 const observed=r125ResponseFormatForEndpoint(
  'http://127.0.0.1:11434/v1/chat/completions',{observationRequired:true});
 const observedVariants=observed.json_schema.schema.anyOf;
 assert(observedVariants.every(v=>v.required.includes('observationLink')));
 const observedThreeRoomShapes=observedVariants.flatMap(v=>
  v.properties.levels.items.anyOf??[]).filter(shape=>
   shape.properties.spaces.minItems===3);
 assert(observedThreeRoomShapes.length>=2);
 for(const shape of observedThreeRoomShapes)
  assert.deepEqual(shape.properties.secondarySplitPercent.enum,[45,50,55]);
 const ordinaryThreeRoomShapes=R125_ARCHITECTURE_RESPONSE_SCHEMA.anyOf.flatMap(v=>
  v.properties.levels.items.anyOf??[]).filter(shape=>
   shape.properties.spaces.minItems===3);
 assert(ordinaryThreeRoomShapes.some(shape=>
  shape.properties.secondarySplitPercent.enum.includes(35)),
  'non-observation plans retain the original valid proportions');
});
