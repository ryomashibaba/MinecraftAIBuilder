# MinecraftAIBuilder — B198Z-R6 / 単発の本物のR4原本を安全に採取する経路
2026-10-19 JST / SOURCE ONLY / **実Qwen推論は今回実行していない**

## 決定済みの最上位方針
- 正本は `ryomashibaba/MinecraftAIBuilder`、Draft PR #128 を #127(B198Y) 上へ積む。main、#113〜127、B99/B100、Legacy、FAILED journalに触らない。
- 最終目標：未知用途にも対応する、日本語→モデル独創的建築計画・形状・機能・階床・階段・吹抜け・動線→独立承認後に初めてMinecraft Education施工/実block state修復できるAI Builder。固定用途テンプレートや材質置換だけの量産は不可。
- 旧Qwen原本14要素/3397バイト SHA256 `40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf` を厳格保全。R1/R2はASSISTANT-AUTHORED。R4/R5の仕組みのPASSをQwen建築生成成功と混同しない。
- 現在も `NOT_PREPARED`、9 gate `BLOCKED`、`BuildPlan.operations=[]`、worldContacts/worldWrites=0。
- **実Qwen高負荷推論は事前承認が必要**。このR6実装追加・GitHub Action実行では推論ゼロ。ユーザーが明示的に承認するまで本番スクリプトは起動しない。

## 今回の実装は本番品質測定の「採取経路」
1. `source/ai/b198s-native-ollama-source.mjs` で、`plannedSourceMode:true` の4項目R4レスポンスを**無改変で返す**。旧3項目の安全なメタデータ/declared-bounds補正は従来通り。原文改変のないR4だけを比較原本とする。
2. `scripts/b198zr6-authorized-single-r4-capture.mjs` は1回のみ明示的に承認された localhost Ollama HTTPリクエストを実行できる。モデルは呼び出し側が指定、暗黙のモデル変更不可。凍結B198B `c01` の元日本語要求を使用。空間計画付きJSON1応答・`think:false`・`stream:false`・リトライ0。
3. 取得した `R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt` を、R4パースやB143コンパイル**前に**そのまま書き出す。source/geometry SHA、実セル吹抜け/床/動線のR3評価、使用上のHOLDを `R6_SINGLE_CAPTURE_RESULT.json` に分離。
4. `R6_FROZEN_REQUEST.json` は凍結ケース、明示モデル名、実行予算、実行対象のlocal-loopback、施工禁止を記録。取得済み原本から `R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json` を発行。これはR5形式の**未認証なモデル申告**であり、GPU上でどのモデルが動いたかを署名で証明するものではない。
5. 不正な4項目JSON・B143不合格・モデルが自己申告した空間の実セル不一致・推論途中終了・接続失敗は**HOLD**。原文を取得済みであれば保存したままにし、他モデル/再試行/施工/ワールド接続には移らない。

## Windowsでの将来の最小操作（今回の作業では実行しない）
**ユーザーからこの1回の高負荷Qwen実行に対する明示的な承認が出てから**、repoを更新済みのWindowsで次を使用する。

`scripts/RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` をダブルクリックすると、実行前にフル承認文字列の**手入力**を要求する。入力が不一致ならモデルへ接続しない。承認した場合のみ **qwen3.8:27b に1要求**を送信し、`%LOCALAPPDATA%\MinecraftAIBuilder\R6_Evidence\R6_<GUID>_UPLOAD_THIS_RESULT.zip` をWindows標準PowerShellで生成する。1個のZIPだけ返送すればよい。モデルまたは幾何がHOLDでもリトライせず、保存済み証拠をZIP化する。元原本や旧フォルダには上書きしない。

CLI単体を使用する場合も完全な承認を必須とする：
```
node scripts/b198zr6-authorized-single-r4-capture.mjs --model qwen3.8:27b --out <NEW_OUTPUT_FOLDER> --authorize-one I_APPROVE_ONE_LOCAL_MODEL_REQUEST
```
この例は**操作が承認された時点の参考**であり、現在の実行指示ではない。

## CIと評価限界
`node --test scripts/b198zr6-authorized-single-r4-capture.test.mjs` は実モデルを使わず、localhostの一時モックHTTPで次を証明：
- 承認なしの場合は0モデル要求・0出力フォルダ
- 承認済みの模擬ケースでは1要求で終了、`think:false`、原文がバイト単位で一致、R5未認証レシートSHA一致
- 三項目応答を誤ってR4とみなさない、元原文を捨てずHOLD
- 出力予算で途中終了した場合も1要求・原文保全・HOLD
- モデルが設計したと主張する吹抜けを金属で埋めた場合もB143/R3でHOLD
- 安全ガード・旧資料/旧3項目互換を損なわない

CIはWindowsの手動CMD実行・実27Bメモリ消費・生成時間・モデルの独創性・実Minecraft Player collision/step statesを検証しない。**実Qwen改善の有無は未知**。R4の4項目出力が 3072 tokens の既定の予算で十分かも未計測。失敗時に自動トークン拡張や再推論をしない。

## 次工程の意味
実装すべきものはもう形式的なテストの増殖ではない。必要な次の本番証拠は、ユーザーが明示承認したQwen単発出力の原文＋SHA＋R3独立レビュー。R5で凍結基準と比較し、モデルが本当に多階層と接続を設計したか、さらに別ジャンルへの汎化に値するかを判断する。R2人手改修との混同は禁止。
