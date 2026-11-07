# B198Z-R75 — 記入済み人間審査票の出所確認と未解決課題引き継ぎ

基準日 2026-10-22 JST。MinecraftAIBuilder Draft PR #128 の続き。施工・実Qwen追加推論は明示的な単発承認がないため実行不可。

## 目的
R74は3方向×6軸の未記入審査票を安全に生成した。R75は**人間が実際に入力したコピー**を別ファイルとして受け取り、原本証拠と一致させて、未審査・追加証拠が必要・懸念が残る項目を引き継げる形にする。ユーザーが審査を提出していないうちは『未提出』の案内だけを作り、架空の審査結果を作らない。

## 実装
- `scripts/b198zr75-human-review-handoff.mjs`：元モデル回答raw SHA、B143最終概念ボクセルSHA、R70/R71/R72/R73、R74未記入JSONを元証拠から順番に再算出して照合。改ざんされた過去データ・無関係な設計案・自己申告だけの入口位置は拒否。
- 人間が記入できる欄はreviewerName、reviewedAtJst、overallReviewNotes、各方向の6軸のstatus/observation/evidenceReference、方向へのコメント、再検討するかどうか、今後の検討の好みと理由だけ。施工承認・品質PASS・source SHA・比較対象など、その他の欄の変更を拒否する。ユーザーの氏名入力があっても本人認証は実施しない。
- 18軸（1領域×3方針×6軸）をそれぞれ確認。NOT_REVIEWED、NEEDS_EVIDENCE、CONCERN、根拠の欠けたPROMISING_FOR_FURTHER_STUDY、理由のない選択方向を課題として列挙。完全に全部良好と記入しても `COMPLETE_SELF_ATTESTED_NOT_QUALITY_CERTIFIED` であって品質・実機・施工PASSではない。
- `reviewR75SubmittedDraft` はメモリ上の検証のみ。`writeR75SubmittedDraftHandoff` は検証済みの提出が現実にある場合にだけ新しい`R75_HUMAN_REVIEW_OUTSTANDING.json`と`R75_HUMAN_REVIEW_OUTSTANDING.html`へ記録（原本/空欄テンプレートは上書きしない）。HTMLの自由記述内容はエスケープする。
- R60の1回ZIPレビューには提出手順の`R75_HUMAN_DRAFT_INTAKE_GUIDE.html`だけを追加。ユーザーの入力が存在しないうちは `R75_HUMAN_REVIEW_OUTSTANDING.json` を生成しない。保存済み空欄テンプレートは複製して記入する。
- R62の次回設計指示は、認証できない人間入力でゲートをPASSにしない。実際の次回Qwen推論には**新しい明示承認**が必要。人間のコメントだけでは推論・施工承認にしない。

## CIと安全
未記入HOLD、部分記入、完全記入でも非認証、偽の承認欄、原本の破損やR73改ざん、HTML XSSエスケープ、上書き拒否、B143 HOLDからの入力捏造禁止、R60出力を既存Windows/Ubuntu Node24ワークフローで検証。新規ワークフローを作らない。

`NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、施工9ゲートすべて`BLOCKED`、`BuildPlan.operations=[]`、`modelCalls=0`、`worldContacts/Reads/Writes=0`。R75テスト成功は審査入力の整合性に関する結果であり、AI建築生成品質向上を意味しない。
