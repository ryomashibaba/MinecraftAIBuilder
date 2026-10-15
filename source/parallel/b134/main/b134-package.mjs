/** B134 portable live bridge: copies and pins B133 offline base without modification. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB133Kit,verifyB133Kit} from '../../b133/main/b133-readonly-kit.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const FILE='source/parallel/b134/main/b134-live-probe.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
export const B134_CMD=[
 '@echo off','setlocal','chcp 65001 >nul','pushd "%~dp0"',
 'where node >nul 2>nul','if errorlevel 1 goto ERROR',
 'node -e "if(Number(process.versions.node.split('+"'"+'.'+"'"+')[0]) < 22) process.exit(2)"',
 'if errorlevel 1 goto ERROR',
 'if /I "%~1"=="--check" goto CHECK',
 'if not "%~1"=="" goto ERROR',
 'if not exist "node_modules\\socket-be\\package.json" (',
 '  echo Installing pinned socket-be dependency for the first run...',
 '  call npm.cmd install --ignore-scripts --no-audit --no-fund --omit=dev',
 '  if errorlevel 1 goto ERROR',
 ')',
 'node source\\parallel\\b134\\main\\b134-live-probe.mjs --live',
 'set "RET=%errorlevel%"','pause','popd','endlocal & exit /b %RET%',
 ':CHECK',
 'node source\\parallel\\b134\\main\\b134-live-probe.mjs --dry-run 1 80 2',
 'set "RET=%errorlevel%"','popd','endlocal & exit /b %RET%',
 ':ERROR','echo B134 could not start; no game query was sent.',
 'pause','popd','endlocal & exit /b 1'
].join('\r\n')+'\r\n';
export function buildB134Kit({
 root=ROOT,b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b134-review-output','B134_Windows_Live_ReadOnly_Stair')
}={}){
 buildB133Kit({root,b129Output,out});
 const prev=verifyB133Kit(out);
 if(prev.original.recordCount!==0||prev.field.remainingTrialIds.length!==8||
    prev.readiness!=='NOT_PREPARED'||prev.operations.length!==0)
  throw Error('B134_BASE_NOT_CLEAN');
 const target=path.join(out,FILE);
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.copyFileSync(path.join(root,FILE),target);
 fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({
  name:'minecraftaibuilder-b134-readonly-test-world-bridge',
  private:true,version:'1.0.0',type:'module',
  dependencies:{'socket-be':'2.8.0'}
 },null,2)+'\n');
 fs.writeFileSync(path.join(out,'B134_LIVE_READONLY_MANIFEST.json'),
  JSON.stringify({
   schema:'minecraftaibuilder-b134-live-readonly-bundle-v1',
   b134SourceSha256:H(fs.readFileSync(target)),
   b133SourceSha256:H(fs.readFileSync(path.join(out,
    'source/parallel/b133/main/b133-readonly-probe.mjs'))),
   dependencyPackageSha256:H(fs.readFileSync(path.join(out,'package.json'))),
   initialRealObservations:0,independentWalkabilityCertifications:0,
   gameAccessViaExternalUserSessionOnly:true,mayRunCommands:['testforblock'],
   blockWritesAllowed:false,constructionAllowed:false,
   readiness:'NOT_PREPARED',operations:[]
  },null,2)+'\n');
 fs.writeFileSync(path.join(out,'START_B134_LIVE_PROBE.cmd'),B134_CMD);
 fs.writeFileSync(path.join(out,'B134_START_HERE_JA.txt'),[
  'B134: Minecraft Education テストワールド実機・読み取り専用校正',
  '既存の全ワールドはテスト用。追加の試験ごとの承認は不要。',
  '',
  '1. ZIPを展開してSTART_B134_LIVE_PROBE.cmdをダブルクリック。',
  '2. 初回だけnpmのsocket-be 2.8.0を取得するためインターネット接続が必要です。',
  '3. Windows窓でオーク階段1個のブロックXYZ（整数3個）を入力。',
  '4. Minecraft Educationで同じWindows PCのテストワールドを開き、',
  '   /wsserver localhost:8000 でローカル接続。',
  '5. ゲームのチャットに !b134 を一度送信。',
  '6. 送信されるのは testforblock に限定した5つの読み取りコマンド。',
  '7. Windowsに診断結果と保存先が表示されます。',
  '',
  '重要：オーク階段は既存のテスト領域に手動で置くか既存のものを選択。',
  '  このツールは階段を自動設置せず、world.runCommandは読み取り専用のコマンドだけ。',
  '  結果は data/B134_Live_Diagnostics に保存。B130の申告8枠には自動登録しません。',
  '  実機で動いたとしても向き・上半形状の目視認証、歩行判定は別検証。',
  '  game command responseに成功数が無い場合は不明と扱い、見かけの成功を採用しません。',
  '  複数値一致・一致0・構文エラー・通信切断も不明として保存します。',
  '  接続できなければWindowsを閉じて終了。元の建築計画は変更しません。',
  '  START_B134_LIVE_PROBE.cmd --check ならゲーム接続不要で検査できます。',
  '  Node.js 22以降を使用します。',
  '  15棟66階床102階段・9 HOLD・9 BLOCKED・NOT_PREPARED保持。',
  '  No merge to main, BuildPlan.operations=[], new diagnostic only.'
 ].join('\r\n')+'\r\n');
 return verifyB134Kit(out);
}
export function verifyB134Kit(out){
 const prev=verifyB133Kit(out);
 const x=JSON.parse(fs.readFileSync(path.join(out,'B134_LIVE_READONLY_MANIFEST.json')));
 const b=fs.readFileSync(path.join(out,FILE));
 const dep=fs.readFileSync(path.join(out,'package.json'));
 const pkg=JSON.parse(dep);
 if(x.schema!=='minecraftaibuilder-b134-live-readonly-bundle-v1'||
    x.b134SourceSha256!==H(b)||x.dependencyPackageSha256!==H(dep)||
    x.b133SourceSha256!==H(fs.readFileSync(path.join(out,
     'source/parallel/b133/main/b133-readonly-probe.mjs')))|| 
    pkg.dependencies?.['socket-be']!=='2.8.0'||
    x.blockWritesAllowed!==false||x.constructionAllowed!==false||
    x.readiness!=='NOT_PREPARED'||x.operations?.length!==0||
    x.mayRunCommands?.length!==1||x.mayRunCommands[0]!=='testforblock'|| 
    fs.readFileSync(path.join(out,'START_B134_LIVE_PROBE.cmd'),'utf8')!==B134_CMD||
    prev.worldContacts!==0||prev.operations?.length!==0)
   throw Error('B134_KIT_TAMPER_OR_UNSAFE');
 return {
  folder:out,launcher:'START_B134_LIVE_PROBE.cmd',
  previous:prev,actualGameContactsDuringPackaging:0,
  gameTestedHere:false,readiness:'NOT_PREPARED',
  constructionAllowed:false,operations:[]
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(buildB134Kit(),null,2));
}
