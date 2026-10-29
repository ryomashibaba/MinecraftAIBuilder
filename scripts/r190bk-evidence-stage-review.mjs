/**
 * R190-BK: source-only, tamper-evident A/B reviewer index.
 * No provider, Minecraft, source repair, synthetic promotion or automatic art winner.
 * Reads existing BF/BE/BG/BI evidence and renders a useful offline decision page.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateR190BGObservations} from './r190bg-source-anchored-review.mjs';

export const R190BK_SCHEMA='minecraftaibuilder-r190bk-evidence-stage-review-v1';
const H=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('R190BK_'+s)};
const validHash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const directory=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}catch{return false}};
const safe=x=>x?.readiness==='NOT_PREPARED'&&x.constructionApproved===false&&
 x.executionAllowed===false&&x.worldContacts===0&&x.worldWrites===0&&
 x.gates?.length===9&&x.gates.every(v=>v==='BLOCKED')&&
 Array.isArray(x.BuildPlan?.operations)&&x.BuildPlan.operations.length===0&&
 x.art==='ART_HOLD'&&x.officialArtAdoptions===0;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldWrites:0,
 art:'ART_HOLD',officialArtAdoptions:0});
function file(root,name,max=1200000){
 if(!directory(root)||!/^[A-Za-z0-9_-]+\.(?:json|html|svg)$/.test(name))
  fail('FILE_PATH');
 const p=path.join(root,name),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<2||s.size>max)
  fail('FILE_INTEGRITY_'+name);
 return fs.readFileSync(p);
}
const parse=(bytes,label)=>{try{return JSON.parse(bytes)}catch{fail('JSON_'+label)}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validSource=['SOURCE_REVIEW_AVAILABLE_ART_HOLD',
 'HOLD_R4_SOURCE_REFERENCE_ONLY','HOLD_SECTION_SOURCE_REFERENCE_ONLY'];
function candidate(root,id,be,bf,beSha){
 const entry=be[id],finger=bf[id];
 if(!entry||!finger||!validHash(entry.originalSha256)||
    finger.sourceSha256!==entry.originalSha256)fail('SOURCE_LINK_'+id);
 let source3D=null,diagnostic=null;
 const has3D=validSource.includes(entry.status);
 if(has3D){
  if(!validHash(entry.geometrySha256))fail('VALID_GEOMETRY_SHA_'+id);
  file(root,id+'_3D.html',3000000);
  source3D='../'+id+'_3D.html';
 }else if(entry.status==='HOLD_INVALID_B143'){
  const record=bf.invalidSourceDiagnostics?.[id];
  if(!record||record.originalSha256!==entry.originalSha256)
   fail('INVALID_SOURCE_LINK_'+id);
  if(record.file){
   if(record.file!=='R190BI_'+id+'_INVALID_SOURCE_DIAGNOSTIC.json'||
      !validHash(record.sha256))fail('DIAGNOSTIC_NAME_'+id);
   const bytes=file(root,record.file,200000),d=parse(bytes,'DIAGNOSTIC_'+id);
   if(H(bytes)!==record.sha256||d.originalSha256!==entry.originalSha256||
      d.studySide!==id||d.comparisonSha256!==beSha||
      d.originalUnmodified!==true||d.sourceGeometryProduced!==false||
      !safe(d))fail('DIAGNOSTIC_HASH_CHAIN_'+id);
   diagnostic={status:'LITERAL_ORIGINAL_DIAGNOSTIC_AVAILABLE',
    literalFindings:d.literalFindings.map(x=>({code:x.code,path:x.path})),
    report:'../'+record.file,sha256:H(bytes)};
  }else diagnostic={status:'HOLD_DIAGNOSTIC_UNAVAILABLE',
   reason:record.reason??'Diagnostic not available'};
 }else if(entry.status!=='HOLD_PROVIDER_COMPLETION_UNPROVEN')
  fail('UNRECOGNIZED_SOURCE_STATUS_'+id);
 return {status:entry.status,originalSha256:entry.originalSha256,
  geometrySha256:entry.geometrySha256??null,source3D,
  diagnostic,r4Status:entry.r4Status,sectionStatus:entry.sectionStatus,
  modelClaimed:entry.modelClaimed??null,providerIdentityVerified:false,
  constructionOrArtCertified:false};
}
function page(report){
 const stage=(id,e)=>{
  const link=e.source3D?'<a href="'+esc(e.source3D)+'">元B143の真正3Dを観察</a>':
   '無効または未完成のB143：3Dを捏造しない';
  const issues=e.diagnostic?.literalFindings?.length?
   '<details><summary>原文上の失敗箇所</summary><ul>'+
    e.diagnostic.literalFindings.map(x=>'<li>'+esc(x.code)+' / '+esc(x.path)+'</li>').join('')+
    '</ul><a href="'+esc(e.diagnostic.report)+'">原文診断JSON</a></details>':'';
  return '<section><h2>候補'+id+'</h2><p>'+esc(e.status)+'</p><p>'+link+
   '</p><dl><dt>モデル原文SHA</dt><dd>'+esc(e.originalSha256)+'</dd>'+
   '<dt>R4機能判定</dt><dd>'+esc(e.r4Status)+'</dd>'+
   '<dt>断面・入口判定</dt><dd>'+esc(e.sectionStatus)+'</dd></dl>'+issues+'</section>';
 };
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R190-BK｜真正モデル比較の証拠の段階</title>'+
  '<style>body{margin:28px auto;max-width:1180px;padding:0 16px;font:15px/1.6 system-ui;background:#111b2b;color:#edf3f9}a{color:#92d6ff}main{display:grid;grid-template-columns:1fr 1fr;gap:16px}section{border:1px solid #50647b;border-radius:10px;padding:18px;min-width:0}dd{overflow-wrap:anywhere;margin-bottom:12px}dt{font-weight:600}h1{font-size:24px}h2{font-size:18px}aside{border-left:3px solid #e8bd74;padding:10px 16px;background:#273549;margin-bottom:20px}li{overflow-wrap:anywhere}@media(max-width:780px){main{grid-template-columns:1fr}}</style>'+
  '<h1>R190-BK｜モデル回答の有効性と建築品質の証拠</h1>'+
  '<aside>ART HOLD・正式採用0・施工禁止。保存原文の契約、真正3D、R4、断面と人間審査は別々の段階。モデル名、SHA、合成テストだけから建築の優劣を認定しない。未完成原文から見本の3Dを補完しない。</aside>'+
  '<p>候補Bの指示方式：'+esc(report.candidatePromptKind)+
   '／状態：'+esc(report.status)+'</p><main>'+
  stage('A',report.A)+stage('B',report.B)+'</main>'+
  (report.humanReviewAvailable?
   '<p><a href="../R190BG_HUMAN_REVIEW/R190BG_REVIEW.html">元形状の人間審査画面へ</a></p>':
   '<p>両方の真正B143が揃わないため、A/B美術採点画面は利用不可です。</p>')+
  '<h2>次の判断</h2><p>'+esc(report.nextAction)+'</p>'+
  '<p>人間によるレビュー原文：'+esc(report.humanReviewStatus)+'</p>'+
  '<p>比較結果は技術的な観測に限定。実モデル由来と申告された回答も、プロバイダー真正性は独立認証されていません。'+
  '単発のA/Bで因果改善・汎用性能を断定しません。</p></html>';
}
export function buildR190BKOffline({comparisonDir,observationsFile=null}){
 if(typeof comparisonDir!=='string'||!path.isAbsolute(comparisonDir)||
   !directory(comparisonDir))fail('COMPARISON_DIRECTORY');
 const out=path.join(comparisonDir,'R190BK_EVIDENCE');
 if(fs.existsSync(out))fail('FRESH_OUTPUT_REQUIRED');
 const bfRaw=file(comparisonDir,'R190BF_CONTROLLED_PAIR.json');
 const beRaw=file(comparisonDir,'R190BE_COMPARE.json');
 const bf=parse(bfRaw,'BF'),be=parse(beRaw,'BE'),beSha=H(beRaw);
 if(bf.schema!=='minecraftaibuilder-r190bf-locked-pair-v1'||
    be.schema!=='minecraftaibuilder-r190be-saved-design-comparison-v1'||
    !validHash(bf.protocolSha256)||bf.savedComparisonReportSha256!==beSha||
    !safe(bf)||!safe(be)||be.modelCalls!==0||
    bf.result!=='SOURCE_PAIR_COMPARE_ONLY_ART_HOLD'||
    bf.generationModelDigestVerified!==false||
    be.winner!=='NOT_ESTABLISHED'||be.qualityImprovement!=='NOT_ESTABLISHED')
   fail('BF_BE_EVIDENCE_CHAIN');
 const A=candidate(comparisonDir,'A',be,bf,beSha);
 const B=candidate(comparisonDir,'B',be,bf,beSha);
 const humanReviewAvailable=bf.humanReviewStatus==='READY_FOR_UNSCORED_HUMAN_REVIEW';
 const bgDir=path.join(comparisonDir,'R190BG_HUMAN_REVIEW');
 let manifestHash=null,humanReviewStatus='NOT_RECORDED';
 if(humanReviewAvailable){
  const data=file(bgDir,'R190BG_REVIEW_MANIFEST.json',150000);
  const bg=parse(data,'BG');
  if(H(data)!==bf.humanReviewManifestSha256||
     bf.humanReviewManifestBytesVerified!==true||
     bg.comparisonSha256!==beSha||
     bg.candidates?.A?.originalSha256!==A.originalSha256||
     bg.candidates?.B?.originalSha256!==B.originalSha256||
     !safe(bg))fail('BG_EVIDENCE_CHAIN');
  file(bgDir,'R190BG_REVIEW.html');
  manifestHash=H(data);
  if(observationsFile!==null){
   const validated=validateR190BGObservations({reviewDir:bgDir,observationsFile});
   humanReviewStatus=validated.status;
  }
 }else if(observationsFile!==null||bf.humanReviewManifestSha256!==null||
  bf.humanReviewStatus!=='HOLD_NO_VALID_B143_PAIR')
  fail('NO_VALID_BG_TO_REVIEW');
 const same=be.status==='NO_PHYSICAL_CHANGE_ART_HOLD';
 const status=!A.source3D||!B.source3D?
  'HOLD_NOT_BOTH_VALID_B143':same?
  'NO_PHYSICAL_DIFFERENCE_ART_HOLD':'SOURCE_PAIR_REVIEWABLE_ART_HOLD';
 const nextAction=status==='HOLD_NOT_BOTH_VALID_B143'?
  'モデル自身が原文の形式・空間を整合させることが必要。無効な候補をホストが修復して有利な比較にしない。':
  same?'最終ボクセルが同一のため造形改善は示されていない。必要な場合だけ用途・体験を人間が観察する。':
  '双方の元形状を人間が観察し、内部・動線・屋根・空洞・美術を独立評価する。';
 const report={schema:R190BK_SCHEMA,status,
  candidatePromptKind:be.candidatePromptKind??'BC_DESIGN_FIRST',
  bfReportSha256:H(bfRaw),beReportSha256:beSha,
  protocolSha256:bf.protocolSha256,
  originalBriefSha256:be.originalBriefSha256,
  physicalChangeProven:status==='SOURCE_PAIR_REVIEWABLE_ART_HOLD',
  A,B,humanReviewAvailable,humanReviewManifestSha256:manifestHash,
  humanReviewStatus,nextAction,
  automaticWinner:'NOT_ESTABLISHED',
  independentProviderIdentityVerified:false,
  architecturalQualityImprovement:'NOT_ESTABLISHED',
  onePairCausalInference:'NOT_ESTABLISHED',
  generated3DFromInvalidSource:false,...safety()};
 // No writes until all source and requested human receipt checks succeed.
 if(H(file(comparisonDir,'R190BF_CONTROLLED_PAIR.json'))!==H(bfRaw)||
    H(file(comparisonDir,'R190BE_COMPARE.json'))!==beSha)
  fail('INPUT_CHANGED');
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'R190BK_EVIDENCE.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(out,'R190BK_REVIEW.html'),page(report),{flag:'wx'});
 return {...report,directory:out};
}
export function parseR190BKArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==2&&argv.length!==4)fail('FLAGS');
 const p={};for(let i=0;i<argv.length;i+=2){
  const k={'--compare':'comparisonDir','--observations':'observationsFile'}[argv[i]];
  if(!k||Object.hasOwn(p,k)||!argv[i+1])fail('FLAGS');p[k]=path.resolve(argv[i+1]);
 }
 if(!p.comparisonDir)fail('FLAGS');return p;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const o=parseR190BKArgs(process.argv.slice(2));
  console.log(JSON.stringify(o.help?{help:'Offline only: --compare BF_COMPARISON_DIR [--observations BG_OBSERVATIONS.json]. No model call.'}:buildR190BKOffline(o),null,2));
 }catch(e){console.error(String(e?.message??e));process.exitCode=1}
}
