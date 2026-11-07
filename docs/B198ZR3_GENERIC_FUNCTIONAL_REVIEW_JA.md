# MinecraftAIBuilder — B198Z-R3 汎用空間機能契約 / 2026-10-19

## 決定した方針を変更しない
- 唯一のコード正本は `ryomashibaba/MinecraftAIBuilder`。PR #128 のブランチに積み、#127 B198Y を base とする。新規PR乱立や旧Draft修正、mainマージを行わない。
- 最終目標は未知の建築用途を日本語からモデル自身が独創的に設計・改修できる汎用AI Builder。**図書館固有のテンプレートは絶対に実装しない**。
- 実Qwen原本（SHA256 `40810c69e56e59f61704ef0e0a1d96f98a2415aa057a86d7355c44421ab3edbf`）は変更禁止。R1/R2は手作業修正版であり、Qwenの新規成功例ではない。
- R3でも新しいモデル実行、Windows操作、Minecraft接続・施工・読取、有料API、Workは**すべて0**。
- `NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]`、旧B99/B100凍結と旧建築/Journals保護を維持。

## 実装内容
`source/ai/b198zr3-functional-review-contract.mjs`: **任意の用途**で共通の独立審査。B143ソースのSHA固定、公式コンパイル結果の照合、最終ボクセルの空気容積、入口からの最短段差移動距離、指定ゾーンにおける実際の立てる床・2ブロック以上の頭上空間・入口から到達可能な割合を検査する。根拠のないセル名称・モデル自己採点だけでは合格しない。

`evidence/b198zr3/r2-functional-review-contract.json`: **人間の承認済み契約ではない**、独立のASSISTANT_PROPOSED_UNAPPROVED事例。図書館の各階閲覧空間、書架前の通路、連続吹抜け、展望階と左右テラスを具体的な審査目標に設定。契約はR2の正確なソースSHAへ固定し、形状変更後の自動すり替えを拒絶する。

`scripts/b198zr3-functional-review.test.mjs`: 異種用途の中庭パビリオン、中央空洞のあとから埋め戻す破壊、入口閉塞、上階を埋めた機能不能例、根拠のない「HUMAN_APPROVED」宣言、古いソースSHAの流用をテスト。模型自体の意匠を人工知能として捏造しない。

`scripts/b198zr3-offline-review.mjs`: 既存JSON + 契約JSONから一度で決定的なオフライン報告を作成するCLI。例：

```bash
node scripts/b198zr3-offline-review.mjs \
  --design evidence/b198zr2/assistant-revised-library-r2.json \
  --contract evidence/b198zr3/r2-functional-review-contract.json \
  --out /tmp/b198zr3-audit.json
```

`--out` は既存の報告書を上書きしない。契約自体は人工知能への発注書や改修提案の**代用品ではなく、検証側の受け入れ基準**。ユーザー日本語要求との意味一致、用途充足、実際の階段block ID/state、実機歩行、美的品質は引き続き**HOLD**。形式制約のPASSを施工許可に転換しない。

## 次工程の意味ある優先順位
1. 本R3契約がR2の空間欠陥を実際に拒絶することをCIで確定する。
2. 別の設計ジャンルに対し、モデルが**独創的な空間と動線を自ら提案する**までの生成・批評プロトコルを設計する（固定ビル種ルーティング禁止）。独立評価は同じR3契約系で行う。
3. ユーザーが高負荷Qwen単発生成を明示承認した場合に限り、Qwenの新ソース（生出力＋SHA）を比較する。原案とR2人手改修を**決して混同しない**。
4. R2立体外観はまだインパクトが足りず美観HOLD。少数の大きな機能的ボリュームを優先する。単なる細部やQA数合わせをしない。

## 実装検証の限界
`stand(x,y,z)` はフルボクセル＋頭上空間を利用した抽象グラフ。斜め移動・ジャンプ・階段ハーフブロック、真正のMinecraft衝突形状、見た目のデザイン評価は対象外。契約側の要求が甘ければ弱い設計でもFORMAL制約PASSになる。承認済み建築の証明ではない。
