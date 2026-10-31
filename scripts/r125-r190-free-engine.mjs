/**
 * Opt-in R190 first real massing path from the existing R125 free-build entry.
 * One local model request OR protected saved-plan replay. No world connection.
 * R190 author chooses spatial program, form, openings; never host retitles a
 * rejected plan or silently substitutes unverified materials.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {R190_SCHEMA,compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {diagnoseR190E1Plan} from './r190-e1-diagnose.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const endpoint='http://127.0.0.1:11434/v1/chat/completions';
const sha=v=>createHash('sha256').update(v).digest('hex');
const modelName=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=s=>{throw Error('R125_R190_'+s);};
const SYSTEM=[
 'You are a creative architect planning an original, actually usable 3D building. Return ONE JSON object only.',
 'schema: '+R190_SCHEMA+'; required keys: schema,id,title,brief,site,entrySpaceId,spaces,materials.',
 'CRITICAL IDENTIFIERS: every id, every space.id, entrySpaceId, parentId and referenced spaceId must be ASCII kebab-case matching ^[a-z][a-z0-9-]{2,39}$. NO underscores (_), spaces, Japanese characters or camelCase in identifiers. Use hyphens instead of underscores. These strings must match references exactly; titles, briefs and purposes may be in Japanese.',
 'site is {width,depth,height}, choose practical dimensions about 36..52,36..52,12..16; 16<=width/depth<=80; 10<=height<=32; site volume <= 40000 for the initial Education export.',
 'spaces: 2..4 FUNCTIONALLY DIFFERENT rooms of genuinely different sizes, heights and connected horizontal arrangement; choose purposes and room positions, not building templates. Japanese purpose labels such as 居間, 物置, 受付 are valid even with two Japanese characters. Identifiers must still use ASCII kebab-case.',
 'Each space has EXACT keys id,purpose,width,depth,height,parentId,side,privacy. EACH room height MUST be integer 7..site.height-2 and EACH width AND depth separately MUST be integer 7..22, INCLUDING storage. Never use width=6 or depth=6. Smallest footprint width=7,depth=7. Every roof requires room.height+roof.rise < site.height.',
 'First space is the entrance room: parentId=null,side=null,privacy normally public or shared; its id exactly equals entrySpaceId. All other rooms connect with parentId=an earlier room id, side north/south/east/west. A child placed east of its parent shares the child WEST wall and parent EAST wall; those shared faces are NOT exterior.',
 'entrySpaceId is the first space id. Avoid placing a child on the entrance face (default south). privacy=public/shared/private.',
 'Materials are EXACT {floor,wall,roof}; choose only stone or wood for each until new Minecraft materials are verified. These map via the existing verified palette.',
 'Required glazedOpenings: 1..4 {spaceId,face,offset,baseY,width,height}. Face north/south/east/west; width 2..4, baseY=5,height=2; room height>=8; offset>=2, offset+width<=wallLength-2. ALL windows face external open air, NOT touching parent/child SHARED WALLS. On the entrySpaceId entranceFace, centered door occupies offsets doorOffset=floor((wallLength-2)/2) and doorOffset+1. A window with baseY=5 and columns offset..offset+width-1 MUST NOT intersect either door column. Prefer another genuinely exterior facade instead of placing entry-front windows. Never place glazing on a faceted room.',
 'Optional roofFormIntents: 1..2 items {spaceId,profile,axis,rise}, profile ridge or shed, axis x/z, rise 2..3; each spaceId is different and must refer to enclosed rooms. Every room.height+rise must be STRICTLY LESS than site.height. Do not use roofFormIntent together with roofFormIntents. Avoid adding roof if uncertain about clearance.',
 'Optional formIntent {spaceId,face,cornerInset} with cornerInset 2..3 for a real faceted main volume. CRITICAL: a formIntent spaceId CANNOT also appear in roofFormIntents or roofFormIntent; faceted room CANNOT have any glazedOpenings. Choose one form treatment per space, not overlapping decorations.',
 'Optional entranceFace north/south/east/west, optional skyCourtIntent, optional spatialRole=open-court on a non-entry room only if explicitly desired; do not add unsupported keys.',
 'Before answering, privately check all required fields, identifiers (NO underscores), every room width>=7, depth>=7 and height>=7, roof clearance, windows vs outside air, doorOffset/entrance-window overlap, and roof/facet conflict. If incompatible, DESIGN IT DIFFERENTLY before responding; do not ask host to alter JSON. Model authors individual massing, function and openings; do NOT copy a standard template. Output ONLY the one final JSON object; no commands or code.'
].join('\n');
export const R190_FREE_SYSTEM_PROMPT=SYSTEM;
const save=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});

export function compileR190FreePlan(plan,{palette,provenance='UNVERIFIED_DESIGN'}={}){
 if(!plan||plan.schema!==R190_SCHEMA)fail('PLAN_SCHEMA');
 if(!Array.isArray(plan.glazedOpenings)||plan.glazedOpenings.length<1)
  fail('EXPLICIT_MODEL_WINDOWS_REQUIRED');
 const input=JSON.stringify(plan);
 const result=compileR190SemanticPlan(plan);
 if(JSON.stringify(plan)!==input||!verifyCompiled(result.design,result.compiled)||
    result.audit?.allProgramSpacesReachable!==true||
    result.audit?.glazedOpenings?.length!==plan.glazedOpenings.length||
    result.worldWrites!==0||result.constructionApproved!==false)
  fail('SOURCE_OR_AUTHORSHIP_INVARIANT');
 const packet=exportB143EducationMakeCode({
  design:result.design,scene:result.compiled,provenance,
  groundLowestLayer:true,verifiedPalette:palette
 });
 if(packet.worldWrites!==0||packet.programExecuted!==false)
  fail('UNEXPECTED_WORLD_ACTIVITY');
 return {result,packet,modelPlanSha256:sha(Buffer.from(input))};
}

export async function runR190FreeEngine({
 prompt=null,model='qwen3:14b',planFile=null,outDir,paletteFile
}={}, {fetcher=fetch}={}){
 if(!outDir||!paletteFile||typeof fetcher!=='function'||
   (!!planFile===!!prompt)||!modelName.test(model))fail('INPUT');
 if(fs.existsSync(outDir))fail('OUTPUT_MUST_BE_NEW');
 fs.mkdirSync(outDir,{recursive:false});
 const modelDir=path.join(outDir,'model'),codeDir=path.join(outDir,'makecode');
 fs.mkdirSync(modelDir);
 let raw;
 const provenance=planFile?'UNVERIFIED_DESIGN':'LOCAL_MODEL_CAPTURE';
 const report={schema:'r125-r190-free-massing-engine-v1',
  status:'HOLD',model:planFile?null:model,modelRequests:0,
  originalResponseSha256:null,designEngine:'R190_SEMANTIC_MASSING',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 try{
  if(planFile){
   raw=fs.readFileSync(planFile,'utf8');
   if(raw.length>100000)fail('SAVED_PLAN_SIZE');
   save(modelDir,'SAVED_PLAN_ORIGINAL.txt',raw);
  }else{
   if(typeof prompt!=='string'||prompt.length<8||prompt.length>4000)
    fail('PROMPT_LENGTH');
   if(fetcher!==fetch)fail('TEST_DOUBLE_CANNOT_CLAIM_REAL_MODEL');
   const available=await preflightR125Ollama({model,endpoint,fetcher});
   if(available.status!=='LOCAL_MODEL_LISTED')fail('LOCAL_MODEL_NOT_LISTED');
   const requestBody={model,stream:false,temperature:0.5,
    reasoning_effort:'none',max_tokens:2600,response_format:{type:'json_object'},
    messages:[{role:'system',content:SYSTEM},{role:'user',content:prompt}]};
   save(modelDir,'MODEL_REQUEST.json',{endpoint,requestBody});
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
   let response;
   try{
    report.modelRequests=1;
    response=await fetcher(endpoint,{method:'POST',redirect:'error',
     signal:controller.signal,headers:{'Content-Type':'application/json'},
     body:JSON.stringify(requestBody)});
   }finally{clearTimeout(timeout);}
   if(!response?.ok)fail('MODEL_HTTP_'+String(response?.status));
   const body=await response.text();
   if(body.length>250000)fail('MODEL_HTTP_SIZE');
   const json=JSON.parse(body);
   if(json.choices?.length!==1||json.choices[0]?.finish_reason==='length')
    fail('MODEL_TRUNCATED');
   raw=json.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<20||raw.length>30000)
    fail('MODEL_ORIGINAL_MISSING');
   save(modelDir,'MODEL_RESPONSE_ORIGINAL.txt',raw);
  }
  report.originalResponseSha256=sha(Buffer.from(raw));
  const plan=JSON.parse(raw);
  const palette=JSON.parse(fs.readFileSync(paletteFile,'utf8'));
  const {result,packet,modelPlanSha256}=compileR190FreePlan(plan,{palette,provenance});
  fs.mkdirSync(codeDir);
  const {code,...exportReport}=packet;
  save(modelDir,'ARCHITECTURE_PLAN.json',result.inputPlan);
  save(modelDir,'B143_SOURCE.json',result.design);
  save(modelDir,'B143_SCENE.json',result.compiled);
  save(modelDir,'R190_SOURCE_ROUTE_AUDIT.json',result.audit);
  const gallery=compileB143Gallery([result.design]);
  const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  save(modelDir,'index.html',renderB143Html(gallery,template));
  save(codeDir,'MAKECODE_EDUCATION.ts',code);
  save(codeDir,'EXPORT_REPORT.json',exportReport);
  report.status='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED';
  report.modelPlanSha256=modelPlanSha256;
  report.sourceSha256=packet.sourceSha256;
  report.geometrySha256=packet.geometrySha256;
  report.plannedVoxelCount=packet.plannedVoxelCount;
  report.roomCount=result.layout.spaces.length;
  report.entranceAndRoomSourceRoutes='SOURCE_PROBES_PASS_NOT_MC_WALKING';
  report.modelAuthorship=planFile?'SAVED_PLAN_UNVERIFIED':'MODEL_RESPONSE_CAPTURED';
  return report;
 }catch(e){
  report.reason=String(e?.message??e).slice(0,500);
  if(typeof raw==='string'){
   try{report.validationIssues=diagnoseR190E1Plan(JSON.parse(raw));}
   catch{report.validationIssues=[];}
  }
  return report;
 }finally{
  save(modelDir,'R190_ENGINE_REPORT.json',report);
 }
}


/** E1 one-session, three real local requests. No template architecture or
 * silent repair; each original model answer is retained by runR190FreeEngine.
 * The comparison is a SOURCE-ONLY diversity proxy, NEVER an ART pass.
 */
