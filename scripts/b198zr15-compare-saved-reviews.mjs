/**
 * R15 CLI — compares SAVED R13 JSON only, with optional independent
 * B198W human rating. This does NOT call a model, read a world, or
 * replace/modify original captures. Never creates HTML with active JS.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateR15Comparison}
 from '../source/ai/b198zr15-evidence-quality-target.mjs';
const fail=message=>{throw Error('B198ZR15_CLI_'+message)};
const esc=x=>String(x??'—').replaceAll('&','&amp;')
 .replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'","&#39;");
const row=(name,a,b)=>`<tr><th>${esc(name)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
function readJson(file){
 if(typeof file!=='string'||file.length>2048)fail('FILE_PATH_BOUNDS');
 const src=fs.realpathSync(path.resolve(file));
 const stat=fs.statSync(src);
 if(!stat.isFile()||stat.size<2||stat.size>900000)fail('FILE_SIZE_OR_TYPE');
 return {path:src,data:JSON.parse(fs.readFileSync(src,'utf8'))};
}
export function renderR15ComparisonHtml(d){
 if(d?.schema!=='minecraftaibuilder-b198zr15-next-real-evidence-quality-target-v1')
  fail('SCHEMA');
 const scores=d.humanReview.scores;
 const rubric=d.frozenCriteria.map((item,i)=>{
  const scored=scores?.[i]??null;
  return `<tr><td>${esc(item.description)}</td><td>${esc(scored?.score??'未採点')}/4</td>
  <td>${esc(scored?.reviewerEvidence??'3Dを見た人間の評価が必要です')}</td></tr>`;
 }).join('');
 const evidenceNote=d.baseline.rawJsonComplete===false&&
  d.candidate.rawJsonComplete===true?
  '以前のJSON途中終了から、今回は形式の完成が確認できました。ただし建築の改善を意味しません。':
  '形式の完成と実際の建築品質は別の判定です。';
 return `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>R15 — 実Qwen再生成の品質比較基準</title>
<style>
:root{font-family:system-ui,-apple-system,"Yu Gothic",sans-serif;color:#1a293b;background:#f8fafc;color-scheme:light}
*{box-sizing:border-box}body{max-width:980px;margin:0 auto;padding:30px 18px;line-height:1.75}
header{border-bottom:1px solid #bcc9d6;padding-bottom:18px}
h1{font-size:clamp(1.6rem,4vw,2.25rem);line-height:1.3}h2{font-size:1.25rem;margin:0 0 12px}
section{margin:22px 0;background:white;border:1px solid #dae2ea;border-radius:10px;padding:18px}
p{margin:.7em 0}table{border-collapse:collapse;width:100%}
td,th{padding:9px;border-bottom:1px solid #e5e9ed;text-align:left;vertical-align:top;overflow-wrap:anywhere}
thead th{font-size:.95rem}ul{padding-left:22px}
small{color:#637387}footer{padding-top:14px;border-top:1px solid #bcc9d6;color:#536477}
</style></head><body>
<header><small>MinecraftAIBuilder · R15 · 完全オフライン判定・施工不可</small>
<h1>次回Qwen結果は改善したか？</h1>
<p><b>現在の判定：${esc(d.decision)}</b></p>
<p>${esc(d.criticalNextStep)}</p>
<p><b>注意：</b>実際の建築品質をAIが採点したレポートではありません。</p></header>
<section><h2>以前の原本と新しい原本</h2>
<table><thead><tr><th>項目</th><th>旧R6などの基準</th><th>次回の候補</th></tr></thead>
<tbody>${row('原本SHA-256',d.baseline.rawSha256,d.candidate.rawSha256)}
${row('R13判定',d.baseline.status,d.candidate.status)}
${row('JSONの完成',d.baseline.rawJsonComplete?'完成':'不完全',d.candidate.rawJsonComplete?'完成':'不完全')}
${row('厳格な幾何・動線',d.baseline.machineStage,d.candidate.machineStage)}
${row('ボクセル数',d.baseline.compiledVoxels,d.candidate.compiledVoxels)}
</tbody></table><p>${esc(evidenceNote)}</p></section>
<section><h2>建築として認めるための4項目</h2>
<p>従来のB198Wの人間評価票をそのまま使います。全項目3点以上、うち2項目以上は4点が「オフラインでの品質目標」です。これは施工許可ではありません。</p>
<table><thead><tr><th>評価項目</th><th>人間の点数</th><th>観察した証拠</th></tr></thead><tbody>${rubric}</tbody></table>
<p>人間の自己申告による点数：${esc(d.humanReview.status)}</p></section>
<section><h2>実用性で残っている検証</h2>
<ul><li>3Dを見た独創性・一体感の人間の判断：${esc(d.humanReview.status)}</li>
<li>高リスク形状の数：${esc(d.machineQualitySignals.highRiskFindings)}</li>
<li>概念ボクセル上の動線：${d.machineQualitySignals.supportedCirculationCertifiedInConceptVoxels?'一定条件で検証済み':'未合格'}</li>
<li>実Minecraft Educationでのアバター歩行：未検証</li>
<li>自然言語による自由な再設計・修正：この単発建築評価だけでは未検証</li>
<li>本当にQwenが書いたことの独立認証：未実施</li>
</ul></section>
<section><h2>安全な次の行動</h2>
<p>${esc(d.criticalNextStep)}</p>
<p>新しいQwen推論が必要になった場合は<strong>新たな明示承認</strong>が必要です。既存の1回の承認を再利用しません。</p>
</section>
<footer>NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] / Minecraft施工禁止。元のモデル回答・既存R13報告は変更していません。</footer>
</body></html>`;
}
export function writeR15Comparison({baselinePath,candidatePath,
 humanPath=null,outDir}={}){
 if(typeof outDir!=='string'||!outDir.trim())fail('NEW_OUTPUT_DIRECTORY_REQUIRED');
 const b=readJson(baselinePath),c=readJson(candidatePath);
 const human=humanPath===null?null:readJson(humanPath);
 const destination=path.resolve(outDir);
 if(fs.existsSync(destination)||!fs.existsSync(path.dirname(destination))||
  [b.path,c.path,human?.path].filter(Boolean).some(file=>
   file===destination||file.startsWith(destination+path.sep)))
  fail('OUTPUT_MUST_BE_NEW_AND_SEPARATE');
 const report=evaluateR15Comparison({baseline:b.data,candidate:c.data,
  human:human?.data??null});
 const html=renderR15ComparisonHtml(report);
 fs.mkdirSync(destination,{recursive:false});
 fs.writeFileSync(path.join(destination,'R15_OFFLINE_COMPARE.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(destination,'R15_OFFLINE_COMPARE.html'),
  html,{flag:'wx'});
 return {decision:report.decision,
  files:['R15_OFFLINE_COMPARE.json','R15_OFFLINE_COMPARE.html'],
  modelCalls:0,minecraftWrites:0,sourceOnly:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  const flags={};
  for(let i=0;i<args.length;i+=2){
   if(i+1>=args.length||!['--baseline','--candidate','--human','--out'].includes(args[i])||
    Object.hasOwn(flags,args[i]))fail('INVALID_ARGUMENTS');
   flags[args[i]]=args[i+1];
  }
  if(!flags['--baseline']||!flags['--candidate']||!flags['--out'])
   fail('EXPECTED_BASELINE_CANDIDATE_OUT');
  const result=writeR15Comparison({
   baselinePath:flags['--baseline'],candidatePath:flags['--candidate'],
   humanPath:flags['--human']??null,outDir:flags['--out']});
  console.log('R15_OFFLINE_COMPARE_COMPLETE',JSON.stringify(result));
 }catch(e){
  console.error('R15_COMPARE_HOLD',String(e?.message??e).slice(0,180));
  process.exitCode=1;
 }
}
