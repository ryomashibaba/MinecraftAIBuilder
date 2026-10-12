# MinecraftAIBuilder — B20 非施工M3ステージング

1. `docs/B20_M3_STAGING_FINDINGS_AND_M4.md` を確認。
2. B19原本とB17/B18凍結証拠は**一切変更禁止**。今回の新規ソースは `runner/step8b-staging-contract-b20.mjs`、新規テストは `tests/step8b-staging-contract-b20.test.mjs`。
3. 検証：`node verify-b20-package.mjs`。差分QA：`node --test tests/step8b-interior-geometry-b18.test.mjs tests/step8b-planner-contract-m3.test.mjs tests/step8b-staging-contract-b20.test.mjs`。生ソースZIPの復元がなければB19のオプション1件はSKIPとなり得る。前回の95/95記録は実機ソース7ファイルを照合したもの。
4. 非施工出力：`node tools/RUN_B20_OFFLINE.mjs /新規の出力フォルダ`。既存フォルダへは書き込まない。
5. 材料ID・実ワールド座標・施工命令は**存在しない**。B20の床マスクコピーも実プランナーには接続していない。
6. 次工程は実ブロック尺度のモデル再設計と非実行エンジン検証経路の統合。**`NOT PREPARED`維持**。
