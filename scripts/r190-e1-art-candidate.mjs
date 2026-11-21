/**
 * E1-GA: one Qwen-authored architectural/art direction revision of a
 * real SOURCE-ready research facility, with baseline locked by SHA.
 * SOURCE comparisons are evidence, NEVER automatic ART acceptance.
 * Zero world operations. No unrequested model retries or geometry repairs.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {diagnoseR190E1Plan,r190E1WindowSlotCandidates} from './r190-e1-diagnose.mjs';
import {requestLocalModel,parseStageA,selectWindow,originalSceneOccupancySha} from './r190-e1-two-stage.mjs';
import {runR190FreeEngine,r190E1MassingSignature} from './r125-r190-free-engine.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
const PALETTE=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const err=e=>String(e?.message??e).slice(0,500);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const modelPattern=/^[A-Za-z0-9._:/-]{2,140}$/;
const REVIEW=Object.freeze({
 source:'Two actual views of the E1 research facility; observational art critique, not source-test measurement',
 passed:'Three connected rooms with a usable entrance, one verified exterior glass opening, legitimate B143 scene and source-route checks',
 silhouette:'Single-height linked boxes read as a basic workshop or warehouse, with weak hierarchy and little silhouette articulation',
 roof:'Broad flat wood-colored roof masses dominate both oblique views; no meaningful section, level, or overhang composition',
 facade:'Repetitive gray wall and wood roof/floor with minimal visual hierarchy and only one small glass group',
 entrance:'Two-block entrance is functionally identifiable but visually incidental, not clearly a research-institution arrival',
 program:'Reception, collaborative work and quiet laboratory exist in metadata; external form does not clearly express their different functions',
 boundary:'The current R190 grammar is limited to connected 2–6 rooms, up to two roof forms, one facet and constrained roof/window materials; do not claim it can model unrestricted architecture',
 assessment:'SOURCE technical PASS only; human artistic verdict HOLD; Minecraft actual walking and construction untested'
});
const ARCHITECT_SYSTEM=[
 'You are an original architect creating a DIFFERENT, artistically stronger revision of your OWN real source-compiled research laboratory.',
 'You will see an immutable, technically successful architectural plan and concrete visual critique.',
 'Your task: author a coherent NEW stage-A plan that significantly improves 3D silhouette, hierarchy of arrival, differentiated scientific/workshop wings, roof / facade composition and usable functional organization.',
 'Do NOT simply rename rooms, recolor unchanged boxes, or add meaningless decorations. Choose actual changes to massing and structure.',
 'Architectural direction is YOUR choice: no canned typology, prefabricated design, user-irrelevant symmetrical box template or automatic ornament.',
 'Be mindful of the CURRENT R190 grammar: 2..6 horizontal connected rooms, one floor tree, optional real roof sections or facet and courtyard. Do not invent unsupported 3D operators or fake a second story.',
 'This is phase A: return ONE complete JSON object with NO glazedOpenings. The exterior-window audit and phase-B design choice come later.',
 'Required keys schema,id,title,brief,site,entrySpaceId,spaces,materials; schema minecraftaibuilder-r190-semantic-space-v1.',
 'id, every space.id and parentId are lower-case kebab-case matching ^[a-z][a-z0-9-]{2,39}$; no underscores.',
 'site={width,depth,height} practical 36..52,36..52,12..18; site volume <=40000.',
 'Every space has EXACT id,purpose,width,depth,height,parentId,side,privacy. 2..4 FUNCTIONALLY distinct rooms in this E1 study.',
 'Each width/depth integer 7..22. Each height integer 7..site.height-2. At least one enclosed un-faceted room height >=8 for windows.',
 'The FIRST room id equals entrySpaceId; parentId=null,side=null. Other rooms parentId=EARLIER id, side north/south/east/west, never a child at the entranceFace of entry room.',
 'All model-chosen rooms must fit the site, preserve a usable entrance approach and real portal widths. Avoid packing large wings on the same side.',
 'materials EXACT {floor,wall,roof}, each is stone or wood (existing verified Education palette only; no fake glass/cladding palette).',
 'Optional roofFormIntents: 1 or 2 separate {spaceId,profile,axis,rise}, profile ridge/shed/sawtooth. For sawtooth add toothWidth 3..8; rise integer 2..5; roof room.height+rise < site.height. No roofFormIntent and roofFormIntents together.',
 'Optional formIntent {spaceId,face,cornerInset:2..3}; do NOT apply roof or glazing on that same faceted room.',
 'Optional entranceFace, skyCourtIntent, spatialRole=open-court, tangentShift or crossConnections only if you can preserve strict source feasibility; do not invent new keys.',
 'Windows are authored at phase B from genuine exterior windows, NEVER invent glazedOpenings in this response.',
 'Privately validate all required references, clearances, roof/facet exclusions, complete site fit and composition. A technically impossible idea is not an accepted artwork.',
 'Return ONLY the NEW complete JSON object, without patches, markdown, explanations, or instructions.'
].join('\n');
const WINDOW_SYSTEM=[
 'You are the SAME architect finishing the exterior daylight composition of YOUR revised architecture.',
 'Select EXACTLY ONE SOURCE-certified exterior window slot from the supplied catalog for this bounded E1 study.',
 'The catalog is based on actual geometry and full SOURCE verification; no other position or offset is accepted.',
 'Choose for architectural composition and programmatic daylight, rather than a randomly placed hole.',
 'Output exactly {"selectedWindowSlotIds":["win-NNNN"]} with one listed slot id, or {"selectedWindowSlotIds":[]} to HOLD.',
 'Never edit room geometry, ID, roof or dimensions. No prose or unlisted keys.'
].join('\n');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=rel=>'<iframe title="'+esc(rel)+'" src="'+esc(rel)+'" loading="lazy"></iframe>';
function reviewHtml(row,baseline,hasCandidate){
 const base='baseline/index.html',cand='candidate/compiled/model/index.html';
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>E1 Art A/B — true B143 scenes</title>'+
  '<style>body{font:15px/1.55 system-ui;background:#0c1722;color:#ecf2f8;margin:20px}h1{font-size:1.4rem}h2{font-size:1rem}'+
  'main{display:grid;grid-template-columns:repeat(2,minmax(300px,1fr));gap:16px}'+
  'section{border:1px solid #37516a;border-radius:12px;padding:12px}'+
  'iframe{display:block;border:0;width:100%;height:580px;background:#0b1826}'+
  'code{overflow-wrap:anywhere}p,li{line-height:1.6}a{color:#96dfff}'+
  '@media(max-width:900px){main{grid-template-columns:1fr}}'+
  '</style></head><body><h1>E1 — 研究施設・原本対候補の直接比較（ART未審査）</h1>'+
  '<p>両方とも真正B143 SOURCE。各ビューアは独立操作です。'+
  '回転・高さ帯・ズームを手動で揃え、斜め2方向・正面・側面・上面・入口・内部の同条件で比較。'+
  'これは自動の美術PASSではありません。</p>'+
  '<main><section><h2>原本・固定基準</h2>'+img(base)+
  '<p>元SOURCE SHA: <code>'+esc(baseline.row.sourceSha256)+'</code></p></section>'+
  '<section><h2>Qwen改訂候補</h2>'+
  (hasCandidate?img(cand):'<p>候補SOURCE未成立 — HOLD。原本の技術的成功は維持されます。</p>')+
  '<p>新SOURCE SHA: <code>'+esc(row.sourceSha256??'なし')+'</code></p></section></main>'+
  '<h2>審査ポイント</h2><ol>'+
  '<li>外形に建築的な序列と意図が感じられるか。単なる箱の再配置ではないか。</li>'+
  '<li>屋根・外壁・入口が一体の構成か。意匠のために実用動線が犠牲になっていないか。</li>'+
  '<li>研究施設の3用途の違いが、外部からも読み取れるか。</li>'+
  '<li>既存の箱型・素材の限界を超える実質的改善か。無理ならART HOLDのまま次の表現系設計へ進む。</li>'+
  '</ol><p>自動結果: '+esc(row.status)+
  '。すべての技術成功・改訂原本・検査は保存されています。Minecraft未施工。</p></body></html>';
}
export function locateLatestE1ArtBaseline(outRoot=OUT){
 if(!fs.existsSync(outRoot))throw Error('E1_ART_NO_OUTPUT_ROOT');
 const choices=fs.readdirSync(outRoot,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&x.name.startsWith('E1-revise-saved-'))
  .map(x=>path.join(outRoot,x.name))
  .filter(d=>fs.existsSync(path.join(d,'E1_REVISION_REPORT.json')))
  .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 for(const c of choices){
  let rep;try{rep=read(path.join(c,'E1_REVISION_REPORT.json'));}catch{continue;}
  if(rep.schema==='r190-e1-explicit-revision-v1'&&
   rep.rows?.some(x=>x.id==='research-lab'&&x.status==='SOURCE_READY_ART_HOLD'&&x.sourceCompiled))
   return c;
 }
 throw Error('E1_ART_NO_SOURCE_READY_BASELINE');
}
/** Select a SAVED and failed E1 art attempt for a separately authorized,
 * model-authored follow-up. Never use a completed/successful candidate here.
 */
