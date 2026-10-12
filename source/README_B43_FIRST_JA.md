# Step 8B/B43 — 最初に読む

**順序**: `../00_START_HERE.md` → `docs/B43_WHOLE_BUILDING_CONNECTIVITY_AND_NEXT.md` → `reports/B43_SUMMARY.json` → `reports/B43_VERTICAL_CIRCULATION.json` → `reports/B43_GUARDED_LAYOUT_ASSEMBLY.json`。

B42以前の678ファイルを**一切変更していない**。B43は開発用の非実行設計モジュールのみ。

## 設計上の到達点

建物6階を横断する動線モデル。5階に仮想上階連絡路を提案した場合は入口から **77/78件の概念ドア予約に到達**。ただし壁20セルとの交差および実際の通行性・床支持・階段状態が未解決であり、この数字は未承認の形状変更を仮定したグラフ計算でしかない。

各階：短経路9辺、通路追加7セル・概念壁4セル干渉。比較用の壁クリア経路は83辺で長大すぎる。どちらも採用していない。

## 検証

`cd source && node verify-b43-package.mjs`。

新規 `node --test tests/step8b-vertical-circulation-b43.test.mjs`、関連回帰はB42/B41/B33。

`NOT_PREPARED`、M4全9ゲート `BLOCKED`。既存建築・Legacy・凍結証拠の変更禁止。実プランナー・Minecraft・Bridge接続禁止。施工命令0件。
