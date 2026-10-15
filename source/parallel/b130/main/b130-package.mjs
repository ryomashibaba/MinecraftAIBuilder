/** Build a portable, completely offline Windows lab receipt kit from B129 CI evidence. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateB129} from '../../b129/main/b129-fleet-protocol.mjs';
import {validateB129CalibrationPlan} from '../../b129/main/b129-repeated-calibration.mjs';
import {inspectB130Package} from './b130-lab-tool.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const files=[
 'source/parallel/b130/main/b130-lab-tool.mjs',
 'source/parallel/b129/main/b129-repeated-calibration.mjs',
 'source/parallel/b128/main/b128-readback-receipts.mjs',
 'source/parallel/b127/main/b127-halfstep-orientation.mjs',
 'source/parallel/b114/main/b114-stair-grid-frame.mjs'
];
export function packB130({
 root=ROOT,b129Output=path.join(ROOT,'b129-review-output'),
 out=path.join(ROOT,'b130-review-output','B130_Windows_Offline_Lab')
}={}){
 const report=JSON.parse(fs.readFileSync(
  path.join(b129Output,'B129_Repeatability_Gate_Offline_Report.json'),'utf8'));
 const plan=JSON.parse(fs.readFileSync(
  path.join(b129Output,'B129_Isolated_Calibration_Protocol.json'),'utf8'));
 if(!validateB129(report)||!validateB129CalibrationPlan(plan)||
  report.plan.integritySha256!==plan.integritySha256||
  report.sourceB127Integrity!==plan.sourceB127Integrity||
  report.totals.buildings!==15||report.totals.sourceStairs!==102||
  report.totals.sourceFloors!==66||
  report.totals.actualHumanReceiptsSupplied!==0||
  report.worldContacts!==0||
  report.BuildPlan.operations.length!==0||
  report.gates.some(x=>x.status!=='BLOCKED'))
 throw Error('B130_UNSAFE_OR_CHANGED_B129_REPORT');
 fs.mkdirSync(out,{recursive:true});
 const copy=(source,destination)=>{
  const target=path.join(out,destination);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
 };
 for(const f of files)copy(path.join(root,f),f);
 copy(path.join(b129Output,'B129_Isolated_Calibration_Protocol.json'),
  'B129_Isolated_Calibration_Protocol.json');
 copy(path.join(b129Output,'B129_Manual_Calibration_Worksheet_JA.md'),
  'B129_Manual_Calibration_Worksheet_JA.md');
 copy(path.join(b129Output,'B129_Empty_Receipt_Batch.json'),
  'data/B130_Observation_Receipts.json');
 const cmd=[
  '@echo off','setlocal','pushd "%~dp0"',
  'where node >nul 2>nul',
  'if errorlevel 1 (',
  '  echo Node.js 22 or newer is required. No Minecraft action occurred.',
  '  pause','  exit /b 1',')',
  'node source\\parallel\\b130\\main\\b130-lab-tool.mjs --interactive',
  'echo Offline session ended. Minecraft was not opened or controlled.',
  'pause','popd','endlocal'
 ].join('\r\n')+'\r\n';
 fs.writeFileSync(path.join(out,'START_B130_LAB.cmd'),cmd,'utf8');
 const readme=[
  'B130 Minecraft Education 独立検証用・オフライン記録ツール',
  '',
  '使い方:',
  '1. ZIPを新規フォルダーに展開してください。',
  '2. WindowsでSTART_B130_LAB.cmdをダブルクリックしてください（Node.js 22以降が必要）。',
  '3. すでに別途実施し、本当にreadbackした結果だけを実機バージョン・状態値・見え方・手動で保存した画像とともに登録してください。',
  '4. B129_Manual_Calibration_Worksheet_JA.mdが観察項目の一覧です。',
  '',
  '安全:',
  '- このツールはMinecraft Educationを起動・操作・通信・施工しません。',
  '- 独立した実験ワールドでの手動検証も、対象と内容について別途承認が必要です。',
  '- 画像は明示的に選択しYESと答えた場合にのみローカルevidence/へコピー。自動アップロードなし。',
  '- data/B130_Observation_Receipts.json と data/B130_Offline_Receipt_Review.jsonは人間申告。画像とログの真正性、ゲーム物理、実階段の施工可能性は認証していません。',
  '- 状態値のreadbackを実施していないならREADBACKと入力しないでください。',
  '- 現在の校正値は0件、8件の観察枠が未実施。証拠がないうちは記入しないでください。',
  '- 元の15棟・102階段・66階の設計、9件のHOLDと9つのBLOCKEDゲートは変えません。',
  '- 実世界座標やコマンド、認証情報は入力しません。ネットワークアクセスなし。',
  '',
  '確認だけをする場合:',
  'node source\\parallel\\b130\\main\\b130-lab-tool.mjs --check',
  '',
  'セキュリティ上の補足：このツールは画像ファイルのSHA256を計算しますが、画像内容の正当性・信頼性を認証するものではありません。'
 ].join('\r\n')+'\r\n';
 fs.writeFileSync(path.join(out,'README_FIRST_JA.txt'),readme,'utf8');
 const status=inspectB130Package(out).status;
 if(status.humanClaimedReceiptCount!==0||status.remainingTrialIds.length!==8||
  status.claimConsistentDirectionMappings!==24||status.worldContacts!==0||
  status.constructionAllowed!==false)
 throw Error('B130_PORTABLE_INITIAL_STATE_UNSAFE');
 return {folder:out,files:files.length+5,status,
  launcher:'START_B130_LAB.cmd',readme:'README_FIRST_JA.txt',
  portable:true,gameOperationCount:0,worldContacts:0,buildOperations:[]};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(packB130(),null,2));
}
