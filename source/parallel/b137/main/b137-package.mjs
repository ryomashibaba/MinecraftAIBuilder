/** B137 verified portable overlay on real-tested B136 code and safety manifests. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB136Kit,verifyB136Kit} from '../../b136/main/b136-package.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const SELF='source/parallel/b137/main/b137-landing-live.mjs';
const PREVIOUS='source/parallel/b136/main/b136-traversal.mjs';
const HASH=b=>createHash('sha256').update(b).digest('hex');
export const B137_CMD=[
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
 'node source\\parallel\\b137\\main\\b137-landing-live.mjs --live',
 'set "RC=%errorlevel%"','pause','popd','endlocal & exit /b %RC%',
 ':CHECK',
 'node source\\parallel\\b137\\main\\b137-landing-live.mjs --layout 123 -60 -18 NORTH',
 'set "RC=%errorlevel%"','popd','endlocal & exit /b %RC%',
 ':ERROR','echo B137 setup failed. No game-world modifications.',
 'pause','popd','endlocal & exit /b 1'
].join('\r\n')+'\r\n';
export function overlayB137Kit({
 root=ROOT,
 out=path.join(ROOT,'b137-review-output','B137_Live_Landing_Connection')
}={}){
 const inherited=verifyB136Kit(out);
 if(inherited.initialWalkCaptures!==0||inherited.constructionAllowed!==false||
  inherited.readiness!=='NOT_PREPARED'||inherited.operations.length!==0)
  throw Error('B137_INHERITED_SAFETY_FAILURE');
 const dest=path.join(out,SELF);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,SELF),dest);
 const manifest={
  schema:'minecraftaibuilder-b137-landing-v1',
  sourceSha256:HASH(fs.readFileSync(dest)),
  b136SourceSha256:HASH(fs.readFileSync(path.join(out,PREVIOUS))),
  existingB136OperatorClaim:{upJumpFree:true,downJumpFree:true,
    upRise:3,downRise:-3,
    proofClass:'USER_REPORTED_CONSOLE_AND_VISUAL_NOT_RAW_JSON'},
  layout:'3 existing/lower stairs + 2 level oak planks + 3 upper stairs',
  allowedCommands:['testforblock','setblock','querytarget'],
  maxNewBlocks:7, preservesExistingB136Stairs:true,
  requiresAirAndHeadroomPrecheck:true,autoRemovesOnlyAddedBlocks:true,
  countdownSeconds:3,
  initialB137GameMeasurements:0,independentlyCertified:false,
  massConstructionAllowed:false,constructionAllowed:false,
  readiness:'NOT_PREPARED',operations:[]
 };
 fs.writeFileSync(path.join(out,'B137_LANDING_MANIFEST.json'),
  JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'START_B137_LANDING.cmd'),B137_CMD);
 fs.writeFileSync(path.join(out,'B137_START_HERE_JA.txt'),[
  'B137 — Minecraft Education 実機連続階段＋踊り場テスト',
  'B136: 3段の自動設置・上り+3/下り-3、両方ジャンプなし実機確認。',
  '新工程: 2ブロックの水平踊り場、さらに3段を追加し、全6段を一気に歩く。',
  '',
  '1. ZIPを別のフォルダーへ展開して START_B137_LANDING.cmd を起動。',
  '2. 階段1段目の座標と、高い側の方向を入力。',
  '   前回の例は 123 -60 -18、NORTH。現在のワールドで確認。',
  '3. Minecraft Educationで /wsserver 127.0.0.1:8000 を入力。',
  '4. 初回の読み取りで、既存のブロックと追加予定の空きを確認。',
  '5. !b137-build を1回入力。空き・頭上空間を検査し最大7個を追加。',
  '   B136の3段が残っていれば2個の踊り場＋3個の新階段のみ（最大5個）。',
  '   B136の追加2段が撤去済みでも、安全確認して不足分を設置。',
  '   既存ブロックや他人の施工を上書きしない。1段目は絶対変更しない。',
  '6. 安全な足場を確保し、下側から !b137-up を送信。',
  '   3秒カウントダウン後、ジャンプせず上り、踊り場を歩いて上の階段へ。',
  '   入力中に歩く必要はない。測定後は上側で停止する。',
  '7. 上側から !b137-down、3秒後に下り始める。',
  '8. その後 data/B137_Live_Diagnostics/B137_UP_*.json と',
  '   B137_DOWN_*.json を送ってください。',
  '9. !b137-clean はB137が追加したブロックだけ除去し、以前の階段を残す。',
  '10. !b137-exit で終了。未撤去のブロックがあれば先にcleanを実行。',
  '',
  '安全: 2組の階段・床は足場や柵の自動施工をしません。落下に注意。',
  '既存ブロックや天井がふさがる場合、施工を実行せずに停止します。',
  '独立した衝突PASSや15棟102階段への施工許可には昇格しません。',
  '9 HOLD/9 BLOCKED/NOT_PREPAREDを維持。全ワールドはテスト用。',
  '当ZIPにはB137の実機測定結果を同梱しません。'
 ].join('\r\n')+'\r\n');
 return verifyB137Kit(out);
}
export function buildB137Kit({
 root=ROOT,
 b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b137-review-output','B137_Live_Landing_Connection')
}={}){
 buildB136Kit({root,b129Output,out});
 return overlayB137Kit({root,out});
}
export function verifyB137Kit(out){
 const inherited=verifyB136Kit(out);
 const m=JSON.parse(fs.readFileSync(path.join(out,'B137_LANDING_MANIFEST.json'),'utf8'));
 if(m.schema!=='minecraftaibuilder-b137-landing-v1'||
  m.sourceSha256!==HASH(fs.readFileSync(path.join(out,SELF)))||
  m.b136SourceSha256!==HASH(fs.readFileSync(path.join(out,PREVIOUS)))||
  m.allowedCommands?.join(',')!=='testforblock,setblock,querytarget'||
  m.maxNewBlocks!==7||m.constructionAllowed!==false||
  m.massConstructionAllowed!==false||m.operations?.length!==0||
  m.initialB137GameMeasurements!==0||m.independentlyCertified!==false||
  m.preservesExistingB136Stairs!==true||
  fs.readFileSync(path.join(out,'START_B137_LANDING.cmd'),'utf8')!==B137_CMD||
  inherited.constructionAllowed!==false||inherited.operations.length!==0)
  throw Error('B137_KIT_TAMPER_OR_UNSAFE');
 return {folder:out,launcher:'START_B137_LANDING.cmd',maxNewTestBlocks:7,
  realGameTestsIncluded:0,constructionAllowed:false,
  readiness:'NOT_PREPARED',operations:[]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=process.argv[2]==='--reuse'
  ?overlayB137Kit({out:path.resolve(process.argv[3])})
  :buildB137Kit();
 console.log(JSON.stringify(result,null,2));
}
