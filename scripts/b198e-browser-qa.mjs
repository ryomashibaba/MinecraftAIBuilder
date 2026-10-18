/** B198E real Chromium desktop+mobile verifies eight actual source 3D
 * scenes and revision controls. This only certifies rendering, never
 * the model's aesthetic judgment or full production prompt adherence.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198e-evidence');
const check=(v,s)=>{if(!v)throw Error('B198E_BROWSER_'+s)};
const browser=await chromium.launch({headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage']});
const evidence=[];
try{
 for(const [mode,viewport] of [
  ['DESKTOP',{width:1440,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1});
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.setDefaultTimeout(120000);
  await page.goto(pathToFileURL(path.join(dir,'index.html')).href,
   {waitUntil:'load',timeout:120000});
  await page.locator('#view').waitFor({state:'visible'});
  check(await page.locator('#building option').count()===8,mode+'_NOT_EIGHT_REAL_SCENES');
  check((await page.locator('#b198e-source-provenance').innerText()).includes('未認証'),
   mode+'_FALSE_CONFIDENCE_WARNING_MISSING');
  check((await page.locator('#b198e-source-provenance').innerText()).includes('APIへの'),
   mode+'_PRODUCTION_LLM_UNVERIFIED_WARNING');
  const ratingButton=page.locator('#b198e-export-score');
  await ratingButton.waitFor({state:'visible'});
  check(await ratingButton.isDisabled(),mode+'_AUTOMATIC_HUMAN_SCORE_NOT_BLOCKED');
  const cases=['c01','c03','c05','c08'];
  const pixels=async()=>page.evaluate(()=>{
   const canvas=document.getElementById('view');
   const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   let result=2166136261;
   for(let i=0;i<data.length;i+=101){
    result=Math.imul(result^data[i],16777619)>>>0;
    result=Math.imul(result^data[i+1],16777619)>>>0;
    result=Math.imul(result^data[i+2],16777619)>>>0;
   }
   return result;
  });
  for(let ci=0;ci<cases.length;ci++){
   const id=cases[ci];
   await page.locator('[data-b198e="'+id+'"]').click();
   check(await page.locator('#building').inputValue()===String(ci*2),
    mode+'_'+id+'_GENRE_NAV_BUTTON_INERT');
   await page.waitForTimeout(350);
   const before=await pixels();
   const labelBefore=await page.locator('#meta').innerText();
   const surfaceBefore=Number(labelBefore.match(/表示: ([\d,]+)/)?.[1]?.replaceAll(',',''));
   check(Number.isSafeInteger(surfaceBefore)&&surfaceBefore>250,
    mode+'_'+id+'_EMPTY_REAL_VOXEL_SCENE');
   await page.screenshot({path:path.join(dir,'B198E_'+mode+'_'+id+'_BEFORE.png'),
    fullPage:true,timeout:120000});
   await page.locator('#b198e-select-revised').click();
   check(await page.locator('#building').inputValue()===String(ci*2+1),
    mode+'_'+id+'_REVISION_BUTTON_INERT');
   await page.waitForTimeout(350);
   const after=await pixels();
   const labelAfter=await page.locator('#meta').innerText();
   const surfaceAfter=Number(labelAfter.match(/表示: ([\d,]+)/)?.[1]?.replaceAll(',',''));
   check(Number.isSafeInteger(surfaceAfter)&&surfaceAfter>250,
    mode+'_'+id+'_REVISED_3D_SOURCE_BLANK');
   check(before!==after,
    mode+'_'+id+'_NO_VISIBLE_3D_REVISION_'+before+'_'+after);
   await page.screenshot({path:path.join(dir,'B198E_'+mode+'_'+id+'_AFTER.png'),
    fullPage:true,timeout:120000});
   evidence.push({mode,case:id,actualVisibleSurfaceBefore:surfaceBefore,
    actualVisibleSurfaceAfter:surfaceAfter,sourceImageDifferent:before!==after,
    actualHumanAestheticRatingProvided:false,worldWrites:0});
  }
  // Automated form QA does NOT constitute a real human review.
  // Fill synthetic scores in the browser only to verify input gating and
  // downloaded JSON provenance. The output is NEVER committed as ratings.
  const scores=page.locator('#b198e-review-fields select');
  const evidence=page.locator('#b198e-review-fields textarea');
  check(await scores.count()>=3,mode+'_HUMAN_REVIEW_RUBRIC_FIELDS_MISSING');
  for(let i=0;i<await scores.count();i++){
   await scores.nth(i).selectOption('2');
   await evidence.nth(i).fill('自動入力テストのための根拠テキストであり、人間による品質判定ではありません。');
  }
  check(!(await ratingButton.isDisabled()),mode+'_VALIDATED_DOWNLOAD_INERT');
  const capture=page.waitForEvent('download',{timeout:120000});
  await ratingButton.click();
  const downloaded=await capture;
  check(downloaded.suggestedFilename().includes('HUMAN_RUBRIC'),
   mode+'_SCORE_FILE_EXPORT_NOT_JSON');
  const saved=path.join(dir,'B198E_'+mode+'_SYNTHETIC_FORM_QA.json');
  await downloaded.saveAs(saved);
  const fake=JSON.parse(fs.readFileSync(saved,'utf8'));
  check(fake.modelAutomaticRating===false&&
   fake.humanIdentityIndependentlyVerified===false&&
   fake.actualMinecraftWalkingCertified===false,
   mode+'_FORM_FALSIFIES_HUMAN_SCORING');
  fs.rmSync(saved,{force:true}); // no synthetic score artifact to mislead readers
  check(errs.length===0,mode+'_REAL_PAGE_JS_ERRORS_'+errs.join(';'));
  await ctx.close();
 }
 fs.writeFileSync(path.join(dir,'B198E_CHROMIUM_QA.json'),
  JSON.stringify({schema:'b198e-real-chromium-source-qa-v1',
   result:evidence,javascriptErrors:[],unattendedModelAPIInferenceValidated:false,
   productionRealTimeLLMOutputTested:false,
   beautyAndLanguageSemanticsHumanVerified:false,
   worldWrites:0,readiness:'NOT_PREPARED'},null,2)+'\n');
 console.log('B198E_REAL_CHROMIUM_RENDERING_PASS',
  JSON.stringify({checkedArchitectureGenrePairs:8,sourceImageDiffs:8,
   realLLMAPIInference:false,worldWrites:0}));
}finally{await browser.close()}
