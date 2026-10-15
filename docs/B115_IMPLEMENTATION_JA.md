# B115 — 幅2廊下候補の独立トポロジー検査

## 目的
B114の102階段・15棟の廊下追加候補について、別実装で局所2×2通路の連続性を証明または反例を報告する。B113/B114の正本は一切修正しない。

## 検証する範囲
- 追加セルと通路の2×2平方領域から4方向隣接で辿れる経路、入口・出口の接続、孤立セル・重複セル・不正な追加セル。
- `allowed` と `walk` の元データが明示的に渡された場合だけ、床マスクと既存廊下への接続、追加セル差分を独立照合。
- B114実レポート全15棟・102階段の出力は、B114の固定ハッシュ検証を経たのち、**局所2Dトポロジーのみ**を審査する。

## 保留事項（重要）
- 実レポート一括検証では元の床マスク、完全な既存廊下ネットワーク、床開口・頭上クリアランスを独立再計算していない。候補がPASSでも本物の2幅通行や階段を認証しない。
- B114の現地ワールド座標を使用せず、Minecraft Educationには接続しない。
- `NOT_PREPARED`、9ゲート `BLOCKED`、`BuildPlan.operations=[]`、`worldContacts=0` は不変。

## 実行方法（Minecraft不要）
```bash
node --test source/parallel/b115/main/b115-independent-gallery-proof.test.mjs
node source/parallel/b114/main/b114-batch-review.mjs
node source/parallel/b115/main/b115-independent-gallery-proof.mjs
```

B114のレポート生成は依存分析に時間がかかる。Actionsがrunner未割当（steps=0）の場合はCI成功を主張せず、非実行と記録する。新規施工や課金設定の変更は禁止。
