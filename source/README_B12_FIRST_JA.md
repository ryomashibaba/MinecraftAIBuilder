# Step8B/B12 — 内部空間・上下階整合の非施工レビュー

1. `docs/STEP8B_B12_IMPLEMENTATION_AND_NEXT.md` を読む。
2. `reports/B12_SPATIAL_REVIEW_REPORT.json` および `previews/B12_SPATIAL_REVIEW.html` を確認する。
3. `node verify-b12-package.mjs` でハッシュ・ファイル在庫・B11原本の不変性を確認する。
4. 追加生成が必要な場合のみ `node tools/RUN_B12_OFFLINE.mjs /tmp/新規出力フォルダ名` を実行。既存出力ディレクトリは拒否される。

判定：**5棟・30階・314概念ドア点の名目上の配置整合が成立**。現物の壁厚、ドア開口、階段の有効寸法、安全な移動経路、ワールド座標や材料IDは**未検証**。
オフィス02：概念/エンジン外形差分123セル、廊下端18セルの非適用補正案。建物外形差分は未解消。

**`NOT PREPARED` / `BLOCKED` / commandCount=0 / operations=[]**。
既存建築、Legacy設定、凍結証拠を変更してはならない。新規施工未承認。B11以前のソースは1バイトも変更していない。
