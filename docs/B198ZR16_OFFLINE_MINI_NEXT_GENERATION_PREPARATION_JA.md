# MinecraftAIBuilder — B198Z-R16 検証済み軽量モデル試験準備パッケージ
2026-10-19 / Draft PR #128 / source-only / 新規Qwenの推論なし / Minecraft施工なし

## 一番大事なこと
**このR16 MINI ZIPを使っても実際のQwenは動きません。** 以前許可された本物の一回分はR6で使用済み。R16は「次回一回」のQwenを、安全・省時間で検証するための**コードを揃え、偽サーバーで模擬試験を通す工程だけ**である。実Qwen新規実行は新しい明示許可と別の一回用起動手順が整うまで禁止する。Minecraft Educationワールド読み書き・施工も禁止する。

## 3ファイルの配布
`MinecraftAIBuilder_R16_MINI_OFFLINE_20261019.zip`
- **2,519 bytes**、SHA-256：`bb28b2605486c6709154ef1c8dc0264ab0d1699a8936d32e90dfe3b278232986`
- ZIP CRC / 解凍テスト PASS。収録：`START_R16_OFFLINE.cmd`、`FETCH_PINNED_R16.ps1`、`README_FIRST_JA.txt`
- ZIPの3ファイルはGitHub `tools/r16-starter/`のものとGit blob SHA/ファイルサイズで**完全一致**：
  - `START_R16_OFFLINE.cmd` — `39b8849f2b336c047caddf8b53ecf3fc3639a853`
  - `FETCH_PINNED_R16.ps1` — `858b5e4cdf8d2ea0814e743d236510d4e47fd20e`
  - `README_FIRST_JA.txt` — `bfc28772f217ff1121fdd4f5128a6ee8a12e4688`
- セットアップの流れ：WindowsでZIPを「すべて展開」→`START_R16_OFFLINE.cmd`をダブルクリック。PowerShell5.1とNode.jsが必要。初回はGitHub `8675fb2ca2aad9e631246a5c429dd82756cab322` のインストーラーをGit SHA `8f4224bac2fc2fde9c5ac311052a5887174a9402`で**照合後**に実行。
- インストーラーはGitHub `a0438d8fa2504564351f8ebafbe9ecc14575dc95`で固定した**32ファイル、計283,905バイト**をGit blob SHAで1件ずつ厳密照合。全リポジトリはダウンロード・展開しない。
- ZIPには実Qwenを起動できる`RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd`を**含めない**。インストール先に見つかった場合も明示的にHOLD。

## 実際にテストされる機能
`scripts/b198zr16-offline-preflight.mjs`が、既存コード・生成上限の一致を確認し、4種類のテストを走らせる：
1. R6：旧1回実行の承認ゲート・原本無改変保存・失敗時の自動再試行なし。**127.0.0.1の模擬サーバーだけ**を相手にする。
2. R11：新しい `r11-compact` プロンプトのSHA・モード・3,072出力トークン/6,144文脈トークン固定・旧R8既定との差。新しい実モデルへ問い合わせない。
3. R13：JSON未完成HOLD、機械的なソース/動線検証、人間による意匠評価待ち、改変証拠拒否。
4. R15：旧/新原本SHAと最終建築形状SHAの比較、低品質な人間得点、高リスク建築のHOLD、誇張された改善判定の拒否。
追加でR12の階段・繰り返し部材の最終ボクセル一致、R3の概念空間動線テストを再利用する。
合格文字列は`R16_OFFLINE_PREPARED_NO_QWEN`。**これは次の実Qwen生成の成功ではない。**

## Windows検証
- `.github/workflows/r16-mini-windows.yml`、`scripts/b198zr16-windows-mini-smoke.ps1`を実装。
- Windows-latest / Windows PowerShell5.1 / Node24上で、**配布する3ファイルと同一のGitHubソース**のスターターCMD起動→インストーラー固定SHA確認→32ファイルを実ダウンロード・SHA照合→全模擬テスト実行を確認。
- 2回目のセットアップは同じ32ファイルのSHAを検証して再テスト（改変なし）。改ざんしたB143ソースを発見すれば、勝手に修復・上書きせずHOLD。前回のモデル起動用CMDが入っていないことも検査。
- CIが成功してもユーザーのOMEN本体にNode.js/ネットワークなどの環境差がある可能性は残る。

## 関連する次工程
- 本当に必要な次の1回は **ユーザーの新しい明示承認** が出てから別の「R11 compact指定」「R9/R10 grammar対応」「原文・R13評価票同梱」「R15旧R6との比較」ができる単発起動手順で行う。
- 問題を起こした旧R6原本は**凍結して改変しない**。同じ原本の読み直し・モックHTTPの成功はモデル性能向上の根拠としない。
- データ安全：`NOT_PREPARED`、9 `BLOCKED`、`BuildPlan.operations=[]`、worldContacts/worldWrites=0、mainマージなし、既存B99/B100 Freeze保持、Work利用なし。
