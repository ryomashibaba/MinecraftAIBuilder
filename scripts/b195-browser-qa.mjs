/**
 * B195 actual Chromium QA: standalone new architecture, not mock DOM.
 * User receives screenshots from GitHub Actions artifact alongside fully
 * portable interactive offline index.html. Never accesses Minecraft.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(ROOT,'b195-evidence');
const html=path.join(dir,'index.html');
if(!fs.existsSync(html))throw Error('B195_QA_PREVIEW_NOT_BUILT');
const results=[];
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage']});
const check=(v,m)=>{if(!v)throw Error('B195_CHROMIUM_'+m)};
try{
 for(const mobile of [false,true]){
  const label=mobile?'MOBILE':'DESKTOP';
  const context=await browser.newContext({
   viewport:mobile?{width:390,height:844}:{width:1440,height:900},
   deviceScaleFactor:1});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await page.goto(pathToFileURL(html).href,{waitUntil:'load',timeout:60000});
  await page.locator('#view').waitFor({state:'visible'});
  check((await page.locator('#building option').count())===9,
   label+'_NOT_NINE_REAL_SOURCE_SCENES');
  check((await page.locator('#building option').first().innerText())
   .includes('NEBULA ARK'),label+'_WRONG_ARCHITECTURE');
  await page.waitForTimeout(1600);
  const painted=await page.evaluate(()=>{
   const canvas=document.querySelector('#view'),ctx=canvas?.getContext('2d');
   if(!ctx)return {distinct:0,bright:0};
   const {width,height}=canvas;
   const pixels=ctx.getImageData(0,0,width,height).data;
   const distinct=new Set(),bright=new Set();
   for(let y=Math.floor(height*.13);y<height*.87;y+=19)
    for(let x=Math.floor(width*.10);x<width*.90;x+=19){
     const i=(y*width+x)*4,v=[pixels[i],pixels[i+1],pixels[i+2]];
     distinct.add(v.join(','));
     if(v[0]>110&&v[1]>85&&v[2]>75)bright.add(v.join(','));
    }
   return {distinct:distinct.size,bright:bright.size};
  });
  check(painted.distinct>=10&&painted.bright>=3,
   label+'_CANVAS_BLANK_'+JSON.stringify(painted));
  check((await page.locator('#sceneTitle').innerText()).includes('NEBULA ARK'),
   label+'_SCENE_TITLE');
  check((await page.locator('#materialToggles input').count())===7,
   label+'_SEVEN_MATERIAL_LAYERS');
  // Native scene picker is functional: the 3 real main-source viewports
  // and the truly separate new independently authored 3D architecture.
  for(const [num,expected] of [['1','北区画'],['2','中央区画'],
    ['3','南区画'],['4','HORIZON DOCK']]){
   await page.locator('#building').selectOption(num);
   await page.waitForTimeout(250);
   check((await page.locator('#sceneTitle').innerText()).includes(expected),
    label+'_SELECTED_SCENE_NOT_APPLIED_'+num);
  }
  await page.locator('#building').selectOption('5');
  await page.waitForTimeout(350);
  check((await page.locator('#sceneTitle').innerText()).includes('CELESTIAL SKYBRIDGE'),
   label+'_STRICT_SKYBRIDGE_SCENE_INVISIBLE');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_SKYBRIDGE.png'),
   fullPage:true,timeout:60000});
  // Verify seventh SOURCE CITYSCAPE is truly drawn and every
  // individual-part checkbox changes the native painting, not a fake UI.
  await page.locator('#building').selectOption('6');
  await page.waitForTimeout(1100);
  check((await page.locator('#sceneTitle').innerText()).includes('3棟'),
   label+'_VIRTUAL_CITYSCAPE_NOT_SELECTED');
  check((await page.locator('#stats').innerText()).includes('162,816'),
   label+'_CITYSCAPE_COMPOSITE_VOXEL_SUM_WRONG');
  const visibleCount=async()=>{
   const str=await page.locator('#meta').innerText();
   const m=str.match(/表示:\s*([\d,]+)/);
   if(!m)throw Error('B195_META_NOT_RENDERED_'+str);
   return Number(m[1].replaceAll(',',''));
  };
  const initial=await visibleCount();
  check(initial>120000,label+'_TRUE_CITYSCAPE_NOT_PAINTED_'+initial);
  check((await page.locator('#b195-junction-inspector').innerText()).includes('OFFLINE_REVIEW_COORDINATES'),
   label+'_SOURCE_TERMINAL_PANEL_NOT_GROUNDED');
  // Different source builders must actually paint distinctly and disabling
  // colorization must restore the true original source palette.
  const imageScore=()=>page.evaluate(()=>{
   const canvas=document.getElementById('view'),ctx=canvas.getContext('2d');
   const p=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let hash=2166136261;
   for(let i=0;i<p.length;i+=997){
    hash=Math.imul(hash^(p[i]+(p[i+1]<<8)+(p[i+2]<<16)),16777619)>>>0;
   }
   return hash;
  });
  const modelColors=await imageScore();
  await page.screenshot({path:path.join(dir,'B195_'+label+'_IDENTITY_COLORS.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b194-color-by-model').uncheck();
  await page.waitForTimeout(400);
  const naturalMaterials=await imageScore();
  check(naturalMaterials!==modelColors,label+'_COLOR_BY_MODEL_NOT_RENDERED');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_SOURCE_MATERIALS.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b194-color-by-model').check();
  await page.waitForTimeout(350);
  check(await imageScore()===modelColors,label+'_COLOR_BY_MODEL_NOT_RESTORED');
  await page.locator('#b194-focus-main').click();
  check(await page.locator('#building').inputValue()==='6',
   label+'_MAIN_TERMINAL_NOT_IN_CITYSCAPE');
  await page.waitForTimeout(400);
  const mainFocus=await imageScore();
  check(mainFocus!==modelColors,label+'_MAIN_JUNCTION_CAMERA_TARGET_DID_NOT_CHANGE');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_MAIN_JUNCTION.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b194-focus-annex').click();
  await page.waitForTimeout(450);
  const annexFocus=await imageScore();
  check(annexFocus!==mainFocus,label+'_ANNEX_JUNCTION_CAMERA_TARGET_DID_NOT_CHANGE');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_ANNEX_JUNCTION.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b194-show-terminals').uncheck();
  await page.waitForTimeout(400);
  check(await imageScore()!==annexFocus,label+'_JUNCTION_MARKER_OVERLAY_NOT_FUNCTIONAL');
  await page.locator('#b194-show-terminals').check();
  await page.locator('#b194-focus-whole').click();
  await page.waitForTimeout(400);
  check(await page.locator('#building').inputValue()==='6',
   label+'_CITY_JUNCTION_OVERVIEW_NOT_RESTORED');
  await page.locator('#b194-show-celestial-skybridge').uncheck();
  await page.waitForTimeout(450);
  const withoutBridge=await visibleCount();
  check(withoutBridge<initial-100,
   label+'_SKYBRIDGE_TOGGLE_INERT_'+initial+'_'+withoutBridge);
  await page.locator('#b194-show-horizon-dock-annex').uncheck();
  await page.waitForTimeout(450);
  const mainOnly=await visibleCount();
  check(mainOnly<withoutBridge-1000,
   label+'_ANNEX_TOGGLE_INERT_'+withoutBridge+'_'+mainOnly);
  await page.locator('#b194-show-nebula-ark-main').uncheck();
  await page.waitForTimeout(450);
  check(await visibleCount()===0,label+'_MAIN_TOGGLE_INERT');
  for(const id of ['nebula-ark-main','horizon-dock-annex','celestial-skybridge'])
   await page.locator('#b194-show-'+id).check();
  await page.waitForTimeout(750);
  check((await visibleCount())===initial,label+'_CITYSCAPE_TOGGLE_RESTORE_FAILED');
  await page.locator('#b194-cityscape-focus').click();
  check(await page.locator('#building').inputValue()==='6',
   label+'_WHOLE_CITY_CAMERA_NOT_SELECTED');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_CITYSCAPE.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b194-bridge-focus').click();
  check(await page.locator('#building').inputValue()==='6',
   label+'_BRIDGE_FOCUS_NOT_SELECTED');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_CITYSCAPE_BRIDGE.png'),
   fullPage:true,timeout:60000});
  // NEW SCENES: actual 19th source-authored transit district and a
  // ninth source-only 4-building panorama, never a B143 >160k monolith.
  await page.locator('#building').selectOption('7');
  await page.waitForTimeout(600);
  check((await page.locator('#sceneTitle').innerText()).includes('METROPOLIS TRANSIT'),
    label+'_INDEPENDENT_TRANSIT_SCENE_MISSING');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_TRANSIT.png'),
    fullPage:true,timeout:60000});
  await page.locator('#b195-open-4city').click();
  await page.waitForTimeout(800);
  check(await page.locator('#building').inputValue()==='8',
    label+'_FOUR_MODEL_PANORAMA_BUTTON_INERT');
  check((await page.locator('#sceneTitle').innerText()).includes('B195'),
    label+'_NEW_FOUR_MODEL_CITYSCAPE_TITLE_MISSING');
  const allSourceVoxels=await page.locator('#stats').innerText();
  check(!allSourceVoxels.includes('undefined'),
    label+'_FOUR_MODEL_RENDER_METADATA_UNDEFINED');
  const before4=await visibleCount();
  check(before4>125000,label+'_FOUR_MODEL_RENDER_NOT_REAL_'+before4);
  const screenshot4=path.join(dir,'B195_'+label+'_FOUR_CITYSCAPE.png');
  await page.screenshot({path:screenshot4,fullPage:true,timeout:60000});
  await page.locator('#b194-show-metropolis-transit-exchange').uncheck();
  await page.waitForTimeout(450);
  const noTerminal=await visibleCount();
  check(noTerminal<before4-3000,
   label+'_FOURTH_TERMINAL_SOURCE_TOGGLE_INERT_'+before4+'_'+noTerminal);
  await page.locator('#b194-show-metropolis-transit-exchange').check();
  await page.waitForTimeout(450);
  check((await visibleCount())===before4,
   label+'_FOURTH_SOURCE_VOXEL_VIEW_NOT_RESTORED');
  await page.locator('#b195-open-terminal').click();
  check(await page.locator('#building').inputValue()==='7',
   label+'_TERMINAL_SELECTOR_INERT');
  await page.locator('#building').selectOption('4');
  await page.waitForTimeout(450);
  check((await page.locator('#b195-gateway-proof').innerText()).includes('OFFLINE_REVIEW_COORDINATES'),
   label+'_SOURCE_GATEWAY_REVIEW_MISSING');
  check((await page.locator('#b195-gateway-proof').innerText()).includes('Minecraft Education'),
   label+'_UNSAFE_WORLD_PLACEMENT_LABEL');
  check((await page.locator('#b195-route-69').count())===1 &&
   (await page.locator('#b195-route-65').count())===1,
   label+'_MISSING_BOTH_SOURCE_ROUTE_MAPS');
  await page.locator('#b195-level-65').click();
  check((await page.locator('#b195-route-65').isVisible())&&
   (await page.locator('#b195-level-65').getAttribute('aria-pressed'))==='true',
   label+'_Y65_COMPARE_UI_DID_NOT_CHANGE');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_Y65.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b195-level-69').click();
  check((await page.locator('#b195-route-69').isVisible())&&
   (await page.locator('#b195-level-69').getAttribute('aria-pressed'))==='true',
   label+'_Y69_COMPARE_UI_DID_NOT_CHANGE');
  await page.screenshot({path:path.join(dir,'B195_'+label+'_Y69.png'),
   fullPage:true,timeout:60000});
  await page.screenshot({path:path.join(dir,'B195_'+label+'_ANNEX.png'),
   fullPage:true,timeout:60000});
  await page.locator('#building').selectOption('0');
  await page.waitForTimeout(350);
  check((await page.locator('#sceneTitle').innerText()).includes('NEBULA ARK'),
   label+'_ORIGINAL_FULL_MODEL_NOT_RESTORED');
  await page.screenshot({path:path.join(dir,'B195_'+label+'.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b195-low').click();
  check((await page.locator('#floorValue').innerText())!=='全階',
   label+'_LOWER_CUTAWAY_INERT');
  await page.locator('#b195-upper').click();
  check((await page.locator('#floorValue').innerText())!=='全階',
   label+'_UPPER_CUTAWAY_INERT');
  await page.locator('#b195-ring').click();
  check((await page.locator('#floorValue').innerText())==='全階',
   label+'_ORBIT_PRESET_INERT');
  await page.locator('#b195-overview').click();
  check((await page.locator('#floorValue').innerText())==='全階',
   label+'_OVERVIEW_PRESET_INERT');
  const canvas=page.locator('#view'),rect=await canvas.boundingBox();
  check(Boolean(rect),label+'_CANVAS_NOT_INTERACTIVE');
  await page.mouse.move(rect.x+rect.width*.50,rect.y+rect.height*.50);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.60,rect.y+rect.height*.56,{steps:4});
  await page.mouse.up();
  await page.waitForTimeout(200);
  check(errs.length===0,label+'_JAVASCRIPT_ERRORS_'+errs.join(' | '));
  results.push({device:label,painted,options:9,annexScreenshot:true,sceneSwitching:true,reviewCityscapeToggles:true,sourceCityscapeRealSurface:true,buildingPaletteToggle:true,trueJunctionCameraTargets:true,newTransitDistrictSource3d:true,fourBuildingReview:true,routeComparisonControls:true,layers:7,
   changedViewPresets:true,screenCapture:true,jsErrors:errs.length});
  await context.close();
 }
}finally{await browser.close()}
const report={schema:'minecraftaibuilder-b195-browser-qa-v1',results,
 worldWrites:0,minecraftContacted:false,readiness:'NOT_PREPARED',
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]}};
fs.writeFileSync(path.join(dir,'B195_CHROMIUM_QA.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('B195_CHROMIUM_QA_PASS',JSON.stringify(report));
