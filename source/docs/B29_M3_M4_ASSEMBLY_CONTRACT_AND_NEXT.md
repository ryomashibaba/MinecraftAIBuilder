# MinecraftAIBuilder B29 — M3/M4 非施工 Assembly IR（2026-10-11）

## 何が増えたか

**Windows/Minecraft/Bridge/建築APIに接続しない**オフラインの統一 Assembly IR を実装した。B25の部屋・壁共有所有権・ドア候補と、B17のドア境界/階情報、B13/B11のオフィス02修正候補、B26/B28の実機証拠を同じ契約で読める。施工用 BuildPlan は常に空で、物理施工可否は承認しない。

- `runner/step8b-m4-assembly-contract-b29.mjs`：`buildAssemblyB29(root)`、`compileAssemblyB29(...)`、`validateAssemblyB29(report, root)`、`summarizeAssemblyB29(report)`
- `tools/RUN_B29_OFFLINE.mjs`：安全な `reports` 配下に新規出力するCLI。既存レポートは上書き拒否。
- `reports/B29_M3_M4_ASSEMBLY_IR.json`：全30階のドア下/上の**概念座標**、壁所有と階段開口候補などの詳細IR。
- `reports/B29_SUMMARY.json`：小さい確認用サマリー。詳しい floor レコードなし。
- `tests/step8b-m4-assembly-b29.test.mjs`：改ざん拒否、原本根拠、ドア状態等を検証。

## データの意味

| 事項 | B29の状態 | 実機保証 |
| --- | --- | --- |
| 壁区画5,704、共有ボクセル3,990 | B25原本の台帳から統一IRへ取り込み | 無し。共有部材の材料は未証明 |
| ドア314 | ローカル1幅×2高、上下概念セル、壁界面の**軸のみ**記録 | 向き・蝶番・上下状態・材料・設置すべて未証明 |
| 階段25、床開口候補50セル | 上下階の概念予約と未切削候補を保持 | 支持・頭上空間・通行性・開口施工すべて未証明 |
| 材料役割5カテゴリ | 役割名のみ、ブロックID未選定 | 過去966件は**当時の記録**であり現時点の利用可能性ではない |
| オフィス02 | 概念翼幅5/ソース翼幅6、差123・廊下外18。レビュー候補4案 | **物理的な修正は0件**。概念参照を変更すれば計算上0になっても実外形が変わるわけではない |
| Windowsソース | B28の実機取得値に基づく9/9一致を継承 | Nodeランタイム同一性未証明 |

ドア状態トークン `upper_block_bit` / `door_hinge_bit` / `open_bit` / `direction` は、**凍結された変換ソースに存在した名称**として記録した。特定のドアブロックでこれらの値が使用可能であるとは主張しない。

## 安全・原本制約

- **旧ファイル511件は全SHA-256一致**。過去のレポート、Legacy、凍結証拠は上書きしない。
- `NOT_PREPARED / BLOCKED / constructionApproved=false` は強制。
- `BuildPlan.operations=[]`、 `commandCount=0`、 `worldCoordinates=null`、 `materialIds=[]`。
- 建築エンジン、Bridge、Minecraft、ワールド、ネットワーク、実材料選定は一切呼び出さない。
- ドア下/上の `y` はローカル概念階の値であり、実座標でもブロック配置指定でもない。
- QAでは改ざんした凍結データ、強制承認、ドア状態や階段開口の勝手な確定、危険な廊下補正を拒否する。

## QA

- B29新規37/37 PASS。
- B28回帰28/28、B27 32/32、B26静的ゲート40/40、B26 Windowsログ判定18/18、計関連回帰118/118 PASS。
- **合計155/155 PASS**（実行環境 Linux / Node.js 22、実機Windows試験ではない）。
- B28原本511/511ファイル照合および元の `verify-b28-package.mjs` PASS。
- B0〜B25の全履歴QAは今回未実行。過去PASSログは保存済み。

## 次回：実装統合を先に進める

1. **B30：非施工エンジン側アダプター** — Assembly IRを現行プランナーの内部データ境界で消費できる独立APIを作成。材料・ワールド座標・施工関数は接続禁止。ドア開口の状態制約と床スラブ開口候補の干渉を dry-run で比較し、未対応をエラーにする。
2. **B31：材料・ドア状態の証拠整備** — 実ソースの型検査に限定して、使用可能と確認できた組み合わせと、Minecraft実機を要する組み合わせを分離。未検証の材料IDを埋めない。
3. **Windows実機は意味があるとき一度のみ** — 実際に使うエンジンを意図的に起動し、読み取り専用ハッシュ＋PID関連付けの一括照合。必要になるまでは収集を繰り返さない。
4. **M5は明示承認待ち** — 隔離された検証ワールド以外の施工は行わない。現在は新規施工未承認。

## 再開手順

1. `00_START_HERE.md` と `source/README_B29_FIRST_JA.md` を読む。
2. `cd source; node verify-b29-package.mjs` でチェックポイントの完全性を検証。
3. `node --test tests/step8b-m4-assembly-b29.test.mjs` で差分QA。
4. 原本レポートの再生成は本ZIPと別の作業フォルダで行う（既存の `reports/B29_*.json` の上書きは禁止）。
