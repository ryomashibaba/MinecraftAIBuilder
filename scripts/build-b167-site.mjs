/**
 * B167 reproducible 36-model route-study page. New value is a single-body,
 * joined 1x1 path certificate. Reuse B166 3D geometry without inventing a
 * 37th "new building" that would contain identical voxel structure.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,renderB143Html} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign} from './build-b153-site.mjs';
import {readBypassDesign} from './build-b154-site.mjs';
import {readInterchangeR0,readInterchangeR1} from './build-b155-site.mjs';
import {readHeliosR0} from './build-b158-site.mjs';
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB166Bundle,verifyB166Site} from './build-b166-site.mjs';
import {auditUnifiedJourneys,verifyUnifiedJourneys}
 from '../source/ai/b167-unified-journey.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');
const sha=t=>createHash('sha256').update(t).digest('hex');
const ok=(v,k)=>{if(!v)throw Error('B167_SITE_'+k)};
export function makeB167Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const old=makeB166Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const result=auditUnifiedJourneys(doppler),r=result.report;
 ok(verifyUnifiedJourneys(doppler,r)&&r.fullyUnifiedWings.join(',')==='north,south'&&
  r.missingLowerAccessWings.length===0&&
  r.wingRoutes.map(x=>x.lower1x1Moves).join(',')==='11,142'&&
  r.wingRoutes.map(x=>x.full1x1Moves).join(',')==='74,228'&&
  r.wingRoutes.map(x=>x.stair1x1Moves).join(',')==='15,15'&&
  r.wingRoutes.map(x=>x.upper2x2Moves).join(',')==='48,71'&&
  r.wingRoutes.every(x=>x.exactSame1x1FootprintEveryStep&&
    x.MinecraftEntityPhysicsCertified===false&&
    x.fullJourney2x2Certified===false)&&
  r.constructionApproved===false&&r.BuildPlan.operations.length===0,
  'CONTINUOUS_PATH_NOT_VERIFIED');
 const scenes=old.gallery.scenes.slice();
 const last=scenes.at(-1);
 ok(last.id==='doppler-orbital-crown-navigation-network','OLD_MODEL_CHANGED');
 scenes[scenes.length-1]={...last,completeJourneys:r.wingRoutes,
  joinedJourneyReview:r};
 const gallery={...old.gallery,scenes};
 ok(gallery.scenes.length===36&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0&&
  old.gallery.sourceHashes.join()===gallery.sourceHashes.join()&&
  old.gallery.geometryHashes.join()===gallery.geometryHashes.join(),
  'SOURCE_GALLERY_MUST_STAY_IDENTICAL');
 return {old,analysis:result,gallery,worldWrites:0,constructionApproved:false};
}
export function renderB167Html(b,template){
 ok(b?.gallery?.scenes.length===36,'SCENES');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B167 / COMPLETE PASSAGE VERIFICATION')
  .replace('B143 AI Architecture Studio','B167 Whole Journey Studio')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 下層から上階まで一続きの経路')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '新しい建築モデルを水増しせず、B166までの36モデルの実体を保持して、1×1の同一幅で下層→階段→上層を一続きに移動できるかを検証します。');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(mark),'CONTROL_HOOK');
 html=html.replace(mark,
  '<div class="info"><strong>B167：通行領域を統一した全行程レビュー</strong><p>同じスタートから北翼へ74移動、南翼へ228移動の1×1経路を検出。階段と上層を別々に証明するのではなく、接合した全セル経路を通しで検証しました。</p><p>元の上層2×2経路も保持していますが、「階段も2×2で登れる」とは主張しません。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b167-route" checked> 南北の全行程経路を表示</label>'+
  '<div id="b167-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。1×1のボクセル経路が存在してもMinecraft実機物理・転落安全・荷重・2×2全行程は未認証です。</div>'+mark);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const j=s.joinedJourneyReview;',
  ' el("b167-status").textContent=j?',
  '  "北翼：1×1全行程"+j.wingRoutes[0].full1x1Moves+"移動、南翼："+j.wingRoutes[1].full1x1Moves+"移動。下層から上階まで同一1×1幅を維持。2×2全行程・実機物理は未認証。":',
  '  "36番目を選択すると、全行程の接続状況を表示します。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' if(el("b167-route").checked&&s.completeJourneys){',
  '  const colors=["#adf6e1","#ffd18f"];',
  '  s.completeJourneys.forEach((journey,i)=>{',
  '   const path=journey.full1x1Path;if(!path?.length)return;',
  '   ctx.save();ctx.strokeStyle=colors[i];ctx.lineWidth=3;ctx.lineJoin="round";',
  '   ctx.beginPath();path.forEach((p,j)=>{const q=project(p[0]+.5,p[1]+.2,p[2]+.5);',
  '    if(j===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '   });ctx.stroke();ctx.restore();',
  '  });',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const listener='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(listener),'LISTENER');
 html=html.replace(listener,listener+'\nel("b167-route").addEventListener("change",drawSoon);');
 const start='\nsetScene();\n</script>';
 ok(html.includes(start),'INIT');
 html=html.replace(start,'\nindex=35;select.value="35";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'STATIC_ONLY');
 return html;
}
const H='<div id="b167-journey-nav" style="padding:12px 24px;background:#234650;color:#f0fff7"><strong>B167:</strong> 南北の下層→階段→上層を通した経路表示 → <a style="color:#baffed" href="./ai/whole-journey/">36モデルの経路レビュー</a>（施工なし）</div>';
const A='<div id="b167-journey-nav" class="info"><strong>B167:</strong> 1×1同一幅の立体移動経路 → <a style="color:#baffed" href="./whole-journey/">全行程レビュー</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),v=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(v);fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
}
export function writeB167Site(b,dir=SITE){
 verifyB166Site(dir);
 const html=renderB167Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/whole-journey'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/whole-journey/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b167-journey-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b167-journey-nav"'),'UNSAFE_NAV');
 home=home.replace('</header>','</header>'+H);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+A);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=sha(home));
 for(let i=143;i<=166;i++){
  const file='B'+i+'_MANIFEST.json';
  if(fs.existsSync(path.join(dir,file)))edit(dir,file,m=>{
   m.rootSha256=sha(home);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const old=JSON.parse(read(dir,'B166_MANIFEST.json')),p=b.analysis.report;
 const manifest={
  schema:'minecraftaibuilder-b167-unified-routes-v1',
  sceneCount:36,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  unifiedReportSha256:p.sha256,sourceSha256:p.sourceSha256,
  connectedWings:p.fullyUnifiedWings,
  lowerDistances:p.wingRoutes.map(x=>x.lower1x1Moves),
  fullDistances:p.wingRoutes.map(x=>x.full1x1Moves),
  stairMoves:p.wingRoutes.map(x=>x.stair1x1Moves),
  upperDistances:p.wingRoutes.map(x=>x.upper2x2Moves),
  journey2x2Reachable:p.wingRoutes.map(x=>x.wholeJourney2x2GridReachable),
  pageSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),
  inheritedB141Sha256:old.inheritedB141Sha256,
  actualMinecraftStepCertified:false,
  wholeJourney2x2Certified:false,constructionApproved:false,
  worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B167_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB167Site(dir))===JSON.stringify(manifest),'POSTWRITE');
 return manifest;
}
export function verifyB167Site(dir=SITE){
 verifyB166Site(dir);
 const b=makeB167Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B167_MANIFEST.json')),
  prior=JSON.parse(read(dir,'B166_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/whole-journey/index.html'),p=b.analysis.report;
 ok(m.schema==='minecraftaibuilder-b167-unified-routes-v1'&&
  m.sceneCount===36&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.unifiedReportSha256===p.sha256&&m.sourceSha256===p.sourceSha256&&
  m.connectedWings.join()==='north,south'&&
  m.lowerDistances.join()==='11,142'&&m.fullDistances.join()==='74,228'&&
  m.stairMoves.join()==='15,15'&&m.upperDistances.join()==='48,71'&&
  m.journey2x2Reachable.join()===p.wingRoutes.map(x=>x.wholeJourney2x2GridReachable).join()&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB167Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(home)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===prior.inheritedB141Sha256&&
  m.actualMinecraftStepCertified===false&&
  m.wholeJourney2x2Certified===false&&m.constructionApproved===false&&
  m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b167-journey-nav"')&&
  ai.includes('id="b167-journey-nav"')&&html.includes('id="b167-route"'),
  'REPLAY_OR_WORLD_GATE');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB167Site(),null,2));
  else{
   const b=makeB167Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
    readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB167Site(b)},null,2));
  }
 }catch(e){console.error('B167_HOLD',e.message);process.exitCode=1;}
}
