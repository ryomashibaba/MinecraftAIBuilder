# MinecraftAIBuilder / R190-AA — Local Work 実モデル研究引き継ぎ

基準: 既存リポジトリ `ryomashibaba/MinecraftAIBuilder`。ブランチ `feature/b198zr1-protected-architectural-revision`、Draft PR #128。新規プロジェクト・main変更・mergeは禁止。

## 目的と厳格な境界

GitHub上の fake-only CI に代わる、実ローカルQwenの**独立した日本語要求からの建築生成能力**を実測する。用途・立体構成・空洞・入口・支持床・動線・屋根・外観・独創性を評価し、失敗した原文をそのまま残して設計方式の改善につなぐ。機械測定は美術認定ではない。

- 実行対象はWindowsの既存 `$env:USERPROFILE\Projects\MinecraftAIBuilder` のみ。別クローンやZIP展開は不要。
- 研究対象はファイル上のB143設計と真正ボクセル3Dのみ。Minecraft起動・ゲームへの接続・ワールド書き込み禁止。
- `readiness=NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、9 `BLOCKED`、空の`BuildPlan.operations`、`worldContacts=worldWrites=0`を維持。
- GitHubの変更は現行開発ブランチのみ。Draft PR維持。原文・ローカル証拠フォルダはGitに含めない。
- モデルはローカルOllamaのみ（127.0.0.1:11434）。クラウドプロバイダー、モデル自動ダウンロード、無断の再試行、マルチGPU並列実行は禁止。
- この手順は**人間がローカルWorkを選び、PCファイル・コマンドへのアクセス権を与えた場合だけ**実行できる。クラウドWorkやChatからWindowsに直接接続できない場合は無理に代替しない。

## まず実行する読み取りと検証（モデル呼び出し0件）

1. Windowsの上記正規フォルダとGitリポジトリの存在を確認。`git status --short` と現行ブランチを確認する。未コミットの人間の変更がある場合は上書きせず停止する。
2. GitHubの保護ブランチHEADとローカルHEADを比較する。ローカル変更がないときのみ、必要なら `git pull --ff-only origin feature/b198zr1-protected-architectural-revision`。強制操作・reset・main変更禁止。
3. `node --version` と Ollama `http://127.0.0.1:11434/api/tags` を読み取りで確認する。モデルがなければ自動ダウンロードせず停止する。
4. `node --test scripts/r190aa-local-work-pilot.test.mjs`
5. `node scripts/r190aa-local-work-pilot.mjs`（既定は**読み取り専用**でモデル呼び出しなし）。

## 実モデルの第一段階

最初にローカルQwen3:14bで**1件だけ**試す。

```powershell
Set-Location (Join-Path $env:USERPROFILE 'Projects\MinecraftAIBuilder')
node scripts/r190aa-local-work-pilot.mjs --run --model qwen3:14b --batch pilot-01 --count 1
```

- 出力先は `r190aa-local-evidence/pilot-01`。バッチ名が存在したら終了し、別名への**自動リトライは禁止**。
- `R190AA_BATCH_MANIFEST.json`、`library.attempt.json`、`library.observation.json`、`R190AA_BATCH_SUMMARY.json` と元のモデル原文・受領証を照合する。
- 原文SHA、要求SHA、選んだモデル名、模型の真のB143コンパイル状態、立脚点、入口からの到達可能性、屋根下の位置、3D閲覧データを確認する。
- 原文が無い、受領証が壊れた、推論が時間切れになった場合は**HOLD**。欠損データの補完や再推論を勝手にしない。
- 正常にコンパイルできても`ART HOLD`。作品の魅力と独創性は3Dを複数視点で人間が確認する必要がある。

## 第二段階（第一段階の証拠確認後）

次に異なる日本語要求を含む3件または5件の独立設計実験に進める。例：

```powershell
node scripts/r190aa-local-work-pilot.mjs --run --model qwen3:14b --batch pilot-02 --count 3
```

実験は逐次実行。途中でプロバイダー原文が得られない・証拠が不正ならそこで停止。既定の3件は図書館、海岸の再生素材センター、山の天文観測所。5件では橋梁一体型ホールと立体市場が加わる。いずれもユーザーの未知の日本語要求への一般化を測る**初期研究例**であり、特定建築類型の正解テンプレートではない。

この初期の固定課題が通った後に、課題の難易度・類型・未使用要求を増やす拡張を設計する。回数を増やすこと自体を目標にしない。

## 評価と進捗の報告

| 項目 | 判定方法 |
|---|---|
| モデル由来の原文 | 受領証とSHA連鎖を確認。プロバイダー名は暗号学的に認証されないことを明記 |
| 空洞と室内 | 真のボクセルで床上2ブロックの空気・壁・屋根を観察 |
| 外部入口と動線 | モデル申告だけでなく実際の支持立脚点・出口への連続空気・部屋間接続を確認 |
| 屋根と構造 | 斜面・雨仕舞い・空間を塞いでいないかを真正3Dで評価 |
| 外観・独創性 | 原文由来の真正3D多視点で人間が審査。数値代理指標のみでART PASSにしない |
| 実験効率 | 実呼び出し件数、HOLD原因、推論時間（取得可能な場合）、再現可能な条件を記録 |

Chatと中央監督へは、実際の完了件数、原文SHA、実測メトリクス、美術審査で保留した理由、具体的な次の改善仮説を報告する。Cloud CIを実モデルの証拠として引用しない。

**採択状態：研究用／正式美術採用0件／Minecraft施工禁止。**
