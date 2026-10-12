# Step8B/B9 検証台帳

| 検証対象 | 直近の結果 | 証拠 |
|---|---|---|
| Step8B B0～B9 | **174 PASS, 0 FAIL, 0 SKIP** | `B9_STEP8B_FULL_QA.tap` |
| Step8A 直近再実行（detail除外） | **65 PASS, 0 FAIL, 0 SKIP** | `B9_STEP8A_RELEVANT_65_QA.tap` |
| Step8A 全80件 | **B8時点に80 PASS**、今回の再実行は未完了 | `B8_STEP8A_PART1.tap`, `B8_STEP8A_PART2.tap` |
| 実機稼働エンジン | 未特定（前回収集時Node.js 0） | B4.2ログ参照、今回は再収集なし |
| Chromium UI動作 | フィルタ32/14/432, 比較, 階切替, JSON保存 PASS | 同一HTMLを`set_content`で読み込み |
| Minecraft新規施工 | 未実施 | `NOT_PREPARED`, 操作0 |

静的形状検証は、実Planner/Bridge/Worldでの実行を意味しない。
