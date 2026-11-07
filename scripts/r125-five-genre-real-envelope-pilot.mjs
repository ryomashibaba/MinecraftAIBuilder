/**
 * R125 opt-in five-genre REAL local-Qwen roof authoring study.
 * Takes frozen five Qwen spatial originals verified by source/diagnostic SHA;
 * one independent model request PER genre, one at a time, never retries.
 * Qwen chooses each room's genuine roof form, axis and rise, not the HOST.
 * The HOST only compiles that authored envelope into real B143, checks
 * usable interior headroom and routes; 0 world writes and 9 BLOCKED gates.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectPreservedFiveGenreSources,projectExactSourceVoxels}
 from './r125-five-genre-source-comparison.mjs';
import {ENVELOPE_SCHEMA,compileExpressiveEnvelopeV2}
 from '../source/ai/r125-expressive-envelope-v2.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const MODEL='qwen3:14b';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('R125_REAL_ENVELOPE_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const system=[
 'You are an architectural DESIGN AUTHOR (not a Minecraft code author).',
 'Return ONLY one compact JSON object, no markdown, no commentary.',
 'Exact keys schema,planId,roofs. schema='+ENVELOPE_SCHEMA+'.',
 'planId MUST equal the given plan id. roofs is one entry PER given room, no missing or extras.',
 'Each roof has EXACT keys: roomId,form,axis,rise.',
 'roomId EXACTLY as supplied; form shed|ridge; axis x|z; rise integer 2|3.',
 'Use the building genre and room functions to make a meaningful coherent whole-building skyline. The forms are generic geometry vocabulary, NOT fixed genre templates.',
 'shed rises progressively across the chosen axis. ridge rises to the center and descends to the opposite eave.',
 'Each roof is structurally connected; the HOST, not you, computes safe exact B143 voxels.',
 'No Minecraft commands, no block coordinates, no furniture invented, no fake art approval, and no additional fields.'
].join('\n');

export function classifyEnvelopeTrialFailure(reason){
 const s=String(reason??'');
 if(/MODEL_TRUNCATED|MODEL_FINISH|MODEL_CHOICES/.test(s))return 'MODEL_COMPLETION';
 if(/HTTP|TIMEOUT|abort|OLLAMA/i.test(s))return 'LOCAL_MODEL_TRANSPORT';
 if(/MODEL_JSON|MODEL_RAW/.test(s))return 'MODEL_JSON_FORMAT';
 if(/R125_ENVELOPE_(CONTRACT|ROOF_INTENT|HOST_INPUT|MISSING_ROOM_INTENT)/.test(s))
  return 'MODEL_ARCHITECTURAL_INTENT_INVALID';
 if(/R125_ENVELOPE_(NO_USABLE_RAISED_AIR|ROOF_SKIN_GAP|EAVE_PERIMETER_GAP)/.test(s))
  return 'SHARED_MASSING_OR_ENVELOPE';
 if(/R125_ENVELOPE_|B143_|R125_ROUTE_/.test(s))
  return 'SHARED_GEOMETRY_AND_ROUTE';
 return 'UNKNOWN_HOLD';
}
export function summarizeEnvelopeTrials(rows){
 const counts=new Map();
 for(const row of rows){
  if(!row.failureCategory)continue;
  counts.set(row.failureCategory,(counts.get(row.failureCategory)??0)+1);
 }
 const failures=[...counts].map(([category,cases])=>({
  category,affectedGenres:cases,rootCause:'NOT_DETERMINED',
  crossGenre:cases>=2
 })).sort((a,b)=>b.affectedGenres-a.affectedGenres);
 return {requestedGenres:5,receivedCases:rows.length,
  sourcePassCases:rows.filter(x=>x.status==='NEW_SOURCE_ENVELOPE_ART_HOLD').length,
  commonFailureSymptoms:failures.filter(x=>x.crossGenre),allFailureSymptoms:failures,
  geometryAndAirResults:'SOURCE_ONLY_NOT_ART_CERTIFICATION',
  artisticQuality:'NOT_REVIEWED',construction:'BLOCKED',
  worldWrites:0};
}
function renderIndex(report,previews){
 const max=Object.fromEntries(['width','height','depth'].map(k=>[k,
  Math.max(...previews.flatMap(p=>[
   p.original.design.bounds[k],
   ...(p.newEnvelope?[p.newEnvelope.design.bounds[k]]:[])]),1)]));
 const cards=previews.map(p=>{
  const r=p.report;
  const row=(title,compiled)=>'<div class="trio"><h3>'+esc(title)+'</h3>'+
   ['front','side','top'].map(v=>'<div><span>'+esc(v)+
    '</span>'+projectExactSourceVoxels(compiled,v,max)+'</div>').join('')+'</div>';
  return '<article><h2>'+esc(p.genre)+' — '+esc(r.status)+'</h2>'+
   '<div class="compare">'+row('凍結した元の真正形状',p.original.compiled)+
   (p.newEnvelope?row('Qwenが追加で著作した屋根・実上部空間',p.newEnvelope.compiled):
    '<p>新しい包絡面はSOURCE HOLD。元の5ジャンル形状は保持。</p>')+'</div>'+
   (p.newEnvelope?'<p>増えた真正2幅上部空間パッド合計：'+
    p.newEnvelope.massing.headroom.reduce((a,c)=>a+c.raisedTwoWidePads,0)+
    ' / <a href="cases/'+p.id+'/index.html">新しい真正3Dを開く</a></p>':'')+
   '<p>元のSOURCE SHA：<code>'+esc(r.originalGeometrySha256)+'</code></p>'+
   '<p>建築ART：未審査／Minecraft施工：禁止／模型作者：保存元Qwen＋追加意匠Qwen（自己申告）</p></article>';
 }).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>MAB 5ジャンル全体外形AI研究比較</title>'+
  '<style>body{background:#0c1926;color:#eef4f7;font:15px system-ui;margin:auto;max-width:1580px;padding:25px;line-height:1.55}'+
  'article{padding:16px;border:1px solid #435b6b;border-radius:14px;background:#132837;margin:14px 0}'+
  'h1{font-size:1.6em}h2{font-size:1.15em}h3{font-size:1em}'+
  '.compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}'+
  '.trio{min-width:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}'+
  '.trio h3{grid-column:1/-1}.trio svg{max-width:100%;width:100%;background:#081522;image-rendering:pixelated}'+
  'span{display:block;color:#74dce4}p{color:#cbdbe3}a{color:#80e1eb}code{word-break:break-all}'+
  '@media(max-width:820px){.compare{grid-template-columns:1fr}}</style>'+
  '<h1>5ジャンルの建物全体・AI著作屋根比較</h1>'+
  '<p>元5件の部屋プログラムは凍結。Qwenに屋根形状と方向/上昇だけを追加著作させ、'+
  'HOSTが真正B143、上部空間2幅パッド、SOURCE動線を検証。'+
  'モデル推論はジャンルごとに独立・逐次。モデル生回答はローカル私用フォルダのみ。</p>'+
  '<p>結果：'+esc(report.status)+'。真正新形状：'+report.summary.sourcePassCases+
  '/5。全件ART HOLD、Minecraft書込0。</p>'+cards+'</html>';
}
export async function runFiveGenreEnvelopeStudy(
 {studyDir,diagnosticFile,outDir,model=MODEL,endpoint=ENDPOINT,
  timeoutMs=180000}={}, {fetcher=fetch}={}){
 if(![studyDir,diagnosticFile,outDir].every(p=>typeof p==='string'&&path.isAbsolute(p))||
  fs.existsSync(outDir)||model!==MODEL||endpoint!==ENDPOINT||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000||
  typeof fetcher!=='function')fail('ARGS');
 const evidence=inspectPreservedFiveGenreSources({studyDir,diagnosticReportFile:diagnosticFile});
 const dest=path.resolve(outDir);
 if(fs.realpathSync(path.dirname(dest))!==fs.realpathSync(path.dirname(evidence.study))||
   dest===evidence.study||dest.startsWith(evidence.study+path.sep))
  fail('PRIVATE_SIBLING_ONLY');
 const injected=fetcher!==fetch;
 fs.mkdirSync(dest);
 const report={schema:'r125-real-five-genre-envelope-pilot-v1',
  source:'FROZEN_VERIFIED_FIVE_GENRES',
  originalStudySha256:evidence.originalReportSha256,
  previousDiagnosticSha256:evidence.diagnosticSha256,
  provider:'LOCAL_LOOPBACK_DECLARED_NOT_INDEPENDENTLY_ATTESTED',
  testInjectionPresent:injected,model,modelCalls:0,
  cases:[],status:'HOLD_NOT_STARTED',worldContacts:0,worldWrites:0,
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
 const previews=[];
 try{
  const detected=await preflightR125Ollama({model,endpoint,fetcher});
  if(detected.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_LOCAL_MODEL_NOT_READY';
   return report;
  }
  const viewerTemplate=fs.readFileSync(
   path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  for(const c of evidence.results){
   const dir=path.join(dest,'cases',c.id);fs.mkdirSync(dir,{recursive:true});
   const row={id:c.id,genre:c.genre,originalGeometrySha256:c.product.geometrySha256,
    frozenOriginalRawSha256:c.rawSha256,
    originalHistoricHold:c.isRecovered,modelCalls:0,modelRawSha256:null,
    newGeometrySha256:null,raisedTwoWidePads:null,
    routeStatus:'NOT_TESTED',failureCategory:null,reason:null,
    status:'HOLD_NOT_STARTED',art:'NOT_REVIEWED',worldWrites:0};
   let newEnvelope=null;
   try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let wire;
    try{
     report.modelCalls++;row.modelCalls++;
     const response=await fetcher(endpoint,{method:'POST',redirect:'error',
      signal:controller.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model,stream:false,temperature:0.55,
       reasoning_effort:'none',max_tokens:900,response_format:{type:'json_object'},
       messages:[{role:'system',content:system},
        {role:'user',content:'建築ジャンル: '+c.genre+
         '。下記は既存の本物のQwenが著作した建築空間設計です。部屋配置・形状は再発想せず維持。各室の屋根/上部空間が用途と全体景観を表現するよう、全室の独立した屋根意匠だけをJSONで著作してください。\n'+
         JSON.stringify(c.product.plan)}]})
     });
     if(!response?.ok)fail('MODEL_HTTP_'+response?.status);
     const rawBody=await response.text();
     if(rawBody.length>80000)fail('MODEL_HTTP_RESPONSE_TOO_BIG');
     try{wire=JSON.parse(rawBody)}catch{fail('MODEL_HTTP_JSON')}
    }finally{clearTimeout(timer)}
    if(wire?.choices?.length!==1)fail('MODEL_CHOICES');
    const msg=wire.choices[0],raw=msg?.message?.content;
    if(typeof raw==='string'&&raw.length>0&&raw.length<25000){
     save(dir,'MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt',raw);
     row.modelRawSha256=sha(raw);
    }
    if(msg?.finish_reason==='length')fail('MODEL_TRUNCATED');
    if(msg?.finish_reason!=='stop')fail('MODEL_FINISH');
    if(typeof raw!=='string'||raw.length<30||raw.length>=25000)fail('MODEL_RAW');
    let intent;
    try{intent=JSON.parse(raw)}catch{fail('MODEL_JSON')}
    newEnvelope=compileExpressiveEnvelopeV2({
     originalPlan:c.product.plan,intent});
    if(newEnvelope.originalGeometrySha256!==c.product.geometrySha256)
     fail('BASE_SOURCE_DRIFT');
    const html=renderB143Html(compileB143Gallery([newEnvelope.design]),viewerTemplate);
    save(dir,'ENVELOPE_INTENT.json',intent);
    save(dir,'EXPRESSIVE_B143_SOURCE.json',newEnvelope.design);
    save(dir,'ENVELOPE_SOURCE_ROUTES.json',newEnvelope.sourceRoutes);
    save(dir,'ACTUAL_HEADROOM_REPORT.json',newEnvelope.massing);
    save(dir,'index.html',html);
    row.newGeometrySha256=newEnvelope.geometrySha256;
    row.newSourceSha256=newEnvelope.sourceSha256;
    row.raisedTwoWidePads=newEnvelope.massing.headroom.reduce(
     (n,r)=>n+r.raisedTwoWidePads,0);
    row.routeStatus=newEnvelope.sourceRoutes.status;
    row.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
     'NEW_SOURCE_ENVELOPE_ART_HOLD';
   }catch(e){
    row.reason=String(e?.message??e).slice(0,240);
    row.failureCategory=classifyEnvelopeTrialFailure(row.reason);
    row.status='HOLD_'+row.failureCategory;
   }finally{
    save(dir,'CASE_REPORT.json',row);report.cases.push(row);
    previews.push({id:c.id,genre:c.genre,original:c.product,
     newEnvelope,report:row});
   }
  }
  report.summary=summarizeEnvelopeTrials(report.cases);
  report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
   report.summary.sourcePassCases===5?
    'FIVE_NEW_SOURCE_ENVELOPES_READY_HUMAN_ART_HOLD':'HOLD_PARTIAL_ENVELOPES';
  return report;
 }catch(e){
  report.status='HOLD_BATCH_SETUP';
  report.setupReason=String(e?.message??e).slice(0,240);
  return report;
 }finally{
  report.summary??=summarizeEnvelopeTrials(report.cases);
  save(dest,'EXPRESSIVE_ENVELOPE_REPORT.json',report);
  if(previews.length>0)save(dest,'index.html',renderIndex(report,previews));
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==6||a[0]!=='--study'||a[2]!=='--diagnostic'||a[4]!=='--out')
   fail('CLI');
  const r=await runFiveGenreEnvelopeStudy({
   studyDir:path.resolve(a[1]),diagnosticFile:path.resolve(a[3]),
   outDir:path.resolve(a[5])});
  console.log(JSON.stringify({status:r.status,sourceReady:r.summary?.sourcePassCases,
   modelCalls:r.modelCalls,sharedFailureSymptoms:r.summary?.commonFailureSymptoms,
   output:path.resolve(a[5]),worldWrites:0},null,2));
  if(r.status!=='FIVE_NEW_SOURCE_ENVELOPES_READY_HUMAN_ART_HOLD')process.exitCode=2;
 }catch(e){console.error('R125_REAL_ENVELOPE_HOLD',String(e?.message??e));process.exitCode=2}
}
