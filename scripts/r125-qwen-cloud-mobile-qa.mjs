/**
 * Run inside GitHub Actions after generating an already-public Qwen B143
 * comparison. Browser QA is read-only and never contacts Minecraft or Ollama.
 * Synthetic fixture? NO: the input is the pinned saved Qwen original.
 * Four form variants are HOST authored and ART is not certified here.
 */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const fail=x=>{throw Error('R125_QWEN_CLOUD_BROWSER_QA_'+x);};
const dir=process.env.PREVIEW_DIR;
if(!dir||!fs.existsSync(path.join(dir,'index.html')))fail('NO_GENERATED_GALLERY');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const report=JSON.parse(fs.readFileSync(path.join(dir,'R125_EXPRESSION_COMPARISON.json'),'utf8'));
if(report.exactOriginalPlanSha256!=='46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271'||
 report.scenes.length!==5||report.worldWrites!==0||report.constructionApproved!==false||
 report.gates.length!==9||report.gates.some(v=>v!=='BLOCKED'))fail('SOURCE_OR_SAFETY');
const browser=await chromium.launch({headless:true});
try{
 for(const {name,width,height,mobile} of [
  {name:'MOBILE_420',width:420,height:900,mobile:true},
  {name:'DESKTOP_1280',width:1280,height:800,mobile:false}
 ]){
  const context=await browser.newContext({
   viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1
  });
  const page=await context.newPage();
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('request',r=>requests.push(r.url()));
  await page.setContent(html,{waitUntil:'load'});
  await page.waitForFunction(()=>document.querySelector('#meta')?.textContent.includes('表示:'));
  if(await page.locator('#building option').count()!==5)fail(name+'_SCENE_COUNT');
  const pixelCount=await page.locator('#view').evaluate(c=>{
   const ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;
   let contrast=0;
   for(let i=0;i<data.length;i+=4){
    if(Math.abs(data[i]-10)+Math.abs(data[i+1]-27)+Math.abs(data[i+2]-42)>65)contrast++;
   }
   return contrast;
  });
  if(pixelCount<2000)fail(name+'_BLANK_CANVAS');
  await page.locator('#mobileZoomIn').click();
  await page.locator('#mobileZoomOut').click();
  await page.locator('#mobileCut').click();
  if(!(await page.locator('#meta').innerText()).includes('断面'))fail(name+'_CUTAWAY');
  await page.locator('#mobileReset').click();
  await page.locator('#building').selectOption('4');
  if(!(await page.locator('#sceneTitle').innerText()).includes('E:'))fail(name+'_VARIANT_CHANGE');
  await page.screenshot({path:path.join(dir,name+'_SOURCE_RENDER.png'),fullPage:true});
  if(errors.length||requests.length)fail(name+'_JS_OR_EXTERNAL_NETWORK_'+JSON.stringify({errors,requests}));
  await context.close();
  console.log(name+'_SOURCE_RENDER_PASS',JSON.stringify({scenes:5,nonBackgroundPixels:pixelCount,
   actions:['zoomIn','zoomOut','cutaway','reset','sceneChange'],worldWrites:0,networkRequests:0}));
 }
}finally{await browser.close();}
