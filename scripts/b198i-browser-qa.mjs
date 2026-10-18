/**
 * B198I actual Chromium review of the new planned-source → Studio pipeline.
 * Independent TEST-DOUBLE model output; actual B143 voxels are rasterized
 * in a browser. This NEVER establishes quality of a real local model.
 */
import {chromium} from 'playwright';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {SCHEMA as B143} from '../source/ai/b143-building-dsl.mjs';
import {PLAN_SCHEMA} from '../source/ai/b198i-design-director.mjs';
import {parseB198HArgs,executeB198H} from './b198h-local-workflow.mjs';

const out=path.resolve('b198i-browser-evidence');
fs.mkdirSync(out,{recursive:true});
const yes=(ok,why)=>{if(!ok)throw Error('B198I_CHROMIUM_'+why)};
const original=()=>({
 schema:B143,id:'b198i-preview-library',
 title:'B198I SOURCE-ONLY civic architecture original',
 brief:'Source backed independent geometric viewer proof, not real model design.',
 bounds:{width:36,height:18,depth:36},designOnly:true,
 elements:[
  {id:'public-floor',shape:'box',mode:'add',material:'stone',
   origin:[3,2,3],size:[29,1,29]},
  {id:'glass-feature-roof',shape:'box',mode:'add',material:'glass',
   origin:[8,13,8],size:[20,1,20]}
 ]
});
const changed=()=>{
 const d=original();
 d.elements.push({id:'new-visible-upper-terrace',
  shape:'box',mode:'add',material:'accent',
  origin:[24,8,25],size:[7,1,6]});
 return d;
};
const plan=()=>({
 schema:PLAN_SCHEMA,id:'b198i-preview-library',title:'Civic library',
 designIntent:'明るい閲覧床を持ち、中央に開放的な大きい空洞を作る。',
 visualDirection:'平面の大きい読書床と浮遊する透明な屋根を組み合わせる。',
 bounds:{width:36,height:18,depth:36},
 zones:[
  {id:'public-hall',name:'公共閲覧室',purpose:'市民が通行できる幅の広い公共閲覧床を設ける'},
  {id:'central-void',name:'中央吹き抜け',purpose:'屋根までつながる大きな空気空間を確保する'},
  {id:'upper-gallery',name:'高層展示回廊',purpose:'複数人が歩ける回廊を持つ上部ギャラリー'}
 ],
 anchors:[
  {id:'floor-a',zoneId:'public-hall',point:[7,2,7],
   expect:'SUPPORTED_FLOOR',purpose:'主な公共閲覧床を確保する'},
  {id:'floor-b',zoneId:'public-hall',point:[18,2,18],
   expect:'SUPPORTED_FLOOR',purpose:'中心部に十分な閲覧床を確保する'},
  {id:'roof-a',zoneId:'upper-gallery',point:[10,13,10],
   expect:'SOLID',purpose:'独立した上層の屋根を形成する'},
  {id:'void-a',zoneId:'central-void',point:[15,8,15],
   expect:'AIR',purpose:'中央に高さを持つ空洞を保つ'},
  {id:'void-b',zoneId:'central-void',point:[15,10,15],
   expect:'AIR',purpose:'二層以上の空気が続くようにする'}
 ]
});
const p='巨大な公共図書館。明るい閲覧床、中央の吹き抜け、透明な屋根を備える。';
const browser=await chromium.launch({
 headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const [device,view] of [
  ['DESKTOP',{width:1365,height:900}],
  ['MOBILE',{width:390,height:844}]
 ]){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b198i-director-chromium-'));
  const opts=parseB198HArgs(['studio','--project',path.join(tmp,'studio'),
   '--prompt',p,'--local-model','B198I_FIXTURE_NOT_REAL_MODEL','--directed']);
  const app=await executeB198H(opts,{
   planner:async()=>plan(),
   generator:async args=>({
    design:args.mode==='creation'?original():changed(),
    explanation:'TEST DOUBLE only. Architectural quality not verified.',
    assumptions:[]
   })
  });
  const ctx=await browser.newContext({viewport:view,deviceScaleFactor:1});
  try{
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   page.setDefaultTimeout(60000);
   await page.goto(app.url,{waitUntil:'load',timeout:60000});
   await page.waitForFunction(()=>
    document.querySelector('#b198d-summary')?.textContent?.includes('v0001'));
   yes((await page.locator('#building option').count())===1,
    device+'_ORIGINAL_SOURCE_SCENE_MISSING');
   yes((await page.locator('#sceneTitle').innerText()).length>10,
    device+'_SOURCE_3D_TITLE_EMPTY');
   const canvas=await page.locator('#view').evaluate(c=>({
    w:c.width,h:c.height,uri:c.toDataURL('image/png')
   }));
   yes(canvas.w>0&&canvas.h>0&&canvas.uri.length>1500,
    device+'_CANVAS_NOT_RENDERED');
   await page.screenshot({path:path.join(out,'B198I_'+device+'_PLANNED_SOURCE.png'),
    fullPage:true});
   await page.locator('#b198d-request').fill(
    'Add one visible upper public observation terrace but preserve all previous public floors and roof. It must remain an unapproved source-only draft.');
   await page.locator('#b198d-propose').click();
   await page.waitForFunction(()=>
    document.querySelector('#b198d-summary')?.textContent?.includes('承認待ち あり'));
   yes((await page.locator('#building option').count())===2,
    device+'_NEW_DRAFT_SOURCE_NOT_RENDERED');
   await page.waitForFunction(()=>
    document.querySelector('#b198d-after-image')?.getAttribute('src')?.startsWith('data:image/png;base64,'));
   const before=await page.locator('#b198d-before-image').getAttribute('src');
   const after=await page.locator('#b198d-after-image').getAttribute('src');
   yes(before!==after,device+'_3D_BEFORE_AFTER_NOT_DISTINCT');
   await page.screenshot({path:path.join(out,'B198I_'+device+'_SOURCE_DRAFT.png'),
    fullPage:true});
   let state=await(await fetch(app.url+'/api/status')).json();
   yes(state.headId==='v0001'&&Boolean(state.proposedDraft),
    device+'_AUTOMATIC_SOURCE_APPROVAL');
   await page.locator('#b198d-reject').click();
   await page.waitForFunction(()=>
    document.querySelector('#b198d-summary')?.textContent?.includes('承認待ち なし'));
   state=await(await fetch(app.url+'/api/status')).json();
   yes(state.headId==='v0001'&&state.proposedDraft===null,
    device+'_REJECT_DID_NOT_RESTORE_SOURCE');
   yes(state.safety.worldWrites===0&&
     state.safety.gates.every(x=>x==='BLOCKED'),
    device+'_WORLD_SAFETY_REGRESSION');
   yes(errors.length===0,device+'_JAVASCRIPT_ERROR_'+errors.join(';'));
   results.push({device,actual3DCanvasNonempty:true,
    realSourceGeometryBeforeAndAfterDistinguishable:true,
    modelResponsesAreDeterministicTestDoubles:true,
    userApprovedSourceUnchanged:true,unapprovedDraftRejected:true,
    actualModelQualityCertified:false,realMinecraftWorldWrites:0,
    javascriptErrors:errors});
  }finally{
   await ctx.close();await app.app.close();
   fs.rmSync(tmp,{recursive:true,force:true});
  }
 }
 console.log('B198I_REAL_CHROMIUM_PLANNED_3D_SOURCE_FIXTURE_PASS',
  JSON.stringify(results));
 fs.writeFileSync(path.join(out,'B198I_CHROMIUM_REPORT.json'),
  JSON.stringify({sourceOnly:true,localModelActuallyTested:false,
   results,worldWrites:0},null,2)+'\n');
}finally{await browser.close()}
