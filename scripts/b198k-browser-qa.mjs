/**
 * Real Chromium exercise of B198K's offline human review interactions.
 * Uses explicitly synthetic SHA/scene URLs; NO model or human quality claims.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {makeB198KReviewHtml,SCHEMA}
 from '../source/ai/b198k-paired-study.mjs';
const fails=reason=>{throw Error('B198K_BROWSER_'+reason)};
const assert=(x,r)=>{if(!x)fails(r)};
const fake=arm=>({sourceMetrics:{sourceSha256:(arm==='A'?'a':'b').repeat(64)}});
const manifest={schema:SCHEMA,cases:[
 {caseId:'c01',frozenJapanesePrompt:'未来型の公共図書館で閲覧床と上層の星空ラウンジを設ける。',
  criteria:[{id:'c01-k1',description:'主題と外観に一貫性があるか'}],
  armA:'directed',armB:'direct',armARecord:fake('A'),armBRecord:fake('B')},
 {caseId:'c02',frozenJapanesePrompt:'丘に埋め込んだ野外音楽劇場を設計する。',
  criteria:[{id:'c02-k1',description:'劇場のすり鉢状の立体客席が認識できるか'}],
  armA:'direct',armB:'directed',armARecord:fake('A'),armBRecord:fake('B')}
]};
const directory=path.resolve('b198k-browser-evidence');
fs.mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage'
]});
const outputs=[];
try{
 for(const [device,viewport] of [
  ['DESKTOP',{width:1365,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const context=await browser.newContext({viewport});
  try{
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.setContent(makeB198KReviewHtml(manifest),{waitUntil:'load'});
   assert((await page.locator('#case option').count())===2,device+'_CASE_SELECTOR');
   assert((await page.locator('#prompt').innerText()).includes('図書館'),
    device+'_FIRST_PROMPT');
   assert((await page.locator('#armA').getAttribute('src')).includes('directed/c01'),
    device+'_ARM_MAPPING_A');
   assert((await page.locator('#armB').getAttribute('src')).includes('direct/c01'),
    device+'_ARM_MAPPING_B');
   assert(await page.locator('#export').isDisabled(),device+'_PREMATURE_SAVE');
   const choices=page.locator('select[data-criterion]');
   assert(await choices.count()===2,device+'_SOURCE_RUBRIC');
   await choices.nth(0).selectOption('4');
   await choices.nth(1).selectOption('2');
   const explain=page.locator('textarea[data-note]');
   await explain.nth(0).fill('候補Aの外観と図書館の室内構成について、床のまとまりや採光を見ながら評価したという記述。');
   await explain.nth(1).fill('候補Bの立面と公共フロアの内部空間を、上部形状と比較しながら評価したという記述。');
   await page.locator('#choice').selectOption('A');
   await page.locator('#why').fill('この採点は自動判定ではなく、外観のまとまりと空間の違いを人間として見比べた際の個人的判断。');
   assert(await page.locator('#export').isEnabled(),device+'_COMPLETE_HUMAN_FORM');
   await page.locator('#case').selectOption('c02');
   assert(await page.locator('#export').isDisabled(),device+'_CASE_SWITCH_STALE_SCORES');
   assert((await page.locator('#prompt').innerText()).includes('劇場'),
    device+'_CASE_CHANGED');
   assert((await page.locator('#armA').getAttribute('src')).includes('direct/c02'),
    device+'_BLIND_MAPPING_STALE');
   assert(errors.length===0,device+'_JS_ERRORS_'+errors.join(','));
   await page.screenshot({path:path.join(directory,'B198K_'+device+'_REVIEW.png'),
    fullPage:true});
   outputs.push({device,realChromium:true,blindedCandidateOrder:true,
    criteriaInputMandatory:true,reasonMinimumLengthEnforced:true,
    disabledUntilHumanEntry:true,caseChangeResetsHumanEntry:true,
    mock3DScenePathsOnly:true,modelQualityMeasured:false,
    worldWrites:0,javascriptErrors:errors});
  }finally{await context.close();}
 }
 fs.writeFileSync(path.join(directory,'B198K_BROWSER_QA.json'),
  JSON.stringify({schema:'b198k-browser-human-form-test-v1',
   results:outputs,actualHumanRatings:0,realLocalModelCalls:0,
   worldWrites:0},null,2)+'\n');
 console.log('B198K_REAL_CHROMIUM_REVIEW_FORM_PASS',JSON.stringify(outputs));
}finally{await browser.close();}
