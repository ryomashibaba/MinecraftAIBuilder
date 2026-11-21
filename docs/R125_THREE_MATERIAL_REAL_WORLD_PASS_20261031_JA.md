# R125 — Minecraft Education 3材料建築の初回実機照合（2026-10-31 JST）

## 出所と判定
ユーザーが、バックアップ済み試験ワールド上でB143合成設計由来の小型平屋を施工した実機画面2枚をチャットへ提示。元のQwen花屋とは独立した**SYNTHETIC_TEST_FIXTURE**。本リポジトリには画像ファイルを保存していないため、目視確認の出典はこの会話のユーザー添付であり、外部からの再検証は未了。

- 対象Minecraft Edition: Education v26.33（ユーザーの前段の実機環境申告）
- 生成設計：`B143_SYNTHETIC_DESIGN.json`
- データ出所：保存済み合成材料試験、モデル新規呼び出し0。
- 予定ブロック502、直方体16。石348、木材`oak_planks`144、ガラス10。元B143の7抽象材料中、使用3種のみ。
- 元設計SHA-256: `5ee366ee6651c2e9e6a0488315c4cfaa1b1f9d9fbce4eda67fe26229426321dd`
- 幾何SHA-256: `818194e7f7563a07961c3462e4074103a6f3531f9f08bf0bf247318b8db083a2`
- オフライン生成MakeCodeのSHA-256: `4f96571131a2bd5f26aeef14d4894eb213dde4af2b029f12736630f4d3931ab5`。これらはユーザーが送付した合成成果物のレポートから転記。ゲーム実行時のソースSHA直接検査ではない。

## 直接確認
1. ゲーム内チャットに `PROBE MATCH: oak_planks`（単一素材プローブ成功）。
2. `mabset` に対して `Test-world anchor saved. Area 18x10x18; type mabbuild explicitly.`
3. `mabbuild` の直後、ユーザーが完了前に `mabverify` を実行し、`HOLD: busy or no build attempted.` を確認。**これは当初の検証実行タイミングによる一時HOLDであり、建築不成立の最終判定ではない**。
4. 後に `Placing attempted. Type mabverify; do not run mabbuild again.` と表示され、その後の `mabverify` は `Positions and material counts match. Inspect air/entrances/rooms.` を表示。
5. 画面には、石の壁、木材の平屋根、ガラス窓、入口の開口が視認できる。

## 判定
**EDUCATION_REAL_WORLD_THREE_MATERIAL_PLACEMENT_AND_EXPECTED_BLOCK_COUNTS_PASS — USER-SUPPLIED_SCREENSHOTS**

合格範囲は予定502セルの材料と位置をソフトウェアが照合し、ユーザーのスクリーンショットでも主要3素材と外観を確認できたこと。石/木材/ガラスの実機使用、保存した合成設計からの3素材施工が実証された。ただしAir/居住空間の残存、出入口の歩行、室内での機能性、構造の耐久性、他種材、LLM初見設計の汎用適合性や自動施工成功は**未認定**。数値を全用途へ拡大解釈しない。

## 教訓と次
初期版は18×10×18＝3240セルの空気検査と18×18＝324セルの地面支持検査（計3564セル）を施工前に行い、長時間チャット返信がなかった。後続のエクスポーターでは開始時と2層ごとの進捗を表示（検査箇所は安全のため削減しない）。`mabverify` は配置完了メッセージ後のみ。

次の工程では独立した日本語LLM→ArchitecturePlan→B143→MakeCode入口を用意し、既存の実機確認済みパレットでのみ新しい建物を作る。失敗時は原文と生成データを保護しHOLD、外観や用途の真実性はユーザーが最終確認。自動ワールド施工はしない。保護された花屋933セルの既存結果は不変。
