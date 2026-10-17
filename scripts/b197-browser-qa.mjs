/** B197 focused real Chromium desktop/mobile geometry and UI QA.
 * No Minecraft connection and NO repeated 11-scene full browser traversal.
 * Earlier snapshots are frozen; verify inherited scene selector still works.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'b197-evidence'),html=path.join(dir,'index.html');
if(!fs.existsSync(html))throw Error('B197_CHROMIUM_SOURCE_PREVIEW_NOT_BUILT');
const check=(v,s)=>{if(!v)throw Error('B197_CHROMIUM_'+s)};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const result=[];
try{
 for(const mobile of [false,true]){
  const mode=mobile?'MOBILE':'DESKTOP';
  const ctx=await browser.newContext({
   viewport:mobile?{width:390,height:844}:{width:1440,height:900},
   deviceScaleFactor:1});
  const page=await ctx.newPage();page.setDefaultTimeout(60000);
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(pathToFileURL(html).href,{waitUntil:'load',timeout:60000});
  await page.locator('#view').waitFor({state:'visible'});
  check((await page.locator('#building option').count())===13,mode+'_SOURCE_SCENES_NOT_13');
  const pixels=async()=>page.evaluate(()=>{
   const c=document.getElementById('view'),t=c.getContext('2d'),d=t.getImageData(0,0,c.width,c.height).data;
   let hash=2166136261,painted=0;
   for(let i=0;i<d.length;i+=388){
    const n=d[i]+d[i+1]*3+d[i+2]*7;
    hash=Math.imul(hash^n,16777619)>>>0;
    if(n>95)painted++;
   }return {hash,painted};
  });
  const legacy=await page.locator('#building').inputValue();
  check(legacy==='11',mode+'_UPGRADED_MAIN_NOT_DEFAULT');
  await page.locator('#b197-open-main').click();
  check(await page.locator('#building').inputValue()==='11',
   mode+'_ACTUAL_MAIN_UPGRADE_BUTTON_INERT');
  check((await page.locator('#sceneTitle').innerText()).includes('B197 NEBULA ARK'),
   mode+'_UPGRADED_MAIN_SOURCE_SCENE_WRONG');
  await page.waitForTimeout(750);
  const main=await pixels();
  check(main.painted>1500,mode+'_EMPTY_REAL_MAIN_GEOMETRY_'+main.painted);
  await page.screenshot({path:path.join(dir,'B197_'+mode+'_UPGRADED_MAIN.png'),
   timeout:60000,fullPage:true});
  await page.locator('#building').selectOption('0');
  await page.waitForTimeout(550);
  const old=await pixels();
  check(old.painted>1500,mode+'_HISTORIC_SOURCE_MAIN_INVISIBLE');
  check(old.hash!==main.hash,mode+'_GEOMETRY_UPDATE_NO_VISIBLE_DIFFERENCE');
  await page.screenshot({path:path.join(dir,'B197_'+mode+'_B188_BEFORE.png'),
   timeout:60000,fullPage:true});
  await page.locator('#b197-open-updated-city').click();
  check(await page.locator('#building').inputValue()==='12',
   mode+'_UPDATED_FIVE_MODEL_PREVIEW_BUTTON_INERT');
  check((await page.locator('#sceneTitle').innerText()).includes('B197'),
   mode+'_UPDATED_CITY_SCENE_TITLE');
  await page.waitForTimeout(850);
  const city=await pixels();
  check(city.painted>1500,mode+'_UPDATED_CITY_VIEW_INVISIBLE');
  await page.screenshot({path:path.join(dir,'B197_'+mode+'_UPDATED_FIVE_CITY.png'),
   timeout:60000,fullPage:true});
  check((await page.locator('#b197-grand-hollow-panel').innerText()).includes('NOT_PREPARED'),
   mode+'_NO_SOURCE_ONLY_WARNING');
  check(errs.length===0,mode+'_JAVASCRIPT_ERRORS_'+errs.join(' / '));
  result.push({mode,sourceScenes:13,
   mainRenderedPixelSamples:main.painted,
   oldRenderedPixelSamples:old.painted,
   differentMainImageHash:old.hash!==main.hash,
   updatedCityRenderedPixelSamples:city.painted,jsErrors:errs});
  await ctx.close();
 }
 fs.writeFileSync(path.join(dir,'B197_CHROMIUM_QA.json'),
  JSON.stringify({schema:'b197-browser-qa',result,worldContacts:0,worldWrites:0},null,2)+'\n');
 console.log('B197_CHROMIUM_PASS',JSON.stringify(result));
}finally{await browser.close();}
