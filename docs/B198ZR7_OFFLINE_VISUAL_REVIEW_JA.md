# MinecraftAIBuilder — B198Z-R7 人間による建築品質の目視審査まで1回で接続

**2026-10-19 / Source-only / 実Qwenの新規生成ゼロ・Minecraftへの接続/施工ゼロ**

## 最も重要だった欠落
R6 までは実QwenのR4原文取得→B143で形状整合・R3で吹抜け/階床/動線チェック→JSON/ZIP作成がつながっていた。しかし、**実際に目で見て外観や屋内空間の品質を判定するHTML 3Dビューアーを生成していなかった**。数値検査だけでは「日本語の指示に合う、美しい、独創的な建築」か判定不能であり、現時点での最高優先の実用的ボトルネックだった。

## R7で実際に実装したもの
1. `scripts/b198zr7-offline-visual-review.mjs` を新設。純粋にB143設計JSONと正本の独立コンパイル結果を受け、既存 `build-b143-site.mjs` の公式3Dセル表示エンジンで**オフラインの回転/ズーム/階層フィルタ可能な `index.html`** を生成する。外部WebリクエストやMinecraft通信は行わない。
2. 既存 `b198w-quality-review.mjs` の `B198W_REVIEW_BOARD.html` と `B198W_SOURCE_QUALITY_EVIDENCE.json` を同じ出力フォルダへ追加。B198B凍結の c01「未来型図書館」を対象に、人間が「公共図書館として読めるか」「巨大吹抜け」「高層ラウンジ」「曲面・階層の統一感」の各項目を**視覚・意味を含め自分の眼で評価**できる。AIや検証器に外観点数を捏造させない。
3. `R7_VISUAL_REVIEW_MANIFEST.json` に元B143 `sourceSha256` と `geometrySha256`、表面表示セル数、`NOT_PREPARED` と9ゲート `BLOCKED` を記録する。ビューアーが描く形状と、採点対象と、R6元モデル原文の各SHAをつなぐ。
4. `scripts/b198zr6-authorized-single-r4-capture.mjs` と統合したため、別の手動コンバーター起動は不要。コンパイルが成立すれば、**R3でモデル自己申告した動線が不合格でも**表示と人間の再評価ができる。不正JSON/不正B143でコンパイル不能なときは原本を保全し、3Dモデルを捏造しない。
5. ビューアーは過去に「ChatGPTが設計した」と表示していた文言を、**「モデル出力候補（作者・意匠品質は未認証）」**に直したうえで生成。元のページやGitHub Pages本体は変更しない。画面にはNOT_PREPARED・Minecraft施工禁止と明示。
6. `RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` は将来**ユーザーの個別明示承認後**に1回だけ起動する。結果ZIPをPowerShellで生成後にWindowsのエクスプローラーでそのファイルを選択し、探す作業を減らす。ZIPから `index.html` と `B198W_REVIEW_BOARD.html` を開けばよい。

## 検証・禁止事項
現在のActionsのCIは **モックHTTP（実Qwenではない）** の単発取得→元原文の厳格SHA→B143/R3の判定→オフライン3D HTMLとB198W審査画面生成まで連結し、成功/形式不正/HOLD をテストする。Windowsのダブルクリックや実Qwenの27B推論はまだ実機未検証。画像に描かれたことを実Minecraftの建築/歩行/衝突状態や芸術評価として認定しない。

`NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]`、worldWrites/Contacts 0、元Qwen原文 SHA256 `40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf` 保持。旧B99/B100、Legacy、FAILED journal、main、旧Draft PRは変更しない。Work・課金APIなし。

## 次に必要な本物の証拠
一層の「形だけのテスト」は不要。**ユーザーが実Qwen単発推論を明示的に承認した場合に限り**、R6 Windows起動→ひとつのZIP→この3D＋人間のレビュー→R5の旧Qwen原本との差分検討を進める。ユーザーから許可が出るまでは推論を自動実行しない。単発で失敗しても、自動リトライせず原因と原本を残す。

## 使用コンポーネント
- `source/ai/b143-building-dsl.mjs` — 正本B143の厳格コンパイル
- `scripts/build-b143-site.mjs` — オフライン用表示エンジン（流用のみ）
- `source/ai/b143-viewer-template.html` — 3D表示（流用のみ）
- `scripts/b198w-quality-review.mjs` と `source/ai/b198w-review-board-template.html` — c01凍結評価票
- `scripts/b198zr6-authorized-single-r4-capture.mjs` — R7生成を自動統合
- `scripts/RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd` — 将来の1回承認を要求するWindows起動補助
