/** B136: verified B135 artifact overlay with two-stair test-world builder & motion logger. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB135Kit,verifyB135Kit} from '../../b135/main/b135-package.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const SELF='source/parallel/b136/main/b136-traversal.mjs';
const PRIOR='source/parallel/b135/main/b135-controlled-live.mjs';
const HASH=b=>createHash('sha256').update(b).digest('hex');
const DIRS={EAST:0,SOUTH:2,WEST:1,NORTH:3};
export const B136_CMD=[
 '@echo off','setlocal','chcp 65001 >nul','pushd "%~dp0"',
 'where node >nul 2>nul','if errorlevel 1 goto ERROR',
 'node -e "if(Number(process.versions.node.split('+"'"+'.'+"'"+')[0]) < 22) process.exit(2)"',
 'if errorlevel 1 goto ERROR',
 'if /I "%~1"=="--check" goto CHECK',
 'if not "%~1"=="" goto ERROR',
 'if not exist "node_modules\\socket-be\\package.json" (',
 '  echo Installing socket-be 2.8.0...',
 '  call npm.cmd install --ignore-scripts --no-audit --no-fund --omit=dev',
 '  if errorlevel 1 goto ERROR',
 ')',
 'node source\\parallel\\b136\\main\\b136-traversal.mjs --live',
 'set "RC=%errorlevel%"',
 'pause','popd','endlocal & exit /b %RC%',
 ':CHECK',
 'node source\\parallel\\b136\\main\\b136-traversal.mjs --layout 123 -60 -18 EAST',
 'set "RC=%errorlevel%"','popd','endlocal & exit /b %RC%',
 ':ERROR','echo B136 launch failed. No block changes.',
 'pause','popd','endlocal & exit /b 1'
].join('\r\n')+'\r\n';
export function overlayB136Kit({
 root=ROOT,
 out=path.join(ROOT,'b136-review-output','B136_Live_Stair_Traversal')
}={}){
 const inherited=verifyB135Kit(out);
 if(inherited.initialRealGameEvidence!==0||inherited.constructionAllowed!==false||
    inherited.readiness!=='NOT_PREPARED'||inherited.operations.length!==0)
  throw Error('B136_INHERITED_PACKAGE_UNSAFE');
 const dst=path.join(out,SELF);
 fs.mkdirSync(path.dirname(dst),{recursive:true});
 fs.copyFileSync(path.join(root,SELF),dst);
 const manifest={
  schema:'minecraftaibuilder-b136-traversal-v1',
  sourceSha256:HASH(fs.readFileSync(dst)),
  b135SourceSha256:HASH(fs.readFileSync(path.join(out,PRIOR))),
  readbackMapping:DIRS,
  calibrationSource:'B135 R1-R4 real-world JSON + operator-confirmed rise direction 2026-10-16',
  allowedCommands:['testforblock','querytarget','setblock'],
  maxAddedStairs:2,
  massConstructionAllowed:false,
  initialActualWalkCaptures:0,
  initialIndependentCollisionPasses:0,
  initialGameContacts:0,
  constructionAllowed:false,
  readiness:'NOT_PREPARED',
  operations:[]
 };
 fs.writeFileSync(path.join(out,'B136_TRAVERSAL_MANIFEST.json'),
  JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'START_B136_TRAVERSAL.cmd'),B136_CMD);
 fs.writeFileSync(path.join(out,'B136_START_HERE_JA.txt'),[
  'B136 — Minecraft Education実機：3段階段の走行・衝突候補の計測',
  'B135の4実測とユーザーの目視対応を固定：0東、2南、1西、3北。',
  '本番ワールドは存在せず、すべてテストワールド。実験に個別承認不要。',
  '',
  '1. ZIP展開後、START_B136_TRAVERSAL.cmdをダブルクリック。',
  '2. 既にあるオーク階段1段目のXYZと、高い側の向き EAST/SOUTH/WEST/NORTH を入力。',
  '3. Minecraft Educationで /wsserver 127.0.0.1:8000 を実行。',
  '4. 接続直後に既存の3段を読み取り照合。足りない場合は !b136-build 。',
  '5. !b136-build は既存の1段目を変えず、上方向の2段分を「空気」であることを',
  '   読み取ってから、オーク階段2個のみ安全に設置する。',
  '   既存の建物やブロックがあれば設置を拒否。階段上2ブロックの空間も確認。',
  '   地面や支持ブロックの自動施工はしない。進入・落下に注意。',
  '6. 一段目の手前から上へ歩きながら !b136-up を実行。',
  '   約8秒で単一プレイヤーのXYZ座標を最大32回取得する。',
  '7. 上側から降りながら !b136-down を実行。',
  '8. data/B136_Live_Diagnostics/B136_UP_*.json および B136_DOWN_*.json を確認。',
  '   見かけの高度上昇は歩行判定の候補にすぎず、衝突PASSとはしない。',
  '9. テスト用に自動追加した2段だけ撤去する場合は !b136-clean 。',
  '   置き換えられた他のブロックを削除せず、最初の1段には触れない。',
  '10. !b136-exit で終了。必ずcleanを実行してから閉じることを推奨。',
  '必ずテスト用の安全な足場・回避路を確保すること。既存の破損に注意。',
  'ワールドに複数プレイヤーがいると座標の対応を自動判定せずUNKNOWN。',
  '検証済みの対応表はユーザーの視覚確認であり独立した歩行認証ではない。',
  '15棟/66階床/102階段、9 HOLD、9 BLOCKED、NOT_PREPAREDを維持。',
  'main未変更。成果物ZIPには実機ログ・認証済み歩行結果は同梱しない。'
 ].join('\r\n')+'\r\n');
 return verifyB136Kit(out);
}
export function buildB136Kit({
 root=ROOT,
 b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b136-review-output','B136_Live_Stair_Traversal')
}={}){
 buildB135Kit({root,b129Output,out});
 return overlayB136Kit({root,out});
}
export function verifyB136Kit(out){
 const inherited=verifyB135Kit(out);
 const m=JSON.parse(fs.readFileSync(path.join(out,'B136_TRAVERSAL_MANIFEST.json')));
 if(m.schema!=='minecraftaibuilder-b136-traversal-v1'||
    m.sourceSha256!==HASH(fs.readFileSync(path.join(out,SELF)))||
    m.b135SourceSha256!==HASH(fs.readFileSync(path.join(out,PRIOR)))||
    JSON.stringify(m.readbackMapping)!==JSON.stringify(DIRS)||
    m.allowedCommands?.join(',')!=='testforblock,querytarget,setblock'||
    m.maxAddedStairs!==2||m.massConstructionAllowed!==false||
    m.constructionAllowed!==false||m.initialActualWalkCaptures!==0||
    m.initialIndependentCollisionPasses!==0||m.operations?.length!==0||
    inherited.constructionAllowed!==false||inherited.operations.length!==0||
    fs.readFileSync(path.join(out,'START_B136_TRAVERSAL.cmd'),'utf8')!==B136_CMD)
  throw Error('B136_PACKAGE_TAMPER_OR_UNSAFE');
 return {folder:out,launcher:'START_B136_TRAVERSAL.cmd',
  readyForTestWorldOnly:true,initialWalkCaptures:0,
  constructionAllowed:false,readiness:'NOT_PREPARED',operations:[]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=process.argv[2]==='--reuse'
  ?overlayB136Kit({out:path.resolve(process.argv[3])})
  :buildB136Kit();
 console.log(JSON.stringify(result,null,2));
}
