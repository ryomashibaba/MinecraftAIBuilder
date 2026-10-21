# B198Z-R52 — B143失敗時の診断図を将来のQwen結果ZIPへ自動同梱

## 結論

**R51のWindows/Ubuntu最終CIはPASS。** これまでの実Qwen R25/R44/R46/R48は、いずれも正式B143コンパイルがHOLDになり、R7の最終3Dボクセルビューアが生成されないまま結果ZIPが完成した。R51の外接範囲図を追加すれば、ユーザーは再推論や個別コマンドなしで原本の屋根・階段・空洞・入口座標を視覚的に審査できる。

**R52は将来、新規承認がある単発Qwen実行器の「生成→原本・SHA監査→ZIP作成」の間に挿入する、完全オフラインの後処理工程。** R48等の歴史的・使用済み実行器や保存済み原本／既存ZIPを遡及変更しない。今回の実Qwen推論は0、Minecraft接続／施工は0。

## R52の実装

- `scripts/b198zr52-postcapture-auto-storyboard.mjs`：保存済みの`Rxx_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`、`Rxx_CAPTURE_RESULT.json`、`Rxx_FINAL_EVIDENCE_MANIFEST.json`および存在する場合の`Rxx_WINDOWS_ORIGINAL_SHA_AUDIT.json`をSHA-256照合。原本不一致・曖昧な複数原本・symlink・既存同名成果物はすべてHOLDして自動修復しない。
- **厳格な既存B143コンパイラでコンパイル可能ならR51図面を生成しない**。B143が失敗した場合のみ、R51が扱う設計原本の外接矩形をオフラインHTMLに表示する。`R52_FAILED_SOURCE_DIAGNOSTIC/`内に`R51_UNCOMPILED_SPATIAL_STORYBOARD.html`とその原本SHA証拠を作り、`R52_OPEN_FAILED_SOURCE_DIAGRAM.html`から一クリックで開けるようにする。`R52_DIAGNOSTIC_ATTACHMENT_RECEIPT.json`に、何を後処理したか、B143の最初の正式エラーを記録。
- `tools/r52-future/ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1`：**将来の単発実行器から1コマンドだけ呼び出すZIP化ヘルパー**。まずR52オフライン処理を行い、既存と同じ`Compress-Archive`で証拠フォルダとR51診断を**ひとつの新規ZIP**へ収録する。ユーザーにPowerShellやZIP操作を追加で要求しない。
- `scripts/b198zr52-postcapture-auto-storyboard.test.mjs`：偽R48型原本・監査のSHA一致／不一致、B143不成立時の自動同梱、B143成立時の正式R7優先、原本不変、二重同梱拒否、JSON中断、実Windowsでの`Compress-Archive`→`Expand-Archive`を検証。
- `.github/workflows/r52-future-autopackage-source-only.yml`：Windows/Ubuntu CI。模擬JSONファイルのみで、本物のQwen/Ollama、Minecraft、ネットワークを使う処理なし。CIのプログラム取得にGitHub Actionsは利用。

## 将来のWindows単発ランナーとの接続方法（ユーザーには見せない内部手順）

**新しいユーザー承認がある将来の`R53`等でのみ**、従来Windowsコードの`Compress-Archive -LiteralPath $folder -DestinationPath $zip`に代わって次を使用する。ソースファイルは署名された固定コミット・SHA検証済みのものだけ配置すること。

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $src 'tools\r52-future\ARCHIVE_WITH_R51_DIAGNOSTIC_OFFLINE.ps1') -EvidenceDir $folder -SourceRoot $src -ZipOutput $zip
if ($LASTEXITCODE -ne 0) { throw 'OFFLINE_STORYBOARD_OR_ZIP_HOLD' }
```

`src`は将来のピン留め済みローカルソース、`folder`はその1回の試験で保存した**新規証拠フォルダ**。メインのQwen呼出し・承認ロック・モデル選択・回数制限ロジックをR52は変更しない。Windows既存R48のピン留め済み旧ファイルは絶対に上書き・差替えしない。

原本の全体SHA監査が不一致ならZIPも生成しない（成功に偽装しない）。原本の応答そのものが存在しない**通信段階の失敗**では、Windowsヘルパーが既存の早期エラーログをZIPに格納し、診断図を偽造しない。原本ファイルが存在するのにSHAが不一致の場合は、ZIP化前にHOLDする。

## 実装対象と限界

R51/R52のHTMLは**B143のエラーを説明する参考の投影図**であり、最終ボクセルモデル、実3D建築、実際の歩行経路、意匠・構造品質の自動認定ではない。R51の外接図だけを見て建築完成と判断しない。B143がPASSした設計は正式R7の最終ボクセル3D人間審査へ進む。

次の実Qwen推論には新たな明示承認が必要で、R48承認は消費済み。Minecraftについては`NOT_PREPARED`・9ゲート`BLOCKED`・`constructionApproved:false`・`executionAllowed:false`・`BuildPlan.operations:[]`を厳格維持。

## 開発者の合格条件

- CIで模擬モデル原本の**バイト単位の不変**・RAW SHA一致を確認。
- Windows実際の圧縮→展開で`R52_OPEN_FAILED_SOURCE_DIAGRAM.html`とR51ビューア、SHA証拠が1つのZIP内にあることを確認。
- R51/R52のファイル追加を**未来の承認済みランナーの処理に組み込むだけ**で、ユーザー操作は従来と同じ「CMD実行→結果ZIP提出」にとどまる。
