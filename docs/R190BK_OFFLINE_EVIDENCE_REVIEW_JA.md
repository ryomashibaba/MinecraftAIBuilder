# R190-BK — AI建築設計の「成立段階」を直接比較するオフライン人間レビュー入口

**基準：2026-10-30 JST。** 既存 Draft PR #128 を継続。Minecraft施工・新規実モデル推論・正式美術採用なし。BJのHEAD `b6cb3c5ae8bb4aab16e371fb4c63042f26995dc6` から開始する。

## 現状と問題
BJは、保存済み実Qwen原文の失敗（B143スキーマ、material:null、階段axis、床と立脚点・headroomの矛盾）から、BCとは別の設計先行指示案を準備する。BJ/BF/BE/BGの既存CIは合成通信試験中心であり、新しい本物の建築が美しくなった証拠ではない。

既存BFは、原文不正時にはBIの診断を残し、両側が真正B143ならBG人間審査画面を生成できる。しかし、結果を見る人が不正原文・真正3D・R4・断面・人間審査の状態を1箇所で追う入口が不足していた。

## 実装
`scripts/r190bk-evidence-stage-review.mjs` は **既存BF比較フォルダーを読むだけ**で、`R190BK_EVIDENCE/R190BK_REVIEW.html` と `R190BK_EVIDENCE.json` を作る。BF→BEの比較JSONと保存元SHA、BI不正原文診断、BG人間審査のSHAと安全制約を、生成前に照合する。破損や改変はHOLDではなく書き込み前に拒否する。

- **Aだけ有効なB143、Bが不正**：Aの真正3Dへ誘導し、Bは原文上の不整合コードを表示する。Bの偽3DやBGの不正な採点導線は作らない。
- **A/B両方有効、完成ボクセル同一**：両側を表示するが、`NO_PHYSICAL_DIFFERENCE_ART_HOLD`。見た目を改善したとは主張しない。
- **A/B両方有効、完成ボクセル相違**：原3DとBGレビューへ誘導。形状差は美術の改善ではなく、勝者を自動決定しない。
- **任意の人間観察ファイル**：既存BGの原文・比較・画像SHAを再検証し、実在する観察があるという事実だけ付加。人間の評価点から機械が勝者を決めることはない。

## 使い方（新規モデル生成0）
```powershell
node scripts/r190bk-evidence-stage-review.mjs --compare NEW_COMPARISON_DIR
# 個人がBGの画面で観察して保存した場合だけ:
node scripts/r190bk-evidence-stage-review.mjs --compare ANOTHER_FRESH_COMPARISON_DIR --observations PATH_TO_HUMAN_OBSERVATIONS.json
```
既存結果の二重出力は拒否する。再生成が必要なら新しい比較フォルダーを用意する。すべてオフライン・静的HTML。

## 意義と限界
既存の真正B143/五投影/断面を再使用し、無駄に新形状や監査項目を作らず、結果を見るまでの操作を減らす。新しい本物のQwen/Gemma推論、本人による美術評価、Minecraft実機の歩行は未実施。保存されたモデルの識別子・生成条件の真正性も独立認証されない。表示はモデル設計能力の改善を自動認定しない。

## 次工程
新規実モデル推論は実験範囲ごとの明示承認がなければ開始しない。真正なA/B結果が揃った後のみ、BKで有効な原形状と失敗の比較を見て、独立した人間による美術・実用性の評価を行う。BC/BJの方式間評価は同じ元依頼・モデル要求条件・証拠を揃えた追加研究が必要。

安全は `NOT_PREPARED` / 9×`BLOCKED` / `BuildPlan.operations=[]` / `worldContacts=worldWrites=0` / `ART_HOLD` / `officialArtAdoptions=0`。main変更、force push、PRマージ、Draft解除は禁止。