// E1-specific scope: the model still selects all rooms, shapes and exterior
// windows, but this first offline experiment avoids the repeatedly failed
// front-door/window co-location. The general R190 design contract is unchanged.
export const R190_E1_STUDY_WINDOW_SAFETY=
 'E1 architecture experiment: Author exterior windows, but do NOT put any glazedOpenings '+
 'on the ENTRANCE ROOM entrySpaceId with face equal to entranceFace (default south). '+
 'Prefer a SIDE or REAR exterior wall, on the entrance room or another room, '+
 'which is not physically shared with another room. A front facade window can be '+
 'a valid future design choice, but avoid it in this bounded E1 experiment. '+
 'If you use roofFormIntent or roofFormIntents, its room must exist and may NOT '+
 'be the same room as formIntent or any open-court room. Do not drop mandatory windows. '+
 'Build an original three-dimensional functional design; no standard templates.';
export const R190_E1_STUDY_BRIEFS=Object.freeze([
 {id:'modern-home',brief:'日本語の依頼：現代的な小規模住宅を設計してください。居間、静かな作業空間、日常的な動線を備え、部屋と外形の関係を考え、単純な箱の繰り返しを避けてください。用途と実際の入口・採光を最優先し、自分で形状・屋根の断面を選んでください。'},
 {id:'flower-shop',brief:'日本語の依頼：小さな花屋を設計してください。買い物客用の展示空間、花を扱う作業場所、補充・保管の動線を備え、街から店の用途が伝わる個性的な入口と外形を自分で選んでください。'},
 {id:'research-lab',brief:'日本語の依頼：小さな研究・試作施設を設計してください。受付・共同作業室・静かな実験場所の用途を分け、外部からの見え方と室内移動を一体で考え、用途にふさわしい立体構成を自分で選んでください。'}
]);
/** Ignore typology words, room identifiers, materials: these do not
 * alone constitute different architecture. Normalise semantic graph refs.
 */
