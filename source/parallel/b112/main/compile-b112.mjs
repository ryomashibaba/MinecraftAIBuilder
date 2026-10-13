/** B112 one-pass integration review and a non-executable Work handoff checkpoint. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB109,validateB109Report} from '../../b109/main/compile-b109.mjs';
import {assembleB110,validateB110Report} from '../../b110/main/compile-b110.mjs';
import {assembleB111,validateB111Report} from '../../b111/main/compile-b111.mjs';
import {buildB112Audit,validateB112Audit} from './b112-readiness-audit.mjs';
export function assembleB112(){
 const visual=compileB109();
 const functional=assembleB110();
 const interior=assembleB111();
 if(!validateB109Report(visual.report)||!validateB110Report(functional.report)||
 !validateB111Report(interior.report))throw Error('B112_SOURCE_VERIFICATION_FAILED');
 const report=buildB112Audit(visual,functional,interior);
 if(!validateB112Audit(report))throw Error('B112_CROSS_STAGE_VALIDATION_FAILED');
 return {report};
}
const safeText=s=>String(s).replaceAll('|','/').replaceAll('\n',' ');
export function writeB112(value,outDir){
 if(!validateB112Audit(value?.report))throw Error('B112_UNSAFE_EXPORT');
 fs.mkdirSync(outDir,{recursive:true});
 const r=value.report,t=r.totals;
 const reportPath=path.join(outDir,'B112_Integrated_15_Building_Readiness.json');
 const matrixPath=path.join(outDir,'B112_15_Building_Review_Matrix.csv');
 const summaryPath=path.join(outDir,'B112_Integration_Audit_JA.md');
 const handoffPath=path.join(outDir,'00_START_HERE_B113_LOCAL_WORK_HANDOFF.md');
 const checklistPath=path.join(outDir,'B113_WORK_READ_ONLY_PREFLIGHT_JA.md');
 fs.writeFileSync(reportPath,JSON.stringify(r,null,2)+'\n');
 const columns=['id','typology','levels','rooms','conceptDoors','conceptualConnectedDoorways',
  'exteriorOpenings','conceptualStairLinks','stairTreadDiagrams','furnitureAnchors',
  'conceptualRoomPathPasses','roomsNeedingLayoutRevision','twoCellBedProposals',
  'bedPairsWithoutCandidate','sourceRoofCells','sourceGlazingCells',
  'renderedCoalescedRoofSurfaces','physicalDoorsCertified','physicalStairsCertified',
  'installedFurnitureCertified','realEducationBlocksCertified'];
 fs.writeFileSync(matrixPath,columns.join(',')+'\n'+r.cases.map(c=>columns.map(k=>{
  const s=String(c[k]??'');
  return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
 }).join(',')).join('\n')+'\n');
 const summary=[
 '# B112 — B100～B111統合監査結果（オフライン）',
 '',
 '目的：建物全体15案をGitHub上の原本と照合し、B113のローカルWork移行を安全に準備する。',
 '**実Minecraft Educationとの接続、操作、施工は行っていない。**',
 '',
 '## 元データと概念検証の集計',
 '',
 '|指標|値|','|---|---:|',
 '|用途/代替案|'+t.typologies+' / '+t.variants+'|',
 '|建物内の階数（合計）|'+t.levels+'|',
 '|部屋の候補|'+t.rooms+'|',
 '|ドア候補（廊下に連結）|'+t.doorCandidates+'（'+t.conceptualDoorwaysConnected+'）|',
 '|外部出入口候補|'+t.exteriorOpenings+'|',
 '|階段コアの接続候補|'+t.conceptualStairLinks+'|',
 '|階段の概念的な踏み面|'+t.stairDiagrams+'|',
 '|家具の基準アンカー|'+t.furnitureAnchors+'|',
 '|入口から概念床を移動可能な部屋|'+t.roomPathPasses+'|',
 '|家具で再配置を要する部屋|'+t.roomLayoutProblems+'|',
 '|隣接2セルベッド案|'+t.twoCellBedProposals+'|',
 '|未解決ベッド位置|'+t.unresolvedBedPairs+'|',
 '|B105元屋根/窓セル|'+t.sourceRoofCells+' / '+t.sourceWindowCells+'|',
 '|実Education BlockStateの認証数|0|',
 '|実施工済みドア/階段/家具/完成室|0|',
 '',
 '## 解釈と監査制限',
 'B109は元外装セルと読取専用表示の一対一対応を検証。実建築を行っていない。',
 'B110はドア、階段、家具の候補位置と概念的接続を確認。実ベッド向きや扉の開閉は未検証。',
 'B111は床セル1マス幅の概念グラフ検査。2マス幅の連続通路、避難安全、現実の規制適合を証明しない。',
 '',
 '## 必要なローカル作業（次のB113、別チャットでWork用プロンプトを作成）',
 ...r.futureWork.taskList.map(x=>'- '+x.id+' '+x.task),
 '',
 '## 施工許可の状態',
 '**NOT_PREPARED / 9 BLOCKED / worldContacts=0 / worldCoordinates=null / operations=[]。**',
 'B100〜B111の凍結・既存コードは変更しない。歴史的な未承認296案と保留18室を承認しない。',
 '',
 '## 生成物',
 '- B112_Integrated_15_Building_Readiness.json : 15案のソースSHAと段階間の依存証明',
 '- B112_15_Building_Review_Matrix.csv : 15案の検査・実機未認証の一覧',
 '- 00_START_HERE_B113_LOCAL_WORK_HANDOFF.md : Work側で最初に読む事項',
 '- B113_WORK_READ_ONLY_PREFLIGHT_JA.md : 実ワールド操作なしのローカル確認チェック表'
 ].join('\n');
 fs.writeFileSync(summaryPath,summary+'\n');
 const handoff=[
 '# B113用の移行基準 — 最初に読む',
 '',
 '## 現在の状態',
 '- 正本はGitHubの private repository: https://github.com/ryomashibaba/MinecraftAIBuilder',
 '- B112成果物はGitHub Actionsの B112-Integrated-Handoff-Review に保存する。',
 '- **ローカルWork用MinecraftAIBuilderプロジェクトが既に存在する**。',
 '- 作業開始前にgit remote -v, git status --short, git rev-parse HEAD, git branch --show-current を確認し、GitHub mainのB112マージ済みcommit SHAと照合する。古いローカル状態でmainを上書きしない。',
 '- 既存のローカル変更があれば必ず保護し、無断破棄・強制上書き・force pushをしない。',
 '- この資料を生成したCIのcommit SHA: '+(process.env.GITHUB_SHA??'LOCAL_UNSPECIFIED')+'（pushとPRで意味が異なる。マージ後のmain SHAは次チャットで再確認する）',
 '',
 '## 工程切り替え',
 '**B112はこの通常チャット＋GitHubで完了する工程。次のB113ではローカルWorkを使用する。**',
 '**次のチャットはB113実行を開始する場所ではなく、ローカルWorkプロジェクトへ送るプロンプトを作成する場所。**',
 '手元のWork用プロジェクトを開き、作成したプロンプトを送るまでローカル実機作業は着手しない。',
 '',
 '## B113で初期に許可される作業',
 'ローカルプロジェクトの安全な状態確認と既存ソース・ファイル・ログの**読み取り**、GitHub mainとのSHA照合、実機版の確認方法の調査、オフラインのブロック互換性検査、ドアと階段とベッドの非施工シミュレーション。',
 'Minecraft EducationやWebSocket等へ接続できると勝手に想定しない。接続は別途明示承認が必要。',
 '',
 '## 厳守する安全条件',
 '- readiness=NOT_PREPARED、承認ゲート9件はBLOCKED、constructionApproved=false、executionAllowed=false',
 '- worldContacts=0、worldCoordinates=null、BuildPlan.operations=[]、commandCount=0',
 '- 旧296未承認と18保留を承認扱いにしない',
 '- ゲームへの接続、WorldEdit/Minecraft実機の読み取りや変更、デモ施工、ブロック設置、破壊は全て事前の別個の承認なしには実施しない',
 '- 秘密情報、ゲームワールド、認証トークンをGitHubにアップロードしない',
 '',
 '## 事前の根拠資料',
 'docs/B110_IMPLEMENTATION_JA.md、docs/B111_IMPLEMENTATION_JA.md、docs/B112_IMPLEMENTATION_JA.md、',
 'source/parallel/b112/main/b112-readiness-audit.mjs、B112_Integrated_15_Building_Readiness.json。',
 '',
 '## 成果物の完成条件',
 '使用環境の状態/インストール版/根拠となるファイル/未認証事項/安全チェック/実機接続が必要かを整理した報告。',
 '実機の操作や施工をしたという虚偽の記録をしない。'
 ].join('\n');
 fs.writeFileSync(handoffPath,handoff+'\n');
 const checklist=[
 '# B113 Work用 — 読み取り専用事前点検',
 '',
 '1. ローカルWorkプロジェクトに置かれたGitリポジトリと GitHub main を識別。mainのマージSHAを照合。',
 '2. 未コミットのソースやワールドデータ、資格情報等を確認して保護する。決して自動上書きしない。',
 '3. Minecraft Education実機のインストール有無と正確なバージョンを、可能ならローカルの非接続ファイルや既存ログから確かめる。',
 '4. B110の9ブロック役割辞書についてEducation版で未検証の値をすべてUNVERIFIEDのまま扱う。',
 '5. B111の部屋279室・家具558位置と、B112統合JSONとの整合性をオフラインで再確認。',
 '6. ドア上下2セル、階段の上り方向・頭上空間、ベッド2セルの対応をオフラインシミュレーションする。',
 '7. Minecraft本体との接続が必要となった場合、その目的・影響・触れる座標/ワールド・安全性を説明し、別の明示承認を求める。',
 '8. 書き込みが必要でも安全な別ブランチを使い、GitHub CIを通過させる。実世界への施工を開始しない。',
 '',
 '## 未検証事項',
 '実ブロックIDとBlockState、ドアの向きと開閉、階段の当たり判定と移動可能性、',
 '家具の衝突、部屋の実用性、緊急避難やアクセシビリティ要件は未認証。',
 '',
 'B113の細かな実行プロンプトは次のChatGPTチャットで準備する。'
 ].join('\n');
 fs.writeFileSync(checklistPath,checklist+'\n');
 return {reportPath,matrixPath,summaryPath,handoffPath,checklistPath,
  buildings:15,conceptRooms:279,worldContacts:0};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const value=assembleB112();
 console.log(JSON.stringify({
  totals:value.report.totals,integritySha256:value.report.integritySha256,
  artifacts:process.argv.includes('--write-review')?
   writeB112(value,path.resolve('b112-review-output')):null
 },null,2));
}
