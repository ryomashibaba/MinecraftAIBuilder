/** B198B real offline Chromium QA of fixture-mode source previews.
 * Proves actual renderer and visual controls, NOT model prompt compliance.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198b-evidence');
const checked=(v,why)=>{if(!v)throw Error('B198B_CHROMIUM_'+why)};
const results=[],browser=await chromium.launch({
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [mode,size] of [
  ['DESKTOP',{width:1366,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const context=await browser.newContext({viewport:size,deviceScaleFactor:1});
  for(const id of ['c01','c02','r01']){
   const file=path.join(base,id,'index.html');
   checked(fs.existsSync(file),'NO_REVIEWED_SOURCE_FILE_'+id);
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(file).href,{waitUntil:'load',timeout:60000});
   await page.locator('#view').waitFor({state:'visible'});
   await page.locator('#b198b-inference-disclaimer').waitFor({state:'visible'});
   const label=await page.locator('#b198b-inference-disclaimer').innerText();
   checked(label.includes('TEST FIXTURE')&&label.includes('施工禁止'),
    mode+'_'+id+'_MISREPRESENTED_LIVE_MODEL');
   checked(await page.locator('#building option').count()===1,
    mode+'_'+id+'_SOURCE_SCENE_MISSING');
   await page.waitForTimeout(350);
   const before=await page.locator('#meta').innerText();
   const getN=s=>{const m=s.match(/表示: ([\d,]+)/);return m?Number(m[1].replaceAll(',','')):NaN};
   const initial=getN(before);
   checked(Number.isFinite(initial)&&initial>100,
    mode+'_'+id+'_REAL_3D_SURFACE_NOT_RENDERED_'+before);
   await page.screenshot({
    path:path.join(base,'B198B_'+mode+'_'+id+'_SOURCE_VIEW.png'),
    fullPage:true,timeout:60000});
   await page.locator('#cutaway').click();
   await page.waitForTimeout(350);
   const remaining=getN(await page.locator('#meta').innerText());
   checked(Number.isFinite(remaining)&&remaining<initial,
    mode+'_'+id+'_CUTAWAY_INERT_'+initial+'_'+remaining);
   await page.locator('#reset').click();
   await page.waitForTimeout(300);
   const reset=getN(await page.locator('#meta').innerText());
   checked(reset===initial,mode+'_'+id+'_RESET_DID_NOT_RESTORE_SOURCE');
   checked(errors.length===0,mode+'_'+id+'_PAGE_ERRORS_'+errors.join(';'));
   results.push({mode,id,actualSourceSurface:initial,
    cutawaySurface:remaining,resetRestoresActualSource:true,
    fixtureNotRealModel:true,jsErrors:errors});
   await page.close();
  }
  await context.close();
 }
 fs.writeFileSync(path.join(base,'B198B_CHROMIUM_FIXTURE_QA.json'),
  JSON.stringify({schema:'b198b-real-chromium-fixture-only-v1',
   results,realModelInferredFromBrowser:false,
   humanSemanticQualityCertified:false,
   worldWrites:0,readiness:'NOT_PREPARED'},null,2)+'\n');
 console.log('B198B_CHROMIUM_FIXTURE_PASS',JSON.stringify({
  scenes:results.length,
  fullyWorkingCanvasAndCutaway:results.every(r=>r.cutawaySurface<r.actualSourceSurface),
  liveLLMPerformanceCertified:false,
  worldWrites:0}));
}finally{await browser.close()}
