/** Real desktop/mobile Chromium drives source-only human approval UX.
 * All model replies are explicitly fixture only, never actual LLM inference.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startB198DLocalStudio}
 from '../source/ai/b198d-local-review-server.mjs';
import {fixtureAmphitheater,candidate} from './b198a-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../b198d-evidence');
fs.mkdirSync(root,{recursive:true});
const check=(x,why)=>{if(!x)throw Error('B198D_CHROMIUM_'+why)};
const revise=()=>{
 const d=fixtureAmphitheater();
 d.elements.push({id:'studio-new-source-terrace',
  shape:'box',mode:'add',origin:[44,32,37],size:[6,1,5],
  material:'accent'});
 return d;
};
const browser=await chromium.launch({
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const result=[];
try{
 for(const [label,size] of [
  ['DESKTOP',{width:1365,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b198d-chrome-'));
  const app=await startB198DLocalStudio({
   projectDirectory:dir,initialDesign:fixtureAmphitheater(),
   generator:async()=>candidate(revise())});
  try{
   const ctx=await browser.newContext({
    viewport:size,deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.setDefaultTimeout(60000);
   await page.goto(app.url,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('v0001'));
   check((await page.locator('#building option').count())===1,
    label+'_INITIAL_APPROVED_SCENE_NOT_REAL');
   await page.screenshot({path:path.join(root,'B198D_'+label+'_ORIGINAL.png'),
    fullPage:true,timeout:60000});
   await page.locator('#b198d-request').fill(
    'Enlarge the elevated observation terrace of the theater and keep the original stone plaza and audience levels unchanged.');
   await page.locator('#b198d-propose').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認待ち あり'));
   check((await page.locator('#building option').count())===2,
    label+'_SOURCE_DRAFT_COMPARISON_MISSING');
   const comparison=page.locator('#b198d-comparison');
   await comparison.waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('#b198d-after-image')?.getAttribute('src')?.startsWith('data:image/png;base64,'));
   const before=await page.locator('#b198d-before-image').getAttribute('src');
   const after=await page.locator('#b198d-after-image').getAttribute('src');
   check(before!==after,label+'_DUAL_3D_SOURCE_IMAGES_IDENTICAL');
   await page.locator('#building').selectOption('1');
   await page.waitForTimeout(350);
   check((await page.locator('#sceneTitle').innerText()).includes('DRAFT'),
    label+'_UNAPPROVED_MODEL_NOT_VISIBLE');
   await page.screenshot({path:path.join(root,'B198D_'+label+'_PENDING.png'),
    fullPage:true,timeout:60000});
   const notYet=await(await fetch(app.url+'/api/status')).json();
   check(notYet.headId==='v0001'&&notYet.approvedDesign.elements.length===8,
    label+'_AUTO_APPROVAL_SECURITY_BREACH');
   await page.locator('#b198d-reject').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認待ち なし'));
   check((await page.locator('#building option').count())===1,
    label+'_REJECT_DID_NOT_RESTORE_ORIGINAL');
   await page.locator('#b198d-request').fill(
    'Please add a new upper outward-looking terrace but preserve all existing public floor structure.');
   await page.locator('#b198d-propose').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認待ち あり'));
   await page.locator('#b198d-approve').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認済み v0002'));
   check((await page.locator('#building option').count())===1,
    label+'_APPROVED_STILL_DISPLAYED_AS_UNAPPROVED_DRAFT');
   const approved=await(await fetch(app.url+'/api/status')).json();
   check(approved.approvedDesign.elements.length===9,
    label+'_HUMAN_APPROVED_REAL_SOURCE_NOT_COMMITTED');
   await page.screenshot({path:path.join(root,'B198D_'+label+'_APPROVED.png'),
    fullPage:true,timeout:60000});
   await page.locator('#b198d-undo').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認済み v0001'));
   check((await(await fetch(app.url+'/api/status')).json()).approvedDesign.elements.length===8,
    label+'_UNDO_NOT_REALLY_REVERTED');
   await page.locator('#b198d-redo').click();
   await page.waitForFunction(()=>document.querySelector('#b198d-summary')?.textContent.includes('承認済み v0002'));
   check((await(await fetch(app.url+'/api/status')).json()).approvedDesign.elements.length===9,
    label+'_REDO_NOT_REALLY_RESTORED');
   check(errors.length===0,label+'_JAVASCRIPT_ERRORS_'+errors.join(' / '));
   result.push({label,realUserDrivenPropose:true,
    humanApproveAndRejectControls:true,
    historyUndoRedo:true,
    source3dBeforeAfterSideBySide:true,
    modelInferenceActuallyTested:false,
    worldWrites:0,javascriptErrors:errors});
   await ctx.close();
  }finally{
   await app.close();fs.rmSync(dir,{recursive:true,force:true});
  }
 }
 fs.writeFileSync(path.join(root,'B198D_CHROMIUM_QA.json'),
  JSON.stringify({schema:'b198d-real-browser-local-fixture-v1',
   desktopAndMobile:result,realLLMIntelligenceProven:false,
   realMinecraftWalkingCertified:false,worldWrites:0,
   readiness:'NOT_PREPARED'},null,2)+'\n');
 console.log('B198D_REAL_CHROMIUM_FIXTURE_PASS',JSON.stringify(result));
}finally{await browser.close()}