export function r190E1MassingSignature(plan){
 const byId=new Map(plan.spaces.map((s,i)=>[s.id,i]));
 const ix=id=>byId.get(id),f=plan.formIntent,c=plan.skyCourtIntent;
 const roofs=plan.roofFormIntents??(plan.roofFormIntent?[plan.roofFormIntent]:[]);
 return JSON.stringify({
  rooms:plan.spaces.map(s=>[s.width,s.depth,s.height,
   s.parentId===null?null:ix(s.parentId),s.side,
   s.spatialRole??'enclosed',s.tangentShift??null]),
  entryFace:plan.entranceFace??'south',
  form:f?[ix(f.spaceId),f.face,f.cornerInset]:null,
  roofs:roofs.map(x=>[ix(x.spaceId),x.profile,x.axis,x.rise,x.toothWidth??null])
   .sort((x,y)=>x[0]-y[0]),
  court:c?[ix(c.spaceId),c.offsetX,c.offsetZ,c.width,c.depth,c.openFace??null]:null,
  links:(plan.crossConnections??[]).map(([x,y])=>[ix(x),ix(y)]
   .sort((m,n)=>m-n).join(':')).sort()
 });
}
/** Translation- and material-independent SHA of REAL B143 occupied cells.
 * This captures actual geometry but is still NOT a visual quality judgment.
 */
