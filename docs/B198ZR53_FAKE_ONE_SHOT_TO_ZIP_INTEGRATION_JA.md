# B198Z-R53 — R52修正と「偽Qwen一回→自動診断→ZIP」実経路検証

## 作業開始時の状況

- 開発元：`ryomashibaba/MinecraftAIBuilder`、Draft PR #128、`feature/b198zr1-protected-architectural-revision`。
- 前工程R52のCI（Run 39580706041）は**Ubuntu PASS / Windows FAIL**。失敗の原因はWindows側の`ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1`内で`Where-Object`の正規表現行の閉じ括弧と引用符が壊れたことによるPowerShell構文エラー。実Qwen/Ollamaに触れた失敗ではない。
- R53でこのPowerShellヘルパーを原文レベルから再構築。未コンパイル原本・SHA整合・失敗ログ・出力先の安全検査を保持し、**R52修正後のRun 39585952939はWindows/UbuntuともPASS**。

## R53の新規統合検証

`scripts/b198zr53-fake-one-shot-to-zip.integration.test.mjs` を追加し、以前は別々だった模擬モデルとZIPの処理を、同じ使い捨てのテストフォルダーで通す。

1. **ポート11434は使わない**。テスト中のNodeプロセスが作った`127.0.0.1`の空きポートに偽のOllama HTTPサーバーを起動する。
2. R48由来の、実際には何も認証せず実世界と切り離された**合成試験用の**旧`runR48OneShot`関数へテスト固有の同意文字列を渡し、偽`GET /api/tags`と偽`POST /api/chat`各1回のみ受信させる。ここでのロックはテスト専用一時ディレクトリだけに書く。ユーザーの実R48の承認は使わず、旧証拠も触れない。
3. B143を範囲外で故意にFAILさせる合成原本を用意し、受信した未修正原本・キャプチャ・マニフェストのSHAが一致していることを検査。
4. Windowsでは`R52`オフラインZIP化ヘルパーを実行し、`Compress-Archive`→`Expand-Archive`後のZIP内部に次を検証する：
   - 1回の原本の**一字一句無改変のまま**の`R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`
   - 原本SHAを保存した`R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json`
   - `R52_OPEN_FAILED_SOURCE_DIAGRAM.html`
   - `R52_FAILED_SOURCE_DIAGNOSTIC/R51_UNCOMPILED_SPATIAL_STORYBOARD.html`
   - 原本の範囲外エラーが図に記載され、最終3Dや施工は認証しないこと
5. R48風の合成原本でも、B143が厳密にPASSする別例では**正式なR7 3Dレビューを優先してR51図面を作らない**ことを検証。
6. 同じ一時承認ロックでの2回目の要求は拒否し、偽モデルへの2回目POSTが起きないことを検査。
7. Ubuntuでも偽モデル・SHA・R52同梱用の資料生成までは実行し、Windows固有の圧縮には進まない。

`.github/workflows/r53-fake-capture-to-zip.yml`を追加。Windows/UbuntuでR52全体の回帰も続行。

## 具体的な統合点

R52オフラインZIP化ヘルパーが準備できたため、**今後別途ユーザーから明示承認された**ローカルQwen実行器では、モデル1回の生成後、従来の原本保存・SHA監査を実施し、最後の既存`Compress-Archive`部分だけを`ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1`呼出しへ差し替える。これは次の明示承認を得た未来のR54等で固定SHAsを更新し、安全CIで確認した後に行う。

現在のR53には新規本番推論器やCMDダウンロードを追加しない。過去R48用の固定コミットやソースを勝手に更新しない。

## 残る重要な課題

- B143構文・最終ボクセル検証だけでは、使える図書館、本当の通路、目で見て独創的な建築かは判断できない。
- R50の「建築プログラム先行」の生成指示はオフライン試験PASSであり、実`qwen3.8:27b`への品質改善は未実証。
- R51の図は各形状の外接直方体のみ。B143が失敗した場合の説明資料であり、完成3Dではない。
- 今後のユーザー操作は**CMDダブルクリック→承認確認→結果ZIP提出**に抑える。SSH、Git操作、ZIP手作業、PowerShell入力は要求しない。

## 不変の安全状態

今回追加推論0、世界操作0。R25/R44/R46/R48の実原本、古いロック、旧固定Runner、main、不変のFreezeは変更なし。`NOT_PREPARED`、9ゲート`BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`。R53は必ず偽Ollamaによる合成試験に限る。
