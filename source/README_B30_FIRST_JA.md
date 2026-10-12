# MinecraftAIBuilder B30 統合引継ぎ

最初に `../00_START_HERE.md`、次に `docs/B30_ENGINE_BOUNDARY_AND_NEXT.md` を読む。

B29原本526ファイルを変更せず、M3/M4のAssembly IRをソースのプランナー内部データ境界へ**読み取り専用で接続して観測する**B30アダプターを追加。

- 5棟30階、壁5,704、ドア314、階段25。
- 階段床開口候補50/50セルが、プランナーの上階床プレート生成範囲に重なることを静的に確認。
- 物理材料0、実ドア検証0、実床開口0、実エンジン呼び出し0、施工操作0。
- B30新規38＋関連回帰155＝193/193 PASS。B0～B25全回帰は今回省略。
- 保存済みWindowsスナップショット9ソースのハッシュ照合を再確認。ただし**稼働中エンジンの同一性は未確認**。
- Windows側の追加操作0回。B29およびLegacy・凍結証拠は変更禁止。

再開: `node verify-b30-package.mjs` で統合ZIPを検査。`node --test tests/step8b-engine-boundary-b30.test.mjs` で差分QA。

次はB31で床マスクへの開口候補オーバーレイとドア状態条件の静的アダプターを構築。原本の `GeneralBuildingPlanner` を変更・呼出ししない。適用／施工／Minecraft接続は明示承認まで禁止。

**NOT PREPARED / BLOCKED / commandCount=0**
