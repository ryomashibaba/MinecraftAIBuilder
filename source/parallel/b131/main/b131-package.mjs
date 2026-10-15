/**
 * B131: Windows-native smoke-ready launcher built on the unchanged B130 recorder.
 * Every operation here is local file packaging, with zero game interaction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packB130} from '../../b130/main/b130-package.mjs';
import {inspectB130Package} from '../../b130/main/b130-lab-tool.mjs';
const SOURCE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const mandatory=[
  'START_B130_LAB.cmd',
  'README_FIRST_JA.txt',
  'B129_Isolated_Calibration_Protocol.json',
  'B129_Manual_Calibration_Worksheet_JA.md',
  'data/B130_Observation_Receipts.json',
  'source/parallel/b130/main/b130-lab-tool.mjs',
  'source/parallel/b129/main/b129-repeated-calibration.mjs',
  'source/parallel/b128/main/b128-readback-receipts.mjs',
  'source/parallel/b127/main/b127-halfstep-orientation.mjs',
  'source/parallel/b114/main/b114-stair-grid-frame.mjs'
];
export const B131_CMD=[
  '@echo off',
  'setlocal',
  'chcp 65001 >nul',
  'pushd "%~dp0"',
  'if errorlevel 1 goto BAD_DIRECTORY',
  'where node >nul 2>nul',
  'if errorlevel 1 goto NO_NODE',
  "node -e \"if (Number(process.versions.node.split(\u0027.\u0027)[0]) < 22) process.exit(2)\"",
  'if errorlevel 1 goto OLD_NODE',
  'if /I "%~1"=="--check" goto CHECK',
  'if not "%~1"=="" goto BAD_ARGUMENT',
  'node source\\parallel\\b130\\main\\b130-lab-tool.mjs --interactive',
  'set "LAB_EXIT=%errorlevel%"',
  'echo Offline session ended. No Minecraft connection or construction occurred.',
  'pause',
  'popd',
  'endlocal & exit /b %LAB_EXIT%',
  ':CHECK',
  'node source\\parallel\\b130\\main\\b130-lab-tool.mjs --check',
  'set "LAB_EXIT=%errorlevel%"',
  'popd',
  'endlocal & exit /b %LAB_EXIT%',
  ':NO_NODE',
  'echo Node.js 22 or newer is required; no Minecraft operation occurred.',
  'if /I not "%~1"=="--check" pause',
  'popd',
  'endlocal & exit /b 1',
  ':OLD_NODE',
  'echo Found Node.js version is too old. Node.js 22 or newer is required.',
  'if /I not "%~1"=="--check" pause',
  'popd',
  'endlocal & exit /b 2',
  ':BAD_ARGUMENT',
  'echo Only --check or no argument is supported. No Minecraft action.',
  'popd',
  'endlocal & exit /b 3',
  ':BAD_DIRECTORY',
  'echo Cannot access this directory. No Minecraft operation occurred.',
  'endlocal & exit /b 4'
].join('\r\n')+'\r\n';
export function buildB131Package({
 root=SOURCE_ROOT,b129Output=path.join(SOURCE_ROOT,'b129-review-output'),
 out=path.join(SOURCE_ROOT,'b131-review-output','B131_Windows_Lab')
}={}){
 const result=packB130({root,b129Output,out});
 const oldStatus=inspectB130Package(out).status;
 if(oldStatus.humanClaimedReceiptCount!==0||
  oldStatus.remainingTrialIds.length!==8||
  oldStatus.claimConsistentDirectionMappings!==24||
  oldStatus.constructionAllowed!==false||oldStatus.worldContacts!==0)
  throw Error('B131_B130_BASE_NOT_CLEAN');
 fs.writeFileSync(path.join(out,'START_B130_LAB.cmd'),B131_CMD,'utf8');
 fs.writeFileSync(path.join(out,'B131_WINDOWS_START_HERE_JA.txt'),[
  'B131 — Windowsネイティブ検証済みオフライン階段記録ツール',
  '',
  '通常起動：START_B130_LAB.cmdをダブルクリック',
  '診断のみ：コマンドプロンプトから START_B130_LAB.cmd --check',
  '診断は読み取りだけ。8件の空き観察枠、24通りの未認証方向仮説を表示します。',
  'Node.js 22以降が必要です。Windows版Nodeが旧版の場合は安全停止します。',
  '',
  'B130と同じローカル記録機能です。Minecraft Educationを起動・接続・操作しません。',
  '記録の送信は行いません。証拠は明示指定した画像ファイルのローカルコピーだけです。',
  '実際のゲーム内BlockStateを読み取る仕組みはまだ未完成です。',
  '偽の状態値を記入しないでください。Windows起動確認はゲーム内の認証ではありません。',
  '',
  '現時点：NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、worldContacts=0。',
  '実際の校正には独立検証ワールドでの別途承認と操作が必要です。'
 ].join('\r\n')+'\r\n','utf8');
 const manifest={schema:'minecraftaibuilder-b131-windows-native-kit-manifest-v1',
  baseB130Source:'UNMODIFIED_RUNTIME',
  sourceB127Integrity:oldStatus.sourceB127Integrity,
  windowsNativeCheckExpected:{
   humanClaimedReceiptCount:0,remainingTrialSlots:8,
   consistentUnverifiedHypotheses:24,constructionAllowed:false,
   worldContacts:0,educationBlockstatesCertified:false
  },
  fileHashes:Object.fromEntries(mandatory.map(name=>{
   const p=path.join(out,name);
   if(!fs.statSync(p).isFile())throw Error('B131_MISSING_BUNDLE_FILE_'+name);
   return [name,sha(fs.readFileSync(p))];
  })),
  readyToConnectToMinecraft:false,constructionAllowed:false,
  worldContacts:0,buildOperations:[]
 };
 fs.writeFileSync(path.join(out,'B131_MANIFEST_SHA256.json'),
  JSON.stringify(manifest,null,2)+'\n');
 return {base:result,manifest,output:out,gameConnections:0,worldContacts:0,
  realEducationCalibrations:0,windowsSmokeCIRequired:true};
}
export function verifyB131Package(folder){
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'B131_MANIFEST_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-b131-windows-native-kit-manifest-v1'||
  manifest.constructionAllowed!==false||
  manifest.worldContacts!==0||
  manifest.windowsNativeCheckExpected?.remainingTrialSlots!==8)
  throw Error('B131_INVALID_MANIFEST');
 for(const name of mandatory){
  if(manifest.fileHashes?.[name]!==sha(fs.readFileSync(path.join(folder,name))))
   throw Error('B131_FILE_HASH_CHANGED_'+name);
 }
 const report=inspectB130Package(folder).status;
 if(report.remainingTrialIds.length!==8||report.humanClaimedReceiptCount!==0||
  report.claimConsistentDirectionMappings!==24||report.worldContacts!==0||
  report.educationBlockstatesCertified!==false||report.constructionAllowed!==false)
  throw Error('B131_INITIAL_STATE_NOT_SAFE');
 return {fileCount:mandatory.length,allHashesMatch:true,
  remainingSlots:8,unknownPermutations:24,realReadbacks:0,
  constructionAllowed:false,worldContacts:0,windowsSmokeValidatedHere:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const p=buildB131Package();
 console.log(JSON.stringify({output:p.output,results:verifyB131Package(p.output)},null,2));
}
