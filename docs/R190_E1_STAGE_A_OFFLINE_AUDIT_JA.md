# E1 Stage A保存原文監査（2026-10-31 JST）

第1回二段階 `E1_TWO_STAGE_REPORT.json` は、modern-home `SPACE_HEIGHT`（storage-room-003 6 vs >=7）、flower-shop `NO_FEASIBLE_SPATIAL_LAYOUT`、research-lab `NO_CERTIFIED_WINDOWS` を記録。ただし最後の0件はサンプリング窓36個のSOURCE検査結果であり、すべての外壁窓が不可能と断定できない。

`node scripts/r190-e1-stage-a-audit.mjs --latest` は、PCで保存済みの3つの `STAGE_A_ORIGINAL.txt` を再推論せずに読み、原本SHAを先に検証する。モデル設計に手を加えず、部屋定義の具体的問題、既存の3レイアウト戦略の可否（自動採用ではない）、外壁候補36件の源流SOURCE失敗理由分布を表示する。全窓候補の個数と検証した部分集合を区別し、未検査は成功・失敗を主張しない。問題は結果を基に解決し、誤魔化したコード自動調整や固定テンプレ建物は作らない。

このコマンドはREAD ONLY／ローカルLLM通信0／worldWrites0。二段階実モデル初回の原本証拠を再利用し、同じ3リクエストを繰り返さない。