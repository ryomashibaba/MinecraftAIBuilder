/**
 * B198Z-R13 CLI: analyze previously captured R6 folder OFFLINE.
 * Never modifies the original capture; writes report to a NEW directory.
 * No browser, localhost, Qwen, Minecraft or model API access.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeR13SavedCapture}
 from '../source/ai/b198zr13-quality-decision.mjs';

const fail=why=>{throw Error('B198ZR13_CLI_'+why)};
const yes=(b,s)=>{if(!b)fail(s)};
const html=s=>String(s??'—').replaceAll('&','&amp;')
 .replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'",'&#39;');
function optionalJson(file){
 if(!fs.existsSync(file))return null;
 const info=fs.statSync(file);
 yes(info.isFile()&&info.size<=300000,'OVERSIZE_OR_INVALID_JSON_EVIDENCE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
export function renderR13QualityReport(report){
 yes(report?.schema==='minecraftaibuilder-b198zr13-quality-decision-v1',
  'EXPECTED_PINNED_R13_REPORT');
 const row=(label,value)=>`<tr><th>${html(label)}</th><td>${html(value)}</td></tr>`;
 const criteria=report.frozenHumanReview.map((c,i)=>`<li><b>${i+1}. ${html(c.question)}</b><p>未審査 — 3Dを見て人間が判断してください</p></li>`).join('');
 const issues=report.evidenceProvenance.discrepancies.map(s=>`<li>${html(s)}</li>`).join('');
 const reason=report.source.sourceError||report.declaredFunctionality.issue||'—';
 return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>R13 建築品質の判定準備（オフライン）</title>
<style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Yu Gothic",sans-serif;color:#152a3c;background:#f6f8fa}
*{box-sizing:border-box}body{max-width:940px;margin:0 auto;padding:36px 22px;line-height:1.7}
header{border-bottom:2px solid #cbd5df;padding-bottom:18px;margin-bottom:25px}
h1{font-size:clamp(1.5rem,3vw,2.2rem);line-height:1.35}h2{font-size:1.25rem;margin-top:36px}
section{background:#fff;border:1px solid #d7dfe8;border-radius:12px;padding:20px;margin-bottom:14px}
small,footer{color:#566579}table{width:100%;border-collapse:collapse;overflow-wrap:anywhere}
th,td{padding:9px 6px;border-bottom:1px solid #e3e8ee;text-align:left;vertical-align:top}
th{width:38%;color:#4f5e6d;font-weight:600}
li{margin:10px 0}li p{margin:2px 0;color:#657482;font-size:.94rem}
code{overflow-wrap:anywhere} .verdict{font-weight:700;font-size:1.05rem}
</style></head><body>
<header><small>MinecraftAIBuilder · R13 / 本物の建築審査とは別 / 完全オフライン</small>
<h1>建築品質の判定準備レポート</h1>
<p class="verdict">${html(report.status)}</p>
<p>この資料は過去に保存されたAI応答の検査です。Minecraftへの施工許可でも、建築の美しさの自動認定でもありません。</p></header>
<section><h2>設計要求（原文）</h2><p>${html(report.frozenRequest)}</p></section>
<section><h2>保存された原本の完全性</h2><table>
${row('原本のSHA-256',report.rawSha256)}
${row('原本サイズ',report.rawUtf8Bytes+' bytes')}
${row('JSONの構文',report.source.parsedAsJson?'解析可能':'途中終了または形式不正')}
${row('正確な4キー',report.source.completeExactlyFourKeys?'あり':'なし')}
${row('保存原本の改変','なし')}
${row('評価時のエラー',reason)}
${row('証拠の照合',report.evidenceProvenance.discrepancies.length?'不一致':'発見された不一致なし（認証ではない）')}
${row('AI作者の独立認証','未実施')}
</table>${issues?`<p>証拠の不一致：</p><ul>${issues}</ul>`:''}</section>
<section><h2>機械で検証できた建築形状</h2><table>
${row('厳格B143コンパイル',report.source.geometryStatus)}
${row('形状の最終ボクセル数',report.source.compiledVoxels)}
${row('ソース要素数',report.source.modelAuthoredElementCount)}
${row('凍結した目標寸法・素材等の達成',report.machineAuditedGeometry?.sourceGoalsStatus??'未検証')}
${row('モデルが宣言した動線',report.declaredFunctionality.status)}
${row('実際のMinecraftプレイヤー歩行','未検証')}
</table></section>
<section><h2>人間が3Dを見て判断する項目</h2>
<p>下記は「未審査」です。項目が存在することだけでは得点や合格にはなりません。</p><ol>${criteria}</ol>
<p>既存のB198W 3Dビューアーと評価票があれば、視覚と意味の判断に利用してください。</p></section>
<section><h2>利用状況と安全</h2><table>
${row('今回の分析で使用したQwen推論','0回')}
${row('Ollama出力トークン（記録された場合）',report.nativeTelemetryClaim.outputTokens)}
${row('終了理由（記録された場合）',report.nativeTelemetryClaim.serverDoneReason)}
${row('データ利用可能状態',report.safety.readiness)}
${row('施工許可','禁止')}
${row('安全ゲート',report.safety.gates.length+' / 9 BLOCKED')}
</table></section>
<footer>このレポートは独立した記録です。元のR6原本や既存レポートは改変されていません。建築の意匠品質、実Minecraft内の歩行、AIモデルの同一性は未認証です。</footer>
</body></html>`;
}
export function writeR13Report({evidenceDir,outDir,caseId='c01'}={}){
 yes(typeof evidenceDir==='string'&&typeof outDir==='string'&&
  evidenceDir.length>0&&outDir.length>0,'INPUT_OUTPUT_REQUIRED');
 const src=fs.realpathSync(path.resolve(evidenceDir)),
  dest=path.resolve(outDir);
 yes(src!==dest&&!dest.startsWith(src+path.sep)&&
  !src.startsWith(dest+path.sep),'OUTPUT_MUST_BE_SEPARATE_FROM_EVIDENCE');
 yes(fs.statSync(src).isDirectory()&&!fs.existsSync(dest)&&
  fs.existsSync(path.dirname(dest)),'OUTPUT_MUST_BE_NEW');
 const rawFile=path.join(src,'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
 yes(fs.existsSync(rawFile)&&fs.statSync(rawFile).isFile()&&
  fs.statSync(rawFile).size>0&&fs.statSync(rawFile).size<=120000,
  'SAVED_MODEL_ORIGINAL_REQUIRED');
 const raw=fs.readFileSync(rawFile,'utf8');
 const receipt=optionalJson(path.join(src,'R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json'));
 const runResult=optionalJson(path.join(src,'R6_SINGLE_CAPTURE_RESULT.json'));
 const report=analyzeR13SavedCapture({raw,caseId,receipt,runResult});
 // No overwrite or write into input directory; output files are derived only.
 const printable=renderR13QualityReport(report);
 fs.mkdirSync(dest,{recursive:false});
 fs.writeFileSync(path.join(dest,'R13_OFFLINE_QUALITY_DECISION.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(dest,'R13_OFFLINE_QUALITY_OVERVIEW.html'),
  printable,{flag:'wx'});
 return {status:report.status,
  outputFiles:['R13_OFFLINE_QUALITY_DECISION.json',
   'R13_OFFLINE_QUALITY_OVERVIEW.html'],
  originalRawSha256:report.rawSha256,sourceOnly:true,
  modelCalls:0,worldWrites:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  yes(args.length===4&&args[0]==='--evidence'&&args[2]==='--out',
   'USAGE_EVIDENCE_DIR_AND_NEW_OUT_DIR');
  const result=writeR13Report({evidenceDir:args[1],outDir:args[3]});
  console.log('R13_OFFLINE_CAPTURE_AUDIT',JSON.stringify(result));
 }catch(e){
  console.error('R13_AUDIT_HOLD',String(e?.message??e).slice(0,190));
  process.exitCode=1;
 }
}
