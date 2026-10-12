# B72 — 実本番文法を利用した入力互換・構造マスク照合

- B71の5ファイルは再取得せず、同梱されたピン留め版をSHA-256固定として利用します。
- 本番の `createComposition` が `floorHeight` を整数4〜5で受け付けることを原文・ハッシュ付きで確認。B66名目5に合わせた5棟の `createBuildingPlanInputCandidate` （明示高さ5、寸法・6階）を生成。
- `preflightProductionPlan` は**後で別環境から得た読み取り専用の本番計画JSON**の `composition` / `masses` を既存B66床マスクと比較して、不足・余剰領域を座標別に報告します。コードのimport、Plannerの起動、operations実行はしません。
- 実本番計画JSONは現状未入手。ホテルの検証用矩形マスは幾何マスクと一致するが本番の実行結果とは一切扱いません。
- 5ファイルの直接依存15件が今回のZIPにないと判明（その先の間接依存は未解析）。B72工具は**不足依存のみ**を静的収集。B67と重複する5ファイルはZIPには含まれません。

## 検証

```sh
cd source
node parallel/b72/main/run-b72.mjs
node --test parallel/b72/main/compile-b72.test.mjs
node verify-b72-package.mjs
```

別の環境で適法かつ安全に本番計画JSONを出力できる段階になれば、配置せずに、以下で照合できます。

```sh
node parallel/b72/main/check-b72-plan.mjs --building hotel/candidate-01 --plan-json /path/to/read-only-plan.json
```

## 絶対禁止

- 凍結済みB35〜B71ソースの変更。ゲームのワールド/Socket/HTTP接続、施工命令の発行。
- 生成した5棟の入力候補を現段階で `createBuildingPlan` に送る行為。出力JSONを配管して実施工する行為。
- 論理上の階高入力が合うことを、本番の見た目・マスキング・ドア・階段の完成保証とみなすこと。

状態: `NOT_PREPARED`, 9/9 `BLOCKED`, `BuildPlan.operations=[]`, commandCount=0, physicalDoors=0, physicalStairs=0.
