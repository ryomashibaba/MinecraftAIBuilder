# R190-AC — 実Qwenの契約と建築設計を別々に評価する

## 状況

R190-AA pilot-01のGitHub公開原文は2,581バイト、SHA256 `0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17`。B143は0/1で失敗し、真正3Dなし。公開した原文を検証せず修理することは禁止。

R190-ABは、**元と同じ山間の公共図書館要求**に対し、ローカルOllamaのネイティブJSON Schema制約を付けたQwen3:14bの1件だけの実行を準備した。GitHubのR190-AB成功CIはFAKE ONLYで、実Qwen成功の証拠にはならない。

R190-ACは**保存された原文だけ**を比較するオフライン診断器で、モデル呼び出し0、ネットワーク0、ワールド操作0、ソース修復0。旧案の不正schema、余分な回答キー、cut material、staircase axis、失効した切削箱、加算箱重複、モデル自己申告地点の加算箱との交差を見分ける。これはソース座標の静的診断であり、B143を通った後の真正3Dボクセルとは区別する。

## ローカルWorkの安全な進行順

1. `C:\Users\ryoma\Projects\MinecraftAIBuilder` の `git status --short` と `git diff` を確認。R190-AAのWindows上の未コミット2ファイル、pilot-01の研究証拠156ファイル、現在のローカル研究フォルダを保護する。上書き・reset・別クローン禁止。GitHub側のR190-AA集計修正との共通部分を照合してから安全に統合。
2. GitHubの作業ブランチ `feature/b198zr1-protected-architectural-revision` と Draft PR #128、およびR190-AA/AB/ACの最新専用Actionsを確認。CIが実行待ちならPASSと報告せず、ローカルで `node --test` を実行して不足を区別。
3. `node --test scripts/r190aa-local-work-pilot.test.mjs`、`node --test scripts/r190ab-structured-output-pilot.test.mjs`、`node --test scripts/r190ac-offline-source-review.test.mjs`。すべて模擬試験。保留の既知Windows fixture問題は別問題として記録する。
4. 明示的な実Qwenの1件実験を実施する場合、`docs/R190AB_STRUCTURED_OUTPUT_RESEARCH.md` に従い、**新しい一意の研究名**で実施。初回は `--task library` を固定し、次の異用途では同じランナーの `--task tidal-workshop` 等を使用する。ローカルWork操作には事前にユーザーの許可を得る。Qwen/Gemma実推論自体は憲章で包括許可済み。既に同名の実験がある場合は勝手に別名で再実行しない。APIがJSON Schemaを拒否する場合もHOLDの証拠にする。
5. R190-ABが原文・監査を完全保存した場合に限り、次の **ゼロ推論** 比較コマンドを実行。

```powershell
Set-Location "C:\Users\ryoma\Projects\MinecraftAIBuilder"
node scripts/r190ac-offline-source-review.mjs --ab "C:\Users\ryoma\Projects\MinecraftAIBuilder\r190ab-local-evidence\contract-01"
```

このコマンドはレポートを標準出力に出すだけで、保存済みモデル原文・研究成果に書き込まない。生成される監査情報には、原文SHA、B143構文の成立、真のボクセル数（成立時のみ）、入口の支持空間と境界への到達proxy、屋根下到達proxy、モデル宣言領域の測定を記録する。

## 判定の基準

- **契約成立**：正規B143およびR4の出力構造を無改変でコンパイルできる。
- **建築成立**：モデルの申告と異なる可能性を考慮し、実ボクセルで入口・床・空洞・目的空間・階段・動線を実測する。到達proxyはMinecraftの実機歩行ではない。
- **美術品質**：本物のB143から生成した真正3Dを外観・内部・屋根・高さ違い・人間の経路の視点でレビュー。建築類型をハードコードした別作品やホスト修復版を作品として認定しない。
- **計算負担**：記録された壁時計時間とOllamaの任意のduration・tokensは区別する。

R190-ACは「前回より良い建築」を決して自動認定しない。`winner=NOT_ESTABLISHED`、`ART HOLD`、Minecraft施工禁止、`NOT_PREPARED`、9ゲート`BLOCKED`を維持。旧pilot-01がB143不成立なので、旧案と新案の真正ボクセル差は直接比較できず、改善の因果認定もしない。

当面の最優先は **R190-AA/AB/AC専用CI成功確認 → Windowsの差分保護 → 明示的に1件の実Qwen → 保存原文のR190-AC再審査**。大量実験・main変更・PRマージはしない。


## 追加：R190-AB意味IR研究も独立監査（2026-10-28）

R190-ABの `--contract semantic-space` は、既存R190意味IRから**ホストがB143を生成**する。原文は新しい別名の研究ディレクトリ `semantic-workshop-01` に保存し、`contract-01` の図書館原文に上書きしない。

