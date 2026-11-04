/**
 * Offline follow-up to the existing five-genre PRIVATE author batch.
 * Replays each ORIGINAL saved local response via the existing R125 V4D
 * fail-closed replay boundary. No model requests, network or world writes.
 *
 * This does not make a failed old SOURCE valid with a newer compiler.
 * Replay output remains PRIVATE; export only static issue codes, SOURCE
 * hashes and numeric true B143 projections in a separate safe summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FIVE_INDEPENDENT_BRIEFS} from './r125-v4j-five-genre-local.mjs';
import {replayPrivateV4D} from './r125-v4d-replay-private.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compareV4IPrivateRealB143Silhouettes}
 from './r125-v4i-architectural-art-audit.mjs';
import {actualOrthographicSvg}
 from './r125-v4e-source-art-review.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const error=x=>{throw Error('R125_V4J_FIVE_GENRE_PRIVATE_REPLAY_'+x);};
const within=(a,b)=>a===b||a.startsWith(b+path.sep);
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const code=x=>typeof x==='string'&&/^[A-Z][A-Z0-9_]{1,72}$/.test(x);
const safeIssueCodes=codes=>Array.isArray(codes)?
 [...new Set(codes.filter(code))].slice(0,24):[];
const regular=(fp,max)=>{
 const st=fs.lstatSync(fp);
 if(!st.isFile()||st.isSymbolicLink()||st.size<=0||st.size>max)
  error('PRIVATE_B143_FILE_NOT_REGULAR');
 return fs.readFileSync(fp,'utf8');
};


const htmlEscape=value=>String(value).replace(/[&<>"']/g,ch=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[ch]));
const safeGenre=value=>FIVE_INDEPENDENT_BRIEFS.some(x=>x.genre===value);
const visualName='TRUE_B143_FIVE_VIEWS_PRIVATE.svg';
const safeStatus=value=>typeof value==='string'&&
 /^[A-Z][A-Z0-9_]{1,100}$/.test(value)?value:'UNKNOWN_STATUS';
/**
 * Pure visual reviewer. The replay boundary, not the HTML renderer, decides
 * which independently verified REAL (non-test-double) B143 cases are eligible.
 * Nothing loaded from the network. No inline scripts, private prompts,
 * absolute paths, or model-authenticity/ART approval claims.
 */
