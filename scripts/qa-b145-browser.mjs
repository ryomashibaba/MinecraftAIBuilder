/**
 * B145 real browser QA, not a mocked DOM. Runs on GitHub Actions Chromium.
 * Confirms each published static entrypoint executes, Canvas paints useful pixels,
 * and selects, camera drags, floor cutaways and layer switches remain interactive.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const ART=path.join(ROOT,'b145-browser-evidence');
fs.mkdirSync(ART,{recursive:true});
const fail=s=>{throw Error('B145_BROWSER_'+s);};
const pages=[
 {name:'B142-main',url:'index.html',minimum:15,expected:15},
 {name:'B143-freeform',url:'ai/index.html',minimum:2,expected:2},
 {name:'B144-revisions',url:'ai/revisions/index.html',minimum:4,expected:4},
 {name:'B145-iterations',url:'ai/iterations/index.html',minimum:6,expected:6},
 {name:'B146-structure',url:'ai/structure/index.html',minimum:8,expected:8},
 {name:'B147-repairs',url:'ai/repairs/index.html',minimum:9,expected:9},
 {name:'B148-options',url:'ai/options/index.html',minimum:11,expected:11},
 {name:'B149-interiors',url:'ai/interiors/index.html',minimum:12,expected:12},
 {name:'B150-vertical',url:'ai/vertical/index.html',minimum:13,expected:13},
 {name:'B151-clearance',url:'ai/clearance/index.html',minimum:14,expected:14},
 {name:'B152-footprint',url:'ai/footprint/index.html',minimum:15,expected:15},
 {name:'B153-transitions',url:'ai/transitions/index.html',minimum:16,expected:16},
 {name:'B154-bypass',url:'ai/bypass/index.html',minimum:17,expected:17},
 {name:'B155-interchange',url:'ai/bridge-design/index.html',minimum:19,expected:19},
 {name:'B156-auto',url:'ai/auto-bridge/index.html',minimum:20,expected:20},
 {name:'B157-finished',url:'ai/finished-bridge/index.html',minimum:21,expected:21},
 {name:'B158-helios',url:'ai/helios/index.html',minimum:23,expected:23},
 {name:'B159-polaris',url:'ai/polaris/index.html',minimum:25,expected:25},
 {name:'B160-doppler',url:'ai/doppler/index.html',minimum:27,expected:27},
 {name:'B161-adaptive',url:'ai/adaptive-route/index.html',minimum:28,expected:28},
 {name:'B162-revised',url:'ai/revised-bridge/index.html',minimum:30,expected:30}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
async function inspect(info,mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1});
 const page=await context.newPage();
 page.setDefaultTimeout(40000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const url=pathToFileURL(path.join(SITE,info.url)).href;
  await page.goto(url,{waitUntil:'load',timeout:45000});
  await page.locator('#view').waitFor({state:'visible'});
  const options=await page.locator('#building option').count();
  if(options!==info.expected)fail(info.name+'_OPTION_COUNT_'+options);
  await page.waitForTimeout(1400);
  const painted=await page.evaluate(()=>{
   const c=document.querySelector('#view'),ctx=c.getContext('2d');
   if(!c||!ctx||c.width<100||c.height<100)return {variety:0,samples:0};
   // Sample the central 78% to reject a blank/background-only canvas.
   const data=ctx.getImageData(0,0,c.width,c.height).data;
   const distinct=new Set(),background=new Set();
   let samples=0;
   for(let y=Math.floor(c.height*.12);y<Math.floor(c.height*.90);y+=17)
    for(let x=Math.floor(c.width*.12);x<Math.floor(c.width*.90);x+=17){
     const i=(y*c.width+x)*4,v=[data[i],data[i+1],data[i+2]];
     distinct.add(v.join(','));samples++;
     if(v[0]>90&&v[1]>80&&v[2]>80)background.add(v.join(','));
    }
   return {variety:distinct.size,samples,bright:background.size};
  });
  if(painted.variety<8||painted.bright<2)fail(info.name+'_BLANK_RENDER_'+JSON.stringify(painted));
  const canvas=page.locator('#view');
  const box=await canvas.boundingBox();if(!box)fail(info.name+'_CANVAS_HIDDEN');
  await page.mouse.move(box.x+box.width*.54,box.y+box.height*.55);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.69,box.y+box.height*.62,{steps:5});await page.mouse.up();
  await page.mouse.wheel(0,-100);
  if(info.name!=='B142-main'){
   const toggles=page.locator('#materialToggles input[type=checkbox]');
   const layers=await toggles.count();if(layers<5)fail(info.name+'_MATERIAL_LAYERS_'+layers);
   await toggles.nth(2).uncheck();await toggles.nth(2).check();
   await page.locator('#cutaway').click();
   const label=await page.locator('#floorValue').innerText();
   if(label==='全階')fail(info.name+'_FLOOR_CUTAWAY_DID_NOT_APPLY');
   await page.locator('#reset').click();
  }else{
   const n=await page.locator('[data-layer]').count();
   if(n<5)fail('B142_LAYER_COUNT_'+n);
   await page.locator('#interior').click();
   await page.locator('#exterior').click();
  }
  await page.locator('#building').selectOption(String(options-1));
  await page.waitForTimeout(950);
  const last=await page.locator('#building').inputValue();
  if(last!==String(options-1))fail(info.name+'_MODEL_SELECTION_FAILED');
  if(info.name==='B162-revised'){
   const picker=page.locator('#building'),status=page.locator('#b162-status');
   await picker.selectOption('27');await page.waitForTimeout(250);
   const prior=await status.innerText();
   if(!prior.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !prior.includes('101水平移動'))
    fail('B162_ORIGINAL_ROUTE_MISSING_'+prior);
   await picker.selectOption('28');await page.waitForTimeout(280);
   const blocked=await status.innerText();
   if(!blocked.includes('FOOTPRINT_UNREACHABLE')||
      !blocked.includes('接続されていない'))
    fail('B162_CHANGED_BUILDING_NOT_DISCONNECTED_'+blocked);
   await picker.selectOption('29');await page.waitForTimeout(380);
   const recovered=await status.innerText();
   if(!recovered.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !recovered.includes('115水平移動')||
      !recovered.includes('旧回廊の遮断'))
    fail('B162_NEW_ROUTE_MISSING_'+recovered);
   const overlay=page.locator('#b162-route');
   if(!await overlay.isChecked())fail('B162_ROUTE_HIDDEN');
   await overlay.uncheck();await overlay.check();
   await picker.selectOption('24');await page.waitForTimeout(170);
   if(!(await status.innerText()).includes('B162はDOPPLER'))
    fail('B162_UNRELATED_MODEL_FALSE_STATUS');
   await picker.selectOption('29');
  }
  if(info.name==='B161-adaptive'){
   const buildings=page.locator('#building'),status=page.locator('#b161-status');
   await buildings.selectOption('25');await page.waitForTimeout(280);
   const empty=await status.innerText();
   if(!empty.includes('FOOTPRINT_UNREACHABLE')||
      !empty.includes('通路なし'))fail('B161_DISCONNECTED_BASELINE_NOT_VISIBLE_'+empty);
   await buildings.selectOption('26');await page.waitForTimeout(250);
   if(!(await status.innerText()).includes('117水平移動'))
    fail('B161_OLD_ROUTE_MISSING');
   await buildings.selectOption('27');await page.waitForTimeout(350);
   const improved=await status.innerText();
   if(!improved.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !improved.includes('101水平移動')||
      !improved.includes('A*中心線101移動')||
      !improved.includes('曲がり3回'))
    fail('B161_ASTAR_ROUTE_REGRESSED_'+improved);
   const overlay=page.locator('#b161-route');
   if(!await overlay.isChecked())fail('B161_ROUTE_OVERLAY_MISSING');
   await overlay.uncheck();await overlay.check();
   await buildings.selectOption('24');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('B161の通路レビュー対象外'))
    fail('B161_ANCESTOR_FALSE_CERTIFICATION');
   await buildings.selectOption('27');
  }
  if(info.name==='B160-doppler'){
   const models=page.locator('#building'),status=page.locator('#b160-status');
   await models.selectOption('25');await page.waitForTimeout(300);
   const before=await status.innerText();
   if(!before.includes('FOOTPRINT_UNREACHABLE')||
      !before.includes('接続できない'))
    fail('B160_DOPPLER_BASELINE_NOT_DISCONNECTED_'+before);
   await models.selectOption('26');await page.waitForTimeout(400);
   const after=await status.innerText();
   if(!after.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !after.includes('水平117移動')||
      !after.includes('方向転換3回')||
      !after.includes('仕上げ16部材'))
    fail('B160_MULTITURN_ROUTE_OR_FINISH_NOT_VISIBLE_'+after);
   const overlay=page.locator('#b160-route');
   if(!await overlay.isChecked())fail('B160_ROUTE_OVERLAY_DISABLED');
   await overlay.uncheck();await overlay.check();
   await models.selectOption('24');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('B160の経路検査対象外'))
    fail('B160_ANCESTRY_FALSE_MULTITURN_LABEL');
   await models.selectOption('26');
  }
  if(info.name==='B159-polaris'){
   const model=page.locator('#building'),status=page.locator('#b159-status');
   await model.selectOption('23');await page.waitForTimeout(280);
   const before=await status.innerText();
   if(!before.includes('FOOTPRINT_UNREACHABLE')||
      !before.includes('接続経路なし'))
    fail('B159_POLARIS_GAP_NOT_PRESENT_'+before);
   await model.selectOption('24');await page.waitForTimeout(400);
   const repaired=await status.innerText();
   if(!repaired.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !repaired.includes('73水平移動')||
      !repaired.includes('Z_THEN_X')||
      !repaired.includes('仕上げ16部材'))
    fail('B159_BENT_2X2_ROUTE_REVIEW_FAILED_'+repaired);
   const line=page.locator('#b159-route');
   if(!await line.isChecked())fail('B159_ROUTE_OVERLAY_DISABLED');
   await line.uncheck();await line.check();
   await model.selectOption('22');await page.waitForTimeout(180);
   if(!(await status.innerText()).includes('B159の経路診断はありません'))
    fail('B159_HELIOS_FALSE_L_ROUTE');
   await model.selectOption('24');
  }
  if(info.name==='B158-helios'){
   const models=page.locator('#building'),status=page.locator('#b158-status');
   await models.selectOption('21');await page.waitForTimeout(300);
   const before=await status.innerText();
   if(!before.includes('FOOTPRINT_UNREACHABLE')||!before.includes('到達経路なし'))
    fail('B158_HELIOS_DISCONNECTED_R0_MISSING_'+before);
   await models.selectOption('22');await page.waitForTimeout(420);
   const connected=await status.innerText();
   if(!connected.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !connected.includes('38水平移動')||
      !connected.includes('自動仕上げ 14部材'))
    fail('B158_NORTH_SOUTH_BRIDGE_BROKEN_'+connected);
   const layer=page.locator('#b158-route');
   if(!await layer.isChecked())fail('B158_ROUTE_HIDDEN');
   await layer.uncheck();await layer.check();
   await models.selectOption('20');await page.waitForTimeout(180);
   if(!(await status.innerText()).includes('26水平移動'))
    fail('B158_EAST_WEST_PREDECESSOR_DISAPPEARED');
   await models.selectOption('19');await page.waitForTimeout(180);
   if(!(await status.innerText()).includes('26水平移動'))
    fail('B158_GENERATED_PREDECESSOR_DISAPPEARED');
   await models.selectOption('22');
  }
  if(info.name==='B157-finished'){
   const models=page.locator('#building'),status=page.locator('#b157-status');
   await models.selectOption('17');await page.waitForTimeout(280);
   if(!(await status.innerText()).includes('FOOTPRINT_UNREACHABLE'))
    fail('B157_INITIAL_GAP_NOT_VISIBLE_'+await status.innerText());
   for(const id of ['18','19','20']){
    await models.selectOption(id);await page.waitForTimeout(280);
    const value=await status.innerText();
    if(!value.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||!value.includes('26水平移動'))
     fail('B157_ROUTE_REGRESSED_'+id+'_'+value);
   }
   const final=await status.innerText();
   if(!final.includes('自動仕上げ14部材')||!final.includes('柵2')||!final.includes('支柱2'))
    fail('B157_FINISHED_PARTS_NOT_VISIBLE_'+final);
   const layer=page.locator('#b157-route');
   if(!await layer.isChecked())fail('B157_ROUTE_OVERLAY_MISSING');
   await layer.uncheck();await layer.check();
   await models.selectOption('16');await page.waitForTimeout(180);
   if(!(await status.innerText()).includes('経路評価はありません'))
    fail('B157_OLDER_SCENE_FALSE_STATUS');
   await models.selectOption('20');
  }
  if(info.name==='B156-auto'){
   const models=page.locator('#building'),status=page.locator('#b156-status');
   await models.selectOption('17');await page.waitForTimeout(300);
   const disconnected=await status.innerText();
   if(!disconnected.includes('FOOTPRINT_UNREACHABLE'))
    fail('B156_BASELINE_NOT_DISCONNECTED_'+disconnected);
   await models.selectOption('18');await page.waitForTimeout(300);
   const manual=await status.innerText();
   if(!manual.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !manual.includes('26水平移動'))
    fail('B156_MANUAL_DESIGN_NOT_REACHABLE_'+manual);
   await models.selectOption('19');await page.waitForTimeout(350);
   const generated=await status.innerText();
   if(!generated.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !generated.includes('26水平移動')||
      !generated.includes('欄干/荷重要審査'))
    fail('B156_AUTOGENERATED_DESIGN_NOT_VISUALIZED_'+generated);
   const overlay=page.locator('#b156-route');
   if(!await overlay.isChecked())fail('B156_OVERLAY_HIDDEN');
   await overlay.uncheck();await overlay.check();
   await models.selectOption('16');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('経路評価はありません'))
    fail('B156_OLD_MODEL_FALSE_CERTIFICATION');
   await models.selectOption('19');
  }
  if(info.name==='B155-interchange'){
   const models=page.locator('#building'),status=page.locator('#b155-status');
   await models.selectOption('17');await page.waitForTimeout(350);
   const before=await status.innerText();
   if(!before.includes('FOOTPRINT_UNREACHABLE')||
      !before.includes('GEOMETRIC_FLOOR_PROPOSAL_ONLY'))
    fail('B155_AURORA_R0_NOT_DISCONNECTED_'+before);
   await models.selectOption('18');await page.waitForTimeout(400);
   const after=await status.innerText();
   if(!after.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !after.includes('26水平移動'))
    fail('B155_AURORA_R1_NOT_REPAIRED_'+after);
   const layer=page.locator('#b155-route');
   if(!await layer.isChecked())fail('B155_OVERLAY_DISABLED');
   await layer.uncheck();await layer.check();
   await models.selectOption('16');await page.waitForTimeout(180);
   if(!(await status.innerText()).includes('B155診断はありません'))
    fail('B155_OLDER_MODEL_FALSE_CERTIFICATION');
   await models.selectOption('18');
  }
  if(info.name==='B154-bypass'){
   const models=page.locator('#building'),route=page.locator('#b154-target'),
    status=page.locator('#b154-status');
   await models.selectOption('15');await route.selectOption('lower-lookout');
   await page.waitForTimeout(320);
   if(!(await status.innerText()).includes('INVALID_GOAL_FOOTPRINT'))
    fail('B154_R5_OBSERVATION_MISSING_NOT_VISIBLE_'+await status.innerText());
   await models.selectOption('16');await page.waitForTimeout(350);
   const verified=await status.innerText();
   if(!verified.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||
      !verified.includes('26水平移動')||!verified.includes('高度変化0'))
    fail('B154_R6_REAL_BYPASS_NOT_AVAILABLE_'+verified);
   const overlay=page.locator('#b154-show-route');
   if(!await overlay.isChecked())fail('B154_PATH_OVERLAY_NOT_ENABLED');
   await overlay.uncheck();await overlay.check();
   await route.selectOption('promenade-middle');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('PASS_FLAT_FOOTPRINT_GEOMETRY'))
    fail('B154_MID_PROMENADE_UNREACHABLE');
   await models.selectOption('14');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('検証はありません'))
    fail('B154_PREVIOUS_MODEL_FALSE_CERTIFICATION');
   await models.selectOption('16');
  }
  if(info.name==='B153-transitions'){
   const models=page.locator('#building'),size=page.locator('#b153-size'),
    status=page.locator('#b153-status');
   await models.selectOption('14');await page.waitForTimeout(250);
   const old=await status.innerText();
   if(!old.includes('INVALID_DESTINATION_ENVELOPE'))
    fail('B153_OLD_R4_NEW_DECK_NOT_MISSING_'+old);
   await models.selectOption('15');await page.waitForTimeout(350);
   const small=await status.innerText();
   if(!small.includes('VERTICAL_CANDIDATE_UNCERTIFIED')||
      !small.includes('Minecraft物理未認証'))
    fail('B153_SMALL_STEP_NOT_FLAGGED_'+small);
   await size.selectOption('large');await page.waitForTimeout(300);
   const large=await status.innerText();
   if(!large.includes('NO_PROVEN_GEOMETRIC_CONNECTION'))
    fail('B153_WIDE_STEP_COLLISION_NOT_REJECTED_'+large);
   const toggle=page.locator('#b153-show-route');
   if(!await toggle.isChecked())fail('B153_ROUTE_OVERLAY_OFF');
   await toggle.uncheck();await toggle.check();
   await size.selectOption('small');await page.waitForTimeout(250);
   if(!(await status.innerText()).includes('VERTICAL_CANDIDATE_UNCERTIFIED'))
    fail('B153_SMALL_MODE_NOT_RESTORED');
   await models.selectOption('13');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('検査はありません'))
    fail('B153_OLDER_MODEL_FALSE_MOTION_CERTIFICATION');
   await models.selectOption('15');
  }
  if(info.name==='B152-footprint'){
   const models=page.locator('#building'),target=page.locator('#b152-target'),
    status=page.locator('#b152-status');
   await models.selectOption('13');await target.selectOption('observation-platform');
   await page.waitForTimeout(350);
   if(!(await status.innerText()).includes('INVALID_GOAL_FOOTPRINT'))
    fail('B152_R3_MISSING_FLOOR_NOT_DETECTED_'+await status.innerText());
   await models.selectOption('14');await page.waitForTimeout(400);
   const after=await status.innerText();
   if(!after.includes('PASS_FLAT_FOOTPRINT_GEOMETRY')||!after.includes('18移動'))
    fail('B152_R4_FOOTPRINT_NOT_REACHABLE_'+after);
   const layer=page.locator('#b152-show-footprint');
   if(!await layer.isChecked())fail('B152_FOOTPRINT_OVERLAY_HIDDEN');
   await layer.uncheck();await layer.check();
   await target.selectOption('observation-turn');await page.waitForTimeout(250);
   if(!(await status.innerText()).includes('PASS_FLAT_FOOTPRINT_GEOMETRY'))
    fail('B152_TURN_CANNOT_BE_INSPECTED');
   await models.selectOption('12');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('2×2検査はありません'))
    fail('B152_PREVIOUS_MODELS_FALSE_CERTIFICATION');
   await models.selectOption('14');
  }
  if(info.name==='B151-clearance'){
   const selector=page.locator('#building'),target=page.locator('#b151-route');
   const status=page.locator('#b151-status');
   await selector.selectOption('12');await target.selectOption('upper-deck');
   await page.waitForTimeout(350);
   const old=await status.innerText();
   if(!old.includes('BELOW_REQUESTED_WIDTH')||!old.includes('幅不足'))
    fail('B151_OLD_R2_WIDTH_NOT_DETECTED_'+old);
   await selector.selectOption('13');await page.waitForTimeout(400);
   const improved=await status.innerText();
   if(!improved.includes('PASS_WIDTH_GEOMETRY')||!improved.includes('最小5')||
      !improved.includes('幅不足0箇所'))
    fail('B151_R3_NOT_WIDENED_'+improved);
   const toggle=page.locator('#b151-overlay');
   if(!await toggle.isChecked())fail('B151_CLEARANCE_OVERLAY_OFF');
   await toggle.uncheck();await toggle.check();
   await target.selectOption('hangar-inner');await page.waitForTimeout(250);
   if(!(await status.innerText()).includes('局所経路幅'))
    fail('B151_FLAT_ROUTE_NOT_REVIEWABLE');
   await selector.selectOption('11');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('診断はありません'))
    fail('B151_OLD_MODELS_FALSE_RESULT');
   await selector.selectOption('13');
  }
  if(info.name==='B150-vertical'){
   const sel=page.locator('#building'),route=page.locator('#b150-route'),status=page.locator('#b150-status');
   await sel.selectOption('12');await page.waitForTimeout(300);
   await route.selectOption('hangar-inner');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('PASS_FLAT_GEOMETRY'))
    fail('B150_MISSING_FLAT_ROUTE');
   for(const target of ['mid-step','upper-deck']){
    await route.selectOption(target);await page.waitForTimeout(200);
    const text=await status.innerText();
    if(!text.includes('STEP_CANDIDATE_ONLY')||!text.includes('高さ1の候補'))
     fail('B150_UNCERTIFIED_STEP_NOT_REPORTED_'+target+'_'+text);
   }
   const flag=page.locator('#b150-overlay');
   if(!await flag.isChecked())fail('B150_PATH_LAYER_HIDDEN');
   await flag.uncheck();await flag.check();
   await sel.selectOption('11');await page.waitForTimeout(200);
   if(!(await status.innerText()).includes('診断はありません'))
    fail('B150_OLD_MODEL_FALSE_CERTIFICATION');
   await sel.selectOption('12');
  }
  if(info.name==='B149-interiors'){
   const selector=page.locator('#building'),destination=page.locator('#routeTarget');
   const route=page.locator('#routeStatus');
   await selector.selectOption('11');await page.waitForTimeout(350);
   for(const id of ['hangar-hall','hangar-inner']){
    await destination.selectOption(id);await page.waitForTimeout(200);
    const text=await route.innerText();
    if(!text.includes('PASS_FLAT_GEOMETRY')||!text.includes('平面ステップ'))
     fail('B149_REAL_INTERIOR_ROUTE_NOT_VISIBLE_'+id+'_'+text);
   }
   const routeToggle=page.locator('#showRoute');
   if(!await routeToggle.isChecked())fail('B149_ROUTE_OVERLAY_DISABLED');
   await routeToggle.uncheck();await routeToggle.check();
   await destination.selectOption('atrium-deck');await page.waitForTimeout(200);
   const extra=await route.innerText();
   if(!/INVALID_DESTINATION|UNREACHABLE|UNKNOWN_BUDGET|PASS_FLAT_GEOMETRY/.test(extra))
    fail('B149_THIRD_DESTINATION_UNKNOWN_'+extra);
   await selector.selectOption('1');await page.waitForTimeout(200);
   if(!(await route.innerText()).includes('移動判定はありません'))
    fail('B149_BASELINE_MODEL_FALSE_ROUTE');
   await selector.selectOption('11');
  }
  if(info.name==='B148-options'){
   const status=page.locator('#repairStatus'),selector=page.locator('#building');
   await selector.selectOption('6');await page.waitForTimeout(300);
   const baseline=await status.innerText();
   if(!baseline.includes('390 非連結セル'))fail('B148_R4_390_NOT_VISIBLE_'+baseline);
   const toggle=page.locator('#markDisconnected');
   if(!await toggle.isChecked())fail('B148_HIGHLIGHT_NOT_ENABLED');
   await toggle.uncheck();await toggle.check();
   for(const index of [9,10]){
    await selector.selectOption(String(index));await page.waitForTimeout(300);
    const t=await status.innerText();
    if(!t.includes('0 非連結セル')||!t.includes('未採用'))
     fail('B148_UNAPPROVED_OPTION_NOT_ZERO_'+index+'_'+t);
   }
   await selector.selectOption('8');await page.waitForTimeout(250);
   const r5=await status.innerText();
   if(!r5.includes('0 非連結セル'))fail('B148_R5_REGRESSED_'+r5);
  }
  if(info.name==='B147-repairs'){
   await page.locator('#building').selectOption('6');
   await page.waitForTimeout(350);
   const before=await page.locator('#diagnosticStatus').innerText();
   if(!before.includes('390 セル'))fail('B147_R4_DETACHED_STATUS_'+before);
   const flag=page.locator('#highlightDetached');
   if(!await flag.isChecked())fail('B147_DETACHED_HIGHLIGHT_DISABLED');
   await flag.uncheck();await flag.check();
   await page.locator('#building').selectOption('8');
   await page.waitForTimeout(350);
   const after=await page.locator('#diagnosticStatus').innerText();
   if(!after.includes('0 セル'))fail('B147_R5_NOT_REPAIRED_'+after);
  }
  if(info.name==='B146-structure'){
   const review=await page.locator('#topologyReview').innerText();
   if(!review.includes('局所接続群')||!review.includes('実構造の認証ではありません'))
    fail('B146_STRUCTURAL_REVIEW_NOT_UPDATED');
  }
  if(info.name!=='B142-main'){
   const txt=await page.locator('#sceneTitle').innerText();
   if(!txt.trim())fail(info.name+'_SCENE_TITLE_EMPTY');
   if(!await page.locator('#meta').isVisible())fail(info.name+'_RENDER_INFO_MISSING');
  }else if(!await page.locator('#renderInfo').isVisible())fail('B142_RENDER_INFO_MISSING');
  if(errors.length)fail(info.name+'_JS_ERRORS_'+JSON.stringify(errors));
  await page.screenshot({path:path.join(ART,info.name+(mobile?'-mobile':'-desktop')+'.png'),fullPage:false});
  results.push({name:info.name,mobile,models:options,painted,errors:0});
 }finally{await context.close();}
}
try{
 for(const item of pages)await inspect(item,false);
 await inspect(pages[pages.length-1],true);
 fs.writeFileSync(path.join(ART,'B145_BROWSER_RESULTS.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',results},null,2));
}catch(e){
 fs.writeFileSync(path.join(ART,'B145_BROWSER_RESULTS.json'),JSON.stringify({status:'FAIL',error:String(e),results},null,2)+'\n');
 throw e;
}finally{await browser.close();}
