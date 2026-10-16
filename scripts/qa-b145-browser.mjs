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
 {name:'B147-repairs',url:'ai/repairs/index.html',minimum:9,expected:9}
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
 await inspect(pages[5],true);
 fs.writeFileSync(path.join(ART,'B145_BROWSER_RESULTS.json'),JSON.stringify({status:'PASS',results},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',results},null,2));
}catch(e){
 fs.writeFileSync(path.join(ART,'B145_BROWSER_RESULTS.json'),JSON.stringify({status:'FAIL',error:String(e),results},null,2)+'\n');
 throw e;
}finally{await browser.close();}