既存のR190-ACはこの新しい受領証を認識し、原文SHA、意味IRの真正コンパイル、宿主生成B143の一致、3Dビューア、5方向SVG、2幅の支持経路を**モデル推論0回**で独立再検証する。作者表示や計測値の改ざんもHOLD。モデルが3D形状を直接書いたことにしてはいけない。

ただしR190共通変換器は**単層限定**で、二層図書館、立体市場、丘陵観測所、架橋空間などの要求はこの経路の能力を超える。単層の研究題材は `tidal-workshop` のみ。潮位対応・排水の実用性、用途充足、建築の独創性、実Minecraft歩行はいずれも未証明。モデルの課題が異なるため、図書館の旧pilotと「単純にどちらが美しいか」の因果比較は行わない。

Windows側の未コミットR190-AA差分を保護し、GitHubの必要な新規ソースだけを安全に同期する。実Qwenの包括許可とは別に、ChatGPTのWorkでPCを操作する場合は事前にユーザーの許可が必要。ユーザーがPowerShellを手動実行する操作はWorkの遠隔操作ではない。

## R190-AB 単層意味IRの安全なWindows実行（2026-10-28）

以前の `MODULE_NOT_FOUND` や未コミット差分上書きを避けるため、`scripts/r190ab-semantic-workshop.ps1` を用意した。**通常の `git pull` や `git reset --hard` は使用しない。** スクリプトはユーザーがローカルPowerShellで起動するもので、Chat/Workから勝手にPCを操作しない。

- 既存フォルダ `C:\Users\ryoma\Projects\MinecraftAIBuilder` の現在のブランチ・未コミット状況を読み取り、現ブランチが研究ブランチ以外なら停止する。
- `git fetch` で対象HEADを取得し、Windows TEMP以下の**新規独立detached git worktree**でR190-AB/AC fake-onlyテストを実行。既存リポジトリの追跡ソースは変更しない。
- 既定では `-Run` を省略するとテスト・preflightだけで終了し、実LLM呼出は0回。`-Run` を明記すると、**異なる新研究名につき最大1回**、ローカル `127.0.0.1` Ollamaに `qwen3:14b` `tidal-workshop` の単層意味IRを要求する。
- 結果がHOLDであっても、`MODEL_RESPONSE_ORIGINAL.txt`、`R190AB_ATTEMPT.json`、`R190AB_RESULT.json` を含む保存ディレクトリを削除せず、`r190ab-local-evidence/semantic-workshop-01` に証拠を保存。転送後のSHAを全ファイル再検証。転送できなかった場合はtemp worktreeを維持して証拠喪失を防ぐ。既存の同名証拠があれば推論前にHOLD。
- 続いてR190-ACは**0推論・読み取り専用**で原文とホストB143/HTML/SVGを照合。完了後の一時worktreeだけを削除する。
- ただし、GitHubの巨大コードベースと一時worktreeに必要なディスク容量はゼロではない。通常のmain/PRマージ、R190-AA原文の編集、Minecraftワールド接触や施工はない。

既存のローカルコピーに新規スクリプトがまだない場合、次を**canonicalリポジトリ直下のPowerShell**に貼り付ける。これはGitHub取得と一時ファイル実行だけであり、`git pull` や元ソースの上書きをしない。

```powershell
$branch = "feature/b198zr1-protected-architectural-revision"
git fetch --no-tags origin $branch
if ($LASTEXITCODE -ne 0) { throw "git fetch failed" }
$script = Join-Path $env:TEMP "MinecraftAIBuilder-R190AB-semantic-workshop.ps1"
git show "FETCH_HEAD:scripts/r190ab-semantic-workshop.ps1" |
  Set-Content -LiteralPath $script -Encoding UTF8
if ($LASTEXITCODE -ne 0) { throw "Could not retrieve study script" }
# テストのみ、実Qwen0回
& $script -Repository (Get-Location).Path
# テストOKと出た後、ユーザーの操作で明示的に1回実推論する
& $script -Run -Repository (Get-Location).Path
```

CLIの出力を確認し、`-Run` 前のテスト失敗時は実推論をしない。実行後に得られた証拠3ファイルと、真正B143ビューア・5方向SVGが生成された場合はその画像を美術・機能の両面で評価する。Qwenの実モデル名、トークン数、壁時間を保存するがモデル自己申告であり品質の保証ではない。

**注意：** このWindows helper自体のローカル実機成功はまだ未確認。GitHub ActionsのPowerShell構文解析とfake-only Node回帰は、Windowsの実Ollama接続や実モデル建築品質の代替ではない。