export function renderFiveGenrePrivateArtReview(summary){
 if(!summary||!Array.isArray(summary.outcomes)||
  summary.outcomes.length!==FIVE_INDEPENDENT_BRIEFS.length||
  summary.outcomes.some((o,i)=>o.genre!==FIVE_INDEPENDENT_BRIEFS[i].genre)||
  summary.worldWrites!==0||summary.additionalModelCalls!==0||
  summary.userArtAssessment!=='NOT_REVIEWED')
  error('PRIVATE_ART_REVIEW_REQUIRES_SAFE_OFFLINE_SUMMARY');
 const cards=summary.outcomes.map(o=>{
  const genre=htmlEscape(o.genre);
  const original=htmlEscape(safeStatus(o.offlineStatus));
  const isReal=o.independentRealSourceReproduced===true&&
   o.originalWasInjectedTestDouble===false&&
   o.offlineStatus==='SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED'&&
   o.originalResponseIntegrity==='SHA256_MATCH';
  const image=isReal?
   '<img loading="lazy" alt="Verified true B143 five-view projections for '+
    genre+'" src="'+genre+'/'+visualName+'">'+
   '<p><a href="'+genre+'/index.html">この設計の真正B143 3Dビューアを開く</a></p>':
   '<p class="hold">SOURCE HOLD / TEST DOUBLE / モデル実行なし。検証済み実モデル建築画像は表示しません。</p>';
  const codes=(Array.isArray(o.structuralIssueCodes)?o.structuralIssueCodes:[])
   .filter(code).slice(0,12).map(x=>htmlEscape(x)).join(' · ');
  return '<section class="tile"><h2>'+genre+'</h2><p>Offline: <code>'+
   original+'</code></p>'+image+
   (codes?'<p>構造診断コード: <code>'+codes+'</code></p>':'')+
   '<p class="minor">ART: NOT REVIEWED / Minecraft実歩行: NOT TESTED</p></section>';
 }).join('\n');
 const geometry=summary.geometry?.pairwise;
 const pairs=Array.isArray(geometry)?geometry.filter(p=>
  safeGenre(p.genreA)&&safeGenre(p.genreB)&&
  Number.isFinite(p.meanFiveViewSimilarity)&&
  p.meanFiveViewSimilarity>=0&&p.meanFiveViewSimilarity<=1).map(p=>
  '<tr><td>'+htmlEscape(p.genreA)+' / '+htmlEscape(p.genreB)+
  '</td><td>'+p.meanFiveViewSimilarity.toFixed(3)+'</td></tr>').join('\n'):'';
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src &#39;self&#39; file: data:; style-src &#39;unsafe-inline&#39;">'+
  '<title>V4J PRIVATE · 5ジャンル建築ビジュアル比較 · ART HOLD</title>'+
  '<style>body{font:15px/1.55 system-ui,sans-serif;background:#102331;color:#e5f0f7;margin:0;padding:24px}'+
  'header{max-width:1120px;margin:auto auto 20px}h1{font-size:23px}h2{font-size:19px;margin:0 0 6px}'+
  '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:18px;max-width:1500px;margin:auto}'+
  '.tile{background:#1d3647;border:1px solid #446073;border-radius:12px;padding:14px;min-width:0}'+
  'img{width:100%;height:auto;background:#102638;border:1px solid #486b80}'+
  'a{color:#9fdbf7}code{overflow-wrap:anywhere}.hold{border-left:4px solid #d5a766;padding:9px;background:#243849}'+
  '.minor{color:#a9bfcd;font-size:12px}table{border-collapse:collapse;margin:auto;width:min(100%,900px)}'+
  'th,td{border:1px solid #456477;padding:8px;text-align:left}footer{max-width:1000px;margin:24px auto;color:#a9bfcd}</style>'+
  '</head><body><header><h1>V4J · 5ジャンル真正B143視覚比較（PRIVATE）</h1>'+
  '<p>再生済みの保存原文とSOURCE/geometry SHAが一致した、テストダブルではないケースのみ画像を表示します。'+
  '外観が美しい・実用的・用途に適合すると自動認定するものではありません。</p>'+
  '<p><strong>美術判定: ART HOLD / Minecraft実歩行: 未確認 / 世界への書込み: 0</strong></p>'+
  '<p>このHTMLと個別3D/SVGはPRIVATEです。ChatGPTへ共有するのは'+
  ' <code>FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json</code> のみ。</p></header>'+
  '<main class="grid">'+cards+'</main>'+
  (pairs?'<footer><h2>5方向の正規化シルエット類似度（SOURCE指標のみ）</h2>'+
   '<p>値が高いほど投影外形が似ています。美術採点ではありません。</p>'+
   '<table><thead><tr><th>用途ペア</th><th>平均類似度</th></tr></thead><tbody>'+
   pairs+'</tbody></table></footer>':'')+
  '<footer>ローカルファイルのみ。外部通信・追加モデル呼出し・Minecraft施工なし。'+
  'モデル識別の暗号学的証明なし。レビュー開始前のART認定はありません。</footer></body></html>\n';
}

export function parseFiveGenreReplayArgs(args){
 if(args.length!==4||args[0]!=='--study'||args[2]!=='--out'||
  !args[1]||!args[3])error('ARGS_EXPECT_STUDY_AND_NEW_OUT');
 return {study:args[1],out:args[3]};
}

