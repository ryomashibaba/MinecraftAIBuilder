# Step8B/B8 実行済みQA集計

| 検証群 | 実行ファイル | PASS | FAIL | SKIP |
|---|---|---:|---:|---:|
| Step8B（B0〜B8） | `B8_STEP8B_QA.tap` | 157 | 0 | 0 |
| Step8A 前半（architecture, design, detail） | `B8_STEP8A_PART1.tap` | 40 | 0 | 0 |
| Step8A 後半（optimize, physical, review） | `B8_STEP8A_PART2.tap` | 40 | 0 | 0 |
| **合計** | 3実行 | **237** | **0** | **0** |

環境：Linux Node.js 22。静的ソーススナップショット249ファイルのハッシュ照合を含む。Windows実機施工・実planner・Bridge・Minecraftの接続はなし。

B8追加テスト22件と過去Step8B 135件を含む。以前の全件一括試行はタイムアウトしたため、最後のPASS集計は3実行分。途中の失敗／中断を成功として計上していない。

HTML動作スモークテスト：Chromiumで同一HTML文字列を読み込み、432表示、用途hotelで144表示、2候補の比較、階切替、JSONダウンロードを実施。JS例外0。出力JSONには`NOT_PREPARED`, `operations=[]`, `commandCount=0`, `constructionApproved=false`, `executionAllowed=false`。file://を直接開く操作は試験環境が禁止したため未検証。

安全状態：`NOT_PREPARED / BLOCKED`、施工命令0、既存建築変更0。
