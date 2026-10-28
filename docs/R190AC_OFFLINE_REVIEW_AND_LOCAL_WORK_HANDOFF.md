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
