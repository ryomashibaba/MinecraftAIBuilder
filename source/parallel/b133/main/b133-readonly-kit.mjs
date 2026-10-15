/**
 * B133 builds on the exact B132 package. No Minecraft API, process launch,
 * world edit, network request or construction instruction is executed here.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB132Kit,verifyB132ActiveKit} from '../../b132/main/b132-active-kit.mjs';
import {checkB133Sources} from './b133-readonly-probe.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const SOURCE='source/parallel/b133/main/b133-readonly-probe.mjs';
const H=b=>createHash('sha256').update(b).digest('hex');

export const B133_CMD=[
 '@echo off',
 'setlocal',
 'chcp 65001 >nul',
 'pushd "%~dp0"',
 'if errorlevel 1 goto BAD',
 'where node >nul 2>nul',
 'if errorlevel 1 goto BAD',
 'node -e "if(Number(process.versions.node.split('+"'"+'.'+"'"+')[0]) < 22) process.exit(2)"',
 'if errorlevel 1 goto BAD',
 'node source\\parallel\\b133\\main\\b133-readonly-probe.mjs --check',
 'if errorlevel 1 goto BAD',
 'if /I "%~1"=="--check" goto DONE',
 'if not "%~1"=="" goto BAD',
 'node source\\parallel\\b133\\main\\b133-readonly-probe.mjs --interactive',
 'if errorlevel 1 goto STOP',
 'node source\\parallel\\b130\\main\\b130-lab-tool.mjs --interactive',
 'set "LAB_EXIT=%errorlevel%"',
 'echo Offline session ended. No Minecraft contact or construction.',
 'pause',
 'popd',
 'endlocal & exit /b %LAB_EXIT%',
 ':DONE',
 'popd',
 'endlocal & exit /b 0',
 ':STOP',
 'echo No B133 game action or evidence record was generated.',
 'pause',
 'popd',
 'endlocal & exit /b 0',
 ':BAD',
 'echo B133 safety preflight failed. No Minecraft contact.',
 'if /I not "%~1"=="--check" pause',
 'popd',
 'endlocal & exit /b 1'
].join('\r\n')+'\r\n';

export function buildB133Kit({
 root=ROOT,b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b133-review-output','B133_ReadOnly_Stair_Probe')
}={}){
 buildB132Kit({root,b129Output,out});
 const staticState=verifyB132ActiveKit(out);
 if(staticState.recordCount!==0||staticState.remainingSlots!==8||
    staticState.consistentHumanClaimHypotheses!==24||
    staticState.constructionAllowed!==false||staticState.worldContacts!==0)
  throw Error('B133_BASELINE_NOT_UNOBSERVED');
 const dest=path.join(out,SOURCE);
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.copyFileSync(path.join(root,SOURCE),dest);
 fs.writeFileSync(path.join(out,'B133_READONLY_SOURCE_PIN.json'),
  JSON.stringify({
   schema:'minecraftaibuilder-b133-offline-readonly-probe-v1',
   sourceSha256:H(fs.readFileSync(dest)),
   readOnlyCommandFamily:'/testforblock',
   fixedBlock:'minecraft:oak_stairs',
   testedEducationVersion:null,verifiedEducationCommands:0,
   actualGameTrials:0,physicalWalkabilityCertified:0,
   noMinecraftAccess:true,constructionAllowed:false,
   worldContacts:0,operations:[]
  },null,2)+'\n');
 fs.writeFileSync(path.join(out,'START_B133_READONLY_PROBE.cmd'),B133_CMD);
 fs.writeFileSync(path.join(out,'B133_START_HERE_JA.txt'),[
  'B133 — Minecraft Education 階段状態の読み取り専用プローブ',
  '',
  '1. ユーザー確認済み：本番ワールドは存在せず、すべてテストワールドです。試験ごとの承認は不要です。',
  '2. 既存のテストワールドを再利用できます。既存の作業成果を壊さない空き領域を選んでください。',
  '3. 通常のオーク階段1個を手動設置し、XYZ座標を確認します。',
  '4. START_B133_READONLY_PROBE.cmdをダブルクリック。座標を一度入力。',
  '5. 表示された4行の/testforblockをゲーム内で手動実行して成否を確認します。',
  '6. 同時に目で見た上り方向・上半形状を確認し、必要なら証拠画像を保存。',
  '7. 4つの候補のうち厳密に1つだけ成功し、他の結果も正確に確認できた時に限り記録候補としてください。',
  '8. YESで既存B130入力ツールへ進み、READBACKと証拠画像パスを自分で入力。',
  '',
  'コマンドが非対応・失敗・曖昧な場合はREADBACKと入力せず、Qで終了してください。',
  '現行版Minecraft Educationでの/testforblock状態引数の動作は未検証です。',
  'プローブは文字列を表示するだけです。Minecraftを起動・接続・操作しません。',
  'CMD側で生成するのは読み取り専用コマンドですが、ゲーム内実行は人間の操作です。',
  'Minecraftコマンド使用にはワールドの権限・チート設定が必要な場合があります。',
  '歩行可能性・当たり判定・自動施工が認証されたわけではありません。',
  '登録後も実機証拠の独立検証は未実施です。合成CI画像を流用しないでください。',
  '確認のみ: START_B133_READONLY_PROBE.cmd --check',
  '',
  'Microsoft Learn /testforblock:',
  'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/commandsreference/examples/commands/testforblock?view=minecraft-bedrock-stable',
  'Microsoft Learn vanilla block states (oak_stairs, weirdo_direction):',
  'https://learn.microsoft.com/en-us/minecraft/creator/reference/content/vanillalistingsreference/blocks?view=minecraft-bedrock-stable',
  '',
  'この配布ツールによる接続なし。NOT_PREPARED / HOLD 9 / BLOCKED 9 / BuildPlan.operations=[] / worldContacts=0.'
 ].join('\r\n')+'\r\n');
 return verifyB133Kit(out);
}
export function verifyB133Kit(folder){
 const original=verifyB132ActiveKit(folder);
 const field=checkB133Sources(folder);
 const cmd=fs.readFileSync(path.join(folder,'START_B133_READONLY_PROBE.cmd'),'utf8');
 if(cmd!==B133_CMD||!cmd.includes('--check')||
    !cmd.includes('b130-lab-tool.mjs --interactive')||
    original.worldContacts!==0||original.constructionAllowed!==false||
    field.worldContacts!==0||field.constructionAllowed!==false)
  throw Error('B133_PACKAGE_UNSAFE');
 return {
  out:folder,original,field,launcher:'START_B133_READONLY_PROBE.cmd',
  actualGameTests:0,certifiedReadbacks:0,
  readiness:'NOT_PREPARED',constructionAllowed:false,
  worldContacts:0,operations:[]
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(buildB133Kit(),null,2));
}
