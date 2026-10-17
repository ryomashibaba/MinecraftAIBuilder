/**
 * B190 actual Chromium QA: standalone new architecture, not mock DOM.
 * User receives screenshots from GitHub Actions artifact alongside fully
 * portable interactive offline index.html. Never accesses Minecraft.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(ROOT,'b190-evidence');
const html=path.join(dir,'index.html');
if(!fs.existsSync(html))throw Error('B190_QA_PREVIEW_NOT_BUILT');
const results=[];
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage']});
const check=(v,m)=>{if(!v)throw Error('B190_CHROMIUM_'+m)};
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
  check((await page.locator('#building option').count())===5,
   label+'_NOT_FIVE_SOURCE_VERIFIED_SCENES');
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
  await page.waitForTimeout(450);
  check((await page.locator('#b190-gateway-proof').innerText()).includes('OFFLINE_REVIEW_COORDINATES'),
   label+'_SOURCE_GATEWAY_REVIEW_MISSING');
  check((await page.locator('#b190-gateway-proof').innerText()).includes('Minecraft Education'),
   label+'_UNSAFE_WORLD_PLACEMENT_LABEL');
  await page.screenshot({path:path.join(dir,'B190_'+label+'_ANNEX.png'),
   fullPage:true,timeout:60000});
  await page.locator('#building').selectOption('0');
  await page.waitForTimeout(350);
  check((await page.locator('#sceneTitle').innerText()).includes('NEBULA ARK'),
   label+'_ORIGINAL_FULL_MODEL_NOT_RESTORED');
  await page.screenshot({path:path.join(dir,'B190_'+label+'.png'),
   fullPage:true,timeout:60000});
  await page.locator('#b190-low').click();
  check((await page.locator('#floorValue').innerText())!=='全階',
   label+'_LOWER_CUTAWAY_INERT');
  await page.locator('#b190-upper').click();
  check((await page.locator('#floorValue').innerText())!=='全階',
   label+'_UPPER_CUTAWAY_INERT');
  await page.locator('#b190-ring').click();
  check((await page.locator('#floorValue').innerText())==='全階',
   label+'_ORBIT_PRESET_INERT');
  await page.locator('#b190-overview').click();
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
  results.push({device:label,painted,options:5,annexScreenshot:true,sceneSwitching:true,layers:7,
   changedViewPresets:true,screenCapture:true,jsErrors:errs.length});
  await context.close();
 }
}finally{await browser.close()}
const report={schema:'minecraftaibuilder-b190-browser-qa-v1',results,
 worldWrites:0,minecraftContacted:false,readiness:'NOT_PREPARED',
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]}};
fs.writeFileSync(path.join(dir,'B190_CHROMIUM_QA.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('B190_CHROMIUM_QA_PASS',JSON.stringify(report));
