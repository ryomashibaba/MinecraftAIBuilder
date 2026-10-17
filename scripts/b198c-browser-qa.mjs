/** Actual Chrome desktop/mobile confirms 2 source-compiled scenes and
 * working user switches. Fixture only: NOT actual AI inference.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198c-evidence');
const pageUrl=pathToFileURL(path.join(root,'BEFORE_AFTER_SOURCE_PREVIEW/index.html')).href;
const test=(v,m)=>{if(!v)throw Error('B198C_CHROMIUM_'+m)};
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage']});
const entries=[];
try{
 for(const [label,viewport] of [
  ['DESKTOP',{width:1400,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1});
  const page=await ctx.newPage();page.setDefaultTimeout(60000);
  const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
  await page.goto(pageUrl,{waitUntil:'load',timeout:60000});
  await page.locator('#view').waitFor({state:'visible'});
  const notice=await page.locator('#b198c-warning').innerText();
  test(notice.includes('TEST DOUBLE')&&notice.includes('未認証'),
   label+'_MODEL_FIXTURE_LABELED_INCORRECTLY');
  test((await page.locator('#building option').count())===2,
   label+'_NOT_TWO_ACTUAL_SOURCE_MODELS');
  await page.waitForTimeout(600);
  const count=async()=>Number((await page.locator('#meta').innerText())
   .match(/表示: ([\d,]+)/)?.[1]?.replaceAll(',',''));
  const old=await count();
  test(Number.isFinite(old)&&old>100,label+'_OLD_MODEL_NOT_RENDERED');
  await page.screenshot({path:path.join(root,'B198C_'+label+'_BEFORE.png'),
   fullPage:true,timeout:60000});
  await page.locator('#building').selectOption('1');
  await page.waitForTimeout(700);
  const later=await count();
  test(Number.isFinite(later)&&later>old,
   label+'_NEW_SOURCE_BRIDGE_NOT_RENDERED_'+old+'_'+later);
  await page.screenshot({path:path.join(root,'B198C_'+label+'_AFTER.png'),
   fullPage:true,timeout:60000});
  await page.locator('#cutaway').click();
  await page.waitForTimeout(350);
  test(await count()<later,label+'_SOURCE_CUTAWAY_INERT');
  await page.locator('#reset').click();
  await page.waitForTimeout(350);
  test(await count()===later,label+'_RESET_DID_NOT_RESTORE');
  test(jsErrors.length===0,label+'_JS_ERRORS_'+jsErrors.join(';'));
  entries.push({label,renderedBefore:old,renderedAfter:later,
   genuinelyDifferentVisibleSourceGeometry:true,controlsPass:true,
   javascriptErrors:jsErrors,modelReasoningTested:false});
  await ctx.close();
 }
 fs.writeFileSync(path.join(root,'B198C_CHROMIUM_QA.json'),
  JSON.stringify({schema:'b198c-chromium-fixture-only-v1',entries,
   actualModelReasoningCertified:false,realMinecraftWalkingCertified:false,
   worldWrites:0,readiness:'NOT_PREPARED'},null,2)+'\n');
 console.log('B198C_REAL_CHROMIUM_QA_PASS',JSON.stringify(entries));
}finally{await browser.close()}
