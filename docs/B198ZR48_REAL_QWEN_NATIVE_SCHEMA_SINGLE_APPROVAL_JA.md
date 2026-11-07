# R48 — 新しいユーザー承認1回でQwenをSchema制約付きローカル生成

日付：2026年10月21日。MinecraftAIBuilder / Draft PR #128。`qwen3.8:27b`のOMENローカルOllamaによる新規推論**最大1回**をユーザーが明示承認。従来R25/R44/R46の承認は再利用しない。Minecraftへは接続も施工もしない。

## 前提と狙い

R25はCUT.material×5、R44はshape不正×43、R46はbounds.volumeとstaircase.steps=36。すべて厳格B143 HOLDで、空間の使い勝手も不合格。R47のオフライン開発では、B143に対応した最大11種類の排他的形状・モード組合せのJSON Schemaを作り、モデルが余分な属性を生成しにくい`format:{...}`へ切り替える仕組みを実装。最新Windows/Ubuntu合成QAを別途確認する。

**R48の検証対象は実Qwen/OllamaでこのSchemaが機能するか・生成された最終ボクセルに実在する機能空間があるか**。単なるSchema化の成功を建築品質PASSにしない。

## 実装（すべて既存Draft PR #128のみ）

- `scripts/b198zr48-consented-schema-qwen-once.mjs`: 専用の新しい同意文字列 `I_APPROVE_R48_ONE_LOCAL_QWEN_REQUEST` に限定。厳密モデル`qwen3.8:27b`の`GET /api/tags`を先に確認し、使用済みロックを**生成POST前に**`wx`で作成。1回の`/api/chat`を投げ、自動再試行とモデル切替は禁止。
- 再現条件はB198B固定`c01`公共図書館、`num_predict:3072`、`num_ctx:6144`、`think:false`、`temperature:0.35`、`stream:false`を維持。差分はR47 Schema化した出力形式にある。
- Ollamaの新profile`r47SchemaFormat:true`を**R48だけ明示採用**。以前のR46は`format:'json'`のままで遡及変更なし。ネイティブ形式が非対応の場合、失敗としてHOLDし、自動的に緩いJSONへ戻したり二度目を要求しない。
- 生の`R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`を先に1回だけ保存しSHA固定、B143・R3・R41/R42/R43/R45/R47オフライン検査、可能なら3DプレビューおよびR13品質レビューの素材を生成。読み・書きは概念データのみ、Minecraftワールドには触れない。
- `tools/r48-approved/INSTALL_R48_OFFLINE_SOURCE_ONLY.ps1`: OMENでR46が成功済みなら`%LOCALAPPDATA%/MinecraftAIBuilder/R46_Source_214fec3002de/`の449件を再利用。厳格R46-SHA元本を確認し、R48用の5パスを別フォルダにダウンロード、Git blob SHAと453ファイル数を照合。R46元フォルダは読み取りのみ。
- `tools/r48-approved/RUN_R48_ONE_APPROVED_REQUEST.ps1`: 固定コミットのSHAピン済みソースだけを使い、偽通信の事前QAを実施。新しい実Qwenの推論1回が始まれば承認ロックは消費済み。原本と監査をZIPにまとめ、Explorerで結果を選択する。
- `tools/r48-approved/START_R48_ONE_QWEN.cmd`: 1ファイルだけ保存して起動。`YES`で実行。Chromeでrawソースが表示される問題はChatからCMD本体を配布する方針で回避。

## 回帰テストと証拠の限界

- `scripts/b198zr48-consented-schema-qwen-once.test.mjs`：Windows/Ubuntuでエフェメラルポートの偽Ollamaを使う。新規同意検査・旧同意拒否・モデル拒否・Schemaのdeep equality・原本SHA/診断/ラッチ・追加POST禁止を確認。
- `scripts/b198zr48-windows-one-click-fake.test.mjs`：Windowsで`127.0.0.1:11434`を偽サーバーが**確実に先に占有**してからCMDを試す。モデルプロセスへ誤って接続しない。1回のGET+POST、R47 Schemaの完全一致、Windows結果ZIP・監査・二回目の拒否を確認。
- 実際のQwen/Scheme互換性、ユーザー環境の性能、元の要求を満たす設計意図、美しさ、機能性は合成CIでは保証しない。
- B143/R3は原本に対する独立した**数学的検証**だが、モデルが自己申告したprotectedVoidsやfunctionalZonesの基準は第三者契約ではない。人間による外観、内部空間、動線と図書館の実用性審査は必要。

## 次のユーザー操作（Windows最終QA成功後のみ）

1. Chatから`START_R48_ONE_QWEN.cmd`を1ファイル取得し、OMENでダブルクリック。
2. 新しい承認の現地確認`YES`を一度だけ入力。
3. 結果Explorerで選ばれた`R48_*_UPLOAD_THIS_RESULT.zip`をChatに添付。

これまでの凍結原本を動かさず、`NOT_PREPARED`、9ゲート`BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`。失敗してもR48を再実行しない。次の推論にはまた別の明示承認を得ること。