export function replayFiveGenrePrivateBatch(study,out){
 if(typeof study!=='string'||typeof out!=='string'||
  study.length<2||out.length<2)error('FOLDER_ARGS');
 const studyRoot=path.resolve(study),destination=path.resolve(out);
 const studyStat=fs.lstatSync(studyRoot);
 if(!studyStat.isDirectory()||studyStat.isSymbolicLink())
  error('ORIGINAL_BATCH_DIRECTORY_UNSAFE');
 const physicalStudy=fs.realpathSync(studyRoot);
 const physicalRepo=fs.realpathSync(ROOT);
 if(within(physicalStudy,physicalRepo))
  error('PRIVATE_BATCH_INSIDE_REPOSITORY');
 if(fs.existsSync(destination)||within(destination,physicalStudy))
  error('FRESH_SEPARATE_OUTPUT_REQUIRED');
 const destParent=path.dirname(destination);
 const parentStat=fs.lstatSync(destParent),physicalParent=fs.realpathSync(destParent);
 if(!parentStat.isDirectory()||parentStat.isSymbolicLink()||
  within(physicalParent,physicalRepo)||within(physicalParent,physicalStudy))
  error('OUTPUT_PARENT_OUTSIDE_SOURCE_AND_REPOSITORY');
 fs.mkdirSync(destination);
 const outcomes=[],genuineSources=[];let replayAttempts=0;
 for(const item of FIVE_INDEPENDENT_BRIEFS){
  const folder=path.join(physicalStudy,item.genre);
  let status='NOT_ATTEMPTED',sourceReproduced=false,synthetic=false,
   structuralIssueCodes=[],originalResponseIntegrity='NOT_CHECKED',
   promptProtocol='UNAVAILABLE',systemPromptSHA256=null;
  if(fs.existsSync(folder)){
   replayAttempts++;
   try{
    const info=fs.lstatSync(folder);
    if(!info.isDirectory()||info.isSymbolicLink())
     error('PRIVATE_GENRE_FOLDER_UNSAFE');
    const replayRoot=path.join(destination,item.genre);
    const report=replayPrivateV4D(folder,replayRoot);
    status=report.status;
    promptProtocol=report.originalPromptProtocol;
    systemPromptSHA256=report.originalSystemPromptSHA256;
    synthetic=report.originalTestInjectionPresent===true;
    originalResponseIntegrity=report.originalResponseIntegrity;
    structuralIssueCodes=safeIssueCodes(report.structuralDiagnosticIssueCodes);
    if(status==='SOURCE_REPRODUCED_OFFLINE_ART_NOT_REVIEWED'&&!synthetic){
     const file=path.join(replayRoot,'TRUE_B143_REPLAY_SOURCE.json');
     const parsed=JSON.parse(regular(file,1000000));
     const compiled=compileDesign(parsed);
     if(!hex(report.sourceCodeSHA256Original)||
      !hex(report.geometrySHA256Original)||
      report.originalCompilerHashesMatch!==true||
      compiled.sourceSha256!==report.sourceCodeSHA256Original||
      compiled.geometrySha256!==report.geometrySHA256Original||
      compiled.primitives.length<100)
      error('PRIVATE_SOURCE_RECOMPILE_INTEGRITY');
     fs.writeFileSync(path.join(replayRoot,visualName),
      actualOrthographicSvg(compiled.primitives,
       {sourceKind:'PRIVATE_SINGLE_MODEL_ATTEMPT_UNATTESTED'}),{flag:'wx'});
     genuineSources.push({genre:item.genre,primitives:compiled.primitives});
     sourceReproduced=true;
    }
   }catch{
    status='HOLD_REPLAY_INPUT_OR_SOURCE_INTEGRITY';
    sourceReproduced=false;
    // Error strings and all raw private text remain PRIVATE.
   }
  }
  outcomes.push({genre:item.genre,offlineStatus:status,
   originalResponseIntegrity,originalWasInjectedTestDouble:synthetic,
   promptProtocol,systemPromptSHA256,
   independentRealSourceReproduced:sourceReproduced,structuralIssueCodes});
 }
 const codeIndex=new Map();
 for(const outcome of outcomes){
  for(const issue of outcome.structuralIssueCodes){
   if(!codeIndex.has(issue))codeIndex.set(issue,[]);
   codeIndex.get(issue).push(outcome.genre);
  }
 }
 const sharedSourceIssues=[...codeIndex.entries()]
  .filter(([,genres])=>genres.length>=2)
  .map(([issueCode,genres])=>({issueCode,genres,
   sameUnderlyingRootCauseProven:false}));
 let geometry={status:'INSUFFICIENT_INDEPENDENT_REAL_MODEL_SOURCES',
  caseCount:genuineSources.length,pairCount:0,
  humanArchitecturalArt:'NOT_REVIEWED',
  visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'};
 if(genuineSources.length>=2){
  try{geometry=compareV4IPrivateRealB143Silhouettes(genuineSources);}
  catch{geometry={status:'HOLD_OFFLINE_GEOMETRY_COMPARISON',
   caseCount:0,pairCount:0,humanArchitecturalArt:'NOT_REVIEWED',
   visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'};}
 }
 const promptProtocols=Object.entries(outcomes.reduce((counts,o)=>{
  counts[o.promptProtocol]=(counts[o.promptProtocol]??0)+1;
  return counts;
 },Object.create(null))).map(([promptProtocol,count])=>({promptProtocol,count}));
 const issueIndex=new Map();
 for(const o of outcomes){
  if(o.originalWasInjectedTestDouble||o.originalResponseIntegrity!=='SHA256_MATCH')continue;
  for(const issue of o.structuralIssueCodes){
   if(!issueIndex.has(issue))issueIndex.set(issue,[]);
   issueIndex.get(issue).push(o.genre);
  }
 }
 const nonInjectedShaMatchedIssueFrequency=[...issueIndex.entries()]
  .map(([issueCode,genres])=>({issueCode,genreCount:genres.length,genres,
   sameUnderlyingRootCauseProven:false}))
  .sort((a,b)=>b.genreCount-a.genreCount||a.issueCode.localeCompare(b.issueCode));
 const summary={
  schema:'minecraftaibuilder-r125-v4j-five-genre-zero-model-call-offline-replay-v1',
  inputIsPrivateExistingOriginal:true,originalFilesMutated:false,
  additionalModelCalls:0,networkCalls:0,worldContacts:0,worldWrites:0,
  attemptedOfflineReplays:replayAttempts,
  sourceReproducedCount:outcomes.filter(x=>x.independentRealSourceReproduced).length,
  outcomes,sharedSourceIssues,geometry,
  promptProtocols,nonInjectedShaMatchedIssueFrequency,
  promptProtocolAttribution:'MATCHING_PRIVATE_MANIFESTS_NOT_MODEL_AUTHENTICITY',
  syntheticRunsNeverPromoted:true,
  noRawModelTextOrPromptsOrAbsolutePathsIncluded:true,
  userArtAssessment:'NOT_REVIEWED',realMinecraftWalking:'NOT_TESTED',
  modelIdentityCryptographicallyAuthenticated:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 fs.writeFileSync(path.join(destination,'FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(destination,'FIVE_GENRES_PRIVATE_ART_REVIEW.html'),
  renderFiveGenrePrivateArtReview(summary),{flag:'wx'});
 return summary;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const o=parseFiveGenreReplayArgs(process.argv.slice(2));
  const r=replayFiveGenrePrivateBatch(o.study,o.out);
  console.log(JSON.stringify({replayed:r.attemptedOfflineReplays,
   genuineSourceReproduced:r.sourceReproducedCount,
   sharedIssueGroups:r.sharedSourceIssues.length,
   modelCalls:0,worldWrites:0,
   onlyShare:'FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json'}));
 }catch(e){
  console.error('R125_V4J_FIVE_GENRE_OFFLINE_REPLAY_HOLD',
   String(e?.message??e).replace(/(?:[A-Za-z]:\\|\/)[^\s]*/g,'[private]'));
  process.exitCode=2;
 }
}
