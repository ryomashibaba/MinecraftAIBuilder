/** B135 portable overlay on verified B134 Windows kit. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB134Kit,verifyB134Kit} from '../../b134/main/b134-package.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const FILE='source/parallel/b135/main/b135-controlled-live.mjs';
const PREVIOUS='source/parallel/b134/main/b134-live-probe.mjs';
const HASH=x=>createHash('sha256').update(x).digest('hex');
export const B135_CMD=[
 '@echo off','setlocal','chcp 65001 >nul','pushd "%~dp0"',
 'if errorlevel 1 goto ERROR',
 'where node >nul 2>nul','if errorlevel 1 goto ERROR',
 'node -e "if(Number(process.versions.node.split('+"'"+'.'+"'"+')[0]) < 22) process.exit(2)"',
 'if errorlevel 1 goto ERROR',
 'if /I "%~1"=="--check" goto CHECK',
 'if not "%~1"=="" goto ERROR',
 'if not exist "node_modules\\socket-be\\package.json" (',
 '  echo Installing socket-be 2.8.0 for first-time connection...',
 '  call npm.cmd install --ignore-scripts --no-audit --no-fund --omit=dev',
 '  if errorlevel 1 goto ERROR',
 ')',
 'node source\\parallel\\b135\\main\\b135-controlled-live.mjs --live',
 'set "RC=%errorlevel%"',
 'pause','popd','endlocal & exit /b %RC%',
 ':CHECK',
 'node source\\parallel\\b135\\main\\b135-controlled-live.mjs --commands 122 104 -138',
 'set "RC=%errorlevel%"','popd','endlocal & exit /b %RC%',
 ':ERROR','echo B135 preflight or launch failed; no game block edits.',
 'pause','popd','endlocal & exit /b 1'
].join('\r\n')+'\r\n';
export function overlayB135Kit({
 root=ROOT,
 out=path.join(ROOT,'b135-review-output','B135_Controlled_Live_Test_World')
}={}){
 const old=verifyB134Kit(out);
 if(old.gameTestedHere!==false||old.constructionAllowed!==false||
    old.operations.length!==0||old.previous.original.recordCount!==0)
  throw Error('B135_INHERITED_PACKAGE_UNSAFE');
 const dst=path.join(out,FILE);
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.copyFileSync(path.join(root,FILE),dst);
 const manifest={
  schema:'minecraftaibuilder-b135-controlled-live-v1',
  sourceSha256:HASH(fs.readFileSync(dst)),
  b134SourceSha256:HASH(fs.readFileSync(path.join(out,PREVIOUS))),
  allowedCommands:['testforblock'],
  maxRounds:4,
  manualWalkabilityVerificationRequired:true,
  initialAuthenticatedGameObservations:0,
  productionWorldExists:false,
  constructionAllowed:false,
  readiness:'NOT_PREPARED',
  operations:[]
 };
 fs.writeFileSync(path.join(out,'B135_CONTROLLED_READBACK_MANIFEST.json'),
  JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'START_B135_CONTROLLED_LIVE.cmd'),B135_CMD);
 fs.writeFileSync(path.join(out,'B135_START_HERE_JA.txt'),[
  'B135 — Minecraft Education 自動階段方向校正 / 実機診断',
  'ユーザー確認済み：本番ワールドは存在せず、すべてテストワールドです。',
  '1. ZIPを展開し START_B135_CONTROLLED_LIVE.cmd をダブルクリック。',
  '2. テスト中のオーク階段のXYZ整数3個を入力（既存階段可）。',
  '3. Minecraft Educationで /wsserver 127.0.0.1:8000 と入力。',
  '4. 接続すると6件の testforblock による1回目の照合が自動で始まります。',
  '5. 必要なら同じ座標の階段の向きを手で変え、チャット !b135 で再照合。',
  '   最大4ラウンドの記録が終わると自動終了。',
  '6. 途中で終了する時はチャット !b135-stop または WindowsでCtrl+C。',
  '実行中は setblock/fill/teleportを送信しません。階段も設置しません。',
  '読み取り結果は data/B135_Live_Diagnostics/ にラウンドごとに保存。',
  '通常のオーク階段がある陽性対照とbedrockではない陰性対照を先に確認。',
  'successCountがなくても、対照から実行失敗のstatusCodeを実測で較正します。',
  '対照に矛盾があれば全状態を不明と判定します。',
  'ステートが1個に絞れても、ゲームで実際に歩けるかは未検証のまま。',
  '実際の階段方位を目視し、後続工程で移動・当たり判定も検証してください。',
  '15棟66階床102階段、HOLD9、BLOCKED9、NOT_PREPARED、main未変更。',
  '初回のみsocket-be@2.8.0をnpmで取得。Node.js 22+ が必要。',
  'この配布ZIPはゲーム実機の成功結果を一切含みません。'
 ].join('\r\n')+'\r\n');
 return verifyB135Kit(out);
}
export function buildB135Kit({
 root=ROOT,
 b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b135-review-output','B135_Controlled_Live_Test_World')
}={}){
 buildB134Kit({root,b129Output,out});
 return overlayB135Kit({root,out});
}
export function verifyB135Kit(out){
 const inherited=verifyB134Kit(out);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'B135_CONTROLLED_READBACK_MANIFEST.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-b135-controlled-live-v1'||
    manifest.sourceSha256!==HASH(fs.readFileSync(path.join(out,FILE)))||
    manifest.b134SourceSha256!==HASH(fs.readFileSync(path.join(out,PREVIOUS)))||
    manifest.allowedCommands?.length!==1||manifest.allowedCommands[0]!=='testforblock'||
    manifest.maxRounds!==4||manifest.constructionAllowed!==false||
    manifest.operations?.length!==0||
    fs.readFileSync(path.join(out,'START_B135_CONTROLLED_LIVE.cmd'),'utf8')!==B135_CMD||
    inherited.gameTestedHere!==false||
    inherited.constructionAllowed!==false||inherited.operations?.length!==0)
  throw Error('B135_TAMPER_OR_UNSAFE');
 return {
  folder:out,
  launcher:'START_B135_CONTROLLED_LIVE.cmd',
  roundsAvailable:4,
  initialRealGameEvidence:0,
  constructionAllowed:false,
  readiness:'NOT_PREPARED',
  operations:[]
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=process.argv[2]==='--reuse'
  ?overlayB135Kit({out:path.resolve(process.argv[3])})
  :buildB135Kit();
 console.log(JSON.stringify(result,null,2));
}