export function locateLatestE1FailedArt(outRoot=OUT){
 if(!fs.existsSync(outRoot))throw Error('E1_ART_NO_OUTPUT_ROOT');
 const dirs=fs.readdirSync(outRoot,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&x.name.startsWith('E1-art-review-'))
  .map(x=>path.join(outRoot,x.name))
  .filter(x=>fs.existsSync(path.join(x,'E1_ART_COMPARE_REPORT.json')))
  .sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 for(const dir of dirs){
  try{
   const report=read(path.join(dir,'E1_ART_COMPARE_REPORT.json'));
   if(report.schema==='r190-e1-art-compare-v1'&&
    report.row?.stageAOriginalSha256&&
    report.row?.sourceCompiled===false&&report.candidateSourceReady===false)
    return dir;
  }catch{}
 }
 throw Error('E1_ART_NO_SAVED_FAILED_CANDIDATE');
}
export function loadVerifiedE1FailedArt(directory,baseline){
 const full=path.resolve(directory),rep=read(path.join(full,'E1_ART_COMPARE_REPORT.json'));
 if(rep.schema!=='r190-e1-art-compare-v1'||rep.candidateSourceReady!==false||
   rep.row?.sourceCompiled!==false||
   typeof rep.row.stageAOriginalSha256!=='string'||
   rep.sourceBaselineSHA!==baseline.row.sourceSha256||
   rep.sourceBaselineGeometrySHA!==baseline.row.geometrySha256||
   path.resolve(rep.sourceBaselineFolder)!==baseline.dir||
   rep.worldWrites!==0)
  throw Error('E1_ART_REWORK_SOURCE_OR_STATUS_INVALID');
 const raw=fs.readFileSync(path.join(full,'candidate','MODEL_ART_A_ORIGINAL.txt'),'utf8');
 if(sha(raw)!==rep.row.stageAOriginalSha256)
  throw Error('E1_ART_REWORK_PRIOR_MODEL_ORIGINAL_SHA_MISMATCH');
 let plan=null,issues=[];
 try{plan=JSON.parse(raw);issues=diagnoseR190E1Plan(plan);}catch{}
 const cause=rep.row.reason??'UNSPECIFIED_HOLD';
 return {dir:full,raw,plan,issues,cause,report:rep,
  priorOriginalSha256:rep.row.stageAOriginalSha256};
}

