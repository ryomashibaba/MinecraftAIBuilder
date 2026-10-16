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
 {name:'B155-interchange',url:'ai/bridge-design/index.html',minimum:19,expected:19}
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
