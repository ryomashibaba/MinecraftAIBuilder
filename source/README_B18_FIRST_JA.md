# MinecraftAIBuilder — Step 8B/B18 (M2) 最初に読む

1. `00_START_HERE.md`（ZIPルート）と `docs/B18_M2_IMPLEMENTATION_AND_NEXT_GATE.md` を読む。
2. B17の `reports/B17_INTERIOR_INTEGRATION_IR.json` を**ファイルSHA-256で固定**。旧ファイル369件は一切変更しない。
3. M2 新規ソース `runner/step8b-interior-geometry-b18.mjs`、CLI `tools/RUN_B18_OFFLINE.mjs`、テスト `tests/step8b-interior-geometry-b18.test.mjs`。
4. `node --test tests/step8b-interior-geometry-b18.test.mjs` と `node verify-b18-package.mjs` でQA。WindowsやMinecraftは不要。
5. 作成済み `reports/B18_M2_LOCAL_GEOMETRY.json`、`reports/B18_M2_SUMMARY.json` は**施工不能なローカル仮想幾何**。壁5,704パネル・ドア314開口・階段25候補を含む。
6. 次工程M3は Windowsで取得済みのエンジンAPI/データ契約とのオフライン統合差分検証。ワールド座標・材料・稼働プロセス・室内施工の実証は未完了。

**NOT PREPARED / BLOCKED / operations=[] / commandCount=0**。ワールド変更、Bridge通信、Minecraft操作、既存Legacyの変更は絶対に行わない。