export function loadVerifiedE1ArtBaseline(folder){
 const base=path.resolve(folder);
 const report=read(path.join(base,'E1_REVISION_REPORT.json'));
 const row=report.rows?.find(r=>r.id==='research-lab');
 if(report.schema!=='r190-e1-explicit-revision-v1'||
  report.worldWrites!==0||row?.sourceCompiled!==true||
  row.status!=='SOURCE_READY_ART_HOLD'||row.modelWindowSelected!==true||
  typeof row.composedPlanSha256!=='string'||typeof row.sourceSha256!=='string'||
  typeof row.geometrySha256!=='string')
  throw Error('E1_ART_BASELINE_NOT_AUTHORIZED');
 const d=path.join(base,'research-lab'),planPath=path.join(d,'MODEL_AUTHORED_EXPLICIT_COMPOSITION.json');
 const raw=fs.readFileSync(planPath,'utf8');
 if(sha(raw)!==row.composedPlanSha256)throw Error('E1_ART_BASELINE_PLAN_SHA_MISMATCH');
 const plan=JSON.parse(raw);
 validateR190SemanticPlan(plan);
 if(!Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length!==1)
  throw Error('E1_ART_BASELINE_INVALID_WINDOWS');
 const scenePath=path.join(d,'compiled','model','B143_SCENE.json');
 const scene=read(scenePath);
 if(scene.sourceSha256!==row.sourceSha256||scene.geometrySha256!==row.geometrySha256||
  !Array.isArray(scene.primitives)||scene.primitives.length===0)
  throw Error('E1_ART_BASELINE_SCENE_SHA_MISMATCH');
 const htmlPath=path.join(d,'compiled','model','index.html');
 if(!fs.existsSync(htmlPath))throw Error('E1_ART_BASELINE_VIEW_MISSING');
 const phaseA=fs.readFileSync(path.join(d,'REVISION_MODEL_ORIGINAL.txt'),'utf8');
 if(sha(phaseA)!==row.revisionOriginalSha256)
  throw Error('E1_ART_BASELINE_STAGE_A_HASH_MISMATCH');
 const phaseB=fs.readFileSync(path.join(d,'WINDOW_CHOICE_MODEL_ORIGINAL.txt'),'utf8');
 if(sha(phaseB)!==row.windowChoiceOriginalSha256)
  throw Error('E1_ART_BASELINE_STAGE_B_HASH_MISMATCH');
 return {dir:base,report,row,plan,planRaw:raw,scene,
  viewerPath:htmlPath,stageAOriginal:phaseA,stageBOriginal:phaseB};
}
function stats(plan,scene){
 const cells=scene.primitives;
 const extent=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
 const materials={};
 for(const c of cells){
  for(let k=0;k<3;k++){
   extent[0][k]=Math.min(extent[0][k],c[k]);
   extent[1][k]=Math.max(extent[1][k],c[k]);
  }
  materials[c[3]]=(materials[c[3]]??0)+1;
 }
 return {roomCount:plan.spaces.length,
  heights:plan.spaces.map(s=>({purpose:s.purpose,height:s.height,width:s.width,depth:s.depth})),
  uniqueRoomHeightCount:new Set(plan.spaces.map(s=>s.height)).size,
  roofForms:plan.roofFormIntents??(plan.roofFormIntent?[plan.roofFormIntent]:[]),
  facet:plan.formIntent??null,skyCourt:plan.skyCourtIntent??null,
  authoredWindowCount:plan.glazedOpenings?.length??0,
  voxelCount:cells.length,sourceGeometryBounds:{min:extent[0],max:extent[1]},
  materialCellCounts:materials};
}
export async function runR190E1ArtCandidate({
 baselineDir=null,failedCandidateDir=null,outRoot=OUT,model='qwen3:14b',paletteFile=PALETTE,
 maxWindowSlots=36
}={}, {request=requestLocalModel}={}){
 if(!modelPattern.test(model)||typeof request!=='function'||
  !Number.isSafeInteger(maxWindowSlots)||maxWindowSlots<1||maxWindowSlots>120)
  throw Error('E1_ART_BAD_CONFIGURATION');
 const baseline=loadVerifiedE1ArtBaseline(baselineDir??locateLatestE1ArtBaseline(outRoot));
 const previous=failedCandidateDir===null?null:
  loadVerifiedE1FailedArt(failedCandidateDir,baseline);
 fs.mkdirSync(outRoot,{recursive:true});
 const directory=fs.mkdtempSync(path.join(path.resolve(outRoot),'E1-art-review-'));
 const synthetic=request!==requestLocalModel;
 const row={id:'research-lab',status:'HOLD',reason:null,worldWrites:0,
  stageAOriginalSha256:null,stageBOriginalSha256:null,modelRequests:0,
  syntheticStageCalls:0,sourceCompiled:false,originalHumanArt:'HOLD',
  candidateHumanArt:'NOT_REVIEWED',minecraftPlayerWalking:'NOT_TESTED'};
 const baseDir=path.join(directory,'baseline'),candDir=path.join(directory,'candidate');
 fs.mkdirSync(baseDir);fs.mkdirSync(candDir);
 // Preserve original SHA evidence; report and prior source stay byte-identical.
 fs.copyFileSync(baseline.viewerPath,path.join(baseDir,'index.html'));
 save(path.join(directory,'BASELINE_PROVENANCE.json'),{
  schema:'e1-art-original-provenance-v1',originalFolder:baseline.dir,
  modelOrigin:'REAL_LOCAL_QWEN_IN_PREVIOUS_RUN',
  originalPlanSha256:baseline.row.composedPlanSha256,
  originalSourceSha256:baseline.row.sourceSha256,
  originalGeometrySha256:baseline.row.geometrySha256,
  baselineViewerCopySha256:sha(fs.readFileSync(baseline.viewerPath)),
  originalPlanAndViewerUnmodified:true,
  priorFailedCandidateDir:previous?.dir??null,
  priorFailedOriginalSha256:previous?.priorOriginalSha256??null,
  worldWrites:0});
 const basis=r190E1MassingSignature(baseline.plan);
 const baseStats=stats(baseline.plan,baseline.scene);
 save(path.join(directory,'ART_DIRECTION_BRIEF.json'),{
  schema:'e1-art-human-observation-20261031-v1',
  humanReview:REVIEW,initialShapeSignature:basis,
  priorFailedArchitecture:previous?{source:previous.dir,sha256:previous.priorOriginalSha256,
   cause:previous.cause,issues:previous.issues}:null,
  baselineStats:baseStats,architectSystem:ARCHITECT_SYSTEM,
  windowSystem:WINDOW_SYSTEM,safety:{worldWrites:0,automaticRetryCount:0,
   artAcceptance:'HUMAN_REQUIRED'}});
 try{
  const attempt=()=>{if(synthetic)row.syntheticStageCalls++;else row.modelRequests++;};
  const userA='Japanese brief: Design a visually compelling small research/prototyping institution with reception, collaborative work and quiet research functions.\n'+
   'Your actual SOURCE-compiled original stage-A architecture (frozen, you may redesign your proposed alternative):\n'+
   baseline.stageAOriginal+'\n'+
   'Objective original spatial evidence:\n'+JSON.stringify(baseStats)+'\n'+
   'Human-observed 2-view quality assessment:\n'+JSON.stringify(REVIEW)+'\n'+
   (previous?
    'YOUR PRIOR ART PROPOSAL (INVALID, AUTHOR A NEW CORRECTED COMPLETE PLAN; DO NOT DROP ITS ARTISTIC INTENTION):\n'+
     previous.raw+'\nVALIDATED REJECTION CODE:\n'+previous.cause+
     '\nDETAILED CONTRACT FAILURES:\n'+JSON.stringify(previous.issues)+
     '\nRoof safety: each roof form requires EXACT spaceId,profile,axis,rise, plus toothWidth only for sawtooth; roof on a room must NOT coexist with formIntent of the same room. Model must choose the new roof / facet relationship. Never use a host-repaired plan.\n':'')+
   'Create one NEW original architectural proposal with improved 3D form, not an unchanged or recolored copy. Return stage-A JSON with NO glazedOpenings.';
  // Exactly one explicit new plan, no hidden retries.
  const stageA=await request({stage:'ART_A',model,system:ARCHITECT_SYSTEM,
   user:userA,onAttempt:attempt,baseline:baseline.plan});
  if(typeof stageA?.raw!=='string')throw Error('E1_ART_A_MISSING_ORIGINAL');
  save(path.join(candDir,'MODEL_ART_A_ORIGINAL.txt'),stageA.raw);
  row.stageAOriginalSha256=sha(stageA.raw);
  const proposal=parseStageA(stageA.raw);
  save(path.join(candDir,'MODEL_AUTHORED_MASSING.json'),proposal);
  const proposedSig=r190E1MassingSignature(proposal);
  row.massingChanged=proposedSig!==basis;
  if(!row.massingChanged)throw Error('E1_ART_SAME_MASSING_OR_UNCHANGED_STRUCTURE');
  const catalog=r190E1WindowSlotCandidates(proposal,{
   maxSlots:maxWindowSlots,verifySource:true});
  save(path.join(candDir,'SOURCE_CERTIFIED_WINDOW_CATALOG.json'),catalog);
  row.windowCatalog={geometricallyPossible:catalog.totalPossibleSlots,
   sourceTested:catalog.testedRepresentativeSlots,
   certified:catalog.slots.length,
   sourcePreflight:catalog.sourcePreflight,
   rejectionCounts:catalog.rejectedSourceReasonCounts};
  if(catalog.sourcePreflight?.status==='HOLD')
   throw Error('E1_ART_BASE_GEOMETRY_HOLD_'+catalog.sourcePreflight.reason);
  if(!catalog.slots.length)throw Error('E1_ART_NO_CERTIFIED_WINDOWS');
  const userB='Your revised architecture:\n'+JSON.stringify(proposal)+
   '\nExternal source-certified window choices:\n'+JSON.stringify(catalog.slots)+
   '\nPick an architecturally suitable daylight opening with exact slot ID.';
  const stageB=await request({stage:'ART_B',model,system:WINDOW_SYSTEM,
   user:userB,slots:catalog.slots,onAttempt:attempt});
  if(typeof stageB?.raw!=='string')throw Error('E1_ART_B_MISSING_ORIGINAL');
  save(path.join(candDir,'MODEL_WINDOW_B_ORIGINAL.txt'),stageB.raw);
  row.stageBOriginalSha256=sha(stageB.raw);
  const slot=selectWindow(stageB.raw,catalog);
  const final={...proposal,glazedOpenings:[slot]};
  const finalRaw=JSON.stringify(final,null,2)+'\n';
  save(path.join(candDir,'MODEL_EXPLICITLY_COMPOSED_PLAN.json'),finalRaw);
  row.composedPlanSha256=sha(finalRaw);
  const source=await runR190FreeEngine({planFile:path.join(candDir,'MODEL_EXPLICITLY_COMPOSED_PLAN.json'),
   outDir:path.join(candDir,'compiled'),paletteFile});
  row.engineStatus=source.status;
  if(source.status!=='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED'){
   row.reason=source.reason??'E1_ART_SOURCE_HOLD';
   row.validationIssues=source.validationIssues??[];
  }else{
   const scene=read(path.join(candDir,'compiled','model','B143_SCENE.json'));
   row.sourceSha256=source.sourceSha256;
   row.geometrySha256=source.geometrySha256;
   row.occupancySha256=originalSceneOccupancySha(scene);
   row.stats=stats(final,scene);
   row.geometryChanged=source.geometrySha256!==baseline.row.geometrySha256;
   row.sourceCompiled=true;
   row.status=row.geometryChanged?'SOURCE_READY_ART_HOLD':'SOURCE_SAME_GEOMETRY_ART_HOLD';
   if(!row.geometryChanged)row.reason='NO_CHANGE_TO_TRUE_B143_GEOMETRY';
  }
 }catch(e){
  row.reason=err(e);
  if(row.stageAOriginalSha256&&!row.composedPlanSha256){
   try{row.validationIssues=diagnoseR190E1Plan(read(path.join(candDir,'MODEL_ART_A_ORIGINAL.txt')));}
   catch{row.validationIssues=[];}
  }
 }
 const report={schema:'r190-e1-art-compare-v1',
  priorFailedCandidateFolder:previous?.dir??null,
  priorFailedModelOriginalSha256:previous?.priorOriginalSha256??null,
  explicitSavedRevision:previous!==null,
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_MODEL_ATTEMPTS',
  sourceBaselineFolder:baseline.dir,sourceBaselineSHA:baseline.row.sourceSha256,
  sourceBaselineGeometrySHA:baseline.row.geometrySha256,
  sourceBaselineVerified:true,sourceBaselineArt:'HOLD',
  model,realModelRequests:synthetic?0:row.modelRequests,
  syntheticStageCalls:synthetic?row.syntheticStageCalls:0,
  status:row.status,
  candidateSourceReady:row.sourceCompiled&&row.geometryChanged===true,
  humanArt:'NOT_REVIEWED',actualMinecraftBuild:'NOT_ATTEMPTED',
  actualMinecraftWalking:'NOT_TESTED',constructionApproved:false,
  worldWrites:0,worldContacts:0,automaticRetries:0,
  baselineStats:baseStats,row};
 save(path.join(directory,'E1_ART_COMPARE_REPORT.json'),report);
 save(path.join(directory,'ART_SIDE_BY_SIDE.html'),reviewHtml(row,baseline,
  row.sourceCompiled));
 save(path.join(directory,'ART_REVIEW_JA.md'),
  '# E1 ART direct comparison — Research lab\n\n'+
  'B143 SOURCE technical pass is not an ART acceptance.\n\n'+
  'Baseline SHA: '+baseline.row.sourceSha256+'\n'+
  'Candidate SHA: '+(row.sourceSha256??'HOLD')+'\n'+
  'Candidate: '+row.status+'; reason: '+(row.reason??'none')+'\n\n'+
  'Open ART_SIDE_BY_SIDE.html; inspect both B143 models at matching orientations. '+
  'Evaluate silhouette, roof, differentiated program, entrance hierarchy, facade, '+
  'daylight, and usability, then independently accept/reject the ART changes. '+
  'World writes=0, Minecraft walking not tested.\n');
 console.log('E1 art comparison saved: '+path.join(directory,'E1_ART_COMPARE_REPORT.json'));
 console.log('E1 source result: '+row.status+'; real model requests: '+report.realModelRequests);
 return {dir:directory,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 let opts;
 try{
  if(args.length===0)opts={};
  else if(args.length===1&&args[0]==='--revise-latest'){
   const failed=locateLatestE1FailedArt();
   const prior=read(path.join(failed,'E1_ART_COMPARE_REPORT.json'));
   opts={baselineDir:prior.sourceBaselineFolder,failedCandidateDir:failed};
  }else if(args.length===1)opts={baselineDir:args[0]};
  else throw Error('ARGS');
 }catch(e){console.error(err(e));process.exitCode=2;}
 if(opts)runR190E1ArtCandidate(opts).then(r=>{
  const gui=openE1ResultFolder(path.join(r.dir,'E1_ART_COMPARE_REPORT.json'));
  if(gui.attempted)console.log('E1 result folder opening: '+gui.folder);
  if(!r.candidateSourceReady)process.exitCode=2;
 }).catch(e=>{console.error(err(e));process.exitCode=2;});
}
