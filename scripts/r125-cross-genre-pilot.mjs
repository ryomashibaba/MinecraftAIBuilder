/**
 * Five independent real-Qwen spatial-design trials in one local operation.
 * One Ollama POST at a time to avoid parallel GPU VRAM pressure.
 * Private raw model evidence, cross-genre failure clustering, B143 3D review.
 * No world contact, model retry, paid API, or genre-specific HOST geometry.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SCHEMA,compileSpatialComposition} from '../source/ai/r125-spatial-composition.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT='http://127.0.0.1:11434/v1/chat/completions';
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=s=>{throw Error('R125_CROSS_GENRE_'+s)};
const digest=s=>createHash('sha256').update(s).digest('hex');
const msg=s=>String(s??'UNKNOWN').slice(0,350);
const save=(dir,name,o)=>fs.writeFileSync(path.join(dir,name),
 typeof o==='string'?o:JSON.stringify(o,null,2)+'\n',{flag:'wx'});

export const GENRES=Object.freeze([
 Object.freeze({id:'home',genre:'平屋住宅',prompt:'小さな独立した平屋住宅。家族の居間、私的な寝室、家事の作業空間など、実際に異なる生活機能とその関係を設計する。店舗のラベル替えにしない'}),
 Object.freeze({id:'retail',genre:'独立店舗',prompt:'街路から入れる小規模店舗。来客用の売場とレジ、在庫管理・従業員作業室など、客と裏方の異なる動線を設計する。住宅のラベル替えにしない'}),
 Object.freeze({id:'laboratory',genre:'研究施設',prompt:'小型研究所。実験・試料取り扱い、観測記録、器具準備など実際の機能関係を設計する。売場と同じ平面の名前替えにしない'}),
 Object.freeze({id:'gallery',genre:'小美術館',prompt:'小規模な公共美術展示館。入館・導入、性格の異なる鑑賞室、収蔵や管理など、順序性と異なる天井高を考えて設計する'}),
 Object.freeze({id:'station',genre:'小駅舎',prompt:'小さな地上駅舎。案内・切符、乗客の待合、駅員の管理空間など、混雑を考慮した異なる機能を設計する。線路やホームは今回の施工対象外'})
]);
const SYSTEM=[
 'You design architectural spatial relationships, not Minecraft coordinates.',
 'Return one JSON object ONLY. No code, markdown, commentary or additional fields.',
 'Top-level EXACT keys: schema,id,title,brief,materials,rooms. schema='+SCHEMA+'.',
 'id and room ids: unique lowercase letter/digit/hyphen slugs 3..40 chars.',
 'title, brief, room purpose: meaningful short text 3..500 chars.',
 'materials EXACT keys floor,wall,roof. floor wood|stone|concrete; wall concrete|stone|wood|metal; roof stone|metal|wood|concrete.',
 'rooms: 2..5 functional rooms in parent-before-child order.',
 'Each room EXACT keys id,purpose,width,depth,roofY plus attach for non-root only.',
 'room width/depth integers 6..14, roofY integer 6..10.',
 'Every non-root attach EXACT keys to,side,shift; to is a preceding room id;',
 'side east|west|north|south; shift integer -3..3.',
 'The HOST aligns the connected rooms with a shared two-wide doorway. Avoid collisions, narrow overlaps, blocking north entrance of first room.',
 'The FIRST room faces the exterior public entrance. Different genres should drive genuinely different room relations, roof heights, dimensions and whole-building shapes.',
 'No absolute coordinates, voxel data, genre-specific templates, unsupported architecture certifications, or code.'
].join('\n');

export function classifyGenreFailure(reason){
 const x=String(reason??'');
 if(/MODEL_TRUNCATED|MODEL_FINISH|CHOICES/.test(x))return 'MODEL_COMPLETENESS';
 if(/OLLAMA|HTTP|TIMEOUT|aborted/i.test(x))return 'MODEL_TRANSPORT';
 if(/MODEL_JSON|MODEL_RAW/.test(x))return 'MODEL_OUTPUT_FORMAT';
 if(/R125_SPATIAL_(PLAN_CONTRACT|ROOM_COUNT|ROOM_CONTRACT|ADJACENCY_CONTRACT)/.test(x))
  return 'MODEL_IR_INVALID';
 if(/R125_SPATIAL_(VOLUMES_OVERLAP|NO_TWO_WIDE_CONNECTION|PUBLIC_ENTRY_NOT_EXTERIOR)/.test(x))
  return 'SPATIAL_RELATIONS_INVALID';
 if(/R125_SPATIAL_(REAL_VOXEL_CIRCULATION_HOLD|NO_EXTERIOR_WINDOW|SOURCE_MISMATCH)/.test(x))
  return 'MODEL_ENGINE_INTERACTION';
 if(/B143_|R125_ROUTE_/.test(x))return 'COMMON_GEOMETRY_ENGINE';
 return 'UNKNOWN_REQUIRES_CAUSAL_REVIEW';
}
export function analyzeGenreBatch(cases){
 if(!Array.isArray(cases))fail('CASE_SUMMARY');
 const count=new Map();
 for(const c of cases){
  if(!c.id||!c.genre)fail('CASE_ID');
  if(c.failureCategory){
   if(!count.has(c.failureCategory))count.set(c.failureCategory,new Set());
   count.get(c.failureCategory).add(c.genre);
  }
 }
 const groups=[...count].map(([category,genres])=>({
  category,genreCount:genres.size,genres:[...genres].sort(),
  sharedSymptom:genres.size>=2,rootCause:'NOT_DETERMINED'
 })).sort((a,b)=>b.genreCount-a.genreCount);
 const shapes=cases.filter(x=>x.geometrySha256).map(x=>x.geometrySha256);
 const layouts=cases.filter(x=>x.layoutFingerprint).map(x=>x.layoutFingerprint);
 return {schema:'r125-five-genre-comparison-v1',requestedGenreCount:GENRES.length,
  completedCaseCount:cases.length,sourceCompiled:shapes.length,
  uniqueGeometryCount:new Set(shapes).size,
  uniqueLayoutCount:new Set(layouts).size,
  repeatedGeometryCount:shapes.length-new Set(shapes).size,
  repeatedLayoutCount:layouts.length-new Set(layouts).size,
  failures:groups,sharedSymptoms:groups.filter(g=>g.sharedSymptom),
  allSourcePass:cases.length===GENRES.length&&shapes.length===GENRES.length&&
   cases.every(c=>c.routeStatus==='SOURCE_ROUTES_REACH_ALL_ZONES'),
  genreSemanticFit:'HUMAN_REVIEW_REQUIRED',
  architecturalArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  mac8gb2b:'NOT_TESTED',worldWrites:0,BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderGenreIndex(result){
 const rows=result.cases.map(c=>'<tr><td>'+esc(c.genre)+'</td><td>'+esc(c.status)+
  '</td><td>'+esc(c.sourceVoxelCount??'-')+'</td><td>'+
  (c.geometrySha256?'<a href="cases/'+esc(c.id)+'/index.html">3Dを見る</a>':'HOLD')+
  '</td></tr>').join('');
 const shared=result.analysis.sharedSymptoms.map(g=>'<li>'+esc(g.category)+' : '+esc(g.genres.join('/'))+'</li>').join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8"><title>MAB 異ジャンル建築比較</title>'+
 '<style>body{background:#0c1824;color:#f0f5fb;font:16px system-ui;margin:32px}'+
 'table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #405566;padding:12px;text-align:left}'+
 'a{color:#69d9de}</style><h1>5ジャンルの建築を横断検証</h1>'+
 '<p>自動推論は逐次実行。SOURCEと人間ART・Minecraft実機は別の判定です。</p>'+
 '<p>総合判定: '+esc(result.status)+'</p><table><tr><th>ジャンル</th><th>結果</th><th>実ボクセル</th><th>レビュー</th></tr>'+
 rows+'</table><h2>複数ジャンルで再現した症状（根本原因は未特定）</h2><ul>'+
 (shared||'<li>現在確認されていません</li>')+'</ul><p>個別の非公開Qwen原文とSHA・レポートはcases以下に保存。施工していません。</p></html>';
}
export async function runGenreBatch({model='qwen3:14b',outDir,
 endpoint=DEFAULT,timeoutMs=180000}={}, {fetcher=fetch}={}){
 const matched=typeof endpoint==='string'?ENDPOINT.exec(endpoint):null;
 if(!MODEL.test(model)||typeof outDir!=='string'||!path.isAbsolute(outDir)||
  fs.existsSync(outDir)||!fs.existsSync(path.dirname(outDir))||
  !matched||Number(matched[1])>65535||Number(matched[1])<1||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000||
  typeof fetcher!=='function')fail('INPUT');
 const testInjected=fetcher!==fetch;
 fs.mkdirSync(outDir);
 const result={schema:'r125-local-cross-genre-study-v1',model,
  declaredProvider:'LOCAL_LOOPBACK_NOT_INDEPENDENTLY_ATTESTED',
  testInjectionPresent:testInjected,modelCalls:0,cases:[],
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,status:'HOLD_NOT_STARTED'};
 const start=Date.now();
 try{
  const models=await preflightR125Ollama({model,endpoint,fetcher});
  if(models.status!=='LOCAL_MODEL_LISTED'){
   result.status='HOLD_MODEL_NOT_INSTALLED';return result;
  }
  const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  for(const c of GENRES){
   const dir=path.join(outDir,'cases',c.id);
   fs.mkdirSync(dir,{recursive:true});
   const row={id:c.id,genre:c.genre,status:'HOLD_NOT_STARTED',modelCalls:0,
    rawSha256:null,geometrySha256:null,routeStatus:'NOT_TESTED',
    sourceVoxelCount:null,failureCategory:null,reason:null,
    humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',worldWrites:0};
   try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    let data;
    try{
     result.modelCalls++;row.modelCalls++;
     const response=await fetcher(endpoint,{method:'POST',redirect:'error',
      signal:controller.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model,stream:false,temperature:0.5,reasoning_effort:'none',
       max_tokens:2048,response_format:{type:'json_object'},
       messages:[{role:'system',content:SYSTEM},
        {role:'user',content:'ジャンル: '+c.genre+'。 '+c.prompt+
         '。未知の独自建築として、2〜5室の全体構成と空間関係をJSONだけで設計してください。'}]})
     });
     if(response?.ok!==true)fail('MODEL_HTTP_'+(response?.status??'UNKNOWN'));
     const body=await response.text();
     if(body.length>150000)fail('MODEL_HTTP_OVERSIZE');
     try{data=JSON.parse(body)}catch{fail('MODEL_HTTP_BAD_JSON')}
    }finally{clearTimeout(timer)}
    if(data?.choices?.length!==1)fail('MODEL_CHOICES');
    const choice=data.choices[0],raw=choice?.message?.content;
    if(typeof raw==='string'&&raw.length>0&&raw.length<=30000){
     save(dir,'MODEL_RESPONSE_ORIGINAL.txt',raw);row.rawSha256=digest(raw);
    }
    if(choice?.finish_reason==='length')fail('MODEL_TRUNCATED');
    if(choice?.finish_reason!=='stop')fail('MODEL_FINISH');
    if(typeof raw!=='string'||raw.length<30||raw.length>30000)fail('MODEL_RAW');
    let plan;
    try{plan=JSON.parse(raw)}catch{fail('MODEL_JSON')}
    const product=compileSpatialComposition(plan);
    const gallery=compileB143Gallery([product.design]);
    const html=renderB143Html(gallery,template);
    save(dir,'ARCHITECTURE_PLAN.json',plan);
    save(dir,'B143_SOURCE.json',product.design);
    save(dir,'SOURCE_ROUTES.json',product.sourceRoutes);
    save(dir,'SPATIAL_LAYOUT.json',product.layout);
    save(dir,'index.html',html);
    row.geometrySha256=product.geometrySha256;
    row.sourceSha256=product.sourceSha256;
    row.planSha256=product.planSha256;
    row.sourceVoxelCount=product.compiled.primitives.length;
    row.layoutFingerprint=digest(JSON.stringify(product.layout.rooms.map(r=>[
     r.x,r.z,r.width,r.depth,r.roofY])));
    row.roomCount=plan.rooms.length;
    row.routeStatus=product.sourceRoutes.status;
    row.status=testInjected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
     'SOURCE_AND_3D_READY_ART_HOLD';
   }catch(e){
    row.reason=msg(e?.message??e);
    row.failureCategory=classifyGenreFailure(row.reason);
    row.status='HOLD_'+row.failureCategory;
   }finally{save(dir,'CASE_REPORT.json',row);result.cases.push(row)}
  }
  result.analysis=analyzeGenreBatch(result.cases);
  result.status=testInjected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
   result.analysis.allSourcePass?'FIVE_GENRES_SOURCE_READY_ART_HOLD':
   'HOLD_GENRE_BATCH_PARTIAL';
  return result;
 }catch(e){
  result.status='HOLD_BATCH_RUNTIME';result.batchReason=msg(e?.message??e);
  return result;
 }finally{
  result.elapsedMs=Date.now()-start;
  result.analysis??=analyzeGenreBatch(result.cases);
  save(outDir,'CROSS_GENRE_REPORT.json',result);
  save(outDir,'index.html',renderGenreIndex(result));
 }
}
export function parseGenreArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==4||argv[0]!=='--model'||argv[2]!=='--out')fail('ARGS');
 return {model:argv[1],outDir:path.resolve(argv[3])};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseGenreArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-cross-genre-pilot.mjs --model qwen3:14b --out NEW_PRIVATE_DIR');
  else{
   const r=await runGenreBatch(args);
   console.log(JSON.stringify({status:r.status,modelCalls:r.modelCalls,
    compiled:r.analysis?.sourceCompiled,sharedSymptoms:r.analysis?.sharedSymptoms,
    folder:args.outDir,worldWrites:0},null,2));
   if(r.status!=='FIVE_GENRES_SOURCE_READY_ART_HOLD')process.exitCode=2;
  }
 }catch(e){console.error('R125_CROSS_GENRE_HOLD',msg(e?.message??e));process.exitCode=2}
}
