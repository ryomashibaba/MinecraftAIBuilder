# B171 — B134/B135 → B170 読み取り結果の統合・不一致検出

## 目的

B170 Draft PR #74 は、DOPPLER の北翼・南翼について合計18箇所の「どのブロックID・向き・上下状態・階段形状か」を記録する、実ワールド操作なしの観測キットを既に実装しています。

B171 は B170 を重複実装せず、以前に作られた **B134/B135 の読み取り専用 `testforblock` 診断JSONを、B170で定義した18地点へ正しく取り込むための橋渡し**です。

重要: B134/B135 の実行結果、利用者入力、反復した読み取りを、そのまま Minecraft Education 実機から独立認証済みとみなすことはできません。出力は常に未認証です。

## 統合処理

- **ソース固定:** B170 の `B170_PROBE_PACKET.json` に固定された source/geometry SHA と、18地点のIDだけを採用します。
- **B134:** 5件の読み取り専用 `testforblock`（ブロックIDと方向候補4件）を、元の評価関数で再計算し、提出JSONの「成功/失敗」ラベルと完全照合します。
- **B135:** positive/negative対照と方向候補4件の合計6件を、B135 の評価関数で再計算します。値の一致を重視し、エラーレスポンスのデバッグ用 `responseKeys` メタデータは証拠として扱いません。
- **重複／衝突:** 同一診断書を重複計上せず、方向値が異なる場合は `DIRECTION_VALUE_CONFLICT`、ワールドXYZが食い違う場合は `WORLD_COORDINATE_CONFLICT` と判定します。
- **状態値の解釈:** `weirdo_direction=0…3` の候補値が一意でも、それを北/南/東/西と直接結びつけません。設計ローカル座標→ワールド座標の対応も未認証のままです。
- **施工制限:** 一切の Minecraft 通信・`setblock`・`fill`・`clone` を含まず、元のB166モデル・B170の観測入力ファイルを書き換えません。

## すでに利用可能なGitHub Actions成果物

`B171-ReadOnly-Diagnostic-Reconciler` には、**未観測18件と明示した**4つのJSONが入ります。

- `B171_PINNED_PROBE_PACKET.json`: B170 18地点のソース固定定義
- `B171_EMPTY_SUBMISSION.json`: 利用者提供データなし
- `B171_READBACK_ARCHIVE.json`: 読み取り診断レコードなし
- `B171_EMPTY_RECONCILIATION.json`: 18地点未観測／認証件数0

この空データは実機の測定結果ではありません。未観測は成功や不通の証明ではありません。

## 将来、実機からすでに取得したB134/B135診断JSONがある場合

Minecraftの再起動やコマンド実行は不要です。B170のチェックポイントIDに診断を紐付けた次の形式を、`B171_READBACK_ARCHIVE.json` の `receipts` に入れます。

```json
{
  "checkpointId": "north-tread-1",
  "source": "B135",
  "diagnostic": { "schema": "minecraftaibuilder-b135-live-raw-control-v1" }
}
```

`diagnostic` は**B135が出力した実際のJSON全体**を入れます。上記は形式の説明用であり、そのまま読み込ませても拒否されます。B134の場合は `"source": "B134"` とし、B134出力全文を使います。

B170キットの `observations` にワールド座標を登録する場合、同一チェックポイントに紐付く読み取り診断のXYZと完全一致しなければ衝突扱いにします。ただし一致しても、その座標がDOPPLERの正しい実ワールド位置だと証明したことにはなりません。

### Node.js コマンド（必要なときのみ）

```bash
node scripts/b171-review-readbacks.mjs --init ./b171-readback-output
node scripts/b171-review-readbacks.mjs --review ./b171-readback-output/B171_PINNED_PROBE_PACKET.json ./b171-readback-output/B171_EMPTY_SUBMISSION.json ./b171-readback-output/B171_READBACK_ARCHIVE.json ./b171-readback-output/B171_NEW_REVIEW.json
```

`--init` は既存ファイルの上書きを拒否します。手元に測定結果がない状態でユーザーが操作する必要はありません。診断JSONを取り込む場合も Minecraft の実ワールドを自動接続・操作することはありません。

## 今後の本物の物理モデルへの引き継ぎ条件

1. 実機の Minecraft Education リリース、設置した正確なブロックID、`weirdo_direction` と上下状態の独立確認
2. 実ワールドの位置と設計座標との校正済み対応
3. 1地点1回ではなく、独立した繰り返し診断＋画面確認
4. Minecraft Educationでのプレイヤー当たり判定、実際の階段通過を独立に検証
5. 上記がすべて成立するまで B169の二箱階段モデルを **本物のバニラ階段形状として認証しない**

`NOT_PREPARED` / 全9ゲート `BLOCKED` / `BuildPlan.operations=[]` / Work未使用 / main未マージ / ワールド変更0。
