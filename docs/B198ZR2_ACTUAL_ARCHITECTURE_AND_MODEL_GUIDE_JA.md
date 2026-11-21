# MinecraftAIBuilder — B198Z-R2 実装・独立評価（2026-10-19 JST）

## この工程の正確な認定範囲
- GitHub 正本: `ryomashibaba/MinecraftAIBuilder` Draft PR #128 （base = B198Y Draft PR #127）
- R1 139要素に対し、**R2 は既存1部材変更・外部17部材追加の156要素**。既存の床・階段・中央吹抜け・書架・入口は変更していない。
- R2ソースは `evidence/b198zr2/assistant-revised-library-r2.json`、**ASSISTANT-AUTHORED_REVISION**。
- 唯一の実Qwen生原本 `40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf` は外部の正式B198Z引継ぎZIPに原本保存、変更なし。モデル実行0回。ユーザーのWindows操作0回。
- R2 `sourceSha256=7e5b1885a398d5e98f1298915947bc66eae56d4ccf4b413274da780a3778c218`。
- 公式B143の `compileDesign` と `verifyCompiled`、最終ボクセル空洞検査、抽象歩行グラフおよび意図的な2種類の不正設計（空洞再閉塞・偽階段）をCIで確認。
- B143要素上限160に対して156、最終15,312ボクセル。11×11×36＝4,356セルの吹抜けは全て空気。入口→5層20地点と左右のテラス2地点の**抽象的**到達性を検証。
- 非対称の外骨格・斜めの屋根補強・左右テラス・海側大ゲートを追加したが、**外観・材料・意匠は最終合格ではない**。

## B198Z-R2で改善した汎用部
`source/ai/b198zr2-generic-quality-guide.mjs` は、建物用途を判別して生成するものではなく「完成したボクセルで空洞を守る」「上下の歩行動線を本物の段差で設計する」「外観の特徴と入口を成立させる」など**カテゴリー非依存**の制作要件を定義。ネイティブローカルモデル入力経路 `b198s-native-ollama-source.mjs` の既存構造ガイドに追記される。従来のJSON提案スキーマは変更しない。現時点では**ガイドの輸送/反映をfixtureだけで検証**しており、実Qwenの改善を実証したものではない。

## 独立検査
`node scripts/b198zr1-strict-source-audit.mjs`
`node scripts/b198zr2-strict-architecture-audit.mjs`
`node --test scripts/b198s-native-source.test.mjs`

R2の専用テストは元コードのB143を**実際に実行**し、新旧デザインの要素差、原本由来の保護部分、最終空気量、実配置に基づく歩行グラフと反例の拒絶を検証。実Minecraftのblock stateや身長・衝突、家具の歩行・用途、芸術性を証明するものではない。

## 次工程の優先順位
1. R2の建築を実際の独立視覚レビューで厳しく評価。ボリュームの緊張感・正面・テラス支持・特徴の見え方を優先して改善する。装飾の数合わせは禁止。
2. 汎用ソース品質に、モデルの意図した機能領域／空気領域／ルートを**外部検証可能な形式**で扱う設計（固定ビル種類テンプレートなし）を追加。
3. 実ローカルQwenの再推論は**ユーザーの明確な許可後に単発で**比較検査。人手R2と混同しない。

## 施工・レガシー安全ガード
`readiness=NOT_PREPARED`、9 gate 全件 `BLOCKED`、`BuildPlan.operations=[]`、`worldContacts=0`、`worldWrites=0`。
旧B99/B100保護原本（1,599ファイル等）、旧建築、Legacy、FAILED journal、main、PR #113〜127は変更していない。実機Minecraftに触れず、課金API、Workも使っていない。
