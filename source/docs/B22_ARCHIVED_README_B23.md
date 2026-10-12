# MinecraftAIBuilder B22 / M3-D — ここから開始

最初に `docs/B22_M3D_IMPLEMENTATION_AND_NEXT.md` を読むこと。

- B21の整数格子候補に対する **施工不可の** プランナー契約シミュレーターを追加した。
- ドア118か所／236セルの干渉は**未解決**。壁を安全に隣セルへ移せる候補は0件。
- 118枚の壁の236セルを局所的に開ける仮の形状提案は生成したが、壁の連続性未検証につき施工禁止。
- 5棟30階、階段25接続／開口候補50セルは引き続き未適用。
- 新規 `node --test tests/step8b-m3d-b22.test.mjs`（30件）、B21関連44件PASS。重いB20一式は今回は未完了。
- `node verify-b22-package.mjs` による旧原本SHA＋新パッケージ整合性＋レポート再現を実施する。
- レポートを再生成する場合は `node tools/RUN_B22_OFFLINE.mjs /absolute/brand-new-output-folder`。既存出力先は拒否。

**Windows操作は不要。施工はNOT PREPARED / BLOCKED、命令0件を維持。**
