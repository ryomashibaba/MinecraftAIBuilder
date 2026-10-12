/** B109 real Chromium smoke review of generated stand-alone HTML.
 * Uses playwright-core (test-only); never loads Minecraft or sends world commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const root=path.resolve(process.argv[2]??'b109-preview-output'),
 htmlPath=path.join(root,'B109_Cohesive_Architecture_15_Buildings.html');
if(!fs.existsSync(htmlPath))throw Error('B109_HTML_MISSING');
const executable=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
 '/usr/bin/chromium','/usr/bin/chromium-browser'].find(x=>x&&fs.existsSync(x));
if(!executable)throw Error('B109_CHROME_NOT_FOUND__REAL_BROWSER_QA_REQUIRED');
const browser=await chromium.launch({headless:true,executablePath:executable,
 args:['--no-sandbox','--disable-dev-shm-usage']});
const report={schema:'minecraftaibuilder-b109-real-chromium-qa-v1',
 browserExecutable:path.basename(executable),variants:[],failures:[],shots:[],
 worldContacts:0,constructionApproved:false,
 humanAestheticApproval:false,sourceRef:'B109_OFFLINE_HTML_REVIEW'};
const dir=path.resolve('b109-browser-output');fs.mkdirSync(dir,{recursive:true});
let page;
try{
 page=await browser.newPage({viewport:{width:1380,height:850},deviceScaleFactor:1});
 page.on('pageerror',err=>report.failures.push(String(err)));
 const requests=[];
 page.on('request',r=>requests.push(r.url()));
 const source=fs.readFileSync(htmlPath,'utf8');
 await page.setContent(source,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__B109_QA?.snapshot().rendered.includes('面描画'),
  null,{timeout:60000});
 assert.equal(await page.locator('#building option').count(),15);
 const meta=await page.evaluate(()=>window.__B109_QA.data());
 assert.deepEqual(meta,{buildings:15,constructionApproved:false,worldContacts:0});
 const first=await page.evaluate(()=>window.__B109_QA.snapshot());
 assert(!first.layers.includes('ROOM_FLOOR_TRACE'),'Exterior defaults must hide technical floor trace');
 assert(!first.layers.includes('GALLERY_FLOOR_TRACE'),'Exterior defaults must hide technical gallery trace');
 assert(!first.layers.includes('EXTERIOR_PORTAL_VOID_PROXY'),'Exterior defaults must hide air ghosts');
 assert(first.layers.includes('COHESIVE_ROOF'));
 assert(first.layers.includes('COHESIVE_FACADE'));
 assert(!first.layers.includes('FACADE_PANEL_PROXY'));
 assert(!first.layers.includes('ROOF_FORM'));
 for(let i=0;i<15;i++){
  const candidate=await page.locator('#building option').nth(i).textContent();
  const id=candidate.split(' / ').at(-1).trim();
  await page.selectOption('#building',String(i));
  await page.waitForFunction(expected=>window.__B109_QA?.snapshot().building===expected&&
    window.__B109_QA.snapshot().rendered.includes('面描画'),id,{timeout:60000});
  // request a new frame and let browser flush canvas
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const snap=await page.evaluate(()=>window.__B109_QA.snapshot());
  const pixels=await page.evaluate(()=>{
   const c=document.querySelector('canvas'),ctx=c.getContext('2d'),
    im=ctx.getImageData(0,0,c.width,c.height),colors=new Set();
   for(let i=0;i<im.data.length;i+=Math.max(4,Math.floor(im.data.length/3200/4)*4)){
    colors.add(im.data[i]+','+im.data[i+1]+','+im.data[i+2]);
   }
   return {unique:colors.size,width:c.width,height:c.height};
  });
  assert(pixels.unique>6,'Nearly blank canvas '+id);
  assert(snap.frameMs>0&&Number.isFinite(snap.frameMs)&&snap.frameMs<12000,
   'Frame rendering slow / blocked '+id+': '+snap.frameMs);
  assert(snap.source.visualPrimitiveReductionVsOriginal>0,'Model primitive count not reduced: '+id);
  report.variants.push({id,frameMs:snap.frameMs,sourcePrimitivesSaved:snap.source.visualPrimitiveReductionVsOriginal,uniqueSampleColors:pixels.unique,
   visibleLayers:snap.layers.length});
  if(i%3===0){
   const f=path.join(dir,'B109_'+id+'_exterior.png');
   await page.locator('#view').screenshot({path:f});
   report.shots.push(path.basename(f));
  }
 }
 // Check cutaway, full exterior, yaw/pitch and zoom are real interactive controls.
 await page.click('#interior');
 let s=await page.evaluate(()=>window.__B109_QA.snapshot());
 assert.equal(s.allFloors,false);
 assert(s.layers.includes('ROOM_FLOOR_TRACE'));
 assert(!s.layers.includes('COHESIVE_ROOF'));
 await page.locator('#view').screenshot({path:path.join(dir,'B109_library_interior_cut.png')});
 report.shots.push('B109_library_interior_cut.png');
 await page.click('#exterior');
 s=await page.evaluate(()=>window.__B109_QA.snapshot());
 assert.equal(s.allFloors,true);
 assert(s.layers.includes('COHESIVE_ROOF'));
 assert(!s.layers.includes('ROOM_FLOOR_TRACE'));
 const bounds=await page.locator('#view').boundingBox();
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width/2+110,bounds.y+bounds.height/2+44,{steps:5});
 await page.mouse.up();
 const moved=await page.evaluate(()=>window.__B109_QA.snapshot());
 assert(Math.abs(moved.yaw-s.yaw)>.05);
 await page.locator('#view').hover();
 await page.mouse.wheel(0,-250);
 await page.waitForTimeout(50);
 const zoomed=await page.evaluate(()=>window.__B109_QA.snapshot());
 assert(zoomed.zoom>moved.zoom);
 // Narrow mobile viewport must render real geometry, not error.
 await page.setViewportSize({width:390,height:780});
 await page.waitForTimeout(100);
 assert((await page.locator('#view').boundingBox()).width>300);
 await page.locator('#view').screenshot({path:path.join(dir,'B109_mobile_review.png')});
 report.shots.push('B109_mobile_review.png');
 assert.equal(requests.length,0,'Standalone offline HTML attempted external requests');
 assert.equal(report.failures.length,0,report.failures.join('\n'));
 report.passed=true;
 console.log('B109 PASS real Chromium: 15/15 render, cutaway, exterior, orbit/zoom, mobile, zero page errors/requests');
 console.log(JSON.stringify({maxFrameMs:Math.max(...report.variants.map(x=>x.frameMs)),
  minFrameMs:Math.min(...report.variants.map(x=>x.frameMs)),shots:report.shots},null,2));
}finally{
 await browser.close();
 fs.writeFileSync(path.join(dir,'B109_Chromium_Browser_QA.json'),JSON.stringify(report,null,2)+'\n');
}
