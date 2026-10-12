# MinecraftAIBuilder Step 8B/B31 — 最初に読む

`../00_START_HERE.md`、次に `docs/B31_FLOOR_DOOR_ADAPTER_AND_NEXT.md` を確認する。

B30原本542ファイルをハッシュ固定。B31では元のプランナーを読み込まずに、階段床開口候補を差し引いた床マスクと、室内ドア314か所の上下2セル／方位候補を生成する非施工アダプターを追加。

- 元の予測床マスク12,778セル、床開口候補50セル、未適用の代替マスク12,728セル。
- ドア実ブロックID・方位・蝶番・open/upper状態は未証明。物理ドアの施工可否を証明しない。
- B31新規41/41、B29/B30関連75/75、計116/116 PASS。
- B30原本・Legacy・既存建築・凍結証拠を変更禁止。Windowsユーザー操作0回。

`cd source && node verify-b31-package.mjs` で復元と安全契約を確認。
`node --test tests/step8b-floor-door-overlay-b31.test.mjs` で差分QA。
報告の再生成は、原本を上書きしない**新しい作業コピー**で `reports/B31_*.json` を置かずに `node tools/RUN_B31_OFFLINE.mjs` を実行。

**NOT PREPARED / BLOCKED / BuildPlan.operations=[]**