function r190E1OccupancySha(scene){
 const vox=scene?.primitives;
 if(!Array.isArray(vox)||!vox.length||vox.length>160000||
  !vox.every(v=>Array.isArray(v)&&v.length>=3&&
   v.slice(0,3).every(Number.isSafeInteger)))fail('E1_INVALID_VOXEL_SCENE');
 let minX=Infinity,minY=Infinity,minZ=Infinity;
 for(const cell of vox){minX=Math.min(minX,cell[0]);minY=Math.min(minY,cell[1]);minZ=Math.min(minZ,cell[2]);}
 return sha(vox.map(c=>[c[0]-minX,c[1]-minY,c[2]-minZ].join(','))
  .sort().join('|'));
}
export async function runR190E1ThreeUseStudy({
 model='qwen3:14b',outRoot=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs'),
 paletteFile=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json')
}={}, {single=runR190FreeEngine}={}){
 if(!modelName.test(model)||typeof single!=='function')fail('E1_BAD_CONFIGURATION');
 fs.mkdirSync(outRoot,{recursive:true});
 const dir=fs.mkdtempSync(path.join(path.resolve(outRoot),'E1-three-use-'));
 const synthetic=single!==runR190FreeEngine;
 const rows=[];
 save(dir,'E1_REQUESTS.json',{schema:'r190-e1-three-use-requests-v1',model,
  provenance:synthetic?'SYNTHETIC_TEST_DOUBLE':'REAL_LOCAL_MODEL_ATTEMPT',
  requests:R190_E1_STUDY_BRIEFS});
 const writeProgress=()=>fs.writeFileSync(path.join(dir,'E1_PROGRESS.json'),
  JSON.stringify({rows,synthetic,worldWrites:0},null,2)+'\n');
 let localUnavailable=false;
 for(const item of R190_E1_STUDY_BRIEFS){
  if(localUnavailable){
   rows.push({id:item.id,status:'SKIPPED_LOCAL_MODEL_NOT_AVAILABLE',modelRequests:0,
    sourceCompiled:false,worldWrites:0});writeProgress();continue;
  }
  const target=path.join(dir,item.id);
  let report;
  try{report=await single({prompt:item.brief+'\n'+R190_E1_STUDY_WINDOW_SAFETY,model,outDir:target,paletteFile});}
  catch(e){report={status:'HOLD_STUDY_RUN_EXCEPTION',reason:String(e?.message??e),
   modelRequests:0,worldWrites:0};}
  let sourceCompiled=false,shapeSignature=null,occupancySha256=null,features=null,reason=report.reason??null;
  if(report.status==='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED'&&
   report.worldWrites===0&&report.modelRequests===1&&
   typeof report.originalResponseSha256==='string'&&
   typeof report.geometrySha256==='string'){
   try{
    const plan=JSON.parse(fs.readFileSync(path.join(target,'model','ARCHITECTURE_PLAN.json'),'utf8'));
    const source=JSON.parse(fs.readFileSync(path.join(target,'model','B143_SOURCE.json'),'utf8'));
    const scene=JSON.parse(fs.readFileSync(path.join(target,'model','B143_SCENE.json'),'utf8'));
    if(plan.schema!==R190_SCHEMA||source.designOnly!==true)fail('E1_SOURCE_EVIDENCE_INCOMPLETE');
    shapeSignature=r190E1MassingSignature(plan);
    occupancySha256=r190E1OccupancySha(scene);
    sourceCompiled=true;
    features={roomCount:plan.spaces.length,
     roomDimensions:plan.spaces.map(x=>({width:x.width,depth:x.depth,height:x.height})),
     roofSections:plan.roofFormIntents??(plan.roofFormIntent?[plan.roofFormIntent]:[]),
     facetedForm:plan.formIntent??null,openCourtSpaces:plan.spaces.filter(x=>x.spatialRole==='open-court').length,
     skyCourt:plan.skyCourtIntent??null};
   }catch(e){sourceCompiled=false;shapeSignature=null;occupancySha256=null;
    features=null;reason='SOURCE_EVIDENCE_INVALID: '+String(e?.message??e);}
  }
  rows.push({id:item.id,status:sourceCompiled?'SOURCE_READY_ART_HOLD':
   'HOLD_OR_INCOMPLETE_SOURCE',engineStatus:report.status,reason,
   modelRequests:report.modelRequests??0,
   sourceCompiled,originalResponseSha256:report.originalResponseSha256??null,
   sourceSha256:report.sourceSha256??null,geometrySha256:report.geometrySha256??null,
   shapeSignature,occupancySha256,features,
   validationIssues:report.validationIssues??[],output:target,worldWrites:0,
   art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'});
  writeProgress();
  if(/LOCAL_MODEL_NOT_LISTED|MODEL_NOT_LISTED|MODEL_UNAVAILABLE/.test(reason??''))localUnavailable=true;
 }
/** Standalone offline side-by-side 3D inspection. Escaped diagnostic text,
 * no external resources or Minecraft access. Not an automatic ART decision.
 */
function r190E1ReviewHtml(rows,summary){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 })[c]);
 const cards=rows.map(row=>{
  const title=R190_E1_STUDY_BRIEFS.find(x=>x.id===row.id)?.id??row.id;
  const dir=encodeURIComponent(row.id);
  const view=row.sourceCompiled?
   '<iframe loading="lazy" title="'+esc(title)+' genuine 3D" src="'+dir+
    '/model/index.html"></iframe>'+
   '<p><a href="'+dir+'/model/index.html" target="_blank" rel="noopener">3Dビューアを開く</a></p>':
   '<div class="hold">生成した真正3Dなし — HOLD</div>';
  const roomCount=row.features?.roomCount??'–',
   roofs=row.features?.roofSections?.length??'–';
  return '<article><h2>'+esc(title)+'</h2>'+view+
   '<p>状態: <strong>'+esc(row.status)+'</strong></p>'+
   '<p>用途空間: '+esc(roomCount)+' / 屋根断面: '+esc(roofs)+'</p>'+
   '<p>原応答 SHA: <code>'+esc(row.originalResponseSha256)+'</code></p>'+
   '<p>幾何 SHA: <code>'+esc(row.geometrySha256)+'</code></p>'+
   '<p>占有形状 SHA: <code>'+esc(row.occupancySha256)+'</code></p>'+
   '<p>HOLD理由: '+esc(row.reason??'なし')+'</p></article>';
 }).join('\n');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>MinecraftAIBuilder E1 — 3建築比較</title>'+
 '<style>body{background:#101820;color:#f1f5f8;font:15px/1.5 system-ui;margin:22px}'+
 'header{max-width:1200px;margin:auto auto 22px}h1{font-size:1.6rem;margin-bottom:6px}'+
 'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}'+
 'article{background:#1b2834;border:1px solid #405669;border-radius:12px;padding:14px;min-width:0}'+
 'h2{font-size:1.1rem;margin:0 0 12px}iframe{width:100%;height:340px;border:0;background:#253748}'+
 'code{font-size:11px;overflow-wrap:anywhere}p{overflow-wrap:anywhere}a{color:#9cdbff}'+
 '.hold{height:340px;display:grid;place-items:center;background:#303641}'+
 'footer{margin-top:24px;max-width:1100px;color:#c6d2dd}</style></head><body>'+
 '<header><h1>E1 — 本物の3D形状による3用途比較</h1>'+
 '<p>比較状態: '+esc(summary.status)+'。形状の相違は美術合格ではありません。'+
 '全件モデル原文・実空間・外観を独立評価してください。</p>'+
 '<p>真正SOURCE件数 '+esc(summary.sourceCompiledCount)+'/3、'+
 '異なる占有形状 '+esc(summary.distinctVoxelOccupancyCount)+'/3。</p></header>'+
 '<main>'+cards+'</main>'+
 '<footer>注意：ARTは未審査、Minecraft実歩行・実施工は未実施。'+
 '合成テストダブルの成果を実モデル生成と混同しないでください。</footer></body></html>';
}
 const compiled=rows.filter(x=>x.sourceCompiled);
 const distinct=new Set(compiled.map(x=>x.shapeSignature)).size;
 const summary={schema:'r190-e1-three-use-source-comparison-v1',
  provenance:synthetic?'SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL':'REAL_LOCAL_MODEL_ATTEMPTS',
  model,requestedUseCount:3,realModelRequests:synthetic?0:rows.reduce((n,r)=>n+r.modelRequests,0),
  sourceCompiledCount:compiled.length,distinctMassingSignatureCount:distinct,
  distinctVoxelOccupancyCount:new Set(compiled.map(x=>x.occupancySha256)).size,
  status:synthetic?'TEST_DOUBLE_ONLY':compiled.length!==3?'SOURCE_INCOMPLETE_HOLD':
   distinct!==3?'DUPLICATE_MASSING_PROXY_REVIEW_REQUIRED':'THREE_DISTINCT_SOURCE_MASSING_PROXIES_ART_HOLD',
  shapeDiversityIsOnlyProxy:true,humanArt:'NOT_REVIEWED',actualMinecraftBuild:'NOT_ATTEMPTED',
  actualPlayerWalking:'NOT_TESTED',constructionApproved:false,worldWrites:0,
  rows};
 save(dir,'E1_STUDY_REPORT.json',summary);
 save(dir,'E1_REVIEW.html',r190E1ReviewHtml(rows,summary));
 save(dir,'E1_REVIEW.md','# MinecraftAIBuilder E1 — 3用途の真正3D比較（一次資料）\n\n'
  +'判定: '+summary.status+'。これは作品美術・Minecraft実歩行・汎用性能の合格ではありません。\n\n'
  +rows.map(r=>'- '+r.id+': '+r.status+' / source='+String(r.sourceSha256)
   +' / geometry='+String(r.geometrySha256)+' / reason='+String(r.reason)).join('\n')
  +'\n\n各用途の model/MODEL_RESPONSE_ORIGINAL.txt（原文）と model/index.html（3D）を独立に確認。'
  +' 入口・床・室内経路・開口を確認してから美術を人間が評価してください。\n');
 console.log('E1 study saved: '+path.join(dir,'E1_STUDY_REPORT.json'));
 console.log('E1 status: '+summary.status+'; model requests: '+summary.realModelRequests);
 return {dir,...summary};
}

async function main(argv){
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  if(!['--out','--palette','--prompt','--model','--plan'].includes(argv[i])||
     !argv[i+1]||Object.hasOwn(opts,argv[i]))fail('ARGS');
  opts[argv[i]]=argv[i+1];
 }
 const report=await runR190FreeEngine({outDir:opts['--out'],
  paletteFile:opts['--palette'],prompt:opts['--prompt']??null,
  planFile:opts['--plan']??null,model:opts['--model']??'qwen3:14b'});
 console.log(JSON.stringify(report));
 if(report.status!=='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const study=process.argv.length===3&&process.argv[2]==='--study-three';
 const task=study?runR190E1ThreeUseStudy():main(process.argv.slice(2));
 task.then(r=>{if(study&&r.status!=='THREE_DISTINCT_SOURCE_MASSING_PROXIES_ART_HOLD')process.exitCode=2;})
  .catch(e=>{console.error(String(e?.message??e));process.exitCode=2;});
}
