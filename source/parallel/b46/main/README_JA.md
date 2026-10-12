# B46 — Read-only Local Planner Geometry Packets

B45の5棟・30階・175工程を、建築プランナーへの**将来的な**転送対象として検査できる局所座標の構造化パケットに変換する。これは実行アダプターでも実ブロックへの変換でもない。

ファイル：`compile-b46.mjs`（副作用なし）、`run-b46.mjs`（入力再現・排他的なオフライン出力）、`compile-b46.test.mjs`、`B46_PLANNER_GEOMETRY_REVIEW.json`、`B46_PREVIEW_*.obj`（5棟）と `B46_VISUAL_ONLY.mtl`。

ステージの `kind`：FLOOR_MASS / FACADE_SHELL / ROOF_PROJECTION / PARTITION_HINTS / OPENING_REVIEW / STAIR_LINK_REVIEW。各パケットは`approved:false`, `emitAllowed:false`, `worldAnchor:null`, `blockState:null`、形状のみを収録。外観は縦フィン、水平帯、露出屋根外縁の**表示専用**の帯で、Minecraft内に設置可能な部材を意味しない。

検証で扱う安全境界：B45 upstreamを `verifyB45` で再現、床矩形の重複と占有数、旧床内だけの切り欠き、屋根投影、外周境界再現、窓表示候補が壁面上にあること、30階の工程依存関係、全ゲートがBLOCKEDであること。

実プランナーの参照ソースを確認する `compile-b46.test.mjs` は **静的な文字列照合だけ**。実プランナーのモジュールをimport・実行したり、Bridge/HTTP/WebSocket/Windowsに接続したりしない。

再実行:

```bash
cd source
node parallel/b46/main/run-b46.mjs
node --test parallel/b46/main/compile-b46.test.mjs
node verify-b46-package.mjs
```

### 次の開発上の判断

今後は見た目のマーカー追加よりも、既存の建築プランナーの入力から得られるフットプリントとB46幾何の**構造的同一性／差分**を判断することが先。ブロック状態・材料が未検証なので、たとえ形状が一致しても実施工は承認しない。
